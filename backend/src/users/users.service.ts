import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { PermissionCheckService } from '../permissions/permission-check.service';

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, isActive: true, status: true, mustChangePassword: true,
  jobTitle: true, phone: true, departmentId: true, createdAt: true,
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
    // Default password = lastName (enterprise credential policy)
    const defaultPassword = data.lastName;
    const hashed = await bcrypt.hash(defaultPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashed,
        role: data.role || 'USER',
        organizationId: orgId,
        departmentId: data.departmentId || null,
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
    return this.prisma.user.findMany({
      where: { organizationId: orgId },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, orgId: string, data: any) {
    await this.findOne(id, orgId);
    const { tempPassword: _, ...patch } = data;
    if (patch.password) patch.password = await bcrypt.hash(patch.password, 12);
    return this.prisma.user.update({ where: { id }, data: patch, select: USER_SELECT });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, status: 'DISABLED' },
    });
  }

  async reactivate(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true, status: 'ACTIVE' },
    });
  }

  async suspend(id: string, orgId: string, adminId: string) {
    await this.findOne(id, orgId);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: orgId, action: 'USER_SUSPENDED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
      select: USER_SELECT,
    });
  }

  async unsuspend(id: string, orgId: string, adminId: string) {
    await this.findOne(id, orgId);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: orgId, action: 'USER_UNSUSPENDED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null },
      select: USER_SELECT,
    });
  }

  async lock(id: string, orgId: string, adminId: string) {
    await this.findOne(id, orgId);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: orgId, action: 'USER_LOCKED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'LOCKED', lockedAt: new Date() },
      select: USER_SELECT,
    });
  }

  async unlock(id: string, orgId: string, adminId: string) {
    await this.findOne(id, orgId);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: orgId, action: 'USER_UNLOCKED', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', lockedAt: null },
      select: USER_SELECT,
    });
  }

  async resetPassword(id: string, orgId: string, adminId: string) {
    const user = await this.findOne(id, orgId);
    // Reset to lastName
    const newPassword = (user as any).lastName;
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: orgId, action: 'PASSWORD_RESET', entityType: 'User', entityId: id, metadata: {} },
    });
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed, mustChangePassword: true, status: 'ACTIVE' },
    });
    return { tempPassword: newPassword };
  }

  async forcePasswordReset(id: string, orgId: string, adminId: string) {
    await this.findOne(id, orgId);
    await this.prisma.auditLog.create({
      data: { userId: adminId, organizationId: orgId, action: 'FORCE_PASSWORD_RESET', entityType: 'User', entityId: id, metadata: {} },
    });
    return this.prisma.user.update({
      where: { id },
      data: { mustChangePassword: true, status: 'PASSWORD_RESET_REQUIRED' },
      select: USER_SELECT,
    });
  }

  // ── Permission Overrides ─────────────────────────────────────────────

  async getPermissionOverrides(userId: string, orgId: string) {
    return this.prisma.userPermissionOverride.findMany({
      where: { userId, organizationId: orgId, isActive: true },
      include: { module: { select: { id: true, name: true, slug: true } } },
    });
  }

  async setPermissionOverride(userId: string, orgId: string, grantedById: string, body: any) {
    await this.findOne(userId, orgId);

    const existing = await this.prisma.userPermissionOverride.findFirst({
      where: {
        userId,
        organizationId: orgId,
        moduleSlug: body.moduleSlug || null,
        isActive: true,
      },
    });

    const payload = {
      userId,
      organizationId: orgId,
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
        userId: grantedById, organizationId: orgId,
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

  async getMyPermissions(userId: string, orgId: string) {
    return this.permCheck.resolveUserPermissions(userId, orgId);
  }

  async getPermissionSummary(userId: string, orgId: string) {
    const [effective, overrides] = await Promise.all([
      this.permCheck.resolveUserPermissions(userId, orgId),
      this.getPermissionOverrides(userId, orgId),
    ]);
    return { effective, overrides };
  }
}
