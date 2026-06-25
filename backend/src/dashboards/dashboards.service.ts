import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCheckService, ShareableResource } from '../permissions/permission-check.service';

/**
 * Dashboards are persisted server-side so they can be shared across users with
 * per-dashboard access control. Widget layout lives in `config` ({ widgets: [...] })
 * mirroring AnalyticsView. Access rules: isPublic + sharedRoles/Departments/Users.
 */
@Injectable()
export class DashboardsService {
  constructor(
    private prisma: PrismaService,
    private perm: PermissionCheckService,
  ) {}

  // Fields a creator/admin is allowed to set on create/update.
  private pickWritable(data: any) {
    const out: any = {};
    for (const key of ['name', 'description', 'config', 'isPublic', 'isDefault', 'sharedRoles', 'sharedDepartments', 'sharedUsers']) {
      if (data[key] !== undefined) out[key] = data[key];
    }
    return out;
  }

  async findAll(userId: string, orgId: string) {
    const dashboards = await this.prisma.dashboard.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    const visible: any[] = [];
    for (const d of dashboards) {
      if (await this.perm.canViewResource(userId, orgId, d as unknown as ShareableResource)) {
        visible.push(d);
      }
    }
    return visible;
  }

  async findOne(id: string, userId: string, orgId: string) {
    const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId } });
    if (!d) throw new NotFoundException('Dashboard not found');
    const allowed = await this.perm.canViewResource(userId, orgId, d as unknown as ShareableResource);
    if (!allowed) throw new ForbiddenException('You do not have access to this dashboard');
    return d;
  }

  async create(userId: string, orgId: string, data: any) {
    // First dashboard for the org becomes the default if none requested.
    const existing = await this.prisma.dashboard.count({ where: { organizationId: orgId, createdById: userId } });
    const writable = this.pickWritable(data);
    return this.prisma.dashboard.create({
      data: {
        name: writable.name ?? 'Untitled Dashboard',
        description: writable.description ?? null,
        config: writable.config ?? {},
        isPublic: writable.isPublic ?? false,
        isDefault: writable.isDefault ?? existing === 0,
        sharedRoles: writable.sharedRoles ?? [],
        sharedDepartments: writable.sharedDepartments ?? [],
        sharedUsers: writable.sharedUsers ?? [],
        organizationId: orgId,
        createdById: userId,
      },
    });
  }

  async update(id: string, userId: string, orgId: string, data: any) {
    const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId } });
    if (!d) throw new NotFoundException('Dashboard not found');
    await this.perm.enforceCanEditResource(userId, orgId, d as unknown as ShareableResource);

    const writable = this.pickWritable(data);
    // Setting this dashboard as default clears the flag on the others.
    if (writable.isDefault === true) {
      await this.prisma.dashboard.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.dashboard.update({ where: { id }, data: writable });
  }

  async remove(id: string, userId: string, orgId: string) {
    const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId } });
    if (!d) throw new NotFoundException('Dashboard not found');
    await this.perm.enforceCanEditResource(userId, orgId, d as unknown as ShareableResource);
    await this.prisma.dashboard.delete({ where: { id } });
    return { ok: true };
  }
}
