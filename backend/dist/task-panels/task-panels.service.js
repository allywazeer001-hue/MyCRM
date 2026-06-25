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
exports.TaskPanelsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TaskPanelsService = class TaskPanelsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    applyCondition(data, c) {
        const raw = data?.[c.field];
        const val = raw ?? '';
        const cv = c.value ?? '';
        switch (c.operator) {
            case 'is': return String(val) === String(cv);
            case 'is_not': return String(val) !== String(cv);
            case 'contains': return String(val).toLowerCase().includes(String(cv).toLowerCase());
            case 'not_contains': return !String(val).toLowerCase().includes(String(cv).toLowerCase());
            case 'starts_with': return String(val).toLowerCase().startsWith(String(cv).toLowerCase());
            case 'ends_with': return String(val).toLowerCase().endsWith(String(cv).toLowerCase());
            case 'empty': return !raw || raw === '' || (Array.isArray(raw) && raw.length === 0);
            case 'not_empty': return !!raw && raw !== '' && !(Array.isArray(raw) && raw.length === 0);
            case 'eq': return Number(val) === Number(cv);
            case 'neq': return Number(val) !== Number(cv);
            case 'lt': return Number(val) < Number(cv);
            case 'lte': return Number(val) <= Number(cv);
            case 'gt': return Number(val) > Number(cv);
            case 'gte': return Number(val) >= Number(cv);
            case 'between': return Number(val) >= Number(cv) && Number(val) <= Number(c.value2);
            case 'today': {
                const d = new Date();
                const v = new Date(val);
                return v.toDateString() === d.toDateString();
            }
            case 'yesterday': {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                return new Date(val).toDateString() === d.toDateString();
            }
            case 'this_week': {
                const now = new Date();
                const ws = new Date(now);
                ws.setDate(now.getDate() - now.getDay());
                return new Date(val) >= ws && new Date(val) <= now;
            }
            case 'this_month': {
                const now = new Date();
                const dv = new Date(val);
                return dv.getMonth() === now.getMonth() && dv.getFullYear() === now.getFullYear();
            }
            case 'last_month': {
                const now = new Date();
                const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const dv = new Date(val);
                return dv.getMonth() === lm.getMonth() && dv.getFullYear() === lm.getFullYear();
            }
            case 'date_between': {
                const dv = new Date(val);
                return dv >= new Date(cv) && dv <= new Date(c.value2);
            }
            default: return true;
        }
    }
    applyFilterGroup(data, group) {
        const results = [
            ...group.conditions.map((c) => this.applyCondition(data, c)),
            ...(group.groups || []).map((g) => this.applyFilterGroup(data, g)),
        ];
        if (results.length === 0)
            return true;
        return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
    }
    panelAllowsRole(panel, userRole) {
        const roles = Array.isArray(panel.assigneeRoles)
            ? panel.assigneeRoles
            : JSON.parse(String(panel.assigneeRoles || '[]'));
        return roles.length === 0 || roles.includes(userRole);
    }
    async getPanelsForUser(userId, userRole, organizationId) {
        const panels = await this.prisma.taskPanel.findMany({
            where: { organizationId, isActive: true },
            orderBy: { order: 'asc' },
        });
        return panels.filter(panel => this.panelAllowsRole(panel, userRole));
    }
    async getAllPanels(organizationId) {
        return this.prisma.taskPanel.findMany({
            where: { organizationId },
            orderBy: { order: 'asc' },
        });
    }
    async getPanelRecords(panelId, userId, userRole, organizationId) {
        const panel = await this.prisma.taskPanel.findFirst({
            where: { id: panelId, organizationId },
        });
        if (!panel)
            throw new common_1.NotFoundException('Panel not found');
        if (!this.panelAllowsRole(panel, userRole)) {
            throw new common_1.NotFoundException('Panel not found');
        }
        const module = await this.prisma.dynamicModule.findFirst({
            where: { id: panel.moduleId, organizationId },
        });
        if (!module)
            throw new common_1.NotFoundException('Module not found');
        const fields = await this.prisma.field.findMany({
            where: { moduleId: panel.moduleId, isActive: true },
            include: { options: true },
        });
        const sortField = panel.sortField || 'createdAt';
        const sortDir = panel.sortDir || 'desc';
        const displayLimit = panel.displayLimit || 50;
        let records = await this.prisma.record.findMany({
            where: { moduleId: panel.moduleId, organizationId, isDeleted: false },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { [sortField]: sortDir },
            take: displayLimit,
        });
        const rawFilterGroup = panel.filterGroup;
        if (rawFilterGroup) {
            try {
                const fg = typeof rawFilterGroup === 'string'
                    ? JSON.parse(rawFilterGroup)
                    : rawFilterGroup;
                const hasConditions = fg &&
                    typeof fg === 'object' &&
                    Array.isArray(fg.conditions) &&
                    fg.conditions.length > 0;
                if (hasConditions) {
                    records = records.filter(r => this.applyFilterGroup(r.data, fg));
                }
            }
            catch {
            }
        }
        const thresholdMs = (panel.newThresholdHours || 24) * 60 * 60 * 1000;
        const threshold = new Date(Date.now() - thresholdMs);
        const enrichedRecords = records.map(record => ({
            ...record,
            isNew: record.createdAt > threshold,
        }));
        const newCount = enrichedRecords.filter(r => r.isNew).length;
        return {
            panel,
            module,
            fields,
            records: enrichedRecords,
            total: enrichedRecords.length,
            newCount,
        };
    }
    async createPanel(dto, organizationId) {
        const agg = await this.prisma.taskPanel.aggregate({
            where: { organizationId },
            _max: { order: true },
        });
        const nextOrder = (agg._max.order ?? 0) + 1;
        return this.prisma.taskPanel.create({
            data: {
                ...dto,
                organizationId,
                order: nextOrder,
            },
        });
    }
    async updatePanel(id, dto, organizationId) {
        const panel = await this.prisma.taskPanel.findFirst({ where: { id, organizationId } });
        if (!panel)
            throw new common_1.NotFoundException('Panel not found');
        return this.prisma.taskPanel.update({
            where: { id },
            data: dto,
        });
    }
    async deletePanel(id, organizationId) {
        const panel = await this.prisma.taskPanel.findFirst({ where: { id, organizationId } });
        if (!panel)
            throw new common_1.NotFoundException('Panel not found');
        return this.prisma.taskPanel.delete({ where: { id } });
    }
};
exports.TaskPanelsService = TaskPanelsService;
exports.TaskPanelsService = TaskPanelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaskPanelsService);
//# sourceMappingURL=task-panels.service.js.map