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
exports.DashboardsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const permission_check_service_1 = require("../permissions/permission-check.service");
let DashboardsService = class DashboardsService {
    constructor(prisma, perm) {
        this.prisma = prisma;
        this.perm = perm;
    }
    pickWritable(data) {
        const out = {};
        for (const key of ['name', 'description', 'config', 'isPublic', 'isDefault', 'sharedRoles', 'sharedDepartments', 'sharedUsers']) {
            if (data[key] !== undefined)
                out[key] = data[key];
        }
        return out;
    }
    async findAll(userId, orgId) {
        const dashboards = await this.prisma.dashboard.findMany({
            where: { organizationId: orgId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
        const visible = [];
        for (const d of dashboards) {
            if (await this.perm.canViewResource(userId, orgId, d)) {
                visible.push(d);
            }
        }
        return visible;
    }
    async findOne(id, userId, orgId) {
        const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId } });
        if (!d)
            throw new common_1.NotFoundException('Dashboard not found');
        const allowed = await this.perm.canViewResource(userId, orgId, d);
        if (!allowed)
            throw new common_1.ForbiddenException('You do not have access to this dashboard');
        return d;
    }
    async create(userId, orgId, data) {
        const existing = await this.prisma.dashboard.count({ where: { organizationId: orgId, createdById: userId } });
        const writable = this.pickWritable(data);
        return this.prisma.dashboard.create({
            data: {
                name: writable.name ?? 'Untitled Dashboard',
                description: writable.description ?? null,
                config: writable.config ?? {},
                isPublic: writable.isPublic ?? false,
                isDefault: writable.isDefault ?? existing === 0,
                sharedRoles: writable.sharedRoles ?? [],
                sharedDepartments: writable.sharedDepartments ?? [],
                sharedUsers: writable.sharedUsers ?? [],
                organizationId: orgId,
                createdById: userId,
            },
        });
    }
    async update(id, userId, orgId, data) {
        const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId } });
        if (!d)
            throw new common_1.NotFoundException('Dashboard not found');
        await this.perm.enforceCanEditResource(userId, orgId, d);
        const writable = this.pickWritable(data);
        if (writable.isDefault === true) {
            await this.prisma.dashboard.updateMany({
                where: { organizationId: orgId, isDefault: true },
                data: { isDefault: false },
            });
        }
        return this.prisma.dashboard.update({ where: { id }, data: writable });
    }
    async remove(id, userId, orgId) {
        const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId } });
        if (!d)
            throw new common_1.NotFoundException('Dashboard not found');
        await this.perm.enforceCanEditResource(userId, orgId, d);
        await this.prisma.dashboard.delete({ where: { id } });
        return { ok: true };
    }
};
exports.DashboardsService = DashboardsService;
exports.DashboardsService = DashboardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_check_service_1.PermissionCheckService])
], DashboardsService);
//# sourceMappingURL=dashboards.service.js.map