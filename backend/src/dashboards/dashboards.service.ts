import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, data: any) {
    return this.prisma.dashboard.create({ data: { ...data, organizationId: orgId, createdById: userId } });
  }

  async findAll(orgId: string) {
    return this.prisma.dashboard.findMany({ where: { organizationId: orgId }, include: { widgets: true } });
  }

  async findOne(id: string, orgId: string) {
    const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId }, include: { widgets: { orderBy: { order: 'asc' } } } });
    if (!d) throw new NotFoundException('Dashboard not found');
    return d;
  }

  async addWidget(dashboardId: string, orgId: string, data: any) {
    const d = await this.prisma.dashboard.findFirst({ where: { id: dashboardId, organizationId: orgId } });
    if (!d) throw new NotFoundException('Dashboard not found');
    return this.prisma.dashboardWidget.create({ data: { ...data, dashboardId } });
  }

  async removeWidget(widgetId: string) {
    return this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
  }

  async getAnalytics(moduleId: string, orgId: string, query: any) {
    const { groupByField, aggregation = 'count' } = query;
    const records = await this.prisma.record.findMany({
      where: { moduleId, organizationId: orgId, isDeleted: false },
    });

    if (groupByField) {
      const groups: Record<string, number> = {};
      for (const r of records) {
        const val = (r.data as any)[groupByField] ?? 'Unknown';
        groups[String(val)] = (groups[String(val)] || 0) + 1;
      }
      return Object.entries(groups).map(([name, value]) => ({ name, value }));
    }

    return { total: records.length };
  }
}
