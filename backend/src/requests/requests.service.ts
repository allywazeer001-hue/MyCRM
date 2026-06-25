import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private async genNumber(orgId: string, typeId: string): Promise<string> {
    const type = await this.prisma.requestType.findFirst({ where: { id: typeId } });
    const prefix = type?.prefix ?? 'REQ';
    const year = new Date().getFullYear();
    const count = await this.prisma.request.count({ where: { organizationId: orgId, typeId } });
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async list(orgId: string, userId: string, filters: any) {
    const where: any = { organizationId: orgId };
    if (filters.typeId)   where.typeId   = filters.typeId;
    if (filters.status)   where.status   = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedUserId === 'me') where.assignedUserId = userId;
    else if (filters.assignedUserId) where.assignedUserId = filters.assignedUserId;
    if (filters.requesterId === 'me') where.requesterId = userId;
    if (filters.stage) where.currentStage = filters.stage;
    if (filters.search) where.OR = [
      { title: { contains: filters.search } },
      { requestNumber: { contains: filters.search } },
    ];

    return this.prisma.request.findMany({
      where,
      include: {
        type: { select: { id: true, name: true, icon: true, color: true } },
        requester: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        assignedDept: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ? parseInt(filters.limit) : 100,
      skip: filters.offset ? parseInt(filters.offset) : 0,
    });
  }

  async getMyQueue(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId }, select: { role: true, departmentId: true } });
    const [mine, assigned, teamQueue] = await Promise.all([
      this.prisma.request.findMany({
        where: { organizationId: orgId, requesterId: userId, status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } },
        include: { type: { select: { id: true, name: true, icon: true, color: true } }, assignedUser: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.request.findMany({
        where: { organizationId: orgId, assignedUserId: userId, status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } },
        include: { type: { select: { id: true, name: true, icon: true, color: true } }, requester: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { updatedAt: 'desc' }, take: 20,
      }),
      user?.departmentId ? this.prisma.request.findMany({
        where: { organizationId: orgId, assignedDeptId: user.departmentId, status: { notIn: ['COMPLETED', 'REJECTED', 'CANCELLED'] } },
        include: { type: { select: { id: true, name: true, icon: true, color: true } }, requester: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { updatedAt: 'desc' }, take: 20,
      }) : [],
    ]);
    return { myRequests: mine, assignedToMe: assigned, teamQueue };
  }

  async get(id: string, orgId: string) {
    const req = await this.prisma.request.findFirst({
      where: { id, organizationId: orgId },
      include: {
        type: true,
        requester: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        assignedDept: { select: { id: true, name: true } },
        currentStageRef: { include: { actions: { orderBy: { order: 'asc' } } } },
        comments: { include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
        attachments: { include: { uploader: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        events: { include: { actor: { select: { id: true, firstName: true, lastName: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
        instance: {
          include: {
            blueprint: { include: { stages: { orderBy: { order: 'asc' } } } },
            steps: {
              include: { actor: { select: { id: true, firstName: true, lastName: true } }, stage: { select: { id: true, name: true } } },
              orderBy: { enteredAt: 'asc' },
            },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('Request not found');
    return req;
  }

  async create(orgId: string, userId: string, body: any) {
    const type = await this.prisma.requestType.findFirst({ where: { id: body.typeId, organizationId: orgId } });
    if (!type) throw new BadRequestException('Invalid request type');

    const requestNumber = await this.genNumber(orgId, body.typeId);

    // Get blueprint first stage if linked
    let firstStage: any = null;
    let blueprint: any = null;
    if (type.blueprintId) {
      blueprint = await this.prisma.requestBlueprint.findFirst({
        where: { id: type.blueprintId },
        include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
      });
      firstStage = blueprint?.stages?.[0] ?? null;
    }

    const req = await this.prisma.request.create({
      data: {
        requestNumber,
        typeId: body.typeId,
        title: body.title,
        description: body.description,
        priority: body.priority ?? 'MEDIUM',
        status: 'OPEN',
        currentStage: firstStage?.name ?? null,
        currentStageId: firstStage?.id ?? null,
        requesterId: userId,
        assignedUserId: body.assignedUserId ?? null,
        assignedDeptId: body.assignedDeptId ?? null,
        relatedEntityType: body.relatedEntityType ?? null,
        relatedEntityId: body.relatedEntityId ?? null,
        data: body.data ?? {},
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        organizationId: orgId,
      },
    });

    // Create workflow instance if blueprint exists
    if (blueprint && firstStage) {
      const instance = await this.prisma.requestInstance.create({
        data: {
          blueprintId: blueprint.id,
          requestId: req.id,
          currentStageId: firstStage.id,
          organizationId: orgId,
        },
      });
      await this.prisma.requestInstanceStep.create({
        data: { instanceId: instance.id, stageId: firstStage.id, stageName: firstStage.name, stepStatus: 'pending' },
      });
    }

    // Create submitted event
    await this.prisma.requestEvent.create({
      data: { requestId: req.id, actorId: userId, eventType: 'created', title: 'Request submitted', data: { requestNumber } },
    });

    return this.get(req.id, orgId);
  }

  async update(id: string, orgId: string, userId: string, body: any) {
    const req = await this.prisma.request.findFirst({ where: { id, organizationId: orgId } });
    if (!req) throw new NotFoundException('Request not found');
    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        priority: body.priority ?? undefined,
        assignedUserId: body.assignedUserId !== undefined ? (body.assignedUserId || null) : undefined,
        assignedDeptId: body.assignedDeptId !== undefined ? (body.assignedDeptId || null) : undefined,
        dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
        data: body.data ?? undefined,
      },
    });
    if (body.assignedUserId !== undefined || body.priority !== undefined) {
      await this.prisma.requestEvent.create({
        data: { requestId: id, actorId: userId, eventType: 'updated', title: 'Request updated' },
      });
    }
    return updated;
  }

  async executeAction(id: string, orgId: string, userId: string, body: { actionId: string; note?: string }) {
    const req = await this.get(id, orgId);
    if (!req.instance) throw new BadRequestException('No workflow instance for this request');

    const action = await this.prisma.requestBlueprintAction.findFirst({
      where: { id: body.actionId },
      include: { stage: true },
    });
    if (!action) throw new BadRequestException('Action not found');

    // Determine next stage
    let nextStage: any = null;
    if (action.targetStageId) {
      nextStage = await this.prisma.requestBlueprintStage.findFirst({ where: { id: action.targetStageId } });
    }

    // Determine new status
    let newStatus = req.status;
    if (action.actionType === 'approve' && !nextStage) newStatus = 'COMPLETED';
    else if (action.actionType === 'reject') newStatus = 'REJECTED';
    else if (action.actionType === 'complete') newStatus = 'COMPLETED';
    else if (action.actionType === 'cancel') newStatus = 'CANCELLED';
    else if (nextStage) newStatus = 'IN_PROGRESS';

    // Complete current step
    const pendingStep = await this.prisma.requestInstanceStep.findFirst({
      where: { instanceId: (req.instance as any).id, stepStatus: 'pending' },
    });
    if (pendingStep) {
      await this.prisma.requestInstanceStep.update({
        where: { id: pendingStep.id },
        data: { stepStatus: 'completed', completedAt: new Date(), actorId: userId, actionName: action.name, actionLabel: action.label, note: body.note },
      });
    }

    // Update request status + stage
    await this.prisma.request.update({
      where: { id },
      data: {
        status: newStatus,
        currentStage: nextStage?.name ?? (newStatus === 'COMPLETED' ? 'Completed' : newStatus === 'REJECTED' ? 'Rejected' : req.currentStage),
        currentStageId: nextStage?.id ?? null,
        completedAt: ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(newStatus) ? new Date() : null,
      },
    });

    // Update instance + create next step
    await this.prisma.requestInstance.update({
      where: { id: (req.instance as any).id },
      data: {
        currentStageId: nextStage?.id ?? null,
        completedAt: ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(newStatus) ? new Date() : null,
      },
    });
    if (nextStage) {
      await this.prisma.requestInstanceStep.create({
        data: { instanceId: (req.instance as any).id, stageId: nextStage.id, stageName: nextStage.name, stepStatus: 'pending' },
      });
    }

    // Create event
    await this.prisma.requestEvent.create({
      data: {
        requestId: id,
        actorId: userId,
        eventType: 'stage_change',
        title: `${action.label}${nextStage ? ` → ${nextStage.name}` : ''}`,
        data: { actionId: action.id, actionName: action.name, fromStage: req.currentStage, toStage: nextStage?.name ?? newStatus, note: body.note },
      },
    });

    // Create notification for requester
    if (req.requesterId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: req.requesterId,
          organizationId: orgId,
          title: `Request ${action.label}: ${req.requestNumber}`,
          message: `Your request "${req.title}" has been ${action.label.toLowerCase()}${body.note ? `: ${body.note}` : '.'}`,
          type: 'INFO',
          link: `/workspace/requests/${id}`,
        },
      } as any);
    }

    return this.get(id, orgId);
  }

  async addComment(id: string, orgId: string, userId: string, content: string) {
    const req = await this.prisma.request.findFirst({ where: { id, organizationId: orgId } });
    if (!req) throw new NotFoundException('Request not found');
    const comment = await this.prisma.requestComment.create({
      data: { requestId: id, authorId: userId, content },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    await this.prisma.requestEvent.create({
      data: { requestId: id, actorId: userId, eventType: 'comment', title: 'Comment added' },
    });
    return comment;
  }

  async remove(id: string, orgId: string) {
    const req = await this.prisma.request.findFirst({ where: { id, organizationId: orgId } });
    if (!req) throw new NotFoundException('Request not found');
    return this.prisma.request.delete({ where: { id } });
  }
}
