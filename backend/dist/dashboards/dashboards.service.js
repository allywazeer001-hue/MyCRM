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
let DashboardsService = class DashboardsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(orgId, userId, data) {
        return this.prisma.dashboard.create({ data: { ...data, organizationId: orgId, createdById: userId } });
    }
    async findAll(orgId) {
        return this.prisma.dashboard.findMany({ where: { organizationId: orgId }, include: { widgets: true } });
    }
    async findOne(id, orgId) {
        const d = await this.prisma.dashboard.findFirst({ where: { id, organizationId: orgId }, include: { widgets: { orderBy: { order: 'asc' } } } });
        if (!d)
            throw new common_1.NotFoundException('Dashboard not found');
        return d;
    }
    async addWidget(dashboardId, orgId, data) {
        const d = await this.prisma.dashboard.findFirst({ where: { id: dashboardId, organizationId: orgId } });
        if (!d)
            throw new common_1.NotFoundException('Dashboard not found');
        return this.prisma.dashboardWidget.create({ data: { ...data, dashboardId } });
    }
    async removeWidget(widgetId) {
        return this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
    }
    async getAnalytics(moduleId, orgId, query) {
        const { groupByField, aggregation = 'count' } = query;
        const records = await this.prisma.record.findMany({
            where: { moduleId, organizationId: orgId, isDeleted: false },
        });
        if (groupByField) {
            const groups = {};
            for (const r of records) {
                const val = r.data[groupByField] ?? 'Unknown';
                groups[String(val)] = (groups[String(val)] || 0) + 1;
            }
            return Object.entries(groups).map(([name, value]) => ({ name, value }));
        }
        return { total: records.length };
    }
};
exports.DashboardsService = DashboardsService;
exports.DashboardsService = DashboardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardsService);
//# sourceMappingURL=dashboards.service.js.map