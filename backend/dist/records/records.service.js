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
exports.RecordsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const workflows_service_1 = require("../workflows/workflows.service");
const process_service_1 = require("../process/process.service");
const relation_resolver_service_1 = require("./relation-resolver.service");
let RecordsService = class RecordsService {
    constructor(prisma, workflows, processService, resolver) {
        this.prisma = prisma;
        this.workflows = workflows;
        this.processService = processService;
        this.resolver = resolver;
    }
    async create(moduleId, orgId, userId, data) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, include: { options: true } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const enrichedData = { ...data };
        for (const field of mod.fields) {
            if (field.type === 'AUTO_NUMBER') {
                enrichedData[field.name] = await this.generateAutoNumber(field, moduleId, orgId);
            }
        }
        const record = await this.prisma.record.create({
            data: { moduleId, organizationId: orgId, createdById: userId, data: enrichedData },
        });
        await this.prisma.auditLog.create({
            data: {
                userId, organizationId: orgId,
                action: 'RECORD_CREATED', entityType: mod.name, entityId: record.id,
                metadata: { moduleId },
            },
        });
        this.workflows.executeForRecord('RECORD_CREATED', moduleId, orgId, record).catch(() => { });
        this.processService.triggerForRecord(record.id, moduleId, "status", enrichedData.status || "", userId, orgId).catch(() => { });
        return record;
    }
    async generateAutoNumber(field, moduleId, orgId) {
        const settings = field.settings || {};
        const prefix = settings.prefix || '';
        const suffix = settings.suffix || '';
        const startingNumber = settings.startingNumber ?? 1;
        const paddingLength = settings.paddingLength ?? 5;
        const count = await this.prisma.record.count({ where: { moduleId, organizationId: orgId } });
        const nextNum = count + startingNumber;
        const padded = String(nextNum).padStart(paddingLength, '0');
        const parts = [prefix, padded, suffix].filter(Boolean);
        return parts.join('-');
    }
    async findAll(moduleId, orgId, query) {
        const { page = 1, limit = 25, search, filterGroup, sortField, sortDir, showArchived } = query;
        const where = { moduleId, organizationId: orgId, isDeleted: false };
        if (!showArchived || showArchived === 'false')
            where.isArchived = false;
        const hasFilter = !!(filterGroup || search);
        const needsInMemorySort = !!(sortField && sortField !== 'createdAt');
        const needsFullFetch = !!(hasFilter || needsInMemorySort);
        let records = await this.prisma.record.findMany({
            where,
            include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
            orderBy: { createdAt: (!sortField || sortField === 'createdAt') ? (sortDir === 'asc' ? 'asc' : 'desc') : 'desc' },
            take: needsFullFetch ? 5000 : Number(limit),
            skip: needsFullFetch ? 0 : (Number(page) - 1) * Number(limit),
        });
        if (search) {
            const s = search.toLowerCase();
            records = records.filter(r => JSON.stringify(r.data).toLowerCase().includes(s));
        }
        if (filterGroup) {
            try {
                const fg = typeof filterGroup === 'string' ? JSON.parse(filterGroup) : filterGroup;
                records = records.filter(r => this.applyFilterGroup(r.data, fg));
            }
            catch { }
        }
        if (sortField && sortField !== 'createdAt') {
            const dir = sortDir === 'asc' ? 1 : -1;
            records.sort((a, b) => {
                const av = a.data?.[sortField] ?? '';
                const bv = b.data?.[sortField] ?? '';
                const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
                return cmp * dir;
            });
        }
        const total = needsFullFetch ? records.length : await this.prisma.record.count({ where });
        const paged = needsFullFetch
            ? records.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit))
            : records;
        const moduleFields = await this.prisma.field.findMany({ where: { moduleId, isActive: true }, include: { options: true } });
        const resolvedData = await this.resolver.resolveRecords(paged, moduleFields);
        return {
            data: resolvedData,
            meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
        };
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
                const d = new Date(val);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            case 'last_month': {
                const now = new Date();
                const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const d = new Date(val);
                return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
            }
            case 'date_between': {
                const d = new Date(val);
                return d >= new Date(cv) && d <= new Date(c.value2);
            }
            default: return true;
        }
    }
    async findOne(id, orgId) {
        const record = await this.prisma.record.findFirst({
            where: { id, organizationId: orgId, isDeleted: false },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
                module: {
                    include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { options: true } } },
                },
                comments: {
                    include: { user: { select: { id: true, firstName: true, lastName: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                files: true,
            },
        });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        const moduleFields = record.module?.fields ?? await this.prisma.field.findMany({ where: { moduleId: record.moduleId, isActive: true }, include: { options: true } });
        return this.resolver.resolveRecord(record, moduleFields);
    }
    async update(id, orgId, userId, data) {
        const where = orgId ? { id, organizationId: orgId, isDeleted: false } : { id, isDeleted: false };
        const record = await this.prisma.record.findFirst({ where });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        const existingData = record.data || {};
        const mergedData = { ...existingData, ...data };
        const updated = await this.prisma.record.update({
            where: { id },
            data: { data: mergedData, updatedById: userId },
        });
        const oldValues = {};
        for (const key of Object.keys(data))
            oldValues[key] = existingData[key] ?? null;
        const auditOrgId = orgId ?? record.organizationId;
        await this.prisma.auditLog.create({
            data: {
                userId, organizationId: auditOrgId,
                action: 'RECORD_UPDATED', entityType: 'Record', entityId: id,
                metadata: { oldValues, newValues: data },
            },
        });
        this.workflows.executeForRecord('RECORD_UPDATED', record.moduleId, auditOrgId, { ...updated, data: mergedData }, existingData).catch(() => { });
        return updated;
    }
    async softDelete(id, orgId, userId) {
        const where = orgId ? { id, organizationId: orgId } : { id };
        const record = await this.prisma.record.findFirst({ where });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        await this.prisma.record.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
        await this.prisma.auditLog.create({
            data: { userId, organizationId: orgId ?? record.organizationId, action: 'RECORD_DELETED', entityType: 'Record', entityId: id, metadata: {} },
        });
        return { success: true };
    }
    async bulkDelete(ids, orgId, userId) {
        await this.prisma.record.updateMany({
            where: { id: { in: ids }, organizationId: orgId },
            data: { isDeleted: true, deletedAt: new Date() },
        });
        return { success: true, count: ids.length };
    }
    async bulkUpdateField(ids, fieldName, value, orgId) {
        let updated = 0;
        const errors = [];
        for (const id of ids) {
            try {
                const record = await this.prisma.record.findFirst({
                    where: { id, organizationId: orgId, isDeleted: false },
                });
                if (!record) {
                    errors.push(id);
                    continue;
                }
                const currentData = record.data || {};
                await this.prisma.record.update({
                    where: { id },
                    data: { data: { ...currentData, [fieldName]: value } },
                });
                updated++;
            }
            catch {
                errors.push(id);
            }
        }
        return { updated, errors, total: ids.length };
    }
    async addComment(recordId, orgId, userId, content) {
        const record = await this.prisma.record.findFirst({ where: { id: recordId, organizationId: orgId } });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        return this.prisma.comment.create({
            data: { recordId, userId, content },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });
    }
    async getActivity(recordId, orgId) {
        const [auditLogs, comments] = await Promise.all([
            this.prisma.auditLog.findMany({
                where: { entityId: recordId, organizationId: orgId },
                include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
            this.prisma.comment.findMany({
                where: { recordId },
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const entries = [
            ...auditLogs.map((log) => ({
                id: log.id, type: 'audit',
                action: log.action, user: log.user,
                metadata: log.metadata, createdAt: log.createdAt,
            })),
            ...comments.map((c) => ({
                id: c.id, type: 'comment',
                action: 'COMMENT_ADDED', user: c.user,
                metadata: { content: c.content }, createdAt: c.createdAt,
            })),
        ];
        return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async duplicate(id, orgId, userId) {
        const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId, isDeleted: false } });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: record.moduleId },
            include: { fields: { where: { isActive: true } } },
        });
        const sourceData = record.data || {};
        const duplicateData = {};
        const skipTypes = new Set(['AUTO_NUMBER', 'FORMULA', 'INLINE_SUBFORM']);
        for (const [key, value] of Object.entries(sourceData)) {
            const field = mod?.fields.find((f) => f.name === key);
            if (field && skipTypes.has(field.type))
                continue;
            duplicateData[key] = value;
        }
        for (const field of mod?.fields ?? []) {
            if (field.type === 'AUTO_NUMBER') {
                duplicateData[field.name] = await this.generateAutoNumber(field, record.moduleId, orgId);
            }
        }
        const newRecord = await this.prisma.record.create({
            data: { moduleId: record.moduleId, organizationId: orgId, createdById: userId, data: duplicateData },
        });
        await this.prisma.auditLog.create({
            data: {
                userId, organizationId: orgId,
                action: 'RECORD_CREATED', entityType: 'Record', entityId: newRecord.id,
                metadata: { moduleId: record.moduleId, duplicatedFrom: id },
            },
        });
        return newRecord;
    }
    async setArchived(id, orgId, userId, archived) {
        const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId, isDeleted: false } });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        await this.prisma.record.update({
            where: { id },
            data: { isArchived: archived, archivedAt: archived ? new Date() : null },
        });
        await this.prisma.auditLog.create({
            data: {
                userId, organizationId: orgId,
                action: archived ? 'RECORD_ARCHIVED' : 'RECORD_UNARCHIVED',
                entityType: 'Record', entityId: id, metadata: {},
            },
        });
        return { success: true, isArchived: archived };
    }
    async setLocked(id, orgId, userId, locked) {
        const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId, isDeleted: false } });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        await this.prisma.record.update({
            where: { id },
            data: { isLocked: locked, lockedAt: locked ? new Date() : null },
        });
        await this.prisma.auditLog.create({
            data: {
                userId, organizationId: orgId,
                action: locked ? 'RECORD_LOCKED' : 'RECORD_UNLOCKED',
                entityType: 'Record', entityId: id, metadata: {},
            },
        });
        return { success: true, isLocked: locked };
    }
    async exportCsv(moduleId, orgId, filterGroup) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const result = await this.findAll(moduleId, orgId, { page: 1, limit: 5000, filterGroup });
        const fields = mod.fields.filter(f => !['FILE', 'IMAGE', 'SIGNATURE'].includes(f.type));
        const esc = (v) => {
            const s = v == null ? '' : String(v);
            return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const header = ['ID', ...fields.map(f => f.label), 'Created At'].map(esc).join(',');
        const rows = result.data.map(r => {
            const d = r.data;
            return [
                r.id,
                ...fields.map(f => Array.isArray(d[f.name]) ? d[f.name].join('; ') : d[f.name]),
                new Date(r.createdAt).toISOString(),
            ].map(esc).join(',');
        });
        return [header, ...rows].join('\n');
    }
    parseCsv(csvText) {
        const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
        if (lines.length === 0)
            return { headers: [], rows: [] };
        const parseRow = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    }
                    else
                        inQuotes = !inQuotes;
                }
                else if (ch === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                }
                else {
                    current += ch;
                }
            }
            result.push(current.trim());
            return result;
        };
        const headers = parseRow(lines[0]);
        const rows = lines.slice(1).map(line => {
            const vals = parseRow(line);
            const row = {};
            headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
            return row;
        });
        return { headers, rows };
    }
    async importPreview(csvText) {
        const { headers, rows } = this.parseCsv(csvText);
        return { headers, preview: rows.slice(0, 5), total: rows.length };
    }
    async importCsv(moduleId, orgId, userId, csvText, mapping) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, include: { options: true } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const { rows } = this.parseCsv(csvText);
        let imported = 0;
        const errors = [];
        for (let i = 0; i < rows.length; i++) {
            try {
                const data = {};
                for (const [csvCol, fieldName] of Object.entries(mapping)) {
                    if (fieldName && rows[i][csvCol] !== undefined && rows[i][csvCol] !== '') {
                        data[fieldName] = rows[i][csvCol];
                    }
                }
                for (const field of mod.fields) {
                    if (field.type === 'AUTO_NUMBER') {
                        data[field.name] = await this.generateAutoNumber(field, moduleId, orgId);
                    }
                }
                await this.prisma.record.create({
                    data: { moduleId, organizationId: orgId, createdById: userId, data },
                });
                imported++;
            }
            catch (err) {
                errors.push(`Row ${i + 2}: ${err?.message || 'Unknown error'}`);
            }
        }
        if (imported > 0) {
            await this.prisma.auditLog.create({
                data: {
                    userId, organizationId: orgId,
                    action: 'RECORDS_IMPORTED', entityType: mod.name, entityId: moduleId,
                    metadata: { imported, errors: errors.length },
                },
            });
        }
        return { imported, errors, total: rows.length };
    }
    async getImportTemplate(moduleId, orgId) {
        const mod = await this.prisma.dynamicModule.findFirst({
            where: { id: moduleId, organizationId: orgId },
            include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const fields = mod.fields.filter(f => !['AUTO_NUMBER', 'FILE', 'IMAGE', 'SIGNATURE'].includes(f.type));
        const esc = (v) => /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        const header = fields.map(f => esc(f.label)).join(',');
        const example = fields.map(f => {
            switch (f.type) {
                case 'NUMBER':
                case 'DECIMAL':
                case 'CURRENCY': return '100';
                case 'BOOLEAN': return 'true';
                case 'DATE': return '2025-01-15';
                case 'DATETIME': return '2025-01-15T09:00:00';
                case 'EMAIL': return 'example@email.com';
                case 'PHONE': return '+1-555-0100';
                case 'URL': return 'https://example.com';
                case 'RATING': return '4';
                case 'PROGRESS': return '50';
                default: return `Example ${f.label}`;
            }
        }).map(esc).join(',');
        return [header, example].join('\n');
    }
    async lookupSearch(orgId, targetModuleId, displayField, search) {
        const mod = await this.prisma.dynamicModule.findFirst({ where: { id: targetModuleId, organizationId: orgId } });
        if (!mod)
            throw new common_1.NotFoundException('Target module not found');
        const records = await this.prisma.record.findMany({
            where: { moduleId: targetModuleId, organizationId: orgId, isDeleted: false },
            take: 50,
            orderBy: { createdAt: 'desc' },
        });
        const filtered = search
            ? records.filter(r => {
                const val = r.data?.[displayField];
                return val && String(val).toLowerCase().includes(search.toLowerCase());
            })
            : records.slice(0, 20);
        return filtered.map(r => ({
            id: r.id,
            label: r.data?.[displayField] ?? r.id,
            data: r.data,
        }));
    }
};
exports.RecordsService = RecordsService;
exports.RecordsService = RecordsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workflows_service_1.WorkflowsService,
        process_service_1.ProcessService,
        relation_resolver_service_1.RelationResolverService])
], RecordsService);
//# sourceMappingURL=records.service.js.map