import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PivotService {
  constructor(private prisma: PrismaService) {}

  async getData(moduleId: string, organizationId: string) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: { id: true, name: true, label: true, type: true },
        },
      },
    });

    if (!mod) return { fields: [], records: [], total: 0 };

    const records = await this.prisma.record.findMany({
      where: { moduleId, organizationId, isDeleted: false, isArchived: false },
      take: 5000,
      orderBy: { createdAt: 'desc' },
      select: { id: true, data: true },
    });

    return {
      fields: mod.fields,
      records: records.map(r => ({ id: r.id, data: r.data })),
      total: records.length,
    };
  }
}
