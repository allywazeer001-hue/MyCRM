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
exports.PermissionCheckService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const SYSTEM_ALL_ON = {
    canDashboard: true, canAnalytics: true, canWorkflow: true, canForms: true, canStudio: true,
};
const MODULE_ALL_ON = {
    canView: true, canCreate: true, canEdit: true, canDelete: true,
    canExport: true, canImport: true, canPrint: true,
};
let PermissionCheckService = class PermissionCheckService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async isSuperAdmin(userId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true },
        });
        return user?.role === 'SUPER_ADMIN';
    }
    async resolveUserPermissions(userId, orgId) {
        const userRole = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true },
        });
        if (userRole?.role === 'SUPER_ADMIN') {
            return {
                isAdmin: true,
                isSuperAdmin: true,
                system: { ...SYSTEM_ALL_ON },
                modules: { isSuperAdmin: true },
            };
        }
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { id: true, role: true, departmentId: true },
        });
        if (!user)
            return { isAdmin: false, system: { ...SYSTEM_ALL_ON, canAnalytics: false, canWorkflow: false, canForms: false, canStudio: false }, modules: {} };
        const isAdmin = user.role === 'ADMIN';
        const modules = await this.prisma.dynamicModule.findMany({
            where: { organizationId: orgId, isActive: true },
            select: { id: true, slug: true },
        });
        let baseSystem;
        let baseMods;
        if (isAdmin && user.departmentId) {
            const dept = await this.prisma.department.findFirst({
                where: { id: user.departmentId, organizationId: orgId },
                select: { permissions: true },
            });
            const stored = dept?.permissions || {};
            const ss = stored.system || {};
            const ms = stored.modules || {};
            baseSystem = {
                canDashboard: ss.canDashboard ?? true,
                canAnalytics: ss.canAnalytics ?? true,
                canWorkflow: ss.canWorkflow ?? true,
                canForms: ss.canForms ?? true,
                canStudio: ss.canStudio ?? true,
            };
            baseMods = Object.fromEntries(modules.map(m => {
                const mp = ms[m.id] || {};
                return [m.slug, {
                        canView: mp.canView ?? true,
                        canCreate: mp.canCreate ?? true,
                        canEdit: mp.canEdit ?? true,
                        canDelete: mp.canDelete ?? true,
                        canExport: mp.canExport ?? true,
                        canImport: mp.canImport ?? true,
                        canPrint: mp.canPrint ?? true,
                    }];
            }));
        }
        else if (isAdmin) {
            baseSystem = { ...SYSTEM_ALL_ON };
            baseMods = Object.fromEntries(modules.map(m => [m.slug, { ...MODULE_ALL_ON }]));
        }
        else if (!user.departmentId) {
            baseSystem = { canDashboard: true, canAnalytics: false, canWorkflow: false, canForms: false, canStudio: false };
            baseMods = Object.fromEntries(modules.map(m => [m.slug, {
                    canView: true, canCreate: false, canEdit: false, canDelete: false,
                    canExport: false, canImport: false, canPrint: false,
                }]));
        }
        else {
            const dept = await this.prisma.department.findFirst({
                where: { id: user.departmentId, organizationId: orgId },
                select: { permissions: true },
            });
            const stored = dept?.permissions || {};
            const ss = stored.system || {};
            const ms = stored.modules || {};
            baseSystem = {
                canDashboard: ss.canDashboard ?? true,
                canAnalytics: ss.canAnalytics ?? false,
                canWorkflow: ss.canWorkflow ?? false,
                canForms: ss.canForms ?? false,
                canStudio: ss.canStudio ?? false,
            };
            baseMods = Object.fromEntries(modules.map(m => {
                const mp = ms[m.id] || {};
                return [m.slug, {
                        canView: mp.canView ?? true,
                        canCreate: mp.canCreate ?? false,
                        canEdit: mp.canEdit ?? false,
                        canDelete: mp.canDelete ?? false,
                        canExport: mp.canExport ?? false,
                        canImport: mp.canImport ?? false,
                        canPrint: mp.canPrint ?? false,
                    }];
            }));
        }
        const now = new Date();
        const overrides = await this.prisma.userPermissionOverride.findMany({
            where: {
                userId, organizationId: orgId, isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
        });
        for (const o of overrides) {
            if (o.moduleSlug) {
                if (!baseMods[o.moduleSlug])
                    baseMods[o.moduleSlug] = { ...MODULE_ALL_ON };
                const m = baseMods[o.moduleSlug];
                if (o.canView !== null)
                    m.canView = o.canView;
                if (o.canCreate !== null)
                    m.canCreate = o.canCreate;
                if (o.canEdit !== null)
                    m.canEdit = o.canEdit;
                if (o.canDelete !== null)
                    m.canDelete = o.canDelete;
                if (o.canExport !== null)
                    m.canExport = o.canExport;
                if (o.canImport !== null)
                    m.canImport = o.canImport;
                if (o.canPrint !== null)
                    m.canPrint = o.canPrint;
            }
            else {
                if (o.canDashboard !== null)
                    baseSystem.canDashboard = o.canDashboard;
                if (o.canAnalytics !== null)
                    baseSystem.canAnalytics = o.canAnalytics;
                if (o.canWorkflow !== null)
                    baseSystem.canWorkflow = o.canWorkflow;
                if (o.canForms !== null)
                    baseSystem.canForms = o.canForms;
                if (o.canStudio !== null)
                    baseSystem.canStudio = o.canStudio;
            }
        }
        return { isAdmin, system: baseSystem, modules: baseMods };
    }
    async canViewResource(userId, _orgId, resource) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true, departmentId: true },
        });
        if (!user)
            return false;
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')
            return true;
        if (resource.createdById === userId)
            return true;
        if (resource.isPublic)
            return true;
        const sharedUsers = asArray(resource.sharedUsers);
        const sharedRoles = asArray(resource.sharedRoles);
        const sharedDepartments = asArray(resource.sharedDepartments);
        const hasRestrictions = sharedUsers.length > 0 || sharedRoles.length > 0 || sharedDepartments.length > 0;
        if (!hasRestrictions)
            return true;
        if (sharedUsers.includes(userId))
            return true;
        if (sharedRoles.includes(user.role))
            return true;
        if (user.departmentId && sharedDepartments.includes(user.departmentId))
            return true;
        return false;
    }
    async enforceCanEditResource(userId, _orgId, resource) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true },
        });
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN')
            return;
        if (resource.createdById === userId)
            return;
        throw new common_1.ForbiddenException('You do not have permission to manage this resource');
    }
    async getUserUnit(userId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true, departmentId: true },
        });
        if (!user || user.role === 'SUPER_ADMIN')
            return null;
        if (user.role === 'ADMIN')
            return user.departmentId ?? null;
        return null;
    }
    async checkModulePermById(userId, orgId, moduleId, action) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true },
        });
        if (!user)
            return false;
        if (user.role === 'SUPER_ADMIN')
            return true;
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId },
            select: { slug: true },
        });
        if (!mod)
            return false;
        const perms = await this.resolveUserPermissions(userId, orgId);
        return perms.modules[mod.slug]?.[action] ?? false;
    }
    async enforceModulePerm(userId, orgId, moduleId, action) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            select: { role: true },
        });
        if (user?.role === 'SUPER_ADMIN')
            return;
        const allowed = await this.checkModulePermById(userId, orgId, moduleId, action);
        if (!allowed)
            throw new common_1.ForbiddenException(`Permission denied: ${action}`);
    }
};
exports.PermissionCheckService = PermissionCheckService;
exports.PermissionCheckService = PermissionCheckService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionCheckService);
function asArray(value) {
    if (Array.isArray(value))
        return value.filter(v => typeof v === 'string');
    return [];
}
//# sourceMappingURL=permission-check.service.js.map