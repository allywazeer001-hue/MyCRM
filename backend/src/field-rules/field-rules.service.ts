import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FieldRulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(moduleId: string, organizationId: string) {
    return this.prisma.fieldRule.findMany({
      where: { moduleId, organizationId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(moduleId: string, organizationId: string, dto: any) {
    return this.prisma.fieldRule.create({
      data: {
        moduleId,
        organizationId,
        name: dto.name,
        description: dto.description ?? null,
        priority: dto.priority ?? 0,
        isEnabled: dto.isEnabled ?? true,
        logic: dto.logic ?? 'AND',
        conditions: dto.conditions ?? [],
        actions: dto.actions ?? [],
        stopOnMatch: dto.stopOnMatch ?? false,
        runOnLoad: dto.runOnLoad ?? true,
      },
    });
  }

  async update(id: string, organizationId: string, dto: any) {
    const rule = await this.prisma.fieldRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.fieldRule.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    const rule = await this.prisma.fieldRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.prisma.fieldRule.delete({ where: { id } });
  }
}
