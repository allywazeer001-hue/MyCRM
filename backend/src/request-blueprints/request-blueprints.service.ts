import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestBlueprintsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.requestBlueprint.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { stages: true, instances: true } } },
      orderBy: { name: 'asc' },
    });
  }

  get(id: string, orgId: string) {
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

  create(orgId: string, body: any) {
    return this.prisma.requestBlueprint.create({ data: { name: body.name, description: body.description, organizationId: orgId } });
  }

  async update(id: string, orgId: string, body: any) {
    await this.prisma.requestBlueprint.findFirstOrThrow({ where: { id, organizationId: orgId } });
    return this.prisma.requestBlueprint.update({ where: { id }, data: { name: body.name, description: body.description, isActive: body.isActive } });
  }

  async remove(id: string, orgId: string) {
    await this.prisma.requestBlueprint.findFirstOrThrow({ where: { id, organizationId: orgId } });
    return this.prisma.requestBlueprint.delete({ where: { id } });
  }

  // ── Stages ──────────────────────────────────────────────────────────────────

  async addStage(blueprintId: string, orgId: string, body: any) {
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

  async updateStage(stageId: string, orgId: string, body: any) {
    const stage = await this.prisma.requestBlueprintStage.findFirstOrThrow({
      where: { id: stageId },
      include: { blueprint: { select: { organizationId: true } } },
    });
    if (stage.blueprint.organizationId !== orgId) throw new Error('Not found');
    return this.prisma.requestBlueprintStage.update({
      where: { id: stageId },
      data: { name: body.name, description: body.description, order: body.order, stageType: body.stageType, color: body.color, responsibleRole: body.responsibleRole, slaDuration: body.slaDuration, requiredFields: body.requiredFields, requiredDocs: body.requiredDocs },
    });
  }

  async removeStage(stageId: string, orgId: string) {
    const stage = await this.prisma.requestBlueprintStage.findFirstOrThrow({
      where: { id: stageId },
      include: { blueprint: { select: { organizationId: true } } },
    });
    if (stage.blueprint.organizationId !== orgId) throw new Error('Not found');
    return this.prisma.requestBlueprintStage.delete({ where: { id: stageId } });
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  async addAction(stageId: string, orgId: string, body: any) {
    const stage = await this.prisma.requestBlueprintStage.findFirstOrThrow({
      where: { id: stageId },
      include: { blueprint: { select: { organizationId: true } } },
    });
    if (stage.blueprint.organizationId !== orgId) throw new Error('Not found');
    const count = await this.prisma.requestBlueprintAction.count({ where: { stageId } });
    return this.prisma.requestBlueprintAction.create({
      data: {
        stageId, name: body.name, label: body.label, actionType: body.actionType ?? 'custom',
        targetStageId: body.targetStageId, color: body.color ?? '#3b82f6',
        requiresNote: body.requiresNote ?? false, conditions: body.conditions, order: body.order ?? count,
      },
    });
  }

  async updateAction(actionId: string, orgId: string, body: any) {
    const action = await this.prisma.requestBlueprintAction.findFirstOrThrow({
      where: { id: actionId },
      include: { stage: { include: { blueprint: { select: { organizationId: true } } } } },
    });
    if (action.stage.blueprint.organizationId !== orgId) throw new Error('Not found');
    return this.prisma.requestBlueprintAction.update({
      where: { id: actionId },
      data: { name: body.name, label: body.label, actionType: body.actionType, targetStageId: body.targetStageId, color: body.color, requiresNote: body.requiresNote, conditions: body.conditions, order: body.order },
    });
  }

  async removeAction(actionId: string, orgId: string) {
    const action = await this.prisma.requestBlueprintAction.findFirstOrThrow({
      where: { id: actionId },
      include: { stage: { include: { blueprint: { select: { organizationId: true } } } } },
    });
    if (action.stage.blueprint.organizationId !== orgId) throw new Error('Not found');
    return this.prisma.requestBlueprintAction.delete({ where: { id: actionId } });
  }
}
