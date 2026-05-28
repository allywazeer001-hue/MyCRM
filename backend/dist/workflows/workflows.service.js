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
exports.WorkflowsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WorkflowsService = class WorkflowsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(orgId, data) {
        const { actions = [], ...rest } = data;
        return this.prisma.workflow.create({
            data: {
                ...rest,
                organizationId: orgId,
                actions: {
                    create: actions.map((a, i) => ({
                        type: a.type,
                        config: a.config || {},
                        order: a.order ?? i,
                    })),
                },
            },
            include: { actions: { orderBy: { order: 'asc' } } },
        });
    }
    async findAll(orgId) {
        return this.prisma.workflow.findMany({
            where: { organizationId: orgId },
            include: { actions: { orderBy: { order: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, orgId) {
        const wf = await this.prisma.workflow.findFirst({
            where: { id, organizationId: orgId },
            include: { actions: { orderBy: { order: 'asc' } } },
        });
        if (!wf)
            throw new common_1.NotFoundException('Workflow not found');
        return wf;
    }
    async update(id, orgId, data) {
        await this.findOne(id, orgId);
        const { actions, ...rest } = data;
        if (actions !== undefined) {
            await this.prisma.workflowAction.deleteMany({ where: { workflowId: id } });
            await this.prisma.workflowAction.createMany({
                data: actions.map((a, i) => ({
                    workflowId: id,
                    type: a.type,
                    config: a.config || {},
                    order: a.order ?? i,
                })),
            });
        }
        return this.prisma.workflow.update({
            where: { id },
            data: rest,
            include: { actions: { orderBy: { order: 'asc' } } },
        });
    }
    async remove(id, orgId) {
        await this.findOne(id, orgId);
        return this.prisma.workflow.delete({ where: { id } });
    }
    async toggle(id, orgId) {
        const wf = await this.findOne(id, orgId);
        return this.prisma.workflow.update({
            where: { id },
            data: { isActive: !wf.isActive },
            include: { actions: { orderBy: { order: 'asc' } } },
        });
    }
    async executeForRecord(trigger, moduleId, orgId, record, previousData) {
        const workflows = await this.prisma.workflow.findMany({
            where: {
                organizationId: orgId,
                moduleId,
                isActive: true,
                trigger,
            },
            include: { actions: { orderBy: { order: 'asc' } } },
        });
        for (const wf of workflows) {
            const conditions = wf.conditions || [];
            if (!this.evaluateConditions(conditions, record.data, previousData))
                continue;
            await this.executeWorkflow(wf, record, orgId);
        }
    }
    evaluateConditions(conditions, data, previousData) {
        if (conditions.length === 0)
            return true;
        const logic = conditions[0]?.logic || 'AND';
        const checks = conditions.map(c => this.evaluateCondition(c, data, previousData));
        return logic === 'OR' ? checks.some(Boolean) : checks.every(Boolean);
    }
    evaluateCondition(cond, data, previousData) {
        const raw = data?.[cond.field];
        const val = raw === null || raw === undefined ? '' : String(raw);
        const cv = cond.value != null ? String(cond.value) : '';
        switch (cond.operator) {
            case 'is':
            case 'equals': return val === cv;
            case 'is_not':
            case 'not_equals': return val !== cv;
            case 'contains': return val.toLowerCase().includes(cv.toLowerCase());
            case 'not_contains': return !val.toLowerCase().includes(cv.toLowerCase());
            case 'empty': return val === '' || raw == null;
            case 'not_empty': return val !== '' && raw != null;
            case 'gt': return Number(raw) > Number(cv);
            case 'gte': return Number(raw) >= Number(cv);
            case 'lt': return Number(raw) < Number(cv);
            case 'lte': return Number(raw) <= Number(cv);
            case 'changed': return previousData != null && String(previousData[cond.field]) !== val;
            default: return true;
        }
    }
    async executeWorkflow(wf, record, orgId) {
        const execution = await this.prisma.workflowExecution.create({
            data: {
                workflowId: wf.id,
                status: 'RUNNING',
                input: { recordId: record.id, data: record.data },
            },
        });
        try {
            for (const action of wf.actions) {
                await this.executeAction(action, record, orgId);
            }
            await this.prisma.workflowExecution.update({
                where: { id: execution.id },
                data: { status: 'SUCCESS', finishedAt: new Date() },
            });
        }
        catch (err) {
            await this.prisma.workflowExecution.update({
                where: { id: execution.id },
                data: { status: 'FAILED', error: err?.message || 'Unknown error', finishedAt: new Date() },
            });
        }
    }
    async executeAction(action, record, orgId) {
        const cfg = action.config || {};
        switch (action.type) {
            case 'SET_FIELD': {
                if (!cfg.field)
                    break;
                const value = cfg.value === '__NOW__' ? new Date().toISOString() : cfg.value;
                const newData = { ...record.data, [cfg.field]: value };
                await this.prisma.record.update({
                    where: { id: record.id },
                    data: { data: newData },
                });
                record.data = newData;
                break;
            }
            case 'UPDATE_RECORD': {
                if (!cfg.updates || !Array.isArray(cfg.updates))
                    break;
                const patch = {};
                for (const u of cfg.updates) {
                    patch[u.field] = u.value === '__NOW__' ? new Date().toISOString() : u.value;
                }
                const updated = { ...record.data, ...patch };
                await this.prisma.record.update({
                    where: { id: record.id },
                    data: { data: updated },
                });
                record.data = updated;
                break;
            }
            case 'SEND_NOTIFICATION': {
                const users = await this.prisma.user.findMany({
                    where: { organizationId: orgId, isActive: true },
                    select: { id: true },
                });
                const targets = cfg.userIds?.length
                    ? users.filter(u => cfg.userIds.includes(u.id))
                    : users;
                await this.prisma.notification.createMany({
                    data: targets.map(u => ({
                        userId: u.id,
                        organizationId: orgId,
                        title: cfg.title || 'Workflow Notification',
                        message: cfg.message || `Workflow action triggered on record ${record.id}`,
                        type: 'WORKFLOW',
                    })),
                });
                break;
            }
            case 'ASSIGN_USER': {
                if (!cfg.field || !cfg.userId)
                    break;
                const newData = { ...record.data, [cfg.field]: cfg.userId };
                await this.prisma.record.update({
                    where: { id: record.id },
                    data: { data: newData },
                });
                record.data = newData;
                break;
            }
            case 'CREATE_RECORD': {
                if (!cfg.moduleId)
                    break;
                await this.prisma.record.create({
                    data: {
                        moduleId: cfg.moduleId,
                        organizationId: orgId,
                        createdById: record.createdById,
                        data: cfg.data || {},
                    },
                });
                break;
            }
            default:
                break;
        }
    }
    async getExecutions(workflowId, orgId) {
        const wf = await this.findOne(workflowId, orgId);
        return this.prisma.workflowExecution.findMany({
            where: { workflowId: wf.id },
            orderBy: { startedAt: 'desc' },
            take: 50,
        });
    }
};
exports.WorkflowsService = WorkflowsService;
exports.WorkflowsService = WorkflowsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkflowsService);
//# sourceMappingURL=workflows.service.js.map