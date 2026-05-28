import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: { canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true, canPrint: true, canApprove: true, canManage: true, canFormBuilder: true, canDashboard: true, canAnalytics: true, canSettings: true },
  ADMIN:       { canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true, canPrint: true, canApprove: true, canManage: true, canFormBuilder: true, canDashboard: true, canAnalytics: true, canSettings: true },
  MANAGER:     { canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: true, canPrint: true, canApprove: true, canManage: false, canFormBuilder: false, canDashboard: true, canAnalytics: true, canSettings: false },
  USER:        { canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: true, canPrint: true, canApprove: false, canManage: false, canFormBuilder: false, canDashboard: true, canAnalytics: true, canSettings: false },
  VIEWER:      { canCreate: false, canRead: true, canUpdate: false, canDelete: false, canExport: false, canPrint: true, canApprove: false, canManage: false, canFormBuilder: false, canDashboard: true, canAnalytics: false, canSettings: false },
};

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async setPermission(orgId: string, data: any) {
    return this.prisma.permission.upsert({
      where: {
        organizationId_role_moduleId: {
          organizationId: orgId,
          role: data.role,
          moduleId: data.moduleId,
        },
      },
      create: { ...data, organizationId: orgId },
      update: data,
    });
  }

  async getPermissions(orgId: string, role?: string, moduleId?: string) {
    return this.prisma.permission.findMany({
      where: {
        organizationId: orgId,
        ...(role ? { role } : {}),
        ...(moduleId ? { moduleId } : {}),
      },
      include: { module: { select: { id: true, name: true, slug: true, icon: true } } },
    });
  }

  // Full matrix: all roles × all modules
  async getMatrix(orgId: string) {
    const [modules, permissions] = await Promise.all([
      this.prisma.dynamicModule.findMany({
        where: { organizationId: orgId, isActive: true },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, slug: true, icon: true },
      }),
      this.prisma.permission.findMany({ where: { organizationId: orgId } }),
    ]);

    const roles = Object.keys(DEFAULT_PERMISSIONS);
    const matrix: Record<string, Record<string, any>> = {};

    for (const role of roles) {
      matrix[role] = {};
      for (const mod of modules) {
        const existing = permissions.find(p => p.role === role && p.moduleId === mod.id);
        matrix[role][mod.id] = existing || { ...DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] };
      }
    }

    return { modules, roles, matrix };
  }

  // Bulk set permissions for a role across all modules
  async setBulkPermissions(orgId: string, role: string, permissions: Array<{ moduleId: string; [key: string]: any }>) {
    const results = await Promise.all(
      permissions.map(p =>
        this.prisma.permission.upsert({
          where: { organizationId_role_moduleId: { organizationId: orgId, role, moduleId: p.moduleId } },
          create: { ...p, role, organizationId: orgId },
          update: p,
        })
      )
    );
    return results;
  }

  // Seed default permissions for a new module across all roles
  async seedModulePermissions(orgId: string, moduleId: string) {
    const roles = Object.keys(DEFAULT_PERMISSIONS);
    await Promise.all(
      roles.map(role =>
        this.prisma.permission.upsert({
          where: { organizationId_role_moduleId: { organizationId: orgId, role, moduleId } },
          create: { organizationId: orgId, role, moduleId, ...DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] },
          update: {},
        })
      )
    );
  }
}
