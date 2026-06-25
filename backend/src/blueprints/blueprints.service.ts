import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../websocket/app.gateway';

// ── JSON-shape types (stored as Json in Prisma) ────────────────────────────

export interface BlueprintPhase {
  id: string;
  name: string;
  color: string;
  order: number;
  x?: number;
  y?: number;
}

export interface BlueprintTransition {
  id: string;
  name: string;
  fromPhaseId: string;
  toPhaseId: string;
  isCommon?: boolean; // true = available from any stage
  description?: string;
  buttonColor?: string;
  requiredFields: string[];
  allowedRoles: string[];
  allowedUsers: string[];
  conditions: any[];
  conditionsLogic: 'AND' | 'OR';
  requiresApproval: boolean;
  approvalRoles: string[];
  notifyRoles: string[];
  notifyUsers: string[];
  confirmMessage?: string;
}

@Injectable()
export class BlueprintsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gateway: AppGateway,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────

  async findAll(orgId: string) {
    return this.prisma.blueprint.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
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
    if (!bp) throw new NotFoundException('Blueprint not found');
    return bp;
  }

  async findForModule(moduleId: string, orgId: string) {
    return this.prisma.blueprint.findFirst({
      where: { moduleId, organizationId: orgId, isActive: true },
    });
  }

  async create(orgId: string, data: any) {
    const name = (data.name ?? '').toString().trim();
    if (!name) throw new BadRequestException('Name is required');
    if (!data.moduleId) throw new BadRequestException('Module is required');
    if (!data.statusFieldName) throw new BadRequestException('Status field is required');

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

  async update(id: string, orgId: string, data: any) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');

    const safe: any = {};
    if (data.name            !== undefined) safe.name            = String(data.name).trim();
    if (data.description     !== undefined) safe.description     = data.description ? String(data.description) : null;
    if (data.statusFieldName !== undefined) safe.statusFieldName = String(data.statusFieldName);
    if (data.phases          !== undefined) safe.phases          = data.phases;
    if (data.transitions     !== undefined) safe.transitions     = data.transitions;
    if (data.fieldLocks      !== undefined) safe.fieldLocks      = data.fieldLocks;
    if (data.rules           !== undefined) safe.rules           = data.rules;
    if (data.treeData        !== undefined) safe.treeData        = data.treeData;
    if (data.isActive        !== undefined) safe.isActive        = Boolean(data.isActive);

    safe.version = (bp.version ?? 1) + 1;

    return this.prisma.blueprint.update({ where: { id }, data: safe });
  }

  async remove(id: string, orgId: string) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');
    return this.prisma.blueprint.update({ where: { id }, data: { isActive: false } });
  }

  // ── Runtime: available transitions for a record ──────────────────────────

  async getAvailableTransitions(recordId: string, userId: string, orgId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
    });
    if (!blueprint) {
      return { blueprint: null, currentStage: null, availableTransitions: [], lockedFields: [], phases: [], canInitialize: false };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { id: true, role: true },
    });

    const phases      = (blueprint.phases as unknown as BlueprintPhase[]) || [];
    const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];
    const fieldLocks  = (blueprint.fieldLocks as any) || {};
    const recordData  = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];

    const currentStage = phases.find(p => p.id === currentValue || p.name === currentValue) ?? null;

    // When no stage is set, the record can be initialized to any phase.
    // canInitialize = true signals the frontend to show a "Start Process" picker.
    const canInitialize = !currentStage && phases.length > 0;

    const lockedFields: string[] = currentStage
      ? (fieldLocks[currentStage.id] || fieldLocks[currentStage.name] || [])
      : [];

    const isAdminOrSuper = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

    const availableTransitions = transitions.filter(t => {
      // Common transitions are available from any stage
      const isCommon = t.isCommon === true || t.fromPhaseId === '*';
      // Match current stage (or entry transitions with empty fromPhaseId when no stage set)
      if (!isCommon) {
        if (currentStage) {
          if (t.fromPhaseId !== currentStage.id) return false;
        } else {
          // Only show entry transitions (fromPhaseId is empty/null) when no stage is set
          if (t.fromPhaseId && t.fromPhaseId !== '' && t.fromPhaseId !== '__start__') return false;
        }
      } else if (!currentStage) {
        // Common transitions not shown when record has no stage yet
        return false;
      }

      if (!isAdminOrSuper) {
        const hasRole = !t.allowedRoles?.length || t.allowedRoles.includes(user?.role ?? '');
        const hasUser = !t.allowedUsers?.length || t.allowedUsers.includes(userId);
        if (!hasRole && !hasUser) return false;
      }

      if (t.conditions?.length) {
        const results = t.conditions.map((c: any) => this.evalCondition(c, recordData));
        const logic = t.conditionsLogic || 'AND';
        if (!(logic === 'AND' ? results.every(Boolean) : results.some(Boolean))) return false;
      }

      return true;
    });

    return { blueprint, currentStage, availableTransitions, lockedFields, phases, canInitialize };
  }

  // ── Runtime: initialize a record to a starting stage ─────────────────────

  async initializeRecord(recordId: string, stageId: string, userId: string, orgId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
    });
    if (!blueprint) throw new NotFoundException('No active blueprint for this module');

    const phases = (blueprint.phases as unknown as BlueprintPhase[]) || [];
    const phase  = phases.find(p => p.id === stageId);
    if (!phase) throw new BadRequestException('Invalid stage');

    // Ensure record doesn't already have a stage
    const recordData   = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];
    const currentStage = phases.find(p => p.id === currentValue || p.name === currentValue);
    if (currentStage) throw new BadRequestException('Record already has a stage set');

    const newData = { ...recordData, [blueprint.statusFieldName]: phase.id };
    await this.prisma.record.update({ where: { id: recordId }, data: { data: newData, updatedById: userId } });

    await this.prisma.auditLog.create({
      data: {
        entityId:       recordId,
        entityType:     'record',
        action:         'BLUEPRINT_INITIALIZED',
        metadata:       { stage: phase.id, stageName: phase.name },
        userId,
        organizationId: orgId,
      },
    });

    this.gateway.emitToOrg(orgId, 'blueprint:stage:changed', {
      recordId,
      fromStage: null,
      toStage:   phase.id,
      stageName: phase.name,
    });

    return { status: 'initialized', stageId: phase.id, stageName: phase.name };
  }

  // ── Runtime: execute a transition ─────────────────────────────────────────

  async executeTransition(
    recordId: string,
    transitionId: string,
    userId: string,
    orgId: string,
    formData: Record<string, any> = {},
  ) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
    });
    if (!blueprint) throw new NotFoundException('No active blueprint for this module');

    const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];
    const phases      = (blueprint.phases as unknown as BlueprintPhase[]) || [];
    const transition  = transitions.find(t => t.id === transitionId);
    if (!transition) throw new NotFoundException('Transition not found');

    const recordData   = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];
    const currentPhase = phases.find(p => p.id === currentValue || p.name === currentValue);

    const isCommonTransition = transition.isCommon === true || transition.fromPhaseId === '*';
    if (!isCommonTransition && transition.fromPhaseId !== currentPhase?.id) {
      throw new BadRequestException('This transition is not valid from the current stage');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    const isAdminOrSuper = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    if (!isAdminOrSuper) {
      const hasRole = !transition.allowedRoles?.length || transition.allowedRoles.includes(user?.role ?? '');
      const hasUser = !transition.allowedUsers?.length || transition.allowedUsers.includes(userId);
      if (!hasRole && !hasUser) {
        throw new ForbiddenException('You do not have permission to execute this transition');
      }
    }

    if (transition.requiredFields?.length) {
      const missing = transition.requiredFields.filter(f => {
        const v = formData[f] ?? recordData[f];
        return v === null || v === undefined || v === '';
      });
      if (missing.length) {
        throw new BadRequestException(`Required fields missing: ${missing.join(', ')}`);
      }
    }

    const targetPhase  = phases.find(p => p.id === transition.toPhaseId);
    const newStageValue = targetPhase?.id ?? transition.toPhaseId;

    // Approval required — create pending task
    if (transition.requiresApproval && transition.approvalRoles?.length) {
      await this.prisma.blueprintTask.create({
        data: {
          blueprintId:    blueprint.id,
          recordId,
          moduleId:       record.moduleId,
          transitionId,
          transitionName: transition.name,
          fromStage:      currentPhase?.id ?? '',
          toStage:        transition.toPhaseId,
          assignedRole:   transition.approvalRoles[0],
          organizationId: orgId,
          status:         'pending',
        },
      });

      await this.notifyByRoles(transition.approvalRoles, orgId, {
        title:   `Approval Required: ${transition.name}`,
        message: `${user?.firstName ?? 'A user'} requested to execute "${transition.name}" and needs your approval.`,
        type:    'INFO',
      });

      this.gateway.emitToOrg(orgId, 'blueprint:task:created', {
        recordId, transitionId, transitionName: transition.name,
      });

      return { status: 'pending_approval', message: 'Approval request sent' };
    }

    // No approval — update record stage directly
    const newData = { ...recordData, ...formData, [blueprint.statusFieldName]: newStageValue };
    await this.prisma.record.update({
      where: { id: recordId },
      data: { data: newData, updatedById: userId },
    });

    await this.prisma.auditLog.create({
      data: {
        action:         'RECORD_UPDATED',
        entityType:     'record',
        entityId:       recordId,
        userId,
        organizationId: orgId,
        metadata: {
          blueprintTransition: transition.name,
          fromStage:           currentPhase?.name ?? currentValue,
          toStage:             targetPhase?.name ?? newStageValue,
        },
      },
    });

    if (transition.notifyRoles?.length) {
      await this.notifyByRoles(transition.notifyRoles, orgId, {
        title:   `Stage Changed: ${transition.name}`,
        message: `A record moved from "${currentPhase?.name}" to "${targetPhase?.name}".`,
        type:    'INFO',
      });
    }

    this.gateway.emitToOrg(orgId, 'blueprint:stage:changed', {
      recordId,
      moduleId:       record.moduleId,
      fromStage:      currentPhase?.id,
      toStage:        newStageValue,
      transitionName: transition.name,
    });

    return {
      status:   'completed',
      newStage: newStageValue,
      message:  `Moved to "${targetPhase?.name ?? newStageValue}"`,
    };
  }

  // ── Pending tasks ────────────────────────────────────────────────────────

  async getMyBlueprintTasks(userId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { role: true },
    });

    return this.prisma.blueprintTask.findMany({
      where: {
        organizationId: orgId,
        status: 'pending',
        OR: [
          { assignedToId: userId },
          { assignedRole: user?.role ?? '' },
        ],
      },
      include: {
        blueprint: {
          select: {
            id: true, name: true, statusFieldName: true, moduleId: true,
            module: { select: { id: true, name: true, slug: true, icon: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBlueprintTasksForRecord(recordId: string, orgId: string) {
    return this.prisma.blueprintTask.findMany({
      where: { recordId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeBlueprintTask(
    taskId: string,
    action: 'approve' | 'reject',
    comment: string | undefined,
    userId: string,
    orgId: string,
  ) {
    const task = await this.prisma.blueprintTask.findFirst({
      where: { id: taskId, organizationId: orgId, status: 'pending' },
      include: { blueprint: true },
    });
    if (!task) throw new NotFoundException('Task not found or already completed');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { role: true },
    });
    const isAdminOrSuper = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    if (!isAdminOrSuper && task.assignedToId !== userId && task.assignedRole !== user?.role) {
      throw new ForbiddenException('You cannot act on this task');
    }

    await this.prisma.blueprintTask.update({
      where: { id: taskId },
      data: { status: action === 'approve' ? 'approved' : 'rejected', comment },
    });

    if (action === 'approve') {
      const record = await this.prisma.record.findFirst({
        where: { id: task.recordId, organizationId: orgId, isDeleted: false },
      });
      if (record) {
        const recordData = (record.data as any) || {};
        await this.prisma.record.update({
          where: { id: task.recordId },
          data: {
            data: { ...recordData, [task.blueprint.statusFieldName]: task.toStage },
            updatedById: userId,
          },
        });

        this.gateway.emitToOrg(orgId, 'blueprint:stage:changed', {
          recordId:       task.recordId,
          moduleId:       task.moduleId,
          fromStage:      task.fromStage,
          toStage:        task.toStage,
          transitionName: task.transitionName,
          approvedBy:     userId,
        });
      }
    }

    return { status: action === 'approve' ? 'approved' : 'rejected' };
  }

  // ── Validate transition (for Kanban drag-and-drop) ───────────────────────

  async validateTransition(
    moduleId: string,
    fromStage: string,
    toStage: string,
    userId: string,
    orgId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId, organizationId: orgId, isActive: true },
    });
    if (!blueprint) return { allowed: true }; // No blueprint = no restrictions

    const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];
    const allowed = transitions.some(
      t => t.toPhaseId === toStage && (
        t.fromPhaseId === fromStage ||
        t.isCommon === true ||
        t.fromPhaseId === '*'
      ),
    );

    if (!allowed) {
      return {
        allowed: false,
        reason: `No transition defined from "${fromStage}" to "${toStage}" in this blueprint`,
      };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { role: true },
    });
    const isAdminOrSuper = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

    const matchingTransitions = transitions.filter(
      t => t.toPhaseId === toStage && (
        t.fromPhaseId === fromStage ||
        t.isCommon === true ||
        t.fromPhaseId === '*'
      ),
    );

    if (!isAdminOrSuper) {
      const permitted = matchingTransitions.some(t => {
        const hasRole = !t.allowedRoles?.length || t.allowedRoles.includes(user?.role ?? '');
        const hasUser = !t.allowedUsers?.length || t.allowedUsers.includes(userId);
        return hasRole || hasUser;
      });
      if (!permitted) {
        return { allowed: false, reason: 'You do not have permission for this transition' };
      }
    }

    return { allowed: true };
  }

  // ── Tree evaluation (legacy) ─────────────────────────────────────────────

  evaluateTree(treeData: any, recordData: any): { actions: any[] } {
    if (!treeData?.nodes?.length) return { actions: [] };
    const nodes: any[] = treeData.nodes;
    const out: any[] = [];
    const roots = nodes.filter((n: any) => !n.parentId);
    if (roots.length) this.walkNode(roots[0], nodes, recordData, out);
    return { actions: out };
  }

  private walkNode(node: any, allNodes: any[], data: any, out: any[]) {
    const children = allNodes.filter((n: any) => n.parentId === node.id);
    if (node.type === 'phase') {
      this.processChildren(children, allNodes, data, out);
    } else if (node.type === 'condition') {
      if (node.branchType === 'else') {
        this.processChildren(children, allNodes, data, out);
      } else {
        if (this.evalCondGroup(node.conditions, node.conditionsLogic, data)) {
          this.processChildren(children, allNodes, data, out);
        }
      }
    } else if (node.type === 'action') {
      out.push(...(node.actions ?? []));
    }
  }

  private processChildren(children: any[], allNodes: any[], data: any, out: any[]) {
    const conds = children.filter((c: any) => c.type === 'condition');
    const acts  = children.filter((c: any) => c.type === 'action');
    let i = 0;
    while (i < conds.length) {
      if (conds[i].branchType !== 'if') { i++; continue; }
      const chain = [conds[i]];
      let j = i + 1;
      while (j < conds.length && conds[j].branchType !== 'if') { chain.push(conds[j]); j++; }
      for (const n of chain) {
        if (n.branchType === 'else') { this.walkNode(n, allNodes, data, out); break; }
        if (this.evalCondGroup(n.conditions, n.conditionsLogic, data)) { this.walkNode(n, allNodes, data, out); break; }
      }
      i = j;
    }
    for (const a of acts) this.walkNode(a, allNodes, data, out);
  }

  private evalCondGroup(conds: any[], logic: string, data: any): boolean {
    if (!conds?.length) return true;
    const results = conds.map((c: any) => this.evalCondition(c, data));
    return (logic ?? 'AND') === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  async evaluateForRecord(recordId: string, orgId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId: orgId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
    });
    if (!blueprint) {
      return { blueprint: null, currentPhase: null, lockedFields: [], availableTransitions: [], treeActions: [] };
    }

    const phases      = (blueprint.phases as any[]) || [];
    const transitions = (blueprint.transitions as any[]) || [];
    const fieldLocks  = (blueprint.fieldLocks as any) || {};
    const recordData  = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];

    const currentPhase = phases.find((p: any) => p.id === currentValue || p.name === currentValue) ?? null;
    const lockedFields: string[] = currentPhase
      ? (fieldLocks[currentPhase.id] || fieldLocks[currentPhase.name] || [])
      : [];

    const availableTransitions = transitions.filter((t: any) => {
      if (t.fromPhaseId !== currentPhase?.id) return false;
      if (!t.conditions?.length) return true;
      const results = (t.conditions as any[]).map((c: any) => this.evalCondition(c, recordData));
      return (t.conditionsLogic || 'AND') === 'AND' ? results.every(Boolean) : results.some(Boolean);
    });

    const treeActions = blueprint.treeData
      ? this.evaluateTree(blueprint.treeData, recordData).actions
      : [];

    return { blueprint, currentPhase, lockedFields, availableTransitions, treeActions };
  }

  private evalCondition(cond: any, data: Record<string, any>): boolean {
    const v  = data[cond.fieldName];
    const rv = String(cond.value ?? '');
    switch (cond.operator) {
      case 'equals':     return String(v ?? '') === rv;
      case 'not_equals': return String(v ?? '') !== rv;
      case 'contains':   return String(v ?? '').toLowerCase().includes(rv.toLowerCase());
      case 'gt':         return Number(v) > Number(rv);
      case 'lt':         return Number(v) < Number(rv);
      case 'gte':        return Number(v) >= Number(rv);
      case 'lte':        return Number(v) <= Number(rv);
      case 'is_empty':   return v === null || v === undefined || v === '';
      case 'not_empty':  return v !== null && v !== undefined && v !== '';
      default:           return false;
    }
  }

  // ── Stage history for record ─────────────────────────────────────────────

  async getStageHistory(recordId: string, orgId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityId: recordId,
        entityType: 'record',
        organizationId: orgId,
        action: { in: ['RECORD_UPDATED', 'BLUEPRINT_INITIALIZED'] },
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    const history: {
      fromStage: string | null;
      toStage: string;
      transitionName: string | null;
      timestamp: string;
      user: { id: string; firstName: string; lastName: string } | null;
    }[] = [];

    for (const log of logs) {
      const meta = (log.metadata as any) || {};
      if (log.action === 'BLUEPRINT_INITIALIZED' && meta.stage) {
        history.push({
          fromStage: null,
          toStage: meta.stage,
          transitionName: null,
          timestamp: log.createdAt.toISOString(),
          user: (log as any).user ?? null,
        });
      } else if (log.action === 'RECORD_UPDATED' && meta.blueprintTransition) {
        history.push({
          fromStage: meta.fromStage ?? null,
          toStage: meta.toStage,
          transitionName: meta.blueprintTransition,
          timestamp: log.createdAt.toISOString(),
          user: (log as any).user ?? null,
        });
      }
    }

    return history;
  }

  private async notifyByRoles(
    roles: string[],
    orgId: string,
    notifData: { title: string; message: string; type?: string; link?: string },
  ) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: orgId, role: { in: roles as any[] } },
      select: { id: true },
    });
    await Promise.all(users.map(u => this.notifications.create(u.id, orgId, notifData)));
  }
}
