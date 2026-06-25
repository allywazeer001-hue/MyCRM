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
var WorkflowsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_gateway_1 = require("../websocket/app.gateway");
const _executingSet = new Map();
let WorkflowsService = WorkflowsService_1 = class WorkflowsService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.logger = new common_1.Logger(WorkflowsService_1.name);
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
                        recipientUsers: a.recipientUsers || [],
                        recipientDepts: a.recipientDepts || [],
                        order: a.order ?? i,
                    })),
                },
            },
            include: { actions: { orderBy: { order: 'asc' } } },
        });
    }
    async findAll(orgId) {
        const where = { organizationId: orgId };
        const workflows = await this.prisma.workflow.findMany({
            where,
            include: { actions: { orderBy: { order: 'asc' } } },
            orderBy: { createdAt: 'desc' },
        });
        const withLastRun = await Promise.all(workflows.map(async (wf) => {
            const lastExec = await this.prisma.workflowExecution.findFirst({
                where: { workflowId: wf.id },
                orderBy: { startedAt: 'desc' },
                select: { status: true, startedAt: true, finishedAt: true, error: true },
            });
            return { ...wf, lastExecution: lastExec };
        }));
        return withLastRun;
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
                    recipientUsers: a.recipientUsers || [],
                    recipientDepts: a.recipientDepts || [],
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
            const orgSet = _executingSet.get(orgId) ?? new Set();
            if (orgSet.has(wf.id)) {
                this.logger.warn('Circular workflow skip: ' + wf.id);
                continue;
            }
            orgSet.add(wf.id);
            _executingSet.set(orgId, orgSet);
            try {
                await this.executeWorkflow(wf, record, orgId);
            }
            finally {
                orgSet.delete(wf.id);
                if (orgSet.size === 0)
                    _executingSet.delete(orgId);
            }
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
            case 'between': {
                const parts = String(cond.value || '').split(',');
                const minVal = Number(parts[0]?.trim() ?? 0);
                const maxVal = Number(parts[1]?.trim() ?? 0);
                return Number(raw) >= minVal && Number(raw) <= maxVal;
            }
            case 'is_one_of': {
                const opts = String(cond.value || '').split(',').map((s) => s.trim().toLowerCase());
                return opts.includes(val.toLowerCase());
            }
            case 'changed_from': {
                if (!previousData)
                    return false;
                const prevVal = String(previousData[cond.field] ?? '');
                return prevVal === cv && val !== cv;
            }
            case 'changed_to': {
                if (!previousData)
                    return false;
                const prevVal = String(previousData[cond.field] ?? '');
                return val === cv && prevVal !== cv;
            }
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
                const setResult = await this.prisma.record.update({
                    where: { id: record.id },
                    data: { data: newData },
                });
                record.data = newData;
                this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, data: newData });
                this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: newData, updatedAt: setResult.updatedAt });
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
                const upResult = await this.prisma.record.update({
                    where: { id: record.id },
                    data: { data: updated },
                });
                record.data = updated;
                this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, data: updated });
                this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: upResult.updatedAt });
                break;
            }
            case 'SEND_NOTIFICATION': {
                const recordData = record.data ?? {};
                const resolvedTitle = this.resolveNotifTemplate(cfg.title || 'Workflow Notification', recordData);
                const resolvedMessage = this.resolveNotifTemplate(cfg.message || '', recordData);
                const notifModule = await this.prisma.dynamicModule.findFirst({
                    where: { id: record.moduleId },
                    select: { slug: true },
                });
                const recordLink = notifModule ? `/m/${notifModule.slug}/${record.id}` : undefined;
                const allOrgUsers = await this.prisma.user.findMany({
                    where: { organizationId: orgId, isActive: true },
                    select: { id: true, departmentId: true },
                });
                let targetIds;
                if (!cfg.userIds?.length && !cfg.recipientDepts?.length) {
                    targetIds = new Set(allOrgUsers.map(u => u.id));
                }
                else {
                    targetIds = new Set(cfg.userIds ?? []);
                    if (cfg.recipientDepts?.length) {
                        allOrgUsers
                            .filter(u => u.departmentId && cfg.recipientDepts.includes(u.departmentId))
                            .forEach(u => targetIds.add(u.id));
                    }
                }
                for (const u of allOrgUsers.filter(u => targetIds.has(u.id))) {
                    const notif = await this.prisma.notification.create({
                        data: {
                            userId: u.id,
                            organizationId: orgId,
                            title: resolvedTitle,
                            message: resolvedMessage,
                            type: 'WORKFLOW',
                            ...(recordLink ? { link: recordLink } : {}),
                        },
                    });
                    const unreadCount = await this.prisma.notification.count({ where: { userId: u.id, isRead: false } });
                    this.gateway.emitToUser(u.id, 'notification:new', { ...notif, unreadCount });
                }
                break;
            }
            case 'ASSIGN_USER': {
                if (!cfg.field || !cfg.userId)
                    break;
                const newData = { ...record.data, [cfg.field]: cfg.userId };
                await this.prisma.record.update({ where: { id: record.id }, data: { data: newData } });
                record.data = newData;
                break;
            }
            case 'TAG': {
                const tagsToAdd = Array.isArray(cfg.tags) ? cfg.tags : [];
                if (tagsToAdd.length === 0)
                    break;
                const existingTags = Array.isArray(record.data.tags)
                    ? record.data.tags : [];
                const merged = Array.from(new Set([...existingTags, ...tagsToAdd]));
                const taggedData = { ...record.data, tags: merged };
                await this.prisma.record.update({ where: { id: record.id }, data: { data: taggedData } });
                record.data = taggedData;
                break;
            }
            case 'CREATE_RECORD': {
                if (!cfg.moduleId)
                    break;
                const newRecordData = { ...(cfg.data || {}) };
                for (const mapping of (cfg.fieldMappings ?? [])) {
                    if (!mapping.targetField)
                        continue;
                    if (mapping.type === 'reference' && mapping.sourceField) {
                        newRecordData[mapping.targetField] = record.data[mapping.sourceField] ?? null;
                    }
                    else if (mapping.type === 'static') {
                        newRecordData[mapping.targetField] = mapping.staticValue ?? '';
                    }
                }
                const targetMod = await this.prisma.dynamicModule.findFirst({
                    where: { id: cfg.moduleId, organizationId: orgId },
                    include: { fields: { where: { isActive: true } } },
                });
                if (targetMod) {
                    const autoNumFields = targetMod.fields.filter((f) => String(f.type).toUpperCase() === 'AUTO_NUMBER');
                    for (const field of autoNumFields) {
                        const s = field.settings || {};
                        const count = await this.prisma.record.count({
                            where: { moduleId: cfg.moduleId, organizationId: orgId },
                        });
                        const nextNum = count + (s.startingNumber ?? 1);
                        const padded = String(nextNum).padStart(s.paddingLength ?? 5, '0');
                        newRecordData[field.name] = [s.prefix, padded, s.suffix].filter(Boolean).join('-') || padded;
                    }
                }
                await this.prisma.record.create({
                    data: {
                        moduleId: cfg.moduleId,
                        organizationId: orgId,
                        createdById: record.createdById,
                        data: newRecordData,
                    },
                });
                break;
            }
            case 'CHANGE_STATUS':
                if (cfg.fieldName && cfg.value !== undefined) {
                    const merged = { ...record.data, [cfg.fieldName]: cfg.value };
                    await this.prisma.record.update({ where: { id: record.id }, data: { data: merged } });
                    this.gateway.server?.to('module:' + record.moduleId).emit('record:updated', { recordId: record.id });
                }
                break;
            case 'SEND_EMAIL': {
                const { to, subject, body: bodyTemplate } = cfg;
                if (!to)
                    break;
                const resolvedTo = this.resolveTemplate(to, record.data);
                const resolvedSubject = this.resolveTemplate(subject || 'Workflow Notification', record.data);
                const resolvedBody = this.resolveTemplate(bodyTemplate || '', record.data);
                await this.sendEmail(resolvedTo, resolvedSubject, resolvedBody);
                break;
            }
            case 'WEBHOOK': {
                const { url, method = 'POST', headers: hdrs = {}, body: bodyTemplate = '' } = cfg;
                if (!url)
                    break;
                const resolvedBody = this.resolveTemplate(bodyTemplate, record.data);
                const hdrsResolved = { 'Content-Type': 'application/json' };
                for (const [k, v] of Object.entries(hdrs)) {
                    if (k)
                        hdrsResolved[this.resolveTemplate(k, record.data)] = this.resolveTemplate(v, record.data);
                }
                const fetchOpts = { method: method.toUpperCase(), headers: hdrsResolved };
                if (!['GET', 'HEAD'].includes(fetchOpts.method))
                    fetchOpts.body = resolvedBody;
                const response = await fetch(url, fetchOpts);
                this.logger.log(`[Workflow] Webhook ${fetchOpts.method} ${url} → ${response.status}`);
                break;
            }
            case 'UPDATE_RELATED': {
                const { relationField, targetField, targetValue } = cfg;
                if (!relationField || !targetField)
                    break;
                const relId = record.data[relationField];
                if (!relId)
                    break;
                const relRecord = await this.prisma.record.findFirst({ where: { id: relId, isDeleted: false } });
                if (!relRecord)
                    break;
                const existingData = relRecord.data || {};
                const resolved = this.resolveTemplate(String(targetValue ?? ''), record.data);
                await this.prisma.record.update({
                    where: { id: relId },
                    data: { data: { ...existingData, [targetField]: resolved } },
                });
                break;
            }
            case 'CREATE_TASK': {
                const { moduleId: taskModuleId, title, assigneeField, dueDate, priority, description } = cfg;
                if (!taskModuleId || !title)
                    break;
                const taskData = {
                    title: this.resolveTemplate(title, record.data),
                    description: description ? this.resolveTemplate(description, record.data) : '',
                    priority: priority || 'MEDIUM',
                    status: 'TODO',
                };
                if (assigneeField && record.data[assigneeField]) {
                    taskData.assignee = record.data[assigneeField];
                }
                if (dueDate)
                    taskData.dueDate = this.resolveTemplate(dueDate, record.data);
                await this.prisma.record.create({
                    data: {
                        moduleId: taskModuleId,
                        organizationId: orgId,
                        createdById: record.createdById,
                        data: taskData,
                    },
                });
                break;
            }
            case 'DELAY': {
                const { duration = 5, unit = 'minutes' } = cfg;
                const ms = unit === 'seconds' ? Number(duration) * 1000 :
                    unit === 'hours' ? Number(duration) * 3_600_000 :
                        unit === 'days' ? Number(duration) * 86_400_000 :
                            Number(duration) * 60_000;
                await new Promise(resolve => setTimeout(resolve, Math.min(ms, 30_000)));
                break;
            }
            case 'TRIGGER_WORKFLOW': {
                const { workflowId: targetId } = cfg;
                if (!targetId)
                    break;
                const orgSet = _executingSet.get(orgId) ?? new Set();
                if (orgSet.has(targetId)) {
                    this.logger.warn('[Workflow] Chain loop detected — skipping: ' + targetId);
                    break;
                }
                const targetWf = await this.prisma.workflow.findFirst({
                    where: { id: targetId, organizationId: orgId, isActive: true },
                    include: { actions: { orderBy: { order: 'asc' } } },
                });
                if (!targetWf)
                    break;
                orgSet.add(targetId);
                _executingSet.set(orgId, orgSet);
                try {
                    await this.executeWorkflow(targetWf, record, orgId);
                }
                finally {
                    orgSet.delete(targetId);
                    if (orgSet.size === 0)
                        _executingSet.delete(orgId);
                }
                break;
            }
            default:
                break;
        }
    }
    resolveTemplate(template, data) {
        if (!template || typeof template !== 'string')
            return '';
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            const v = data[key];
            return v === null || v === undefined ? '' : String(v);
        });
    }
    resolveNotifTemplate(template, data) {
        if (!template || typeof template !== 'string')
            return '';
        return template
            .replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, key) => {
            const v = data[key];
            return v === null || v === undefined ? '' : String(v);
        })
            .replace(/\{\{(\w+)\}\}/g, (_, key) => {
            const v = data[key];
            return v === null || v === undefined ? '' : String(v);
        });
    }
    async sendEmail(to, subject, html) {
        const smtpHost = process.env.SMTP_HOST;
        if (!smtpHost) {
            this.logger.warn('[Workflow] SMTP_HOST not configured — SEND_EMAIL skipped');
            return;
        }
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: process.env.SMTP_USER
                    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
                    : undefined,
            });
            await transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@app.com',
                to,
                subject,
                html,
            });
            this.logger.log(`[Workflow] Email sent → ${to}: ${subject}`);
        }
        catch (err) {
            this.logger.warn(`[Workflow] SEND_EMAIL failed: ${err?.message}. Install nodemailer: npm install nodemailer`);
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
exports.WorkflowsService = WorkflowsService = WorkflowsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_gateway_1.AppGateway])
], WorkflowsService);
//# sourceMappingURL=workflows.service.js.map