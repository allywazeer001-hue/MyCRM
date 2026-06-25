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
exports.RelationResolverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RelationResolverService = class RelationResolverService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseSettings(field) {
        const raw = field.settings;
        if (!raw)
            return {};
        if (typeof raw === 'object')
            return raw;
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    extractLeafId(value) {
        if (value === null || value === undefined || value === '')
            return null;
        if (typeof value === 'string')
            return value;
        if (Array.isArray(value)) {
            for (let i = value.length - 1; i >= 0; i--) {
                const el = value[i];
                if (el !== null && el !== undefined && el !== '')
                    return String(el);
            }
            return null;
        }
        if (typeof value === 'object') {
            const numericKeys = Object.keys(value)
                .map((k) => parseInt(k, 10))
                .filter((k) => !isNaN(k));
            if (numericKeys.length > 0) {
                const maxKey = Math.max(...numericKeys);
                const leaf = value[String(maxKey)];
                if (leaf !== null && leaf !== undefined && leaf !== '')
                    return String(leaf);
            }
        }
        return null;
    }
    collectLeafIds(records, fieldName) {
        const ids = new Set();
        for (const record of records) {
            const value = record.data?.[fieldName];
            const leafId = this.extractLeafId(value);
            if (leafId !== null)
                ids.add(leafId);
        }
        return [...ids];
    }
    async resolveRecords(records, fields) {
        if (!records || records.length === 0)
            return records;
        const lookupFields = fields.filter((f) => {
            const s = this.parseSettings(f);
            return f.type === 'LOOKUP' && (s.lookupModuleId || f.lookupModuleId);
        });
        const mirrorFields = fields.filter((f) => {
            const s = this.parseSettings(f);
            return f.type === 'MIRROR' && s.sourceLookupFieldName && s.mirrorFieldName;
        });
        const userFields = fields.filter((f) => f.type === 'USER_SELECT');
        const globalListFields = fields.filter((f) => {
            const s = this.parseSettings(f);
            return ((f.type === 'GLOBAL_LIST' || f.type === 'DEPENDENT_GLOBAL_LIST') &&
                (s.globalListId || s.globalListSource?.listId));
        });
        const globalRelationFields = fields.filter((f) => {
            const s = this.parseSettings(f);
            return f.type === 'GLOBAL_RELATION' && (s.globalListId || s.globalListSource?.listId);
        });
        const dropdownGlobalFields = fields.filter((f) => {
            const s = this.parseSettings(f);
            const hasGlobalSource = !!(s.globalListSource?.listId || s.globalListId);
            return (f.type === 'DROPDOWN' || f.type === 'STATUS') && hasGlobalSource;
        });
        const allLookupIds = [];
        for (const field of lookupFields) {
            allLookupIds.push(...this.collectLeafIds(records, field.name));
        }
        for (const field of mirrorFields) {
            const s = this.parseSettings(field);
            allLookupIds.push(...this.collectLeafIds(records, s.sourceLookupFieldName));
        }
        const uniqueLookupIds = [...new Set(allLookupIds)];
        const allUserIds = [];
        for (const field of userFields) {
            allUserIds.push(...this.collectLeafIds(records, field.name));
        }
        const uniqueUserIds = [...new Set(allUserIds)];
        const allGlobalIds = [];
        for (const field of [...globalListFields, ...globalRelationFields, ...dropdownGlobalFields]) {
            allGlobalIds.push(...this.collectLeafIds(records, field.name));
        }
        const uniqueGlobalIds = [...new Set(allGlobalIds)];
        const lookupRecordMap = new Map();
        if (uniqueLookupIds.length > 0) {
            const fetchedRecords = await this.prisma.record.findMany({
                where: { id: { in: uniqueLookupIds } },
            });
            for (const rec of fetchedRecords) {
                lookupRecordMap.set(rec.id, rec);
            }
        }
        const userMap = new Map();
        if (uniqueUserIds.length > 0) {
            const users = await this.prisma.user.findMany({
                where: { id: { in: uniqueUserIds } },
                select: { id: true, firstName: true, lastName: true, email: true },
            });
            for (const user of users) {
                const displayName = user.firstName || user.lastName
                    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                    : (user.email ?? user.id);
                userMap.set(user.id, displayName);
            }
        }
        const globalListItemMap = new Map();
        if (uniqueGlobalIds.length > 0) {
            const items = await this.prisma.globalListItem.findMany({
                where: { id: { in: uniqueGlobalIds } },
            });
            for (const item of items) {
                globalListItemMap.set(item.id, item.label);
            }
        }
        const enriched = records.map((record) => {
            const data = { ...(record.data ?? {}) };
            for (const field of lookupFields) {
                const rawValue = data[field.name];
                if (rawValue === null || rawValue === undefined || rawValue === '')
                    continue;
                const id = String(rawValue);
                const fetchedRecord = lookupRecordMap.get(id);
                if (fetchedRecord) {
                    const s = this.parseSettings(field);
                    const displayField = s.displayField ?? 'name';
                    const label = fetchedRecord.data?.[displayField] ?? id;
                    data[field.name + '__label'] = label;
                }
            }
            for (const field of userFields) {
                const rawValue = data[field.name];
                if (rawValue === null || rawValue === undefined || rawValue === '')
                    continue;
                const id = String(rawValue);
                const label = userMap.get(id);
                if (label !== undefined) {
                    data[field.name + '__label'] = label;
                }
            }
            for (const field of globalListFields) {
                const rawValue = data[field.name];
                const leafId = this.extractLeafId(rawValue);
                if (leafId === null)
                    continue;
                const label = globalListItemMap.get(leafId);
                if (label !== undefined) {
                    data[field.name + '__label'] = label;
                }
            }
            for (const field of globalRelationFields) {
                const rawValue = data[field.name];
                const leafId = this.extractLeafId(rawValue);
                if (leafId === null)
                    continue;
                const label = globalListItemMap.get(leafId);
                if (label !== undefined) {
                    data[field.name + '__label'] = label;
                }
            }
            for (const field of mirrorFields) {
                const s = this.parseSettings(field);
                const sourceValue = data[s.sourceLookupFieldName];
                if (sourceValue === null || sourceValue === undefined || sourceValue === '')
                    continue;
                const id = String(sourceValue);
                const linkedRecord = lookupRecordMap.get(id);
                if (linkedRecord) {
                    data[field.name] = linkedRecord.data?.[s.mirrorFieldName] ?? null;
                }
            }
            for (const field of dropdownGlobalFields) {
                const rawValue = data[field.name];
                const leafId = this.extractLeafId(rawValue);
                if (leafId === null)
                    continue;
                const label = globalListItemMap.get(leafId);
                if (label !== undefined) {
                    data[field.name + '__label'] = label;
                }
            }
            return { ...record, data };
        });
        return enriched;
    }
    async resolveRecord(record, fields) {
        const result = await this.resolveRecords([record], fields);
        return result[0];
    }
};
exports.RelationResolverService = RelationResolverService;
exports.RelationResolverService = RelationResolverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RelationResolverService);
//# sourceMappingURL=relation-resolver.service.js.map