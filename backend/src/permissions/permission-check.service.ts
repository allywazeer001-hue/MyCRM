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
      where: { id: userId, organizationId: orgId },
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
      where: { id: userId, organizationId: orgId },
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

    if (isAdmin) {
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

  async checkModulePermById(userId: string, orgId: string, moduleId: string, action: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { role: true },
    });
    if (!user) return false;
    // SUPER_ADMIN bypasses all checks — return true immediately
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'ADMIN') return true;

    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      select: { slug: true },
    });
    if (!mod) return false;

    const perms = await this.resolveUserPermissions(userId, orgId);
    return (perms.modules[mod.slug] as any)?.[action] ?? false;
  }

  async enforceModulePerm(userId: string, orgId: string, moduleId: string, action: string): Promise<void> {
    // SUPER_ADMIN bypasses all enforcement — return without throwing
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { role: true },
    });
    if (user?.role === 'SUPER_ADMIN') return;

    const allowed = await this.checkModulePermById(userId, orgId, moduleId, action);
    if (!allowed) throw new ForbiddenException(`Permission denied: ${action}`);
  }
}
