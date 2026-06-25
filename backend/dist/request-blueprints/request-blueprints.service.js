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
exports.RequestBlueprintsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RequestBlueprintsService = class RequestBlueprintsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(orgId) {
        return this.prisma.requestBlueprint.findMany({
            where: { organizationId: orgId },
            include: { _count: { select: { stages: true, instances: true } } },
            orderBy: { name: 'asc' },
        });
    }
    get(id, orgId) {
        return this.prisma.requestBlueprint.findFirstOrThrow({
            where: { id, organizationId: orgId },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    include: { actions: { orderBy: { order: 'asc' } } },
                },
            },
        });
    }
    create(orgId, body) {
        return this.prisma.requestBlueprint.create({ data: { name: body.name, description: body.description, organizationId: orgId } });
    }
    async update(id, orgId, body) {
        await this.prisma.requestBlueprint.findFirstOrThrow({ where: { id, organizationId: orgId } });
        return this.prisma.requestBlueprint.update({ where: { id }, data: { name: body.name, description: body.description, isActive: body.isActive } });
    }
    async remove(id, orgId) {
        await this.prisma.requestBlueprint.findFirstOrThrow({ where: { id, organizationId: orgId } });
        return this.prisma.requestBlueprint.delete({ where: { id } });
    }
    async addStage(blueprintId, orgId, body) {
        await this.prisma.requestBlueprint.findFirstOrThrow({ where: { id: blueprintId, organizationId: orgId } });
        const count = await this.prisma.requestBlueprintStage.count({ where: { blueprintId } });
        return this.prisma.requestBlueprintStage.create({
            data: {
                blueprintId, name: body.name, description: body.description, order: body.order ?? count,
                stageType: body.stageType ?? 'normal', color: body.color ?? '#3b82f6',
                responsibleRole: body.responsibleRole, slaDuration: body.slaDuration,
                requiredFields: body.requiredFields, requiredDocs: body.requiredDocs,
                notifyOnEnter: body.notifyOnEnter,
            },
        });
    }
    async updateStage(stageId, orgId, body) {
        const stage = await this.prisma.requestBlueprintStage.findFirstOrThrow({
            where: { id: stageId },
            include: { blueprint: { select: { organizationId: true } } },
        });
        if (stage.blueprint.organizationId !== orgId)
            throw new Error('Not found');
        return this.prisma.requestBlueprintStage.update({
            where: { id: stageId },
            data: { name: body.name, description: body.description, order: body.order, stageType: body.stageType, color: body.color, responsibleRole: body.responsibleRole, slaDuration: body.slaDuration, requiredFields: body.requiredFields, requiredDocs: body.requiredDocs },
        });
    }
    async removeStage(stageId, orgId) {
        const stage = await this.prisma.requestBlueprintStage.findFirstOrThrow({
            where: { id: stageId },
            include: { blueprint: { select: { organizationId: true } } },
        });
        if (stage.blueprint.organizationId !== orgId)
            throw new Error('Not found');
        return this.prisma.requestBlueprintStage.delete({ where: { id: stageId } });
    }
    async addAction(stageId, orgId, body) {
        const stage = await this.prisma.requestBlueprintStage.findFirstOrThrow({
            where: { id: stageId },
            include: { blueprint: { select: { organizationId: true } } },
        });
        if (stage.blueprint.organizationId !== orgId)
            throw new Error('Not found');
        const count = await this.prisma.requestBlueprintAction.count({ where: { stageId } });
        return this.prisma.requestBlueprintAction.create({
            data: {
                stageId, name: body.name, label: body.label, actionType: body.actionType ?? 'custom',
                targetStageId: body.targetStageId, color: body.color ?? '#3b82f6',
                requiresNote: body.requiresNote ?? false, conditions: body.conditions, order: body.order ?? count,
            },
        });
    }
    async updateAction(actionId, orgId, body) {
        const action = await this.prisma.requestBlueprintAction.findFirstOrThrow({
            where: { id: actionId },
            include: { stage: { include: { blueprint: { select: { organizationId: true } } } } },
        });
        if (action.stage.blueprint.organizationId !== orgId)
            throw new Error('Not found');
        return this.prisma.requestBlueprintAction.update({
            where: { id: actionId },
            data: { name: body.name, label: body.label, actionType: body.actionType, targetStageId: body.targetStageId, color: body.color, requiresNote: body.requiresNote, conditions: body.conditions, order: body.order },
        });
    }
    async removeAction(actionId, orgId) {
        const action = await this.prisma.requestBlueprintAction.findFirstOrThrow({
            where: { id: actionId },
            include: { stage: { include: { blueprint: { select: { organizationId: true } } } } },
        });
        if (action.stage.blueprint.organizationId !== orgId)
            throw new Error('Not found');
        return this.prisma.requestBlueprintAction.delete({ where: { id: actionId } });
    }
};
exports.RequestBlueprintsService = RequestBlueprintsService;
exports.RequestBlueprintsService = RequestBlueprintsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RequestBlueprintsService);
//# sourceMappingURL=request-blueprints.service.js.map