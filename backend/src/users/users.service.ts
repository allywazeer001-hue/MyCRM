import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { PermissionCheckService } from '../permissions/permission-check.service';

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, usertype: true, isActive: true, status: true, mustChangePassword: true,
  jobTitle: true, phone: true, teamRole: true, departmentId: true, organizationId: true, createdAt: true,
  avatar: true, lastLoginAt: true, suspendedAt: true, lockedAt: true,
  department: { select: { id: true, name: true, color: true } },
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private permCheck: PermissionCheckService,
  ) {}

  async create(orgId: string, data: any) {
    if (!data.email || !data.firstName || !data.lastName) {
      throw new BadRequestException('Email, first name, and last name are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestException('Invalid email address');
    }

    // Duplicate email guard (org-scoped)
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email.toLowerCase().trim(), organizationId: orgId },
    });
    if (existing) {
      throw new ConflictException(`A user with email "${data.email}" already exists in this organisation`);
    }

    const defaultPassword = data.lastName;
    const hashed = await bcrypt.hash(defaultPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashed,
        role: data.role || 'USER',
        organizationId: orgId,
        departmentId: data.departmentId || null,
        teamRole: data.teamRole || null,
        jobTitle: data.jobTitle || null,
        phone: data.phone || null,
        isActive: true,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      select: USER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        metadata: { createdByAdmin: true },
      },
    });

    return { ...user, tempPassword: defaultPassword };
  }

  async findAll(orgId: string) {
    const where = { organizationId: orgId };
    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string | null) {
    const user = await this.prisma.user.findFirst({
      where: orgId ? { id, organizationId: orgId } : { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getMyProfile(userId: string, orgId: string) {
    return this.getUserProfile(userId, orgId);
  }

  // Powers both "my own profile" and an admin viewing another staff member's
  // profile (GET /users/:id/profile) — same shape either way.
  async getUserProfile(userId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, usertype: true, isActive: true, status: true,
        jobTitle: true, phone: true, avatar: true,
        createdAt: true, updatedAt: true, lastLoginAt: true,
        departmentId: true,
        department: { select: { id: true, name: true, color: true } },
        organization: { select: { id: true, name: true, slug: true, logo: true, website: true, description: true } },
        _count: { select: { createdRecords: true, comments: true } },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: { id: true, action: true, entityType: true, createdAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [permissions, moduleDirectory] = await Promise.all([
      this.permCheck.resolveUserPermissions(userId, orgId),
      this.prisma.dynamicModule.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, name: true, slug: true, icon: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    return {
      ...user,
      recentActivity: user.auditLogs,
      departmentPermissions: this.buildPermissionRows(permissions, moduleDirectory),
    };
  }

  // Flattens PermissionCheckService.resolveUserPermissions()'s {system, modules}
  // shape (modules keyed by slug, no names) into the array-of-rows-with-joined-
  // module shape the profile UI renders: one "system" row (moduleId absent) plus
  // one row per module (moduleId set, module:{id,name,slug,icon} joined in).
  private buildPermissionRows(
    permissions: { isSuperAdmin?: boolean; system?: Record<string, boolean>; modules?: Record<string, any> },
    moduleDirectory: Array<{ id: string; name: string; slug: string; icon: string | null }>,
  ) {
    const sys = permissions.system || {};
    const isSuperAdmin = !!permissions.isSuperAdmin;
    const rows: any[] = [{
      id: 'system',
      canDashboard: !!sys.canDashboard,
      canAnalytics: !!sys.canAnalytics,
      canWorkflow:  !!sys.canWorkflow,
      canForms:     !!sys.canForms,
      canStudio:    !!sys.canStudio,
    }];

    for (const mod of moduleDirectory) {
      const mp = isSuperAdmin ? null : permissions.modules?.[mod.slug];
      rows.push({
        id: mod.id,
        moduleId: mod.id,
        canView:   isSuperAdmin || !!mp?.canView,
        canCreate: isSuperAdmin || !!mp?.canCreate,
        canEdit:   isSuperAdmin || !!mp?.canEdit,
        canDelete: isSuperAdmin || !!mp?.canDelete,
        canExport: isSuperAdmin || !!mp?.canExport,
        canImport: isSuperAdmin || !!mp?.canImport,
        canPrint:  isSuperAdmin || !!mp?.canPrint,
        module: { id: mod.id, name: mod.name, slug: mod.slug, icon: mod.icon },
      });
    }
    return rows;
  }

  async update(id: string, orgId: string | null, data: any) {
    const existing = await this.findOne(id, orgId);
    const { tempPassword: _, ...patch } = data;
    if (patch.password) patch.password = await bcrypt.hash(patch.password, 12);
    const updated = await this.prisma.user.update({ where: { id }, data: patch, select: USER_SELECT });
    // Sync name/email changes to matching portal user (non-blocking)
    this.syncToPortalUser(existing.email, {
      firstName: patch.firstName,
      lastName:  patch.lastName,
      phone:     patch.phone,
    }).catch(() => {});
    return updated;
  }

  private async syncToPortalUser(email: string, fields: Partial<{ firstName: string; lastName: string; phone: string }>) {
    const portal = await this.prisma.portalUser.findFirst({ where: { email } });
    if (!portal) return;
    const patch: any = {};
    if (fields.firstName !== undefined) patch.firstName = fields.firstName;
    if (fields.lastName  !== undefined) patch.lastName  = fields.lastName;
    if (fields.phone     !== undefined) patch.phone     = fields.phone;
    if (Object.keys(patch).length === 0) return;
    await this.prisma.portalUser.update({ where: { id: portal.id }, data: patch });
  }

  async remove(id: string, orgId: string | null) {
    await this.findOne(id, orgId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, status: 'DISABLED' },
    });
  }

  /** Hard delete — permanently removes the user record from the database. */
  async hardDelete(id: string, orgId: string | null) {
    await this.findOne(id, orgId);

    // Block deletion if the user owns business records that cannot be orphaned
    const [recordCount, formCount] = await Promise.all([
      this.prisma.record.count({ where: { createdById: id } }),
      this.prisma.form.count({ where: { createdById: id } }),
    ]);
    if (recordCount > 0 || formCount > 0) {
      throw new BadRequestException(
        `Cannot permanently delete this user — they have created ${recordCount} record(s) and ${formCount} form(s). ` +
        `Deactivate the account instead.`,
      );
    }

    // Delete all user-owned data that lacks cascade delete in the schema
    await this.prisma.$transaction([
      this.prisma.auditLog.deleteMany({ where: { userId: id } }),
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      this.prisma.comment.deleteMany({ where: { userId: id } }),
      this.prisma.view.deleteMany({ where: { createdById: id } }),
      this.prisma.dashboard.deleteMany({ where: { createdById: id } }),
      this.prisma.analyticsView.deleteMany({ where: { createdById: id } }),
      this.prisma.savedFilter.deleteMany({ where: { createdById: id } }),
      this.prisma.file.deleteMany({ where: { uploadedById: id } }),
    ]);

    return this.prisma.user.delete({ where: { id } });
  }

  async reactivate(id: string, orgId: string | null) {
    await this.findOne(id, orgId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true, status: 'ACTIVE' },
    });
  }

  async suspend(id: string, orgId: string | null, adminId: string) {
    const target = await this.findOne(id, orgId);
    const auditOrgId = orgId ?? (target as any).organizationId;
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: auditOrgId, action: 'USER_SUSPENDED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
      select: USER_SELECT,
    });
  }

  async unsuspend(id: string, orgId: string | null, adminId: string) {
    const target = await this.findOne(id, orgId);
    const auditOrgId = orgId ?? (target as any).organizationId;
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: auditOrgId, action: 'USER_UNSUSPENDED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null },
      select: USER_SELECT,
    });
  }

  async lock(id: string, orgId: string | null, adminId: string) {
    const target = await this.findOne(id, orgId);
    const auditOrgId = orgId ?? (target as any).organizationId;
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: auditOrgId, action: 'USER_LOCKED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'LOCKED', lockedAt: new Date() },
      select: USER_SELECT,
    });
  }

  async unlock(id: string, orgId: string | null, adminId: string) {
    const target = await this.findOne(id, orgId);
    const auditOrgId = orgId ?? (target as any).organizationId;
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: auditOrgId, action: 'USER_UNLOCKED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', lockedAt: null },
      select: USER_SELECT,
    });
  }

  async resetPassword(id: string, orgId: string | null, adminId: string) {
    const user = await this.findOne(id, orgId);
    const auditOrgId = orgId ?? (user as any).organizationId;
    const newPassword = (user as any).lastName;
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: auditOrgId, action: 'PASSWORD_RESET', entityType: 'User', entityId: id, metadata: {} },
    });
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePassword: true, status: 'ACTIVE' },
    });
    return { tempPassword: newPassword };
  }

  async forcePasswordReset(id: string, orgId: string | null, adminId: string) {
    const target = await this.findOne(id, orgId);
    const auditOrgId = orgId ?? (target as any).organizationId;
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: auditOrgId, action: 'FORCE_PASSWORD_RESET', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { mustChangePassword: true, status: 'PASSWORD_RESET_REQUIRED' },
      select: USER_SELECT,
    });
  }

  // ── Permission Overrides ─────────────────────────────────────────────

  async getPermissionOverrides(userId: string, orgId: string | null) {
    const where: any = { userId, isActive: true };
    if (orgId) where.organizationId = orgId;
    return this.prisma.userPermissionOverride.findMany({
      where,
      include: { module: { select: { id: true, name: true, slug: true } } },
    });
  }

  async setPermissionOverride(userId: string, orgId: string | null, grantedById: string, body: any) {
    const target = await this.findOne(userId, orgId);
    const auditOrgId = orgId ?? (target as any).organizationId;

    const existing = await this.prisma.userPermissionOverride.findFirst({
      where: {
        userId,
        organizationId: auditOrgId,
        moduleSlug: body.moduleSlug || null,
        isActive: true,
      },
    });

    const payload = {
      userId,
      organizationId: auditOrgId,
      moduleId: body.moduleId || null,
      moduleSlug: body.moduleSlug || null,
      canView: body.canView ?? null,
      canCreate: body.canCreate ?? null,
      canEdit: body.canEdit ?? null,
      canDelete: body.canDelete ?? null,
      canExport: body.canExport ?? null,
      canImport: body.canImport ?? null,
      canPrint: body.canPrint ?? null,
      canDashboard: body.canDashboard ?? null,
      canAnalytics: body.canAnalytics ?? null,
      canWorkflow: body.canWorkflow ?? null,
      canForms: body.canForms ?? null,
      canStudio: body.canStudio ?? null,
      reason: body.reason || null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      grantedById,
      isActive: true,
    };

    const override = existing
      ? await this.prisma.userPermissionOverride.update({ where: { id: existing.id }, data: payload })
      : await this.prisma.userPermissionOverride.create({ data: payload });

    await this.prisma.auditLog.create({
      data: {
        userId: grantedById, organizationId: auditOrgId,
        action: 'PERMISSION_OVERRIDE_SET', entityType: 'User', entityId: userId,
        metadata: { moduleSlug: body.moduleSlug, overrideId: override.id },
      },
    });

    return override;
  }

  async removePermissionOverride(overrideId: string, orgId: string, adminId: string) {
    const override = await this.prisma.userPermissionOverride.findFirst({
      where: { id: overrideId, organizationId: orgId },
    });
    if (!override) throw new NotFoundException('Override not found');
    await this.prisma.auditLog.create({
      data: {
        userId: adminId, organizationId: orgId,
        action: 'PERMISSION_OVERRIDE_REMOVED', entityType: 'User', entityId: override.userId,
        metadata: { overrideId },
      },
    });
    return this.prisma.userPermissionOverride.update({
      where: { id: overrideId },
      data: { isActive: false },
    });
  }

  // ── Effective Permissions (with overrides) ───────────────────────────

  async clearMyActivity(userId: string, orgId: string) {
    await this.prisma.auditLog.deleteMany({
      where: { userId, organizationId: orgId },
    });
    return { cleared: true };
  }

  async getMyPermissions(userId: string, orgId: string) {
    return this.permCheck.resolveUserPermissions(userId, orgId);
  }

  async getPermissionSummary(userId: string, orgId: string | null) {
    // moduleDirectory joins names/icons onto `effective.modules`, which is
    // keyed only by slug (see PermissionCheckService.resolveUserPermissions)
    // — needed for a human-readable per-module access report, not just the
    // raw slug-keyed booleans.
    const [effective, overrides, moduleDirectory] = await Promise.all([
      this.permCheck.resolveUserPermissions(userId, orgId as string),
      this.getPermissionOverrides(userId, orgId),
      orgId
        ? this.prisma.dynamicModule.findMany({
            where: { organizationId: orgId, isActive: true },
            select: { id: true, name: true, slug: true, icon: true },
            orderBy: { order: 'asc' },
          })
        : Promise.resolve([]),
    ]);
    return { effective, overrides, moduleDirectory };
  }
}
