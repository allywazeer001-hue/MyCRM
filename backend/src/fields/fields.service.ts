import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FieldsService {
  constructor(private prisma: PrismaService) {}

  async create(moduleId: string, orgId: string, data: any) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Module not found');

    const maxOrder = await this.prisma.field.aggregate({ where: { moduleId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? -1) + 1;

    const { options, ...fieldData } = data;
    // Serialize object fields to JSON strings for LongText columns
    const JSON_FIELDS = ['settings', 'validation', 'conditionalLogic'];
    for (const key of JSON_FIELDS) {
      if (key in fieldData && typeof fieldData[key] === 'object' && fieldData[key] !== null) {
        fieldData[key] = JSON.stringify(fieldData[key]);
      }
    }
    const field = await this.prisma.field.create({
      data: { ...fieldData, moduleId, order },
    });

    if (options?.length) {
      await this.prisma.fieldOption.createMany({
        data: options.map((opt: any, i: number) => ({ ...opt, fieldId: field.id, order: i })),
      });
    }

    return this.prisma.field.findUnique({ where: { id: field.id }, include: { options: true } });
  }

  async findByModule(moduleId: string, orgId: string) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.prisma.field.findMany({
      where: { moduleId, isActive: true },
      include: { options: true },
      orderBy: { order: 'asc' },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const field = await this.prisma.field.findFirst({
      where: { id },
      include: { module: true },
    });
    if (!field || field.module.organizationId !== orgId) throw new NotFoundException('Field not found');

    // options handling: replaceExisting controls whether to replace or append
    const { options, replaceExisting, ...fieldData } = data;

    // Serialize object fields to JSON strings for LongText columns
    const JSON_FIELDS = ['settings', 'validation', 'conditionalLogic'];
    for (const key of JSON_FIELDS) {
      if (key in fieldData && typeof fieldData[key] === 'object' && fieldData[key] !== null) {
        fieldData[key] = JSON.stringify(fieldData[key]);
      }
    }
    if (options !== undefined) {
      if (replaceExisting !== false) {
        // Default: replace all options
        await this.prisma.fieldOption.deleteMany({ where: { fieldId: id } });
        if (options?.length) {
          await this.prisma.fieldOption.createMany({
            data: options.map((opt: any, i: number) => ({ ...opt, fieldId: id, order: i })),
          });
        }
      } else {
        // Append mode: preserve existing, add new ones after
        const maxOrder = await this.prisma.fieldOption.aggregate({ where: { fieldId: id }, _max: { order: true } });
        const startOrder = (maxOrder._max.order ?? -1) + 1;
        if (options?.length) {
          await this.prisma.fieldOption.createMany({
            data: options.map((opt: any, i: number) => ({ ...opt, fieldId: id, order: startOrder + i })),
          });
        }
      }
    }

    return this.prisma.field.update({ where: { id }, data: fieldData, include: { options: true } });
  }

  async reorder(moduleId: string, orgId: string, fieldIds: string[]) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Module not found');

    await Promise.all(
      fieldIds.map((fId, index) => this.prisma.field.update({ where: { id: fId }, data: { order: index } }))
    );
    return { success: true };
  }

  async remove(id: string, orgId: string) {
    const field = await this.prisma.field.findFirst({ where: { id }, include: { module: true } });
    if (!field || field.module.organizationId !== orgId) throw new NotFoundException('Field not found');
    return this.prisma.field.update({ where: { id }, data: { isActive: false } });
  }
}
