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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const permission_check_service_1 = require("../permissions/permission-check.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma, perm) {
        this.prisma = prisma;
        this.perm = perm;
    }
    applyFilterGroup(records, group) {
        const op = group.logic || group.operator || 'AND';
        const conditions = group.conditions || [];
        const groups = group.groups || [];
        const allConditions = [
            ...conditions.map(c => (r) => this.matchCondition(r.data, c)),
            ...groups.map(g => (r) => this.applyFilterGroup([r], g).length > 0),
        ];
        if (allConditions.length === 0)
            return records;
        return records.filter(r => op === 'AND'
            ? allConditions.every(fn => fn(r))
            : allConditions.some(fn => fn(r)));
    }
    matchCondition(data, cond) {
        const rawVal = data?.[cond.field];
        const val = rawVal === null || rawVal === undefined ? '' : String(rawVal);
        const cv = cond.value ? String(cond.value) : '';
        switch (cond.operator) {
            case 'is': return val === cv;
            case 'is_not': return val !== cv;
            case 'contains': return val.toLowerCase().includes(cv.toLowerCase());
            case 'not_contains': return !val.toLowerCase().includes(cv.toLowerCase());
            case 'starts_with': return val.toLowerCase().startsWith(cv.toLowerCase());
            case 'ends_with': return val.toLowerCase().endsWith(cv.toLowerCase());
            case 'empty': return val === '' || val === null;
            case 'not_empty': return val !== '' && val !== null;
            case 'eq': return Number(rawVal) === Number(cv);
            case 'neq': return Number(rawVal) !== Number(cv);
            case 'lt': return Number(rawVal) < Number(cv);
            case 'lte': return Number(rawVal) <= Number(cv);
            case 'gt': return Number(rawVal) > Number(cv);
            case 'gte': return Number(rawVal) >= Number(cv);
            case 'between': {
                const min = cv;
                const max = cond.value2 != null ? String(cond.value2) : cv.split(',')[1] ?? cv;
                return Number(rawVal) >= Number(min) && Number(rawVal) <= Number(max);
            }
            case 'today': {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const d = new Date(rawVal);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            }
            case 'yesterday': {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                y.setHours(0, 0, 0, 0);
                const d = new Date(rawVal);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === y.getTime();
            }
            case 'this_week': {
                const now = new Date();
                const start = new Date(now);
                start.setDate(now.getDate() - now.getDay());
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(start.getDate() + 7);
                const d = new Date(rawVal);
                return d >= start && d < end;
            }
            case 'this_month': {
                const now = new Date();
                const d = new Date(rawVal);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }
            case 'date_between': {
                const from = cv;
                const to = cond.value2 != null ? String(cond.value2) : cv.split(',')[1] ?? cv;
                const d = new Date(rawVal);
                return d >= new Date(from) && d <= new Date(to);
            }
            default: return true;
        }
    }
    async getAnalytics(moduleId, orgId, params) {
        const { groupByField, aggregation = 'COUNT', aggregateField, filterGroup, secondaryGroupByField } = params;
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        let records = await this.prisma.record.findMany({
            where: { moduleId, organizationId: orgId, isDeleted: false },
        });
        if (filterGroup) {
            records = this.applyFilterGroup(records, filterGroup);
        }
        const total = records.length;
        if (!groupByField) {
            let value = total;
            if (aggregation === 'SUM' && aggregateField) {
                value = records.reduce((s, r) => s + (Number(r.data?.[aggregateField]) || 0), 0);
            }
            else if (aggregation === 'AVG' && aggregateField) {
                const sum = records.reduce((s, r) => s + (Number(r.data?.[aggregateField]) || 0), 0);
                value = total > 0 ? sum / total : 0;
            }
            return { total, value, data: [] };
        }
        const groups = {};
        for (const r of records) {
            const key = String(r.data?.[groupByField] ?? '(empty)');
            if (!groups[key])
                groups[key] = [];
            groups[key].push(r);
        }
        if (!secondaryGroupByField) {
            let data = Object.entries(groups).map(([name, recs]) => {
                let value = recs.length;
                if (aggregation === 'SUM' && aggregateField) {
                    value = recs.reduce((s, r) => s + (Number(r.data?.[aggregateField]) || 0), 0);
                }
                else if (aggregation === 'AVG' && aggregateField) {
                    const sum = recs.reduce((s, r) => s + (Number(r.data?.[aggregateField]) || 0), 0);
                    value = recs.length > 0 ? sum / recs.length : 0;
                }
                return { name, value };
            });
            data.sort((a, b) => b.value - a.value);
            return { total, value: total, data };
        }
        const secondaryKeys = new Set();
        for (const r of records) {
            const sk = String(r.data?.[secondaryGroupByField] ?? '(empty)');
            secondaryKeys.add(sk);
        }
        const secKeys = [...secondaryKeys].sort();
        const data = Object.entries(groups).map(([name, recs]) => {
            const row = { name };
            for (const sk of secKeys) {
                const subset = recs.filter(r => String(r.data?.[secondaryGroupByField] ?? '(empty)') === sk);
                let value = subset.length;
                if (aggregation === 'SUM' && aggregateField) {
                    value = subset.reduce((s, r) => s + (Number(r.data?.[aggregateField]) || 0), 0);
                }
                else if (aggregation === 'AVG' && aggregateField) {
                    const sum = subset.reduce((s, r) => s + (Number(r.data?.[aggregateField]) || 0), 0);
                    value = subset.length > 0 ? sum / subset.length : 0;
                }
                row[sk] = value;
            }
            return row;
        });
        return { total, value: total, data, secondaryKeys: secKeys, isMultiLevel: true };
    }
    async getKanban(moduleId, orgId, statusField, filterGroup) {
        let records = await this.prisma.record.findMany({
            where: { moduleId, organizationId: orgId, isDeleted: false },
            include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (filterGroup)
            records = this.applyFilterGroup(records, filterGroup);
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId },
            include: { fields: { where: { name: statusField } } },
        });
        const field = mod?.fields?.[0];
        const options = field ? await this.prisma.fieldOption.findMany({ where: { fieldId: field.id } }) : [];
        const columns = {};
        for (const opt of options)
            columns[opt.value] = [];
        columns[''] = [];
        for (const r of records) {
            const key = String(r.data?.[statusField] ?? '');
            if (!columns[key])
                columns[key] = [];
            columns[key].push(r);
        }
        return {
            field,
            columns: Object.entries(columns).map(([key, records]) => ({
                key,
                label: options.find(o => o.value === key)?.label ?? (key || '(No Status)'),
                color: options.find(o => o.value === key)?.color,
                records,
            })),
        };
    }
    async getViews(_userId, orgId) {
        const views = await this.prisma.analyticsView.findMany({
            where: { organizationId: orgId },
            orderBy: { updatedAt: 'desc' },
        });
        return [...views.filter(v => v.isPinned), ...views.filter(v => !v.isPinned)];
    }
    async getView(id, _userId, orgId) {
        const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        return view;
    }
    async createView(orgId, userId, data) {
        return this.prisma.analyticsView.create({
            data: {
                name: data.name,
                config: data.config ?? {},
                organizationId: orgId,
                createdById: userId,
            },
        });
    }
    async updateView(id, userId, orgId, data) {
        const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        await this.perm.enforceCanEditResource(userId, orgId, view);
        const allowed = ['name', 'config', 'isPinned'];
        const clean = {};
        for (const k of allowed)
            if (data[k] !== undefined)
                clean[k] = data[k];
        return this.prisma.analyticsView.update({ where: { id }, data: clean });
    }
    async deleteView(id, userId, orgId) {
        const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        await this.perm.enforceCanEditResource(userId, orgId, view);
        return this.prisma.analyticsView.delete({ where: { id } });
    }
    async togglePinView(id, userId, orgId) {
        const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        await this.perm.enforceCanEditResource(userId, orgId, view);
        return this.prisma.analyticsView.update({ where: { id }, data: { isPinned: !view.isPinned } });
    }
    async getSavedFilters(orgId, context) {
        const where = { organizationId: orgId };
        if (context)
            where.context = context;
        return this.prisma.savedFilter.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    async createSavedFilter(orgId, userId, data) {
        return this.prisma.savedFilter.create({
            data: { ...data, organizationId: orgId, createdById: userId },
        });
    }
    async updateSavedFilter(id, orgId, data) {
        const sf = await this.prisma.savedFilter.findFirst({ where: { id, organizationId: orgId } });
        if (!sf)
            throw new common_1.NotFoundException('Saved filter not found');
        return this.prisma.savedFilter.update({ where: { id }, data });
    }
    async deleteSavedFilter(id, orgId) {
        const sf = await this.prisma.savedFilter.findFirst({ where: { id, organizationId: orgId } });
        if (!sf)
            throw new common_1.NotFoundException('Saved filter not found');
        return this.prisma.savedFilter.delete({ where: { id } });
    }
    async getTargets(orgId) {
        return this.prisma.analyticsTarget.findMany({
            where: { organizationId: orgId },
            include: { module: { select: { id: true, name: true, icon: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createTarget(orgId, data) {
        return this.prisma.analyticsTarget.create({
            data: { ...data, organizationId: orgId },
            include: { module: { select: { id: true, name: true, icon: true } } },
        });
    }
    async updateTarget(id, orgId, data) {
        const target = await this.prisma.analyticsTarget.findFirst({ where: { id, organizationId: orgId } });
        if (!target)
            throw new common_1.NotFoundException('Target not found');
        return this.prisma.analyticsTarget.update({ where: { id }, data });
    }
    async deleteTarget(id, orgId) {
        const target = await this.prisma.analyticsTarget.findFirst({ where: { id, organizationId: orgId } });
        if (!target)
            throw new common_1.NotFoundException('Target not found');
        return this.prisma.analyticsTarget.delete({ where: { id } });
    }
    async computeTargetCurrent(id, orgId) {
        const target = await this.prisma.analyticsTarget.findFirst({ where: { id, organizationId: orgId } });
        if (!target)
            throw new common_1.NotFoundException('Target not found');
        let where = { moduleId: target.moduleId, organizationId: orgId, isDeleted: false };
        if (target.periodStart)
            where.createdAt = { gte: target.periodStart, ...(target.periodEnd ? { lte: target.periodEnd } : {}) };
        let currentValue = 0;
        if (target.aggregation === 'COUNT') {
            currentValue = await this.prisma.record.count({ where });
        }
        else if (target.aggregation === 'SUM' && target.fieldName) {
            const records = await this.prisma.record.findMany({ where });
            currentValue = records.reduce((s, r) => s + (Number(r.data?.[target.fieldName]) || 0), 0);
        }
        else if (target.aggregation === 'AVG' && target.fieldName) {
            const records = await this.prisma.record.findMany({ where });
            const sum = records.reduce((s, r) => s + (Number(r.data?.[target.fieldName]) || 0), 0);
            currentValue = records.length > 0 ? sum / records.length : 0;
        }
        await this.prisma.analyticsTarget.update({ where: { id }, data: { currentValue } });
        return { ...target, currentValue };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_check_service_1.PermissionCheckService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map