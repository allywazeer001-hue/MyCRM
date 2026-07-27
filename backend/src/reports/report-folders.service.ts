import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCheckService, ShareableResource } from '../permissions/permission-check.service';

/**
 * Folders group SavedReports for organization. Access control mirrors Dashboard
 * exactly (isPublic + sharedRoles/Departments/Users), enforced via the shared
 * PermissionCheckService rather than a hand-rolled check.
 */
@Injectable()
export class ReportFoldersService {
  constructor(
    private prisma: PrismaService,
    private perm: PermissionCheckService,
  ) {}

  private pickWritable(data: any) {
    const out: any = {};
    for (const key of ['name', 'isPublic', 'sharedRoles', 'sharedDepartments', 'sharedUsers']) {
      if (data[key] !== undefined) out[key] = data[key];
    }
    return out;
  }

  async findAll(userId: string, orgId: string) {
    const folders = await this.prisma.reportFolder.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
    const visible: any[] = [];
    for (const f of folders) {
      if (await this.perm.canViewResource(userId, orgId, f as unknown as ShareableResource)) {
        visible.push(f);
      }
    }
    return visible;
  }

  async create(userId: string, orgId: string, data: any) {
    const name = (data?.name ?? '').toString().trim();
    if (!name) throw new BadRequestException('Folder name is required');
    const writable = this.pickWritable(data);
    return this.prisma.reportFolder.create({
      data: {
        name,
        isPublic: writable.isPublic ?? false,
        sharedRoles: writable.sharedRoles ?? [],
        sharedDepartments: writable.sharedDepartments ?? [],
        sharedUsers: writable.sharedUsers ?? [],
        organizationId: orgId,
        createdById: userId,
      },
    });
  }

  async update(id: string, userId: string, orgId: string, data: any) {
    const folder = await this.prisma.reportFolder.findFirst({ where: { id, organizationId: orgId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.perm.enforceCanEditResource(userId, orgId, folder as unknown as ShareableResource);

    const writable = this.pickWritable(data);
    if (writable.name !== undefined && !writable.name.toString().trim()) {
      throw new BadRequestException('Folder name is required');
    }
    return this.prisma.reportFolder.update({ where: { id }, data: writable });
  }

  async remove(id: string, userId: string, orgId: string) {
    const folder = await this.prisma.reportFolder.findFirst({ where: { id, organizationId: orgId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.perm.enforceCanEditResource(userId, orgId, folder as unknown as ShareableResource);
    // Reports inside the folder are not deleted — they just fall back to unfiled.
    await this.prisma.savedReport.updateMany({ where: { folderId: id }, data: { folderId: null } });
    await this.prisma.reportFolder.delete({ where: { id } });
    return { ok: true };
  }
}
