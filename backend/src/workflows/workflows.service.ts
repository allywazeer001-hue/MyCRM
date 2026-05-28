import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, data: any) {
    const { actions = [], ...rest } = data;
    return this.prisma.workflow.create({
      data: {
        ...rest,
        organizationId: orgId,
        actions: {
          create: actions.map((a: any, i: number) => ({
            type: a.type,
            config: a.config || {},
            order: a.order ?? i,
          })),
        },
      },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId: orgId },
      include: { actions: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const wf = await this.prisma.workflow.findFirst({
      where: { id, organizationId: orgId },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async update(id: string, orgId: string, data: any) {
    await this.findOne(id, orgId);
    const { actions, ...rest } = data;
    // Replace all actions on update
    if (actions !== undefined) {
      await this.prisma.workflowAction.deleteMany({ where: { workflowId: id } });
      await this.prisma.workflowAction.createMany({
        data: actions.map((a: any, i: number) => ({
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

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.workflow.delete({ where: { id } });
  }

  async toggle(id: string, orgId: string) {
    const wf = await this.findOne(id, orgId);
    return this.prisma.workflow.update({
      where: { id },
      data: { isActive: !wf.isActive },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  // ── Execution Engine ─────────────────────────────────────────────────────────

  async executeForRecord(
    trigger: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED' | 'FIELD_CHANGED',
    moduleId: string,
    orgId: string,
    record: any,
    previousData?: any,
  ) {
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
      const conditions = (wf.conditions as any[]) || [];
      if (!this.evaluateConditions(conditions, record.data, previousData)) continue;
      await this.executeWorkflow(wf, record, orgId);
    }
  }

  private evaluateConditions(conditions: any[], data: any, previousData?: any): boolean {
    if (conditions.length === 0) return true;
    const logic = conditions[0]?.logic || 'AND';
    const checks = conditions.map(c => this.evaluateCondition(c, data, previousData));
    return logic === 'OR' ? checks.some(Boolean) : checks.every(Boolean);
  }

  private evaluateCondition(cond: any, data: any, previousData?: any): boolean {
    const raw = data?.[cond.field];
    const val = raw === null || raw === undefined ? '' : String(raw);
    const cv = cond.value != null ? String(cond.value) : '';

    switch (cond.operator) {
      case 'is':
      case 'equals':        return val === cv;
      case 'is_not':
      case 'not_equals':    return val !== cv;
      case 'contains':      return val.toLowerCase().includes(cv.toLowerCase());
      case 'not_contains':  return !val.toLowerCase().includes(cv.toLowerCase());
      case 'empty':         return val === '' || raw == null;
      case 'not_empty':     return val !== '' && raw != null;
      case 'gt':            return Number(raw) > Number(cv);
      case 'gte':           return Number(raw) >= Number(cv);
      case 'lt':            return Number(raw) < Number(cv);
      case 'lte':           return Number(raw) <= Number(cv);
      case 'changed':       return previousData != null && String(previousData[cond.field]) !== val;
      default:              return true;
    }
  }

  private async executeWorkflow(wf: any, record: any, orgId: string) {
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
    } catch (err: any) {
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', error: err?.message || 'Unknown error', finishedAt: new Date() },
      });
    }
  }

  private async executeAction(action: any, record: any, orgId: string) {
    const cfg = (action.config as any) || {};

    switch (action.type) {
      case 'SET_FIELD': {
        if (!cfg.field) break;
        const value = cfg.value === '__NOW__' ? new Date().toISOString() : cfg.value;
        const newData = { ...(record.data as any), [cfg.field]: value };
        await this.prisma.record.update({
          where: { id: record.id },
          data: { data: newData },
        });
        record.data = newData;
        break;
      }

      case 'UPDATE_RECORD': {
        if (!cfg.updates || !Array.isArray(cfg.updates)) break;
        const patch: Record<string, any> = {};
        for (const u of cfg.updates) {
          patch[u.field] = u.value === '__NOW__' ? new Date().toISOString() : u.value;
        }
        const updated = { ...(record.data as any), ...patch };
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
        if (!cfg.field || !cfg.userId) break;
        const newData = { ...(record.data as any), [cfg.field]: cfg.userId };
        await this.prisma.record.update({
          where: { id: record.id },
          data: { data: newData },
        });
        record.data = newData;
        break;
      }

      case 'CREATE_RECORD': {
        if (!cfg.moduleId) break;
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

      // SEND_EMAIL and WEBHOOK_CALL are logged but not executed (need 3rd-party config)
      default:
        break;
    }
  }

  async getExecutions(workflowId: string, orgId: string) {
    const wf = await this.findOne(workflowId, orgId);
    return this.prisma.workflowExecution.findMany({
      where: { workflowId: wf.id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }
}
