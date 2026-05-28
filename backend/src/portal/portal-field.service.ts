import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const FIELD_TYPES = [
  'text', 'textarea', 'number', 'boolean', 'date', 'datetime',
  'dropdown', 'multiselect', 'lookup', 'upload', 'formula', 'global-list', 'table',
] as const;

@Injectable()
export class PortalFieldService {
  constructor(private prisma: PrismaService) {}

  async listFields(orgId: string, moduleConfigId?: string, pageId?: string) {
    const where: any = { organizationId: orgId, status: 'ACTIVE' };
    if (moduleConfigId) where.portalModuleConfigId = moduleConfigId;
    if (pageId) where.portalPageId = pageId;
    return this.prisma.portalField.findMany({
      where,
      include: { section: { select: { id: true, label: true } } },
      orderBy: [{ sectionId: 'asc' }, { order: 'asc' }],
    });
  }

  async createField(orgId: string, dto: {
    portalModuleConfigId?: string; portalPageId?: string; sectionId?: string; label: string;
    fieldKey: string; fieldType: string; placeholder?: string;
    defaultValue?: string; helpText?: string; options?: any[];
    isRequired?: boolean; isVisible?: boolean; isEditable?: boolean;
    isReadOnly?: boolean; isAdminOnly?: boolean;
    mappedCrmFieldName?: string; mappedCrmModuleSlug?: string; formula?: string; order?: number;
  }) {
    const key = dto.fieldKey.trim().replace(/\s+/g, '_').toLowerCase();
    if (dto.portalPageId) {
      const existing = await this.prisma.portalField.findFirst({
        where: { portalPageId: dto.portalPageId, fieldKey: key, status: 'ACTIVE' },
      });
      if (existing) throw new BadRequestException(`Field key "${key}" already exists on this page`);
    } else if (dto.portalModuleConfigId) {
      const existing = await this.prisma.portalField.findFirst({
        where: { portalModuleConfigId: dto.portalModuleConfigId, fieldKey: key, status: 'ACTIVE' },
      });
      if (existing) throw new BadRequestException(`Field key "${key}" already exists in this module`);
    }
    return this.prisma.portalField.create({
      data: {
        organizationId: orgId,
        portalModuleConfigId: dto.portalModuleConfigId ?? null,
        portalPageId: dto.portalPageId ?? null,
        sectionId: dto.sectionId ?? null,
        label: dto.label,
        fieldKey: key,
        fieldType: dto.fieldType,
        placeholder: dto.placeholder ?? null,
        defaultValue: dto.defaultValue ?? null,
        helpText: dto.helpText ?? null,
        options: dto.options ?? [],
        isRequired: dto.isRequired ?? false,
        isVisible: dto.isVisible ?? true,
        isEditable: dto.isEditable ?? true,
        isReadOnly: dto.isReadOnly ?? false,
        isAdminOnly: dto.isAdminOnly ?? false,
        mappedCrmFieldName: dto.mappedCrmFieldName ?? null,
        mappedCrmModuleSlug: dto.mappedCrmModuleSlug ?? null,
        formula: dto.formula ?? null,
        order: dto.order ?? 0,
      },
      include: { section: { select: { id: true, label: true } } },
    });
  }

  async updateField(orgId: string, fieldId: string, dto: Partial<{
    label: string; placeholder: string; defaultValue: string; helpText: string;
    options: any[]; isRequired: boolean; isVisible: boolean; isEditable: boolean;
    isReadOnly: boolean; isAdminOnly: boolean; sectionId: string | null;
    mappedCrmFieldName: string | null; mappedCrmModuleSlug: string | null;
    formula: string | null; order: number;
  }>) {
    const field = await this.prisma.portalField.findFirst({ where: { id: fieldId, organizationId: orgId } });
    if (!field) throw new NotFoundException('Field not found');
    return this.prisma.portalField.update({
      where: { id: fieldId },
      data: dto as any,
      include: { section: { select: { id: true, label: true } } },
    });
  }

  async deleteField(orgId: string, fieldId: string) {
    const field = await this.prisma.portalField.findFirst({ where: { id: fieldId, organizationId: orgId } });
    if (!field) throw new NotFoundException('Field not found');
    await this.prisma.portalField.update({ where: { id: fieldId }, data: { status: 'ARCHIVED' } });
    return { success: true };
  }

  async reorderFields(orgId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.portalField.updateMany({
          where: { id, organizationId: orgId },
          data: { order: index },
        })
      )
    );
    return { success: true };
  }

  // ── Portal user data access ────────────────────────────────────────────────

  async getFieldsWithValues(portalUserId: string) {
    const user = await this.prisma.portalUser.findUnique({
      where: { id: portalUserId },
      select: { organizationId: true, moduleId: true, recordId: true, customData: true },
    });
    if (!user?.moduleId) return { sections: [], orphanFields: [], record: null };

    const [moduleConfig, record] = await Promise.all([
      this.prisma.portalModuleConfig.findUnique({
        where: { moduleId: user.moduleId },
        include: {
          portalSections: {
            where: { isVisible: true, status: 'PUBLISHED' },
            orderBy: { order: 'asc' },
          },
          portalFields: {
            where: { isVisible: true, isAdminOnly: false, status: 'ACTIVE' },
            orderBy: { order: 'asc' },
          },
        },
      }),
      user.recordId
        ? this.prisma.record.findFirst({ where: { id: user.recordId, isDeleted: false } })
        : null,
    ]);

    if (!moduleConfig) return { sections: [], orphanFields: [], record: null };

    const crmData = (record?.data as Record<string, any>) ?? {};
    const customData = (user.customData as Record<string, any>) ?? {};

    const fieldsWithValues = moduleConfig.portalFields.map(f => ({
      ...f,
      value: f.mappedCrmFieldName ? crmData[f.mappedCrmFieldName] ?? null : customData[f.fieldKey] ?? null,
    }));

    const sectionMap = new Map(moduleConfig.portalSections.map(s => [s.id, { ...s, fields: [] as any[] }]));
    const orphanFields: any[] = [];

    for (const f of fieldsWithValues) {
      if (f.sectionId && sectionMap.has(f.sectionId)) {
        sectionMap.get(f.sectionId)!.fields.push(f);
      } else {
        orphanFields.push(f);
      }
    }

    return {
      sections: Array.from(sectionMap.values()),
      orphanFields,
      record,
      portalLabel: moduleConfig.portalLabel,
    };
  }

  async updateFieldValues(portalUserId: string, updates: Record<string, any>) {
    const user = await this.prisma.portalUser.findUnique({
      where: { id: portalUserId },
      select: { organizationId: true, moduleId: true, recordId: true, customData: true },
    });
    if (!user?.moduleId) throw new BadRequestException('No module linked to this portal user');

    const moduleConfig = await this.prisma.portalModuleConfig.findUnique({
      where: { moduleId: user.moduleId },
      include: {
        portalFields: {
          where: { isEditable: true, isReadOnly: false, status: 'ACTIVE' },
        },
      },
    });
    if (!moduleConfig) throw new NotFoundException('Module config not found');

    const crmUpdates: Record<string, any> = {};
    const customUpdates: Record<string, any> = { ...((user.customData as any) ?? {}) };

    for (const [key, value] of Object.entries(updates)) {
      const field = moduleConfig.portalFields.find(f => f.fieldKey === key);
      if (!field) continue;
      if (field.mappedCrmFieldName) {
        crmUpdates[field.mappedCrmFieldName] = value;
      } else {
        customUpdates[key] = value;
      }
    }

    const ops: Promise<any>[] = [
      this.prisma.portalUser.update({
        where: { id: portalUserId },
        data: { customData: customUpdates },
      }),
    ];

    if (Object.keys(crmUpdates).length > 0 && user.recordId) {
      const rec = await this.prisma.record.findFirst({ where: { id: user.recordId, isDeleted: false } });
      if (rec) {
        ops.push(
          this.prisma.record.update({
            where: { id: user.recordId },
            data: { data: { ...(rec.data as any), ...crmUpdates }, updatedAt: new Date() },
          })
        );
      }
    }

    await Promise.all(ops);
    return {
      updated: Object.keys(updates).map(fieldKey => ({ fieldKey, value: updates[fieldKey] })),
    };
  }

  // ── CRM field list (for mapping UI) ───────────────────────────────────────

  async getCrmFieldsForModule(orgId: string, moduleId: string) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
    if (!mod) throw new NotFoundException('Module not found');
    return mod.fields.map(f => ({ name: f.name, label: f.label, type: f.type }));
  }
}
