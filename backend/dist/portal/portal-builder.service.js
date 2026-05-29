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
exports.PortalBuilderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PortalBuilderService = class PortalBuilderService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPages(orgId) {
        return this.prisma.portalPage.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPage(orgId, pageId) {
        const page = await this.prisma.portalPage.findFirst({ where: { id: pageId, organizationId: orgId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        return page;
    }
    async getPageFull(orgId, pageId) {
        const page = await this.prisma.portalPage.findFirst({
            where: { id: pageId, organizationId: orgId },
            include: {
                sections: {
                    orderBy: [{ columnIndex: 'asc' }, { order: 'asc' }],
                    include: {
                        fields: {
                            where: { status: { not: 'ARCHIVED' } },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        return page;
    }
    async republishPage(orgId, pageId) {
        const page = await this.prisma.portalPage.findFirst({ where: { id: pageId, organizationId: orgId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        const sections = await this.prisma.portalSection.findMany({
            where: { portalPageId: pageId, organizationId: orgId },
            select: { id: true },
        });
        const sectionIds = sections.map(s => s.id);
        await this.prisma.portalSection.updateMany({
            where: { portalPageId: pageId, organizationId: orgId },
            data: { status: 'PUBLISHED' },
        });
        if (sectionIds.length > 0) {
            await this.prisma.portalField.updateMany({
                where: { sectionId: { in: sectionIds }, organizationId: orgId },
                data: { status: 'ACTIVE' },
            });
        }
        return this.prisma.portalPage.update({
            where: { id: pageId },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
        });
    }
    async getPublishedPageFull(orgId, slug) {
        const page = await this.prisma.portalPage.findUnique({
            where: { organizationId_slug: { organizationId: orgId, slug } },
            include: {
                sections: {
                    where: { isVisible: true, isAdminOnly: false, status: 'PUBLISHED' },
                    orderBy: [{ columnIndex: 'asc' }, { order: 'asc' }],
                    include: {
                        fields: {
                            where: { isVisible: true, isAdminOnly: false, status: 'ACTIVE' },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });
        if (!page || page.status !== 'PUBLISHED')
            throw new common_1.NotFoundException('Page not found');
        return page;
    }
    async createPage(orgId, dto) {
        const slug = dto.slug || dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const existing = await this.prisma.portalPage.findUnique({
            where: { organizationId_slug: { organizationId: orgId, slug } },
        });
        if (existing)
            throw new common_1.BadRequestException('A page with this slug already exists');
        return this.prisma.portalPage.create({
            data: {
                organizationId: orgId,
                title: dto.title,
                slug,
                description: dto.description,
                icon: dto.icon,
                accessTypes: dto.accessTypes ?? [],
                layoutTemplate: dto.layoutTemplate ?? 'single',
                status: 'DRAFT',
                blocks: [],
            },
        });
    }
    async updatePage(orgId, pageId, dto) {
        const page = await this.prisma.portalPage.findFirst({ where: { id: pageId, organizationId: orgId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        const data = { ...dto };
        if (dto.status === 'PUBLISHED' && page.status !== 'PUBLISHED') {
            data.publishedAt = new Date();
        }
        return this.prisma.portalPage.update({ where: { id: pageId }, data });
    }
    async deletePage(orgId, pageId) {
        const page = await this.prisma.portalPage.findFirst({ where: { id: pageId, organizationId: orgId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        await this.prisma.portalPage.delete({ where: { id: pageId } });
        return { success: true };
    }
    async listMenuItems(orgId) {
        const items = await this.prisma.portalMenuItem.findMany({
            where: { organizationId: orgId },
            orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
        });
        return this.buildMenuTree(items);
    }
    buildMenuTree(items) {
        const roots = items.filter(i => !i.parentId);
        return roots.map(root => ({
            ...root,
            children: items.filter(i => i.parentId === root.id).sort((a, b) => a.order - b.order),
        }));
    }
    async saveMenuItems(orgId, items) {
        await this.prisma.portalMenuItem.deleteMany({ where: { organizationId: orgId } });
        const childRows = [];
        for (const item of items) {
            const parent = await this.prisma.portalMenuItem.create({
                data: {
                    organizationId: orgId,
                    label: item.label,
                    icon: item.icon,
                    type: item.type,
                    target: item.target,
                    order: item.order,
                    isVisible: item.isVisible,
                    accessTypes: item.accessTypes ?? [],
                },
            });
            if (item.children) {
                for (const child of item.children) {
                    childRows.push({
                        organizationId: orgId,
                        label: child.label,
                        icon: child.icon,
                        type: child.type,
                        target: child.target,
                        order: child.order,
                        isVisible: child.isVisible,
                        accessTypes: child.accessTypes ?? [],
                        parentId: parent.id,
                    });
                }
            }
        }
        if (childRows.length > 0) {
            await this.prisma.portalMenuItem.createMany({ data: childRows });
        }
        return this.listMenuItems(orgId);
    }
    async listAnnouncements(orgId) {
        return this.prisma.portalAnnouncement.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createAnnouncement(orgId, dto) {
        return this.prisma.portalAnnouncement.create({
            data: {
                organizationId: orgId,
                title: dto.title,
                body: dto.body,
                type: dto.type ?? 'general',
                targetTypes: dto.targetTypes ?? [],
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                isPublished: dto.isPublished ?? false,
                publishedAt: new Date(),
            },
        });
    }
    async updateAnnouncement(orgId, announcementId, dto) {
        const ann = await this.prisma.portalAnnouncement.findFirst({
            where: { id: announcementId, organizationId: orgId },
        });
        if (!ann)
            throw new common_1.NotFoundException('Announcement not found');
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.body !== undefined)
            data.body = dto.body;
        if (dto.type !== undefined)
            data.type = dto.type;
        if (dto.targetTypes !== undefined)
            data.targetTypes = dto.targetTypes;
        if (dto.isPublished !== undefined) {
            data.isPublished = dto.isPublished;
            if (dto.isPublished && !ann.isPublished)
                data.publishedAt = new Date();
        }
        if ('scheduledAt' in dto)
            data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
        if ('expiresAt' in dto)
            data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
        return this.prisma.portalAnnouncement.update({ where: { id: announcementId }, data });
    }
    async deleteAnnouncement(orgId, announcementId) {
        const ann = await this.prisma.portalAnnouncement.findFirst({
            where: { id: announcementId, organizationId: orgId },
        });
        if (!ann)
            throw new common_1.NotFoundException('Announcement not found');
        await this.prisma.portalAnnouncement.delete({ where: { id: announcementId } });
        return { success: true };
    }
    async broadcastNotification(orgId, dto) {
        const portalUsers = await this.prisma.portalUser.findMany({
            where: { organizationId: orgId, accountStatus: 'ACTIVE' },
            select: { id: true },
        });
        if (portalUsers.length === 0)
            return { sent: 0 };
        await this.prisma.portalNotification.createMany({
            data: portalUsers.map(u => ({
                portalUserId: u.id,
                title: dto.title,
                body: dto.body,
                type: 'announcement',
            })),
        });
        return { sent: portalUsers.length };
    }
    async addMenuItem(orgId, dto) {
        const parentIdVal = dto.parentId ?? null;
        const siblings = await this.prisma.portalMenuItem.findMany({
            where: { organizationId: orgId, parentId: parentIdVal },
            orderBy: { order: 'desc' }, take: 1,
        });
        const nextOrder = siblings.length > 0 ? siblings[0].order + 1 : 0;
        let target = dto.target ?? null;
        if (dto.autoCreatePage) {
            const raw = dto.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            let slug = raw;
            let attempt = 0;
            while (true) {
                const exists = await this.prisma.portalPage.findUnique({
                    where: { organizationId_slug: { organizationId: orgId, slug } },
                });
                if (!exists)
                    break;
                attempt++;
                slug = `${raw}-${attempt}`;
            }
            const page = await this.prisma.portalPage.create({
                data: { organizationId: orgId, title: dto.label, slug, status: 'DRAFT', blocks: [], accessTypes: [] },
            });
            target = `/portal/pages/${page.slug}`;
        }
        return this.prisma.portalMenuItem.create({
            data: {
                organizationId: orgId,
                label: dto.label,
                icon: dto.icon ?? null,
                type: dto.type ?? 'page',
                target,
                parentId: parentIdVal,
                order: nextOrder,
                isVisible: dto.isVisible ?? true,
                accessTypes: dto.accessTypes ?? [],
            },
        });
    }
    async updateMenuItem(orgId, itemId, dto) {
        const item = await this.prisma.portalMenuItem.findFirst({ where: { id: itemId, organizationId: orgId } });
        if (!item)
            throw new common_1.NotFoundException('Menu item not found');
        const { autoCreatePage: _, ...safeDto } = dto;
        return this.prisma.portalMenuItem.update({ where: { id: itemId }, data: safeDto });
    }
    async deleteMenuItem(orgId, itemId) {
        const item = await this.prisma.portalMenuItem.findFirst({ where: { id: itemId, organizationId: orgId } });
        if (!item)
            throw new common_1.NotFoundException('Menu item not found');
        await this.prisma.portalMenuItem.deleteMany({ where: { parentId: itemId, organizationId: orgId } });
        await this.prisma.portalMenuItem.delete({ where: { id: itemId } });
        return { success: true };
    }
    async reorderMenuItems(orgId, orderedIds) {
        await Promise.all(orderedIds.map((id, index) => this.prisma.portalMenuItem.updateMany({ where: { id, organizationId: orgId }, data: { order: index } })));
        return this.listMenuItems(orgId);
    }
    async listCrmModules(orgId) {
        return this.prisma.dynamicModule.findMany({
            where: { organizationId: orgId, isActive: true },
            select: { id: true, name: true, slug: true, icon: true, color: true },
            orderBy: { name: 'asc' },
        });
    }
    async getCrmModuleFields(orgId, moduleId) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        return mod.fields.map(f => ({ id: f.id, name: f.name, label: f.label, type: f.type }));
    }
    async detectRelatedModules(orgId, moduleId) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const outboundLookups = await this.prisma.field.findMany({
            where: { moduleId, isActive: true, lookupModuleId: { not: null } },
        });
        const inboundLookups = await this.prisma.field.findMany({
            where: { module: { organizationId: orgId }, lookupModuleId: moduleId, isActive: true },
            include: { module: { select: { id: true, name: true, slug: true, icon: true } } },
        });
        const relatedModuleIds = new Set();
        for (const f of outboundLookups) {
            if (f.lookupModuleId)
                relatedModuleIds.add(f.lookupModuleId);
        }
        for (const f of inboundLookups) {
            relatedModuleIds.add(f.moduleId);
        }
        const relatedModules = await Promise.all(Array.from(relatedModuleIds)
            .filter(id => id !== moduleId)
            .map(async (relId) => {
            const relMod = await this.prisma.dynamicModule.findFirst({
                where: { id: relId, organizationId: orgId, isActive: true },
                select: { id: true, name: true, slug: true, icon: true, color: true },
            });
            if (!relMod)
                return null;
            const linkField = outboundLookups.find(f => f.lookupModuleId === relId)
                ?? inboundLookups.find(f => f.moduleId === relId);
            return {
                ...relMod,
                relationField: linkField?.name ?? null,
                relationLabel: linkField?.label ?? null,
                direction: outboundLookups.find(f => f.lookupModuleId === relId) ? 'outbound' : 'inbound',
            };
        }));
        return {
            primary: { id: mod.id, name: mod.name, slug: mod.slug },
            related: relatedModules.filter(Boolean),
        };
    }
    async suggestSectionsFromModule(orgId, moduleId) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const structural = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN', 'DROPDOWN', 'MULTI_SELECT', 'EMAIL', 'PHONE'];
        const fileFields = mod.fields.filter(f => f.type === 'FILE');
        const lookupFields = mod.fields.filter(f => f.type === 'LOOKUP');
        const regularFields = mod.fields.filter(f => structural.includes(f.type));
        const sections = [];
        if (regularFields.length > 0) {
            sections.push({
                label: `${mod.name} Information`,
                sectionType: 'primary',
                moduleSlug: mod.slug,
                moduleId: mod.id,
                fields: regularFields.map(f => ({
                    id: f.id, name: f.name, label: f.label, type: f.type.toLowerCase(),
                })),
            });
        }
        if (fileFields.length > 0) {
            sections.push({
                label: `${mod.name} Documents`,
                sectionType: 'documents',
                moduleSlug: mod.slug,
                moduleId: mod.id,
                fields: fileFields.map(f => ({
                    id: f.id, name: f.name, label: f.label, type: 'upload',
                })),
            });
        }
        if (lookupFields.length > 0) {
            for (const lf of lookupFields) {
                if (!lf.lookupModuleId)
                    continue;
                const lookupMod = await this.prisma.dynamicModule.findFirst({
                    where: { id: lf.lookupModuleId, organizationId: orgId },
                    include: { fields: { where: { isActive: true, type: { in: ['TEXT', 'DROPDOWN', 'DATE', 'NUMBER'] } }, orderBy: { order: 'asc' }, take: 5 } },
                });
                if (!lookupMod)
                    continue;
                sections.push({
                    label: `${lookupMod.name}`,
                    sectionType: 'related',
                    moduleSlug: lookupMod.slug,
                    moduleId: lookupMod.id,
                    relationField: lf.name,
                    fields: lookupMod.fields.map(f => ({
                        id: f.id, name: f.name, label: f.label, type: f.type.toLowerCase(),
                    })),
                });
            }
        }
        return sections;
    }
    async createSectionFromModule(orgId, pageId, dto) {
        const page = await this.prisma.portalPage.findFirst({ where: { id: pageId, organizationId: orgId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: dto.moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const siblings = await this.prisma.portalSection.findMany({
            where: { portalPageId: pageId }, orderBy: { order: 'desc' }, take: 1,
        });
        const nextOrder = siblings.length > 0 ? siblings[0].order + 1 : 0;
        const section = await this.prisma.portalSection.create({
            data: {
                organizationId: orgId,
                label: dto.label,
                columnIndex: dto.columnIndex ?? 0,
                order: nextOrder,
                isCollapsible: false,
                portalPageId: pageId,
                crmModuleSlug: dto.moduleSlug,
                crmRelationField: dto.relationField ?? null,
                crmSectionType: dto.sectionType ?? 'primary',
            },
        });
        const crmTypeToPortal = {
            TEXT: 'text', TEXTAREA: 'textarea', NUMBER: 'number', DATE: 'date',
            DATETIME: 'datetime', BOOLEAN: 'boolean', DROPDOWN: 'dropdown',
            MULTI_SELECT: 'multiselect', FILE: 'upload', LOOKUP: 'lookup',
            EMAIL: 'text', PHONE: 'text',
        };
        const selectedFields = dto.fieldIds.length > 0
            ? mod.fields.filter(f => dto.fieldIds.includes(f.id))
            : mod.fields.slice(0, 8);
        for (let i = 0; i < selectedFields.length; i++) {
            const f = selectedFields[i];
            await this.prisma.portalField.create({
                data: {
                    organizationId: orgId,
                    label: f.label,
                    fieldKey: `${dto.moduleSlug}_${f.name}_${Date.now()}${i}`,
                    fieldType: crmTypeToPortal[f.type] ?? 'text',
                    isEditable: true,
                    isVisible: true,
                    order: i,
                    sectionId: section.id,
                    portalPageId: pageId,
                    mappedCrmFieldName: f.name,
                    mappedCrmModuleSlug: dto.moduleSlug,
                },
            });
        }
        const created = await this.prisma.portalSection.findFirst({
            where: { id: section.id },
            include: { fields: { orderBy: { order: 'asc' } } },
        });
        return created;
    }
    async setPagePrimaryModule(orgId, pageId, dto) {
        const page = await this.prisma.portalPage.findFirst({ where: { id: pageId, organizationId: orgId } });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        return this.prisma.portalPage.update({
            where: { id: pageId },
            data: { primaryModuleId: dto.primaryModuleId, primaryModuleSlug: dto.primaryModuleSlug },
        });
    }
    async mapPortalFieldToCrm(orgId, portalFieldId, dto) {
        const pf = await this.prisma.portalField.findFirst({ where: { id: portalFieldId, organizationId: orgId } });
        if (!pf)
            throw new common_1.NotFoundException('Portal field not found');
        return this.prisma.portalField.update({
            where: { id: portalFieldId },
            data: { mappedCrmFieldName: dto.crmFieldName, mappedCrmModuleSlug: dto.crmModuleSlug },
        });
    }
    async unmapPortalField(orgId, portalFieldId) {
        const pf = await this.prisma.portalField.findFirst({ where: { id: portalFieldId, organizationId: orgId } });
        if (!pf)
            throw new common_1.NotFoundException('Portal field not found');
        return this.prisma.portalField.update({
            where: { id: portalFieldId },
            data: { mappedCrmFieldName: null, mappedCrmModuleSlug: null },
        });
    }
    async createCrmFieldAndMap(orgId, portalFieldId, dto) {
        const pf = await this.prisma.portalField.findFirst({ where: { id: portalFieldId, organizationId: orgId } });
        if (!pf)
            throw new common_1.NotFoundException('Portal field not found');
        const mod = await this.prisma.dynamicModule.findFirst({ where: { id: dto.moduleId, organizationId: orgId } });
        if (!mod)
            throw new common_1.NotFoundException('CRM module not found');
        const fieldName = dto.fieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const crmTypeMap = {
            text: 'TEXT', textarea: 'TEXTAREA', number: 'NUMBER', date: 'DATE',
            datetime: 'DATETIME', boolean: 'BOOLEAN', dropdown: 'DROPDOWN',
            multiselect: 'MULTI_SELECT', upload: 'FILE',
        };
        const existing = await this.prisma.field.findFirst({ where: { moduleId: dto.moduleId, name: fieldName } });
        const finalName = existing ? `${fieldName}_${Date.now()}` : fieldName;
        const crmField = await this.prisma.field.create({
            data: {
                moduleId: dto.moduleId,
                name: finalName,
                label: dto.fieldLabel,
                type: crmTypeMap[dto.fieldType] ?? 'TEXT',
                isActive: true,
                order: 9999,
            },
        });
        const updated = await this.prisma.portalField.update({
            where: { id: portalFieldId },
            data: { mappedCrmFieldName: crmField.name, mappedCrmModuleSlug: mod.slug },
        });
        return { portalField: updated, crmField };
    }
    async duplicatePage(orgId, pageId) {
        const page = await this.prisma.portalPage.findFirst({
            where: { id: pageId, organizationId: orgId },
            include: {
                sections: {
                    orderBy: [{ columnIndex: 'asc' }, { order: 'asc' }],
                    include: { fields: { orderBy: { order: 'asc' } } },
                },
            },
        });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        const baseSlug = `${page.slug}-copy`;
        let slug = baseSlug;
        let attempt = 1;
        while (await this.prisma.portalPage.findFirst({ where: { organizationId: orgId, slug } })) {
            slug = `${baseSlug}-${attempt++}`;
        }
        const newPage = await this.prisma.portalPage.create({
            data: {
                organizationId: orgId,
                title: `${page.title} (Copy)`,
                slug,
                description: page.description,
                icon: page.icon,
                layoutTemplate: page.layoutTemplate,
                status: 'DRAFT',
                blocks: page.blocks ?? [],
                accessTypes: page.accessTypes ?? [],
            },
        });
        for (const section of page.sections) {
            const newSection = await this.prisma.portalSection.create({
                data: {
                    organizationId: orgId,
                    label: section.label,
                    order: section.order,
                    columnIndex: section.columnIndex,
                    isCollapsible: section.isCollapsible,
                    isVisible: section.isVisible,
                    isAdminOnly: section.isAdminOnly,
                    status: section.status,
                    portalPageId: newPage.id,
                },
            });
            for (const field of section.fields) {
                await this.prisma.portalField.create({
                    data: {
                        organizationId: orgId,
                        label: field.label,
                        fieldKey: field.fieldKey,
                        fieldType: field.fieldType,
                        placeholder: field.placeholder,
                        helpText: field.helpText,
                        isRequired: field.isRequired,
                        isEditable: field.isEditable,
                        isReadOnly: field.isReadOnly,
                        isVisible: field.isVisible,
                        isAdminOnly: field.isAdminOnly,
                        options: field.options ?? [],
                        order: field.order,
                        status: field.status,
                        sectionId: newSection.id,
                        portalPageId: newPage.id,
                    },
                });
            }
        }
        return newPage;
    }
    async listTemplates(orgId) {
        return this.prisma.portalTemplate.findMany({
            where: { OR: [{ organizationId: orgId }, { isBuiltIn: true }] },
            orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
            select: { id: true, name: true, description: true, category: true, thumbnail: true, isBuiltIn: true, createdAt: true },
        });
    }
    pageToSnapshot(page) {
        return {
            title: page.title,
            slug: page.slug,
            description: page.description,
            icon: page.icon,
            layoutTemplate: page.layoutTemplate ?? 'single',
            primaryModuleSlug: page.primaryModuleSlug ?? null,
            sections: (page.sections ?? []).map((s) => ({
                label: s.label,
                columnIndex: s.columnIndex ?? 0,
                order: s.order ?? 0,
                isCollapsible: s.isCollapsible ?? false,
                crmModuleSlug: s.crmModuleSlug ?? null,
                crmRelationField: s.crmRelationField ?? null,
                crmSectionType: s.crmSectionType ?? null,
                fields: (s.fields ?? []).map((f) => ({
                    label: f.label,
                    fieldKey: f.fieldKey,
                    fieldType: f.fieldType,
                    placeholder: f.placeholder ?? null,
                    helpText: f.helpText ?? null,
                    isRequired: f.isRequired ?? false,
                    isEditable: f.isEditable ?? true,
                    isReadOnly: f.isReadOnly ?? false,
                    options: f.options ?? [],
                    order: f.order ?? 0,
                    mappedCrmFieldName: f.mappedCrmFieldName ?? null,
                    mappedCrmModuleSlug: f.mappedCrmModuleSlug ?? null,
                })),
            })),
        };
    }
    async saveTemplate(orgId, dto) {
        let snapshot = dto.snapshot ?? { pages: [], menus: [] };
        if (!dto.snapshot && dto.includeAllPages) {
            const allPages = await this.prisma.portalPage.findMany({
                where: { organizationId: orgId },
                include: { sections: { include: { fields: { orderBy: { order: 'asc' } } }, orderBy: [{ columnIndex: 'asc' }, { order: 'asc' }] } },
                orderBy: { createdAt: 'asc' },
            });
            snapshot.pages = allPages.map(p => this.pageToSnapshot(p));
        }
        else if (dto.pageId) {
            const page = await this.prisma.portalPage.findFirst({
                where: { id: dto.pageId, organizationId: orgId },
                include: { sections: { include: { fields: { orderBy: { order: 'asc' } } }, orderBy: [{ columnIndex: 'asc' }, { order: 'asc' }] } },
            });
            if (page)
                snapshot.pages = [this.pageToSnapshot(page)];
        }
        if (dto.includeMenus) {
            const menus = await this.prisma.portalMenuItem.findMany({
                where: { organizationId: orgId },
                orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
            });
            snapshot.menus = menus.map(m => ({
                label: m.label, icon: m.icon, type: m.type, target: m.target,
                order: m.order, isVisible: m.isVisible, parentLabel: null,
                _parentId: m.parentId,
            }));
        }
        return this.prisma.portalTemplate.create({
            data: {
                organizationId: orgId,
                name: dto.name,
                description: dto.description ?? null,
                category: dto.category ?? 'custom',
                snapshot,
                isBuiltIn: false,
            },
        });
    }
    async applyTemplate(orgId, templateId) {
        const tpl = await this.prisma.portalTemplate.findFirst({
            where: { id: templateId, OR: [{ organizationId: orgId }, { isBuiltIn: true }] },
        });
        if (!tpl)
            throw new common_1.NotFoundException('Template not found');
        const snapshot = tpl.snapshot;
        const created = [];
        for (const pageDef of (snapshot.pages ?? [])) {
            let slug = (pageDef.slug ?? pageDef.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            let attempt = 0;
            while (await this.prisma.portalPage.findFirst({ where: { organizationId: orgId, slug } })) {
                slug = `${slug.replace(/-\d+$/, '')}-${++attempt}`;
            }
            const page = await this.prisma.portalPage.create({
                data: {
                    organizationId: orgId,
                    title: pageDef.title,
                    slug,
                    description: pageDef.description ?? null,
                    icon: pageDef.icon ?? null,
                    layoutTemplate: pageDef.layoutTemplate ?? 'single',
                    status: 'DRAFT',
                    blocks: [],
                    accessTypes: [],
                    primaryModuleSlug: pageDef.primaryModuleSlug ?? null,
                },
            });
            for (const secDef of (pageDef.sections ?? [])) {
                const section = await this.prisma.portalSection.create({
                    data: {
                        organizationId: orgId,
                        label: secDef.label,
                        columnIndex: secDef.columnIndex ?? 0,
                        order: secDef.order ?? 0,
                        isCollapsible: secDef.isCollapsible ?? false,
                        portalPageId: page.id,
                        crmModuleSlug: secDef.crmModuleSlug ?? null,
                        crmRelationField: secDef.crmRelationField ?? null,
                        crmSectionType: secDef.crmSectionType ?? null,
                    },
                });
                for (const fDef of (secDef.fields ?? [])) {
                    await this.prisma.portalField.create({
                        data: {
                            organizationId: orgId,
                            label: fDef.label,
                            fieldKey: fDef.fieldKey ?? `${fDef.fieldType}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                            fieldType: fDef.fieldType ?? 'text',
                            placeholder: fDef.placeholder ?? null,
                            helpText: fDef.helpText ?? null,
                            isRequired: fDef.isRequired ?? false,
                            isEditable: fDef.isEditable ?? true,
                            isReadOnly: fDef.isReadOnly ?? false,
                            options: fDef.options ?? [],
                            order: fDef.order ?? 0,
                            sectionId: section.id,
                            portalPageId: page.id,
                            mappedCrmFieldName: fDef.mappedCrmFieldName ?? null,
                            mappedCrmModuleSlug: fDef.mappedCrmModuleSlug ?? null,
                        },
                    });
                }
            }
            created.push(page);
        }
        if ((snapshot.menus ?? []).length > 0) {
            const menuDefs = snapshot.menus;
            const roots = menuDefs.filter(m => !m._parentId);
            for (const m of roots) {
                const siblings = await this.prisma.portalMenuItem.findMany({
                    where: { organizationId: orgId, parentId: null },
                    orderBy: { order: 'desc' }, take: 1,
                });
                const nextOrder = siblings.length > 0 ? siblings[0].order + 1 : 0;
                await this.prisma.portalMenuItem.create({
                    data: {
                        organizationId: orgId,
                        label: m.label,
                        icon: m.icon ?? null,
                        type: m.type ?? 'page',
                        target: m.target ?? null,
                        order: nextOrder,
                        isVisible: m.isVisible ?? true,
                        accessTypes: [],
                    },
                });
            }
        }
        return { applied: created.length, pages: created };
    }
    async deleteTemplate(orgId, templateId) {
        const tpl = await this.prisma.portalTemplate.findFirst({ where: { id: templateId, organizationId: orgId, isBuiltIn: false } });
        if (!tpl)
            throw new common_1.NotFoundException('Template not found or cannot delete built-in');
        return this.prisma.portalTemplate.delete({ where: { id: templateId } });
    }
    async getPublicMenuItems(orgId) {
        const items = await this.prisma.portalMenuItem.findMany({
            where: { organizationId: orgId, isVisible: true },
            orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
        });
        return this.buildMenuTree(items);
    }
    async getPublishedPage(orgId, slug) {
        const page = await this.prisma.portalPage.findUnique({
            where: { organizationId_slug: { organizationId: orgId, slug } },
        });
        if (!page || page.status !== 'PUBLISHED')
            throw new common_1.NotFoundException('Page not found');
        return page;
    }
    async getPublishedAnnouncements(orgId, portalType) {
        const now = new Date();
        const all = await this.prisma.portalAnnouncement.findMany({
            where: {
                organizationId: orgId,
                isPublished: true,
                AND: [
                    { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                    { OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
                ],
            },
            orderBy: { publishedAt: 'desc' },
        });
        if (!portalType)
            return all;
        return all.filter((a) => {
            const types = Array.isArray(a.targetTypes) ? a.targetTypes : [];
            return types.length === 0 || types.includes(portalType);
        });
    }
};
exports.PortalBuilderService = PortalBuilderService;
exports.PortalBuilderService = PortalBuilderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalBuilderService);
//# sourceMappingURL=portal-builder.service.js.map