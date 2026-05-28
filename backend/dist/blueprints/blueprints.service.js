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
exports.BlueprintsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BlueprintsService = class BlueprintsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(orgId) {
        return this.prisma.blueprint.findMany({
            where: { organizationId: orgId, isActive: true },
            include: {
                module: { select: { id: true, name: true, slug: true, icon: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findOne(id, orgId) {
        const bp = await this.prisma.blueprint.findFirst({
            where: { id, organizationId: orgId },
            include: {
                module: {
                    select: {
                        id: true, name: true, slug: true, icon: true,
                        fields: {
                            where: { isActive: true },
                            include: { options: { orderBy: { order: 'asc' } } },
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });
        if (!bp)
            throw new common_1.NotFoundException('Blueprint not found');
        return bp;
    }
    async findForModule(moduleId, orgId) {
        return this.prisma.blueprint.findFirst({
            where: { moduleId, organizationId: orgId, isActive: true },
        });
    }
    async create(orgId, data) {
        const name = (data.name ?? '').toString().trim();
        if (!name)
            throw new common_1.BadRequestException('Name is required');
        if (!data.moduleId)
            throw new common_1.BadRequestException('Module is required');
        if (!data.statusFieldName)
            throw new common_1.BadRequestException('Status field is required');
        return this.prisma.blueprint.create({
            data: {
                name,
                description: data.description ? String(data.description) : null,
                moduleId: data.moduleId,
                statusFieldName: String(data.statusFieldName),
                phases: data.phases ?? [],
                transitions: data.transitions ?? [],
                fieldLocks: data.fieldLocks ?? {},
                treeData: data.treeData ?? null,
                organizationId: orgId,
            },
            include: {
                module: { select: { id: true, name: true, slug: true, icon: true } },
            },
        });
    }
    async update(id, orgId, data) {
        const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
        if (!bp)
            throw new common_1.NotFoundException('Blueprint not found');
        const safe = {};
        if (data.name !== undefined)
            safe.name = String(data.name).trim();
        if (data.description !== undefined)
            safe.description = data.description ? String(data.description) : null;
        if (data.statusFieldName !== undefined)
            safe.statusFieldName = String(data.statusFieldName);
        if (data.phases !== undefined)
            safe.phases = data.phases;
        if (data.transitions !== undefined)
            safe.transitions = data.transitions;
        if (data.fieldLocks !== undefined)
            safe.fieldLocks = data.fieldLocks;
        if (data.rules !== undefined)
            safe.rules = data.rules;
        if (data.treeData !== undefined)
            safe.treeData = data.treeData;
        if (data.isActive !== undefined)
            safe.isActive = Boolean(data.isActive);
        return this.prisma.blueprint.update({ where: { id }, data: safe });
    }
    async remove(id, orgId) {
        const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
        if (!bp)
            throw new common_1.NotFoundException('Blueprint not found');
        return this.prisma.blueprint.update({ where: { id }, data: { isActive: false } });
    }
    evaluateTree(treeData, recordData) {
        if (!treeData?.nodes?.length)
            return { actions: [] };
        const nodes = treeData.nodes;
        const out = [];
        const roots = nodes.filter((n) => !n.parentId);
        if (roots.length)
            this.walkNode(roots[0], nodes, recordData, out);
        return { actions: out };
    }
    walkNode(node, allNodes, data, out) {
        const children = allNodes.filter((n) => n.parentId === node.id);
        if (node.type === 'phase') {
            this.processChildren(children, allNodes, data, out);
        }
        else if (node.type === 'condition') {
            if (node.branchType === 'else') {
                this.processChildren(children, allNodes, data, out);
            }
            else {
                if (this.evalCondGroup(node.conditions, node.conditionsLogic, data)) {
                    this.processChildren(children, allNodes, data, out);
                }
            }
        }
        else if (node.type === 'action') {
            out.push(...(node.actions ?? []));
        }
    }
    processChildren(children, allNodes, data, out) {
        const conds = children.filter((c) => c.type === 'condition');
        const acts = children.filter((c) => c.type === 'action');
        let i = 0;
        while (i < conds.length) {
            if (conds[i].branchType !== 'if') {
                i++;
                continue;
            }
            const chain = [conds[i]];
            let j = i + 1;
            while (j < conds.length && conds[j].branchType !== 'if') {
                chain.push(conds[j]);
                j++;
            }
            for (const n of chain) {
                if (n.branchType === 'else') {
                    this.walkNode(n, allNodes, data, out);
                    break;
                }
                if (this.evalCondGroup(n.conditions, n.conditionsLogic, data)) {
                    this.walkNode(n, allNodes, data, out);
                    break;
                }
            }
            i = j;
        }
        for (const a of acts)
            this.walkNode(a, allNodes, data, out);
    }
    evalCondGroup(conds, logic, data) {
        if (!conds?.length)
            return true;
        const results = conds.map((c) => this.evalCondition(c, data));
        return (logic ?? 'AND') === 'AND' ? results.every(Boolean) : results.some(Boolean);
    }
    async evaluateForRecord(recordId, orgId) {
        const record = await this.prisma.record.findFirst({
            where: { id: recordId, organizationId: orgId, isDeleted: false },
        });
        if (!record)
            throw new common_1.NotFoundException('Record not found');
        const blueprint = await this.prisma.blueprint.findFirst({
            where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
        });
        if (!blueprint) {
            return { blueprint: null, currentPhase: null, lockedFields: [], availableTransitions: [], treeActions: [] };
        }
        const phases = blueprint.phases || [];
        const transitions = blueprint.transitions || [];
        const fieldLocks = blueprint.fieldLocks || {};
        const recordData = record.data || {};
        const currentValue = recordData[blueprint.statusFieldName];
        const currentPhase = phases.find((p) => p.id === currentValue || p.name === currentValue) ?? null;
        const lockedFields = currentPhase
            ? (fieldLocks[currentPhase.id] || fieldLocks[currentPhase.name] || [])
            : [];
        const availableTransitions = transitions.filter((t) => {
            if (t.fromPhaseId !== currentPhase?.id)
                return false;
            if (!t.conditions || t.conditions.length === 0)
                return true;
            const logic = t.conditionsLogic || 'AND';
            const results = t.conditions.map((c) => this.evalCondition(c, recordData));
            return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
        });
        const treeActions = blueprint.treeData
            ? this.evaluateTree(blueprint.treeData, recordData).actions
            : [];
        return { blueprint, currentPhase, lockedFields, availableTransitions, treeActions };
    }
    evalCondition(cond, data) {
        const v = data[cond.fieldName];
        const rv = String(cond.value ?? '');
        switch (cond.operator) {
            case 'equals': return String(v ?? '') === rv;
            case 'not_equals': return String(v ?? '') !== rv;
            case 'contains': return String(v ?? '').toLowerCase().includes(rv.toLowerCase());
            case 'gt': return Number(v) > Number(rv);
            case 'lt': return Number(v) < Number(rv);
            case 'gte': return Number(v) >= Number(rv);
            case 'lte': return Number(v) <= Number(rv);
            case 'is_empty': return v === null || v === undefined || v === '';
            case 'not_empty': return v !== null && v !== undefined && v !== '';
            default: return false;
        }
    }
};
exports.BlueprintsService = BlueprintsService;
exports.BlueprintsService = BlueprintsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlueprintsService);
//# sourceMappingURL=blueprints.service.js.map