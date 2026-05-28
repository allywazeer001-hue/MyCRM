"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalFieldService = exports.FIELD_TYPES = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
exports.FIELD_TYPES = [
    'text', 'textarea', 'number', 'boolean', 'date', 'datetime',
    'dropdown', 'multiselect', 'lookup', 'upload', 'formula', 'global-list', 'table',
];
let PortalFieldService = class PortalFieldService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listFields(orgId, moduleConfigId, pageId) {
        const where = { organizationId: orgId, status: 'ACTIVE' };
        if (moduleConfigId)
            where.portalModuleConfigId = moduleConfigId;
        if (pageId)
            where.portalPageId = pageId;
        return this.prisma.portalField.findMany({
            where,
            include: { section: { select: { id: true, label: true } } },
            orderBy: [{ sectionId: 'asc' }, { order: 'asc' }],
        });
    }
    async createField(orgId, dto) {
        const key = dto.fieldKey.trim().replace(/\s+/g, '_').toLowerCase();
        if (dto.portalPageId) {
            const existing = await this.prisma.portalField.findFirst({
                where: { portalPageId: dto.portalPageId, fieldKey: key, status: 'ACTIVE' },
            });
            if (existing)
                throw new common_1.BadRequestException(`Field key "${key}" already exists on this page`);
        }
        else if (dto.portalModuleConfigId) {
            const existing = await this.prisma.portalField.findFirst({
                where: { portalModuleConfigId: dto.portalModuleConfigId, fieldKey: key, status: 'ACTIVE' },
            });
            if (existing)
                throw new common_1.BadRequestException(`Field key "${key}" already exists in this module`);
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
    async updateField(orgId, fieldId, dto) {
        const field = await this.prisma.portalField.findFirst({ where: { id: fieldId, organizationId: orgId } });
        if (!field)
            throw new common_1.NotFoundException('Field not found');
        return this.prisma.portalField.update({
            where: { id: fieldId },
            data: dto,
            include: { section: { select: { id: true, label: true } } },
        });
    }
    async deleteField(orgId, fieldId) {
        const field = await this.prisma.portalField.findFirst({ where: { id: fieldId, organizationId: orgId } });
        if (!field)
            throw new common_1.NotFoundException('Field not found');
        await this.prisma.portalField.update({ where: { id: fieldId }, data: { status: 'ARCHIVED' } });
        return { success: true };
    }
    async reorderFields(orgId, orderedIds) {
        await Promise.all(orderedIds.map((id, index) => this.prisma.portalField.updateMany({
            where: { id, organizationId: orgId },
            data: { order: index },
        })));
        return { success: true };
    }
    async getFieldsWithValues(portalUserId) {
        const user = await this.prisma.portalUser.findUnique({
            where: { id: portalUserId },
            select: { organizationId: true, moduleId: true, recordId: true, customData: true },
        });
        if (!user?.moduleId)
            return { sections: [], orphanFields: [], record: null };
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
        if (!moduleConfig)
            return { sections: [], orphanFields: [], record: null };
        const crmData = record?.data ?? {};
        const customData = user.customData ?? {};
        const fieldsWithValues = moduleConfig.portalFields.map(f => ({
            ...f,
            value: f.mappedCrmFieldName ? crmData[f.mappedCrmFieldName] ?? null : customData[f.fieldKey] ?? null,
        }));
        const sectionMap = new Map(moduleConfig.portalSections.map(s => [s.id, { ...s, fields: [] }]));
        const orphanFields = [];
        for (const f of fieldsWithValues) {
            if (f.sectionId && sectionMap.has(f.sectionId)) {
                sectionMap.get(f.sectionId).fields.push(f);
            }
            else {
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
    async updateFieldValues(portalUserId, updates) {
        const user = await this.prisma.portalUser.findUnique({
            where: { id: portalUserId },
            select: { organizationId: true, moduleId: true, recordId: true, customData: true },
        });
        if (!user?.moduleId)
            throw new common_1.BadRequestException('No module linked to this portal user');
        const moduleConfig = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId: user.moduleId },
            include: {
                portalFields: {
                    where: { isEditable: true, isReadOnly: false, status: 'ACTIVE' },
                },
            },
        });
        if (!moduleConfig)
            throw new common_1.NotFoundException('Module config not found');
        const crmUpdates = {};
        const customUpdates = { ...(user.customData ?? {}) };
        for (const [key, value] of Object.entries(updates)) {
            const field = moduleConfig.portalFields.find(f => f.fieldKey === key);
            if (!field)
                continue;
            if (field.mappedCrmFieldName) {
                crmUpdates[field.mappedCrmFieldName] = value;
            }
            else {
                customUpdates[key] = value;
            }
        }
        const ops = [
            this.prisma.portalUser.update({
                where: { id: portalUserId },
                data: { customData: customUpdates },
            }),
        ];
        if (Object.keys(crmUpdates).length > 0 && user.recordId) {
            const rec = await this.prisma.record.findFirst({ where: { id: user.recordId, isDeleted: false } });
            if (rec) {
                ops.push(this.prisma.record.update({
                    where: { id: user.recordId },
                    data: { data: { ...rec.data, ...crmUpdates }, updatedAt: new Date() },
                }));
            }
        }
        await Promise.all(ops);
        return {
            updated: Object.keys(updates).map(fieldKey => ({ fieldKey, value: updates[fieldKey] })),
        };
    }
    async getCrmFieldsForModule(orgId, moduleId) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        return mod.fields.map(f => ({ name: f.name, label: f.label, type: f.type }));
    }
};
exports.PortalFieldService = PortalFieldService;
exports.PortalFieldService = PortalFieldService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalFieldService);
//# sourceMappingURL=portal-field.service.js.map