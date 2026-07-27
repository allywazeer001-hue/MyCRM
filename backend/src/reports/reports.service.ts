import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, userId: string, userRole: string) {
    const all = await this.prisma.savedReport.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    });
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return all;
    return all.filter(r => {
      if (r.createdById === userId) return true;
      if (r.isPublic) return true;
      const canView = (r.canView as string[]) || [];
      return canView.includes(userId);
    });
  }

  async create(orgId: string, userId: string, data: any) {
    const {
      name, description = '', moduleId, moduleName, moduleSlug = '',
      columns = [], filters = [], sortBy = '', sortDir = 'asc',
      groupBy = '', pageSize = 25, styling = {},
      isPublic = false, canView = [], canEdit = [], rolesView = [], rolesEdit = [],
      folderId = null,
    } = data;
    return this.prisma.savedReport.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name,
        description,
        moduleId,
        moduleName,
        moduleSlug,
        columns,
        filters,
        sortBy,
        sortDir,
        groupBy,
        pageSize,
        styling,
        isPublic,
        canView,
        canEdit,
        rolesView,
        rolesEdit,
        folderId,
      },
    });
  }

  async findOne(id: string, orgId: string, userId: string, userRole: string) {
    const report = await this.prisma.savedReport.findFirst({ where: { id, organizationId: orgId } });
    if (!report) throw new NotFoundException('Report not found');
    this.assertViewAccess(report, userId, userRole);
    return report;
  }

  async update(id: string, orgId: string, userId: string, userRole: string, data: any) {
    const report = await this.prisma.savedReport.findFirst({ where: { id, organizationId: orgId } });
    if (!report) throw new NotFoundException('Report not found');
    this.assertEditAccess(report, userId, userRole);
    const allowed = [
      'name','description','columns','filters','sortBy','sortDir',
      'groupBy','pageSize','styling','isPublic','canView','canEdit','rolesView','rolesEdit',
      'folderId',
    ];
    const patch: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    return this.prisma.savedReport.update({ where: { id }, data: patch });
  }

  async remove(id: string, orgId: string, userId: string, userRole: string) {
    const report = await this.prisma.savedReport.findFirst({ where: { id, organizationId: orgId } });
    if (!report) throw new NotFoundException('Report not found');
    this.assertEditAccess(report, userId, userRole);
    return this.prisma.savedReport.delete({ where: { id } });
  }

  private assertViewAccess(report: any, userId: string, userRole: string) {
    if (['ADMIN', 'SUPER_ADMIN'].includes(userRole)) return;
    if (report.createdById === userId) return;
    if (report.isPublic) return;
    if (((report.canView as string[]) || []).includes(userId)) return;
    throw new ForbiddenException('You do not have access to this report');
  }

  private assertEditAccess(report: any, userId: string, userRole: string) {
    if (['ADMIN', 'SUPER_ADMIN'].includes(userRole)) return;
    if (report.createdById === userId) return;
    if (((report.canEdit as string[]) || []).includes(userId)) return;
    throw new ForbiddenException('You do not have edit access to this report');
  }
}
