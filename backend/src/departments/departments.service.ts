import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    const where = { organizationId: orgId };
    return this.prisma.department.findMany({
      where,
      include: {
        _count: { select: { users: true } },
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: {
        _count: { select: { users: true } },
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        users: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, role: true, isActive: true, avatar: true,
          },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(orgId: string, data: { name: string; description?: string; color?: string }) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const exists = await this.prisma.department.findFirst({
      where: { slug, organizationId: orgId },
    });
    if (exists) throw new ConflictException('Department with this name already exists');

    return this.prisma.department.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        color: data.color || '#3b82f6',
        organizationId: orgId,
      },
      include: {
        _count: { select: { users: true } },
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async update(id: string, orgId: string, data: Partial<{ name: string; description: string; color: string; permissions: any }>) {
    await this.findOne(id, orgId);
    const patch: any = {};
    if (data.name !== undefined) {
      patch.name = data.name;
      patch.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (data.description !== undefined) patch.description = data.description;
    if (data.color !== undefined) patch.color = data.color;
    if (data.permissions !== undefined) patch.permissions = data.permissions;

    return this.prisma.department.update({
      where: { id },
      data: patch,
      include: {
        _count: { select: { users: true } },
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async setHead(id: string, _orgId: string, headUserId: string | null) {
    const dept = await this.prisma.department.findFirst({ where: { id } });
    if (!dept) throw new NotFoundException('Unit not found');
    return this.prisma.department.update({
      where: { id },
      data: { headUserId },
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    // Unlink all users from this department first
    await this.prisma.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    return this.prisma.department.delete({ where: { id } });
  }

  async getMembers(id: string, orgId: string) {
    const dept = await this.findOne(id, orgId);
    return dept.users;
  }

  async addMember(deptId: string, orgId: string, userId: string) {
    await this.findOne(deptId, orgId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { departmentId: deptId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async removeMember(deptId: string, orgId: string, userId: string) {
    await this.findOne(deptId, orgId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { departmentId: null },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });
  }

  async getPermissions(id: string, orgId: string) {
    const dept = await this.findOne(id, orgId);
    const modules = await this.prisma.dynamicModule.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, slug: true, icon: true, color: true },
      orderBy: { name: 'asc' },
    });

    const stored: any = (dept as any).permissions || {};
    const systemStored = stored.system || {};
    const modulesStored = stored.modules || {};

    const systemPermission = {
      id: null,
      moduleId: null,
      departmentId: id,
      canDashboard: systemStored.canDashboard ?? true,
      canAnalytics: systemStored.canAnalytics ?? false,
      canWorkflow: systemStored.canWorkflow ?? false,
      canForms: systemStored.canForms ?? false,
      canStudio: systemStored.canStudio ?? false,
      canView: true, canCreate: true, canEdit: true, canDelete: true,
      canExport: false, canImport: false, canPrint: false,
    };

    const modulePermissions = modules.map(mod => {
      const mp = modulesStored[mod.id] || {};
      return {
        module: mod,
        permission: {
          id: null,
          moduleId: mod.id,
          departmentId: id,
          canView: mp.canView ?? true,
          canCreate: mp.canCreate ?? false,
          canEdit: mp.canEdit ?? false,
          canDelete: mp.canDelete ?? false,
          canExport: mp.canExport ?? false,
          canImport: mp.canImport ?? false,
          canPrint: mp.canPrint ?? false,
          canStudio: false, canAnalytics: false, canWorkflow: false,
          canForms: false, canDashboard: false,
        },
      };
    });

    return { systemPermission, modulePermissions };
  }

  async updatePermissions(id: string, orgId: string, body: any) {
    await this.findOne(id, orgId);
    const permsArray: any[] = Array.isArray(body.permissions) ? body.permissions : [];

    const stored: any = { system: {}, modules: {} };
    for (const perm of permsArray) {
      if (perm.moduleId === null || perm.moduleId === undefined) {
        stored.system = {
          canDashboard: perm.canDashboard ?? true,
          canAnalytics: perm.canAnalytics ?? false,
          canWorkflow: perm.canWorkflow ?? false,
          canForms: perm.canForms ?? false,
          canStudio: perm.canStudio ?? false,
        };
      } else {
        stored.modules[perm.moduleId] = {
          canView: perm.canView ?? true,
          canCreate: perm.canCreate ?? false,
          canEdit: perm.canEdit ?? false,
          canDelete: perm.canDelete ?? false,
          canExport: perm.canExport ?? false,
          canImport: perm.canImport ?? false,
          canPrint: perm.canPrint ?? false,
        };
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: { permissions: stored },
      include: { _count: { select: { users: true } } },
    });
  }
}
