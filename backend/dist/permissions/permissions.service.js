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
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const DEFAULT_PERMISSIONS = {
    SUPER_ADMIN: { canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true, canPrint: true, canApprove: true, canManage: true, canFormBuilder: true, canDashboard: true, canAnalytics: true, canSettings: true },
    ADMIN: { canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true, canPrint: true, canApprove: true, canManage: true, canFormBuilder: true, canDashboard: true, canAnalytics: true, canSettings: true },
    MANAGER: { canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: true, canPrint: true, canApprove: true, canManage: false, canFormBuilder: false, canDashboard: true, canAnalytics: true, canSettings: false },
    USER: { canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: true, canPrint: true, canApprove: false, canManage: false, canFormBuilder: false, canDashboard: true, canAnalytics: true, canSettings: false },
    VIEWER: { canCreate: false, canRead: true, canUpdate: false, canDelete: false, canExport: false, canPrint: true, canApprove: false, canManage: false, canFormBuilder: false, canDashboard: true, canAnalytics: false, canSettings: false },
};
let PermissionsService = class PermissionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async setPermission(orgId, data) {
        return this.prisma.permission.upsert({
            where: {
                organizationId_role_moduleId: {
                    organizationId: orgId,
                    role: data.role,
                    moduleId: data.moduleId,
                },
            },
            create: { ...data, organizationId: orgId },
            update: data,
        });
    }
    async getPermissions(orgId, role, moduleId) {
        return this.prisma.permission.findMany({
            where: {
                organizationId: orgId,
                ...(role ? { role } : {}),
                ...(moduleId ? { moduleId } : {}),
            },
            include: { module: { select: { id: true, name: true, slug: true, icon: true } } },
        });
    }
    async getMatrix(orgId) {
        const [modules, permissions] = await Promise.all([
            this.prisma.dynamicModule.findMany({
                where: { organizationId: orgId, isActive: true },
                orderBy: { order: 'asc' },
                select: { id: true, name: true, slug: true, icon: true },
            }),
            this.prisma.permission.findMany({ where: { organizationId: orgId } }),
        ]);
        const roles = Object.keys(DEFAULT_PERMISSIONS);
        const matrix = {};
        for (const role of roles) {
            matrix[role] = {};
            for (const mod of modules) {
                const existing = permissions.find(p => p.role === role && p.moduleId === mod.id);
                matrix[role][mod.id] = existing || { ...DEFAULT_PERMISSIONS[role] };
            }
        }
        return { modules, roles, matrix };
    }
    async setBulkPermissions(orgId, role, permissions) {
        const results = await Promise.all(permissions.map(p => this.prisma.permission.upsert({
            where: { organizationId_role_moduleId: { organizationId: orgId, role, moduleId: p.moduleId } },
            create: { ...p, role, organizationId: orgId },
            update: p,
        })));
        return results;
    }
    async seedModulePermissions(orgId, moduleId) {
        const roles = Object.keys(DEFAULT_PERMISSIONS);
        await Promise.all(roles.map(role => this.prisma.permission.upsert({
            where: { organizationId_role_moduleId: { organizationId: orgId, role, moduleId } },
            create: { organizationId: orgId, role, moduleId, ...DEFAULT_PERMISSIONS[role] },
            update: {},
        })));
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map