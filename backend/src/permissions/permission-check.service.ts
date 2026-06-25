import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_ALL_ON = {
  canDashboard: true, canAnalytics: true, canWorkflow: true, canForms: true, canStudio: true,
};
const MODULE_ALL_ON = {
  canView: true, canCreate: true, canEdit: true, canDelete: true,
  canExport: true, canImport: true, canPrint: true,
};

@Injectable()
export class PermissionCheckService {
  constructor(private prisma: PrismaService) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'SUPER_ADMIN';
  }

  async resolveUserPermissions(userId: string, orgId: string) {
    // First fetch the user role with a minimal select for efficiency
    const userRole = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true },
    });

    // SUPER_ADMIN bypasses ALL permission checks — return everything true immediately
    if (userRole?.role === 'SUPER_ADMIN') {
      return {
        isAdmin: true,
        isSuperAdmin: true,
        system: { ...SYSTEM_ALL_ON },
        modules: { isSuperAdmin: true } as Record<string, any>,
      };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, role: true, departmentId: true },
    });
    if (!user) return { isAdmin: false, system: { ...SYSTEM_ALL_ON, canAnalytics: false, canWorkflow: false, canForms: false, canStudio: false }, modules: {} };

    const isAdmin = user.role === 'ADMIN';

    const modules = await this.prisma.dynamicModule.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, slug: true },
    });

    let baseSystem: Record<string, boolean>;
    let baseMods: Record<string, Record<string, boolean>>;

    if (isAdmin && user.departmentId) {
      // ADMIN with a unit: inherit that unit's permission set as base
      const dept = await this.prisma.department.findFirst({
        where: { id: user.departmentId, organizationId: orgId },
        select: { permissions: true },
      });
      const stored: any = dept?.permissions || {};
      const ss = stored.system || {};
      const ms = stored.modules || {};
      baseSystem = {
        canDashboard: ss.canDashboard ?? true,
        canAnalytics: ss.canAnalytics ?? true,
        canWorkflow:  ss.canWorkflow  ?? true,
        canForms:     ss.canForms     ?? true,
        canStudio:    ss.canStudio    ?? true,
      };
      baseMods = Object.fromEntries(modules.map(m => {
        const mp = ms[m.id] || {};
        return [m.slug, {
          canView:   mp.canView   ?? true,
          canCreate: mp.canCreate ?? true,
          canEdit:   mp.canEdit   ?? true,
          canDelete: mp.canDelete ?? true,
          canExport: mp.canExport ?? true,
          canImport: mp.canImport ?? true,
          canPrint:  mp.canPrint  ?? true,
        }];
      }));
    } else if (isAdmin) {
      // ADMIN without a unit: full access (original behaviour)
      baseSystem = { ...SYSTEM_ALL_ON };
      baseMods = Object.fromEntries(modules.map(m => [m.slug, { ...MODULE_ALL_ON }]));
    } else if (!user.departmentId) {
      baseSystem = { canDashboard: true, canAnalytics: false, canWorkflow: false, canForms: false, canStudio: false };
      baseMods = Object.fromEntries(modules.map(m => [m.slug, {
        canView: true, canCreate: false, canEdit: false, canDelete: false,
        canExport: false, canImport: false, canPrint: false,
      }]));
    } else {
      const dept = await this.prisma.department.findFirst({
        where: { id: user.departmentId, organizationId: orgId },
        select: { permissions: true },
      });
      const stored: any = dept?.permissions || {};
      const ss = stored.system || {};
      const ms = stored.modules || {};
      baseSystem = {
        canDashboard: ss.canDashboard ?? true,
        canAnalytics: ss.canAnalytics ?? false,
        canWorkflow:  ss.canWorkflow  ?? false,
        canForms:     ss.canForms     ?? false,
        canStudio:    ss.canStudio    ?? false,
      };
      baseMods = Object.fromEntries(modules.map(m => {
        const mp = ms[m.id] || {};
        return [m.slug, {
          canView:   mp.canView   ?? true,
          canCreate: mp.canCreate ?? false,
          canEdit:   mp.canEdit   ?? false,
          canDelete: mp.canDelete ?? false,
          canExport: mp.canExport ?? false,
          canImport: mp.canImport ?? false,
          canPrint:  mp.canPrint  ?? false,
        }];
      }));
    }

    // Apply user-specific overrides (highest priority)
    const now = new Date();
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: {
        userId, organizationId: orgId, isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    for (const o of overrides) {
      if (o.moduleSlug) {
        if (!baseMods[o.moduleSlug]) baseMods[o.moduleSlug] = { ...MODULE_ALL_ON };
        const m = baseMods[o.moduleSlug];
        if (o.canView   !== null) m.canView   = o.canView!;
        if (o.canCreate !== null) m.canCreate = o.canCreate!;
        if (o.canEdit   !== null) m.canEdit   = o.canEdit!;
        if (o.canDelete !== null) m.canDelete = o.canDelete!;
        if (o.canExport !== null) m.canExport = o.canExport!;
        if (o.canImport !== null) m.canImport = o.canImport!;
        if (o.canPrint  !== null) m.canPrint  = o.canPrint!;
      } else {
        if (o.canDashboard !== null) baseSystem.canDashboard = o.canDashboard!;
        if (o.canAnalytics !== null) baseSystem.canAnalytics = o.canAnalytics!;
        if (o.canWorkflow  !== null) baseSystem.canWorkflow  = o.canWorkflow!;
        if (o.canForms     !== null) baseSystem.canForms     = o.canForms!;
        if (o.canStudio    !== null) baseSystem.canStudio    = o.canStudio!;
      }
    }

    return { isAdmin, system: baseSystem, modules: baseMods };
  }

  // ── Per-resource access control (dashboards, analytics views) ────────────────
  // A "shareable" resource carries who-can-see rules. Used to gate visibility of
  // individual dashboards / analytics views (on top of the general canDashboard /
  // canAnalytics page gate).

  /**
   * Can this user VIEW a shareable resource (e.g. a Dashboard)?
   *
   * Default: OPEN to all org members unless access rules are explicitly set.
   * Restricted only when isPublic=false AND at least one share list is non-empty
   * (meaning the creator deliberately restricted access to specific people).
   *
   * Summary:
   *   • isPublic=true → anyone
   *   • isPublic=false, all lists empty → also anyone (no restrictions configured yet)
   *   • isPublic=false, lists non-empty → only listed users/roles/depts + creator/admin
   */
  async canViewResource(userId: string, _orgId: string, resource: ShareableResource): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true, departmentId: true },
    });
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    if (resource.createdById === userId) return true;
    if (resource.isPublic) return true;

    const sharedUsers       = asArray(resource.sharedUsers);
    const sharedRoles       = asArray(resource.sharedRoles);
    const sharedDepartments = asArray(resource.sharedDepartments);

    // No restrictions configured → open to all org members
    const hasRestrictions = sharedUsers.length > 0 || sharedRoles.length > 0 || sharedDepartments.length > 0;
    if (!hasRestrictions) return true;

    if (sharedUsers.includes(userId)) return true;
    if (sharedRoles.includes(user.role)) return true;
    if (user.departmentId && sharedDepartments.includes(user.departmentId)) return true;
    return false;
  }

  /**
   * Throws ForbiddenException unless the user may MANAGE the resource
   * (rename / delete / change access rules). Only SUPER_ADMIN / ADMIN or the creator.
   */
  async enforceCanEditResource(userId: string, _orgId: string, resource: ShareableResource): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return;
    if (resource.createdById === userId) return;
    throw new ForbiddenException('You do not have permission to manage this resource');
  }

  /**
   * Returns the departmentId (unit) for an ADMIN user, or null for SUPER_ADMIN /
   * regular users (no unit restriction applies).
   */
  async getUserUnit(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true, departmentId: true },
    });
    if (!user || user.role === 'SUPER_ADMIN') return null;
    if (user.role === 'ADMIN') return user.departmentId ?? null;
    return null;
  }

  async checkModulePermById(userId: string, orgId: string, moduleId: string, action: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return false;
    // SUPER_ADMIN bypasses all checks — return true immediately
    if (user.role === 'SUPER_ADMIN') return true;
    // ADMIN: fall through to resolveUserPermissions so unit-scoped permissions apply

    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId },
      select: { slug: true },
    });
    if (!mod) return false;

    const perms = await this.resolveUserPermissions(userId, orgId);
    return (perms.modules[mod.slug] as any)?.[action] ?? false;
  }

  async enforceModulePerm(userId: string, orgId: string, moduleId: string, action: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { role: true },
    });

    // SUPER_ADMIN bypasses all enforcement — return without throwing
    if (user?.role === 'SUPER_ADMIN') return;

    // ADMIN: check their unit's permissions for this module (not a blanket bypass)
    // Regular users: check their unit's permissions
    // Both paths resolve through checkModulePermById -> resolveUserPermissions
    const allowed = await this.checkModulePermById(userId, orgId, moduleId, action);
    if (!allowed) throw new ForbiddenException(`Permission denied: ${action}`);
  }
}

// ── Shareable-resource types/helpers ───────────────────────────────────────────

export interface ShareableResource {
  createdById: string;
  isPublic?: boolean | null;
  sharedUsers?: unknown;
  sharedRoles?: unknown;
  sharedDepartments?: unknown;
}

/** Coerce a Prisma Json field (string[] | null | other) into a string[]. */
function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string') as string[];
  return [];
}
