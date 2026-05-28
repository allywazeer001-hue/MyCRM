import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ViewsService {
  constructor(private prisma: PrismaService) {}

  async create(moduleId: string, orgId: string, userId: string, data: any) {
    return this.prisma.view.create({ data: { ...data, moduleId, organizationId: orgId, createdById: userId } });
  }

  async findByModule(moduleId: string, orgId: string) {
    const views = await this.prisma.view.findMany({
      where: { moduleId, organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    });
    return [...views.filter(v => v.isPinned), ...views.filter(v => !v.isPinned)];
  }

  async findOne(id: string, orgId: string) {
    const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    return view;
  }

  async update(id: string, orgId: string, data: any) {
    const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    return this.prisma.view.update({ where: { id }, data });
  }

  async togglePin(id: string, orgId: string) {
    const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    return this.prisma.view.update({ where: { id }, data: { isPinned: !view.isPinned } });
  }

  async remove(id: string, orgId: string) {
    const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    return this.prisma.view.delete({ where: { id } });
  }
}
