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
exports.PortalModuleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const portal_auth_service_1 = require("./portal-auth.service");
let PortalModuleService = class PortalModuleService {
    constructor(prisma, authService) {
        this.prisma = prisma;
        this.authService = authService;
    }
    async listModuleConfigs(organizationId) {
        const [modules, configs] = await Promise.all([
            this.prisma.dynamicModule.findMany({
                where: { organizationId, isActive: true },
                orderBy: { order: 'asc' },
                select: { id: true, name: true, slug: true, icon: true, color: true },
            }),
            this.prisma.portalModuleConfig.findMany({
                where: { organizationId },
                include: { fieldMappings: { orderBy: { order: 'asc' } } },
            }),
        ]);
        const configMap = new Map(configs.map(c => [c.moduleId, c]));
        return modules.map(mod => ({
            module: mod,
            config: configMap.get(mod.id) ?? null,
            isEnabled: configMap.get(mod.id)?.isEnabled ?? false,
            mappingCount: configMap.get(mod.id)?.fieldMappings?.length ?? 0,
        }));
    }
    async getModuleConfig(organizationId, moduleId) {
        await this.assertModuleOwnership(organizationId, moduleId);
        const config = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId },
            include: { fieldMappings: { orderBy: { order: 'asc' } } },
        });
        const module = await this.prisma.dynamicModule.findUnique({
            where: { id: moduleId },
            include: {
                fields: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { options: true } },
            },
        });
        return { config, module };
    }
    async upsertModuleConfig(organizationId, moduleId, dto) {
        await this.assertModuleOwnership(organizationId, moduleId);
        const mod = await this.prisma.dynamicModule.findUnique({ where: { id: moduleId }, select: { name: true } });
        return this.prisma.portalModuleConfig.upsert({
            where: { moduleId },
            create: {
                organizationId,
                moduleId,
                portalLabel: dto.portalLabel ?? `${mod?.name} Portal`,
                portalType: dto.portalType ?? 'standard',
                isEnabled: dto.isEnabled ?? true,
                menuItems: dto.menuItems ?? [],
                dashboardLayout: dto.dashboardLayout ?? {},
                theme: dto.theme ?? {},
            },
            update: {
                ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
                ...(dto.portalLabel && { portalLabel: dto.portalLabel }),
                ...(dto.portalType && { portalType: dto.portalType }),
                ...(dto.menuItems !== undefined && { menuItems: dto.menuItems }),
                ...(dto.dashboardLayout !== undefined && { dashboardLayout: dto.dashboardLayout }),
                ...(dto.theme !== undefined && { theme: dto.theme }),
            },
            include: { fieldMappings: { orderBy: { order: 'asc' } } },
        });
    }
    async saveFieldMappings(organizationId, moduleId, mappings) {
        await this.assertModuleOwnership(organizationId, moduleId);
        let config = await this.prisma.portalModuleConfig.findUnique({ where: { moduleId } });
        if (!config) {
            const mod = await this.prisma.dynamicModule.findUnique({ where: { id: moduleId }, select: { name: true } });
            config = await this.prisma.portalModuleConfig.create({
                data: { organizationId, moduleId, portalLabel: `${mod?.name} Portal`, isEnabled: true },
            });
        }
        await this.prisma.portalFieldMapping.deleteMany({ where: { portalModuleConfigId: config.id } });
        if (mappings.length > 0) {
            await this.prisma.portalFieldMapping.createMany({
                data: mappings.map((m, i) => ({
                    portalModuleConfigId: config.id,
                    crmFieldName: m.crmFieldName,
                    portalFieldName: m.portalFieldName,
                    displayLabel: m.displayLabel,
                    isIdentity: m.isIdentity ?? false,
                    isEditable: m.isEditable ?? false,
                    isVisible: m.isVisible ?? true,
                    order: m.order ?? i,
                })),
            });
        }
        return this.prisma.portalModuleConfig.findUnique({
            where: { moduleId },
            include: { fieldMappings: { orderBy: { order: 'asc' } } },
        });
    }
    async createPortalUserFromRecord(organizationId, recordId) {
        const record = await this.prisma.record.findFirst({
            where: { id: recordId, organizationId, isDeleted: false },
        });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        const existing = await this.prisma.portalUser.findFirst({
            where: { recordId, organizationId },
        });
        if (existing) {
            return { existed: true, user: this.authService.sanitize(existing) };
        }
        const config = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId: record.moduleId },
            include: { fieldMappings: { where: { isIdentity: true }, orderBy: { order: 'asc' } } },
        });
        if (!config || !config.isEnabled) {
            throw new common_1.BadRequestException('Portal is not enabled for this module. Enable it in Settings → Portal Settings first.');
        }
        const data = record.data;
        const mapped = {};
        for (const fm of config.fieldMappings) {
            const val = data[fm.crmFieldName];
            if (val !== null && val !== undefined && String(val).trim()) {
                mapped[fm.portalFieldName] = String(val).trim();
            }
        }
        if (!mapped['email']) {
            throw new common_1.BadRequestException('No email field is mapped as identity. Configure field mappings in Portal Settings first.');
        }
        if (!mapped['firstName'] && !mapped['lastName']) {
            throw new common_1.BadRequestException('No first/last name field is mapped as identity. Configure field mappings in Portal Settings first.');
        }
        const user = await this.authService.autoCreateUser({
            email: mapped['email'],
            firstName: mapped['firstName'] || 'Portal',
            lastName: mapped['lastName'] || 'User',
            phone: mapped['phone'],
            type: this.inferUserType(config.portalType),
            organizationId,
            moduleId: record.moduleId,
            recordId,
        });
        return { existed: false, user };
    }
    async getRecordPortalStatus(organizationId, recordId) {
        const [config, portalUser] = await Promise.all([
            this.prisma.record.findFirst({
                where: { id: recordId, organizationId, isDeleted: false },
                select: { moduleId: true },
            }).then(r => r ? this.prisma.portalModuleConfig.findUnique({
                where: { moduleId: r.moduleId },
                select: { isEnabled: true, portalLabel: true, portalType: true },
            }) : null),
            this.prisma.portalUser.findFirst({
                where: { recordId, organizationId },
                select: { id: true, email: true, firstName: true, lastName: true, accountStatus: true, lastLoginAt: true },
            }),
        ]);
        return { portalEnabled: config?.isEnabled ?? false, portalLabel: config?.portalLabel, portalUser };
    }
    async syncRecordToPortal(organizationId, recordId) {
        const record = await this.prisma.record.findFirst({
            where: { id: recordId, organizationId, isDeleted: false },
        });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        const portalUser = await this.prisma.portalUser.findFirst({ where: { recordId, organizationId } });
        if (!portalUser)
            return { synced: false, message: 'No portal user linked to this record' };
        const config = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId: record.moduleId },
            include: { fieldMappings: { where: { isIdentity: true } } },
        });
        if (!config)
            return { synced: false, message: 'No portal config for this module' };
        const data = record.data;
        const update = {};
        for (const fm of config.fieldMappings) {
            const val = data[fm.crmFieldName];
            if (val !== null && val !== undefined) {
                if (fm.portalFieldName === 'firstName')
                    update.firstName = String(val).trim();
                else if (fm.portalFieldName === 'lastName')
                    update.lastName = String(val).trim();
                else if (fm.portalFieldName === 'phone')
                    update.phone = String(val).trim();
            }
        }
        if (Object.keys(update).length === 0)
            return { synced: false, message: 'No identity fields to sync' };
        await this.prisma.portalUser.update({ where: { id: portalUser.id }, data: update });
        return { synced: true, updated: Object.keys(update) };
    }
    async getVisibleMappings(moduleId) {
        const config = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId },
            include: { fieldMappings: { where: { isVisible: true }, orderBy: { order: 'asc' } } },
        });
        return config;
    }
    async getEditableMappings(moduleId) {
        const config = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId },
            include: { fieldMappings: { where: { isEditable: true }, orderBy: { order: 'asc' } } },
        });
        return config?.fieldMappings ?? [];
    }
    async assertModuleOwnership(organizationId, moduleId) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
    }
    inferUserType(portalType) {
        const map = {
            academic: 'student', medical: 'patient', hr: 'employee',
            crm: 'client', vendor: 'vendor', member: 'member',
        };
        return map[portalType] ?? 'member';
    }
};
exports.PortalModuleService = PortalModuleService;
exports.PortalModuleService = PortalModuleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        portal_auth_service_1.PortalAuthService])
], PortalModuleService);
//# sourceMappingURL=portal-module.service.js.map