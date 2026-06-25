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
exports.IndustrySetupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const index_1 = require("./blueprints/index");
let IndustrySetupService = class IndustrySetupService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getBlueprintList() {
        return index_1.BLUEPRINT_LIST;
    }
    getBlueprintPreview(key) {
        const bp = index_1.ALL_BLUEPRINTS[key];
        if (!bp)
            throw new common_1.BadRequestException(`Blueprint "${key}" not found`);
        return {
            key: bp.key,
            industry: bp.industry,
            description: bp.description,
            icon: bp.icon,
            color: bp.color,
            moduleCount: bp.modules.length,
            fieldCount: bp.modules.reduce((s, m) => s + m.fields.length, 0),
            workflowCount: bp.workflows.length,
            departmentCount: bp.departments.length,
            modules: bp.modules.map(m => ({
                name: m.name, icon: m.icon, color: m.color,
                fieldCount: m.fields.length,
            })),
            workflows: bp.workflows.map(w => ({ name: w.name, trigger: w.trigger })),
            departments: bp.departments.map(d => ({ name: d.name, color: d.color })),
        };
    }
    async getSetupStatus(orgId) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        const settings = org?.settings ?? {};
        return {
            setupCompleted: !!settings.setupCompleted,
            industry: settings.industry ?? null,
            mode: settings.setupMode ?? null,
        };
    }
    async install(orgId, industryKey, mode) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        const settings = org?.settings ?? {};
        if (settings.setupCompleted) {
            throw new common_1.ConflictException('Industry setup has already been completed for this organization');
        }
        if (mode === 'scratch') {
            await this.markSetupComplete(orgId, 'scratch', null);
            return { success: true, mode: 'scratch', created: {} };
        }
        const blueprint = index_1.ALL_BLUEPRINTS[industryKey];
        if (!blueprint)
            throw new common_1.BadRequestException(`Blueprint "${industryKey}" not found`);
        const log = [];
        const created = {
            modules: [],
            fields: 0,
            workflows: [],
            departments: [],
        };
        for (const dept of blueprint.departments) {
            try {
                await this.prisma.department.upsert({
                    where: { slug_organizationId: { slug: dept.slug, organizationId: orgId } },
                    update: {},
                    create: {
                        name: dept.name,
                        slug: dept.slug,
                        color: dept.color,
                        description: dept.description ?? null,
                        organizationId: orgId,
                    },
                });
                created.departments.push(dept.name);
                log.push(`✓ Department: ${dept.name}`);
            }
            catch {
                log.push(`  Skipped (exists): ${dept.name}`);
            }
        }
        const moduleIdMap = {};
        for (let mi = 0; mi < blueprint.modules.length; mi++) {
            const mod = blueprint.modules[mi];
            const slug = mod.slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const existing = await this.prisma.dynamicModule.findFirst({
                where: { organizationId: orgId, slug },
            });
            let moduleId;
            if (existing) {
                moduleId = existing.id;
                log.push(`  Module exists, using: ${mod.name}`);
            }
            else {
                const created_mod = await this.prisma.dynamicModule.create({
                    data: {
                        name: mod.name,
                        slug,
                        description: mod.description ?? null,
                        icon: mod.icon,
                        color: mod.color,
                        order: mi,
                        isActive: true,
                        settings: {},
                        organizationId: orgId,
                    },
                });
                moduleId = created_mod.id;
                created.modules.push(mod.name);
                log.push(`✓ Module: ${mod.name}`);
            }
            moduleIdMap[mod.slug] = moduleId;
            const fieldCount = await this.createFields(moduleId, orgId, mod.fields, moduleIdMap);
            created.fields += fieldCount;
            log.push(`  → ${fieldCount} fields configured`);
        }
        for (const wf of blueprint.workflows) {
            const moduleId = moduleIdMap[wf.moduleSlug];
            if (!moduleId) {
                log.push(`  Skipped workflow (module not found): ${wf.name}`);
                continue;
            }
            try {
                await this.prisma.workflow.create({
                    data: {
                        name: wf.name,
                        description: wf.description ?? null,
                        trigger: wf.trigger,
                        triggerConfig: {},
                        conditions: [],
                        isActive: wf.isActive ?? true,
                        tags: [],
                        moduleId,
                        organizationId: orgId,
                        actions: {
                            create: wf.actions.map(a => ({
                                type: a.type,
                                config: a.config,
                                order: a.order,
                                recipientUsers: [],
                                recipientDepts: [],
                            })),
                        },
                    },
                });
                created.workflows.push(wf.name);
                log.push(`✓ Workflow: ${wf.name}`);
            }
            catch (e) {
                log.push(`  Skipped workflow: ${wf.name}`);
            }
        }
        const moduleIds = Object.values(moduleIdMap);
        const lookupFields = await this.prisma.field.findMany({
            where: { type: 'LOOKUP', moduleId: { in: moduleIds } },
            include: { module: { select: { name: true } } },
        });
        for (const field of lookupFields) {
            const toModuleId = field.settings?.lookupModuleId;
            if (!toModuleId)
                continue;
            const toMod = await this.prisma.dynamicModule.findUnique({
                where: { id: toModuleId }, select: { name: true },
            });
            if (!toMod)
                continue;
            try {
                await this.prisma.relationship.create({
                    data: {
                        name: `${field.module.name} → ${toMod.name}`,
                        type: 'MANY_TO_ONE',
                        fromModuleId: field.moduleId,
                        toModuleId,
                        fromFieldId: field.id,
                        organizationId: orgId,
                    },
                });
                log.push(`✓ Relationship: ${field.module.name} → ${toMod.name}`);
            }
            catch {
                log.push(`  Skipped relationship (exists): ${field.label}`);
            }
        }
        await this.markSetupComplete(orgId, 'blueprint', industryKey);
        log.push(`✓ Setup complete`);
        return { success: true, mode: 'blueprint', industry: industryKey, created, log };
    }
    async syncBlueprintFields(orgId) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        const settings = org?.settings ?? {};
        const industryKey = settings.industry;
        if (!industryKey)
            throw new common_1.BadRequestException('No blueprint installed for this organization');
        const blueprint = index_1.ALL_BLUEPRINTS[industryKey];
        if (!blueprint)
            throw new common_1.BadRequestException(`Blueprint "${industryKey}" not found`);
        const log = [];
        let totalAdded = 0;
        const moduleIdMap = {};
        for (const mod of blueprint.modules) {
            const slug = mod.slug.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const existing = await this.prisma.dynamicModule.findFirst({
                where: { organizationId: orgId, slug },
            });
            if (existing)
                moduleIdMap[mod.slug] = existing.id;
        }
        for (const mod of blueprint.modules) {
            const moduleId = moduleIdMap[mod.slug];
            if (!moduleId) {
                log.push(`  Module not found: ${mod.name}`);
                continue;
            }
            const added = await this.createFields(moduleId, orgId, mod.fields, moduleIdMap);
            totalAdded += added;
            if (added > 0)
                log.push(`✓ Added ${added} field(s) to: ${mod.name}`);
            else
                log.push(`  No new fields for: ${mod.name}`);
        }
        const moduleIds = Object.values(moduleIdMap);
        const lookupFields = await this.prisma.field.findMany({
            where: { type: 'LOOKUP', moduleId: { in: moduleIds } },
            include: { module: { select: { name: true } } },
        });
        let relationshipsAdded = 0;
        for (const field of lookupFields) {
            const toModuleId = field.settings?.lookupModuleId;
            if (!toModuleId)
                continue;
            const toMod = await this.prisma.dynamicModule.findUnique({
                where: { id: toModuleId }, select: { name: true },
            });
            if (!toMod)
                continue;
            const exists = await this.prisma.relationship.findFirst({
                where: { fromModuleId: field.moduleId, toModuleId, fromFieldId: field.id, organizationId: orgId },
            });
            if (exists)
                continue;
            try {
                await this.prisma.relationship.create({
                    data: {
                        name: `${field.module.name} → ${toMod.name}`,
                        type: 'MANY_TO_ONE',
                        fromModuleId: field.moduleId,
                        toModuleId,
                        fromFieldId: field.id,
                        organizationId: orgId,
                    },
                });
                relationshipsAdded++;
                log.push(`✓ Relationship: ${field.module.name} → ${toMod.name}`);
            }
            catch { }
        }
        return {
            success: true,
            industry: industryKey,
            fieldsAdded: totalAdded,
            relationshipsAdded,
            log,
        };
    }
    async createFields(moduleId, orgId, fields, moduleIdMap = {}) {
        let count = 0;
        const existingCount = await this.prisma.field.count({ where: { moduleId } });
        for (let i = 0; i < fields.length; i++) {
            const f = fields[i];
            const fieldName = f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const exists = await this.prisma.field.findFirst({
                where: { moduleId, name: fieldName },
            });
            if (exists)
                continue;
            try {
                const resolvedSettings = { ...(f.settings ?? {}) };
                if (f.type === 'LOOKUP' && resolvedSettings.lookupModuleSlug) {
                    const targetId = moduleIdMap[resolvedSettings.lookupModuleSlug];
                    if (targetId)
                        resolvedSettings.lookupModuleId = targetId;
                    delete resolvedSettings.lookupModuleSlug;
                }
                const createdField = await this.prisma.field.create({
                    data: {
                        name: fieldName,
                        label: f.label,
                        type: f.type,
                        order: existingCount + i,
                        isRequired: f.isRequired ?? false,
                        isUnique: f.isUnique ?? false,
                        isReadonly: false,
                        isHidden: false,
                        isActive: true,
                        placeholder: f.placeholder ?? null,
                        helpText: f.helpText ?? null,
                        defaultValue: f.defaultValue ?? null,
                        settings: resolvedSettings,
                        moduleId,
                    },
                });
                if (f.options?.length) {
                    await this.prisma.fieldOption.createMany({
                        data: f.options.map((opt, oi) => ({
                            fieldId: createdField.id,
                            label: opt.label,
                            value: opt.value,
                            color: opt.color ?? '#64748b',
                            order: oi,
                        })),
                        skipDuplicates: true,
                    });
                }
                count++;
            }
            catch { }
        }
        return count;
    }
    async markSetupComplete(orgId, mode, industry) {
        const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
        const settings = (org?.settings ?? {});
        await this.prisma.organization.update({
            where: { id: orgId },
            data: {
                settings: {
                    ...settings,
                    setupCompleted: true,
                    setupMode: mode,
                    industry: industry,
                },
            },
        });
    }
};
exports.IndustrySetupService = IndustrySetupService;
exports.IndustrySetupService = IndustrySetupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndustrySetupService);
//# sourceMappingURL=industry-setup.service.js.map