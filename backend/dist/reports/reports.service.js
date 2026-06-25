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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(orgId, userId, userRole) {
        const all = await this.prisma.savedReport.findMany({
            where: { organizationId: orgId },
            orderBy: { updatedAt: 'desc' },
        });
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
            return all;
        return all.filter(r => {
            if (r.createdById === userId)
                return true;
            if (r.isPublic)
                return true;
            const canView = r.canView || [];
            return canView.includes(userId);
        });
    }
    async create(orgId, userId, data) {
        const { name, description = '', moduleId, moduleName, moduleSlug = '', columns = [], filters = [], sortBy = '', sortDir = 'asc', groupBy = '', pageSize = 25, styling = {}, isPublic = false, canView = [], canEdit = [], rolesView = [], rolesEdit = [], } = data;
        return this.prisma.savedReport.create({
            data: {
                organizationId: orgId,
                createdById: userId,
                name,
                description,
                moduleId,
                moduleName,
                moduleSlug,
                columns,
                filters,
                sortBy,
                sortDir,
                groupBy,
                pageSize,
                styling,
                isPublic,
                canView,
                canEdit,
                rolesView,
                rolesEdit,
            },
        });
    }
    async findOne(id, orgId, userId, userRole) {
        const report = await this.prisma.savedReport.findFirst({ where: { id, organizationId: orgId } });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        this.assertViewAccess(report, userId, userRole);
        return report;
    }
    async update(id, orgId, userId, userRole, data) {
        const report = await this.prisma.savedReport.findFirst({ where: { id, organizationId: orgId } });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        this.assertEditAccess(report, userId, userRole);
        const allowed = [
            'name', 'description', 'columns', 'filters', 'sortBy', 'sortDir',
            'groupBy', 'pageSize', 'styling', 'isPublic', 'canView', 'canEdit', 'rolesView', 'rolesEdit',
        ];
        const patch = {};
        for (const key of allowed) {
            if (data[key] !== undefined)
                patch[key] = data[key];
        }
        return this.prisma.savedReport.update({ where: { id }, data: patch });
    }
    async remove(id, orgId, userId, userRole) {
        const report = await this.prisma.savedReport.findFirst({ where: { id, organizationId: orgId } });
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        this.assertEditAccess(report, userId, userRole);
        return this.prisma.savedReport.delete({ where: { id } });
    }
    assertViewAccess(report, userId, userRole) {
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole))
            return;
        if (report.createdById === userId)
            return;
        if (report.isPublic)
            return;
        if ((report.canView || []).includes(userId))
            return;
        throw new common_1.ForbiddenException('You do not have access to this report');
    }
    assertEditAccess(report, userId, userRole) {
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole))
            return;
        if (report.createdById === userId)
            return;
        if ((report.canEdit || []).includes(userId))
            return;
        throw new common_1.ForbiddenException('You do not have edit access to this report');
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map