import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../websocket/app.gateway';
import { CreateBlueprintDto, UpdateBlueprintDto } from './dto/create-blueprint.dto';
import { TaskActionDto } from './dto/task-action.dto';

@Injectable()
export class ProcessService {
  private readonly logger = new Logger(ProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly gateway: AppGateway,
  ) {}

  // ── Blueprints ──────────────────────────────────────────────────────────────

  async getBlueprints(organizationId: string) {
    const blueprints = await this.prisma.processBlueprint.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            stages: true,
            instances: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return blueprints;
  }

  async getBlueprintById(id: string, organizationId: string) {
    const blueprint = await this.prisma.processBlueprint.findFirst({
      where: { id, organizationId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!blueprint) {
      throw new NotFoundException(`ProcessBlueprint with id "${id}" not found`);
    }
    return blueprint;
  }

  async createBlueprint(dto: CreateBlueprintDto, organizationId: string) {
    const { stages, ...blueprintData } = dto;

    const result = await this.prisma.$transaction(async (tx) => {
      const blueprint = await tx.processBlueprint.create({
        data: {
          ...blueprintData,
          organizationId,
        },
      });

      if (stages && stages.length > 0) {
        await tx.processStage.createMany({
          data: stages.map((stage) => ({
            blueprintId: blueprint.id,
            name: stage.name,
            order: stage.order,
            assigneeType: stage.assigneeType,
            assigneeRole: stage.assigneeRole ?? null,
            assigneeUserId: stage.assigneeUserId ?? null,
            assigneeField: stage.assigneeField ?? null,
            actions: stage.actions,
            dueDays: stage.dueDays ?? null,
            conditions: stage.conditions ?? null,
            onApprove: stage.onApprove ?? null,
            onReject: stage.onReject ?? null,
            onRequestInfo: stage.onRequestInfo ?? null,
            notifySubmitter: stage.notifySubmitter ?? true,
            notifyAssignee: stage.notifyAssignee ?? true,
          })),
        });
      }

      return tx.processBlueprint.findUnique({
        where: { id: blueprint.id },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    return result;
  }

  async updateBlueprint(id: string, dto: UpdateBlueprintDto, organizationId: string) {
    const existing = await this.prisma.processBlueprint.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`ProcessBlueprint with id "${id}" not found`);
    }

    const { stages, ...blueprintData } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (stages !== undefined) {
        await tx.processStage.deleteMany({ where: { blueprintId: id } });

        if (stages.length > 0) {
          await tx.processStage.createMany({
            data: stages.map((stage) => ({
              blueprintId: id,
              name: stage.name,
              order: stage.order,
              assigneeType: stage.assigneeType,
              assigneeRole: stage.assigneeRole ?? null,
              assigneeUserId: stage.assigneeUserId ?? null,
              assigneeField: stage.assigneeField ?? null,
              actions: stage.actions,
              dueDays: stage.dueDays ?? null,
              conditions: stage.conditions ?? null,
              onApprove: stage.onApprove ?? null,
              onReject: stage.onReject ?? null,
              onRequestInfo: stage.onRequestInfo ?? null,
              notifySubmitter: stage.notifySubmitter ?? true,
              notifyAssignee: stage.notifyAssignee ?? true,
            })),
          });
        }
      }

      await tx.processBlueprint.update({
        where: { id },
        data: blueprintData,
      });
    });

    return this.prisma.processBlueprint.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async deleteBlueprint(id: string, organizationId: string) {
    const existing = await this.prisma.processBlueprint.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`ProcessBlueprint with id "${id}" not found`);
    }

    return this.prisma.processBlueprint.delete({ where: { id } });
  }

  // ── Instances ───────────────────────────────────────────────────────────────

  async startInstance(
    blueprintId: string,
    recordId: string,
    recordModule: string,
    startedBy: string,
    organizationId: string,
  ) {
    const blueprint = await this.prisma.processBlueprint.findFirst({
      where: { id: blueprintId, organizationId, isActive: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!blueprint) {
      throw new NotFoundException(`Active ProcessBlueprint with id "${blueprintId}" not found`);
    }

    const firstStage = blueprint.stages.reduce(
      (min, s) => (s.order < min.order ? s : min),
      blueprint.stages[0],
    );

    const instance = await this.prisma.processInstance.create({
      data: {
        blueprintId,
        recordId,
        recordModule,
        startedBy,
        organizationId,
        status: 'active',
        currentStageId: firstStage.id,
      },
    });

    await this.prisma.processTimeline.create({
      data: {
        instanceId: instance.id,
        actorId: startedBy,
        event: 'submitted',
      },
    });

    await this.assignTasksForStage(instance, firstStage);

    return instance;
  }

  private async assignTasksForStage(instance: any, stage: any) {
    let assigneeIds: string[] = [];

    switch (stage.assigneeType) {
      case 'role': {
        const users = await this.prisma.user.findMany({
          where: {
            organizationId: instance.organizationId,
            role: stage.assigneeRole,
          },
          select: { id: true },
        });
        assigneeIds = users.map((u) => u.id);
        break;
      }

      case 'user': {
        if (stage.assigneeUserId) {
          assigneeIds = [stage.assigneeUserId];
        }
        break;
      }

      case 'field': {
        try {
          const record = await this.prisma.record.findUnique({
            where: { id: instance.recordId },
            select: { data: true },
          });
          if (record && stage.assigneeField) {
            const data = record.data as Record<string, any>;
            const userId = data[stage.assigneeField];
            if (userId) {
              assigneeIds = [userId];
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to resolve field assignee: ${err.message}`);
        }
        break;
      }

      case 'manager': {
        try {
          const startedByUser = await this.prisma.user.findUnique({
            where: { id: instance.startedBy },
            select: { id: true },
          });
          // User model has no managerId field; fall back to startedBy
          assigneeIds = [instance.startedBy];
          void startedByUser; // suppress unused warning
        } catch (err) {
          this.logger.warn(`Failed to resolve manager assignee: ${err.message}`);
          assigneeIds = [instance.startedBy];
        }
        break;
      }

      default:
        assigneeIds = [];
    }

    if (assigneeIds.length === 0) {
      this.logger.warn(
        `No assignees resolved for stage ${stage.id} (type: ${stage.assigneeType})`,
      );
    }

    for (const userId of assigneeIds) {
      const dueAt =
        stage.dueDays != null
          ? new Date(Date.now() + stage.dueDays * 24 * 60 * 60 * 1000)
          : undefined;

      await this.prisma.processTask.create({
        data: {
          instanceId: instance.id,
          stageId: stage.id,
          assignedTo: userId,
          assignedRole: stage.assigneeRole ?? null,
          status: 'pending',
          dueAt: dueAt ?? null,
        },
      });

      await this.notificationsService.create(userId, instance.organizationId, {
        title: 'New Pending Task',
        message: `You have a new pending task for stage "${stage.name}".`,
        type: 'PROCESS_TASK',
      });

      this.gateway.emitToUser(userId, 'task:assigned', {
        instanceId: instance.id,
        stageId: stage.id,
        stageName: stage.name,
      });
    }
  }

  // ── Task Actions ────────────────────────────────────────────────────────────

  async executeTaskAction(taskId: string, actorId: string, dto: TaskActionDto) {
    const task = await this.prisma.processTask.findUnique({
      where: { id: taskId },
      include: {
        instance: true,
        stage: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`ProcessTask with id "${taskId}" not found`);
    }

    if (task.status !== 'pending') {
      throw new ForbiddenException(`Task is not in pending state`);
    }

    if (task.assignedTo !== actorId) {
      throw new ForbiddenException(`You are not the assignee for this task`);
    }

    const eventMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      request_info: 'info_requested',
    };

    await this.prisma.processTask.update({
      where: { id: taskId },
      data: {
        status: 'done',
        action: dto.action,
        comment: dto.comment ?? null,
        completedAt: new Date(),
      },
    });

    await this.prisma.processTimeline.create({
      data: {
        instanceId: task.instance.id,
        actorId,
        event: eventMap[dto.action] ?? dto.action,
        comment: dto.comment ?? null,
      },
    });

    await this.advanceInstance(task.instance, task.stage, dto.action, actorId);
  }

  private async advanceInstance(
    instance: any,
    stage: any,
    action: string,
    actorId: string,
  ) {
    let nextStageId: string | null = null;

    if (action === 'approve') {
      nextStageId = stage.onApprove ?? null;
    } else if (action === 'reject') {
      nextStageId = stage.onReject ?? null;
    } else if (action === 'request_info') {
      nextStageId = stage.onRequestInfo ?? null;
    }

    const isTerminal =
      nextStageId === null ||
      nextStageId === 'END' ||
      nextStageId === 'COMPLETE';

    if (isTerminal) {
      const finalStatus = action === 'reject' ? 'rejected' : 'completed';
      const finalEvent = action === 'reject' ? 'rejected' : 'completed';

      await this.prisma.processInstance.update({
        where: { id: instance.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });

      await this.prisma.processTimeline.create({
        data: {
          instanceId: instance.id,
          actorId,
          event: finalEvent,
        },
      });

      await this.notificationsService.create(
        instance.startedBy,
        instance.organizationId,
        {
          title: `Process ${finalStatus}`,
          message: `Your submitted process has been ${finalStatus}.`,
          type: 'PROCESS_UPDATE',
        },
      );

      this.gateway.emitToUser(instance.startedBy, 'process:completed', {
        instanceId: instance.id,
        status: finalStatus,
      });
    } else {
      // Mark all remaining pending tasks on this instance as skipped
      await this.prisma.processTask.updateMany({
        where: {
          instanceId: instance.id,
          status: 'pending',
        },
        data: { status: 'skipped' },
      });

      const nextStage = await this.prisma.processStage.findUnique({
        where: { id: nextStageId as string },
      });

      if (!nextStage) {
        this.logger.error(
          `Next stage "${nextStageId}" not found for instance ${instance.id}`,
        );
        return;
      }

      const updatedInstance = await this.prisma.processInstance.update({
        where: { id: instance.id },
        data: { currentStageId: nextStageId },
      });

      await this.prisma.processTimeline.create({
        data: {
          instanceId: instance.id,
          actorId,
          event: 'assigned',
          metadata: { nextStageId, nextStageName: nextStage.name },
        },
      });

      await this.assignTasksForStage(updatedInstance, nextStage);
    }
  }

  // ── My Tasks ────────────────────────────────────────────────────────────────

  async getMyTasks(userId: string, organizationId: string) {
    const tasks = await this.prisma.processTask.findMany({
      where: {
        assignedTo: userId,
        status: 'pending',
        instance: {
          organizationId,
        },
      },
      include: {
        instance: {
          include: {
            blueprint: {
              select: { id: true, name: true },
            },
          },
        },
        stage: true,
      },
      orderBy: [
        { dueAt: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;

    for (const task of tasks) {
      if (task.dueAt == null) {
        upcoming++;
      } else if (task.dueAt < now) {
        overdue++;
      } else if (task.dueAt <= todayEnd) {
        dueToday++;
      } else {
        upcoming++;
      }
    }

    return {
      tasks,
      stats: {
        total: tasks.length,
        overdue,
        dueToday,
        upcoming,
      },
    };
  }

  async markTaskSeen(taskId: string, userId: string) {
    const task = await this.prisma.processTask.findFirst({
      where: { id: taskId, assignedTo: userId },
    });

    if (!task) {
      throw new NotFoundException(`ProcessTask with id "${taskId}" not found`);
    }

    if (task.seenAt === null) {
      return this.prisma.processTask.update({
        where: { id: taskId },
        data: { seenAt: new Date() },
      });
    }

    return task;
  }

  // ── Timeline ────────────────────────────────────────────────────────────────

  async getInstanceTimeline(instanceId: string, organizationId: string) {
    const instance = await this.prisma.processInstance.findFirst({
      where: { id: instanceId, organizationId },
    });

    if (!instance) {
      throw new NotFoundException(`ProcessInstance with id "${instanceId}" not found`);
    }

    return this.prisma.processTimeline.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Monitoring ──────────────────────────────────────────────────────────────

  async getMonitoringStats(organizationId: string) {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [activeInstances, overdueTasks, recentlyCompleted, totalPending] =
      await Promise.all([
        this.prisma.processInstance.count({
          where: { organizationId, status: 'active' },
        }),
        this.prisma.processTask.count({
          where: {
            status: 'pending',
            dueAt: { lt: now },
            instance: { organizationId },
          },
        }),
        this.prisma.processInstance.count({
          where: {
            organizationId,
            status: 'completed',
            completedAt: { gte: recentCutoff },
          },
        }),
        this.prisma.processTask.count({
          where: {
            status: 'pending',
            instance: { organizationId },
          },
        }),
      ]);

    return {
      activeInstances,
      overdueTasks,
      recentlyCompleted,
      totalPending,
    };
  }

  // ── Trigger ─────────────────────────────────────────────────────────────────

  async triggerForRecord(
    recordId: string,
    moduleId: string,
    fieldName: string,
    fieldValue: string,
    startedBy: string,
    organizationId: string,
  ): Promise<void> {
    try {
      const matchingBlueprints = await this.prisma.processBlueprint.findMany({
        where: {
          organizationId,
          moduleId,
          triggerField: fieldName,
          triggerValue: fieldValue,
          isActive: true,
        },
      });

      for (const blueprint of matchingBlueprints) {
        try {
          await this.startInstance(
            blueprint.id,
            recordId,
            moduleId,
            startedBy,
            organizationId,
          );
        } catch (innerErr) {
          this.logger.error(
            `Failed to start instance for blueprint ${blueprint.id}: ${innerErr.message}`,
            innerErr.stack,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `triggerForRecord failed for record ${recordId}: ${err.message}`,
        err.stack,
      );
    }
  }
}
