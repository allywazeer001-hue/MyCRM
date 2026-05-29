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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DepartmentsService = class DepartmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(orgId) {
        return this.prisma.department.findMany({
            where: { organizationId: orgId },
            include: {
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, orgId) {
        const dept = await this.prisma.department.findFirst({
            where: { id, organizationId: orgId },
            include: {
                _count: { select: { users: true } },
                users: {
                    select: {
                        id: true, firstName: true, lastName: true,
                        email: true, role: true, isActive: true, avatar: true,
                    },
                },
            },
        });
        if (!dept)
            throw new common_1.NotFoundException('Department not found');
        return dept;
    }
    async create(orgId, data) {
        const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const exists = await this.prisma.department.findFirst({
            where: { slug, organizationId: orgId },
        });
        if (exists)
            throw new common_1.ConflictException('Department with this name already exists');
        return this.prisma.department.create({
            data: {
                name: data.name,
                slug,
                description: data.description,
                color: data.color || '#3b82f6',
                organizationId: orgId,
            },
            include: { _count: { select: { users: true } } },
        });
    }
    async update(id, orgId, data) {
        await this.findOne(id, orgId);
        const patch = {};
        if (data.name !== undefined) {
            patch.name = data.name;
            patch.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
        if (data.description !== undefined)
            patch.description = data.description;
        if (data.color !== undefined)
            patch.color = data.color;
        if (data.permissions !== undefined)
            patch.permissions = data.permissions;
        return this.prisma.department.update({
            where: { id },
            data: patch,
            include: { _count: { select: { users: true } } },
        });
    }
    async remove(id, orgId) {
        await this.findOne(id, orgId);
        await this.prisma.user.updateMany({
            where: { departmentId: id },
            data: { departmentId: null },
        });
        return this.prisma.department.delete({ where: { id } });
    }
    async getMembers(id, orgId) {
        const dept = await this.findOne(id, orgId);
        return dept.users;
    }
    async addMember(deptId, orgId, userId) {
        await this.findOne(deptId, orgId);
        return this.prisma.user.update({
            where: { id: userId },
            data: { departmentId: deptId },
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
        });
    }
    async removeMember(deptId, orgId, userId) {
        await this.findOne(deptId, orgId);
        return this.prisma.user.update({
            where: { id: userId },
            data: { departmentId: null },
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
        });
    }
    async getPermissions(id, orgId) {
        const dept = await this.findOne(id, orgId);
        const modules = await this.prisma.dynamicModule.findMany({
            where: { organizationId: orgId, isActive: true },
            select: { id: true, name: true, slug: true, icon: true, color: true },
            orderBy: { name: 'asc' },
        });
        const stored = dept.permissions || {};
        const systemStored = stored.system || {};
        const modulesStored = stored.modules || {};
        const systemPermission = {
            id: null,
            moduleId: null,
            departmentId: id,
            canDashboard: systemStored.canDashboard ?? true,
            canAnalytics: systemStored.canAnalytics ?? false,
            canWorkflow: systemStored.canWorkflow ?? false,
            canForms: systemStored.canForms ?? false,
            canStudio: systemStored.canStudio ?? false,
            canView: true, canCreate: true, canEdit: true, canDelete: true,
            canExport: false, canImport: false, canPrint: false,
        };
        const modulePermissions = modules.map(mod => {
            const mp = modulesStored[mod.id] || {};
            return {
                module: mod,
                permission: {
                    id: null,
                    moduleId: mod.id,
                    departmentId: id,
                    canView: mp.canView ?? true,
                    canCreate: mp.canCreate ?? false,
                    canEdit: mp.canEdit ?? false,
                    canDelete: mp.canDelete ?? false,
                    canExport: mp.canExport ?? false,
                    canImport: mp.canImport ?? false,
                    canPrint: mp.canPrint ?? false,
                    canStudio: false, canAnalytics: false, canWorkflow: false,
                    canForms: false, canDashboard: false,
                },
            };
        });
        return { systemPermission, modulePermissions };
    }
    async updatePermissions(id, orgId, body) {
        await this.findOne(id, orgId);
        const permsArray = Array.isArray(body.permissions) ? body.permissions : [];
        const stored = { system: {}, modules: {} };
        for (const perm of permsArray) {
            if (perm.moduleId === null || perm.moduleId === undefined) {
                stored.system = {
                    canDashboard: perm.canDashboard ?? true,
                    canAnalytics: perm.canAnalytics ?? false,
                    canWorkflow: perm.canWorkflow ?? false,
                    canForms: perm.canForms ?? false,
                    canStudio: perm.canStudio ?? false,
                };
            }
            else {
                stored.modules[perm.moduleId] = {
                    canView: perm.canView ?? true,
                    canCreate: perm.canCreate ?? false,
                    canEdit: perm.canEdit ?? false,
                    canDelete: perm.canDelete ?? false,
                    canExport: perm.canExport ?? false,
                    canImport: perm.canImport ?? false,
                    canPrint: perm.canPrint ?? false,
                };
            }
        }
        return this.prisma.department.update({
            where: { id },
            data: { permissions: stored },
            include: { _count: { select: { users: true } } },
        });
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map