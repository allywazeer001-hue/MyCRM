import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../websocket/app.gateway';
import { WorkflowsService } from '../workflows/workflows.service';
import {
  normalizeConditionTree as normalizeTransitionConditions,
  evaluateNode as evaluateConditionNode,
  evaluateLeaf,
} from './condition-tree';
import { getLockInfoForRecordData, normalizeStageLock, canOverrideLock } from './field-lock';

// ── JSON-shape types (stored as Json in Prisma) ────────────────────────────

export interface BlueprintPhase {
  id: string;
  name: string;
  color: string;
  order: number;
  x?: number;
  y?: number;
}

export type BlueprintTransitionType =
  | 'manual'
  | 'approval'
  | 'condition'
  | 'workflow'
  | 'schedule'
  | 'webhook'
  | 'system_event';

export type BlueprintWorkflowTrigger =
  | 'always'
  | 'on_create'
  | 'on_edit'
  | 'on_status_change'
  | 'on_form_submit';

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
  conditions: any; // flat array (legacy) or a nested ConditionGroup tree — see ./condition-tree.ts
  conditionsLogic?: 'AND' | 'OR'; // legacy-only; ignored once `conditions` is tree-shaped
  requiresApproval: boolean;
  approvalRoles: string[];
  notifyRoles: string[];
  notifyUsers: string[];
  confirmMessage?: string;

  // Transition type — defaults to 'manual' when absent (100% backward compatible
  // with every transition stored before this field existed).
  transitionType?: BlueprintTransitionType;

  // Workflow-type config — links this transition to a centrally-managed Workflow
  // entity (backend/src/workflows) instead of duplicating condition/action config
  // inline on the blueprint. `workflowTriggerType` still controls WHEN to check;
  // the linked workflow's own rule groups decide what fires.
  workflowTriggerType?: BlueprintWorkflowTrigger;
  workflowId?: string;

  // Schedule-type config
  scheduleMode?: 'offset' | 'datetime' | 'cron';
  scheduleOffsetValue?: number;
  scheduleOffsetUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  scheduleDateTime?: string;
  scheduleCron?: string;
}

@Injectable()
export class BlueprintsService {
  private readonly logger = new Logger(BlueprintsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gateway: AppGateway,
    private workflows: WorkflowsService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────────

  async findAll(orgId: string) {
    return this.prisma.blueprint.findMany({
      where: { organizationId: orgId },
      include: {
        module: { select: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getManagedTagsForModule(moduleId: string, orgId: string): Promise<string[]> {
    const tags = new Set<string>();

    const bp = await this.prisma.blueprint.findFirst({
      where: { moduleId, organizationId: orgId, isActive: true },
    });
    if (bp) {
      for (const t of (bp.transitions as any[]) ?? []) {
        for (const tu of t.tagUpdates ?? []) {
          for (const tag of tu.tags ?? []) tags.add(String(tag));
        }
        for (const action of t.actions ?? []) {
          if (['add_tags', 'remove_tags'].includes(action.type)) {
            for (const tag of action.config?.tags ?? []) tags.add(String(tag));
          }
        }
      }
    }

    const workflows = await this.prisma.workflow.findMany({
      where: { moduleId, organizationId: orgId, isActive: true },
      include: { actions: true },
    });
    for (const wf of workflows) {
      for (const action of wf.actions) {
        if (['ADD_TAGS', 'REMOVE_TAGS', 'SET_TAGS'].includes(action.type)) {
          const cfg = action.config as any;
          for (const tag of cfg?.tags ?? []) tags.add(String(tag));
        }
      }
    }

    return Array.from(tags);
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

    const bp = await this.prisma.blueprint.create({
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
    await this.syncWorkflowLinks(bp.id, orgId, (data.transitions ?? []) as BlueprintTransition[]);
    return bp;
  }

  async update(id: string, orgId: string, data: any) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');

    // While a blueprint is switched on, its stages/transitions can only grow — removing one
    // could instantly orphan in-flight records or break a transition another stage depends
    // on. Turning the blueprint off first (isActive: false, in this same request or a prior
    // one) unlocks full editing again. Adding new stages/transitions is always allowed.
    const effectiveIsActive = data.isActive !== undefined ? Boolean(data.isActive) : bp.isActive;
    if (effectiveIsActive) {
      if (data.phases !== undefined) {
        const oldIds = new Set(((bp.phases as any[]) ?? []).map((p: any) => p.id));
        const newIds = new Set(((data.phases as any[]) ?? []).map((p: any) => p.id));
        const removed = [...oldIds].filter((pid) => !newIds.has(pid));
        if (removed.length) {
          throw new BadRequestException(
            'Cannot remove stages from an active blueprint. Turn it off first, or add stages instead of removing them.',
          );
        }
      }
      if (data.transitions !== undefined) {
        const oldIds = new Set(((bp.transitions as any[]) ?? []).map((t: any) => t.id));
        const newIds = new Set(((data.transitions as any[]) ?? []).map((t: any) => t.id));
        const removed = [...oldIds].filter((tid) => !newIds.has(tid));
        if (removed.length) {
          throw new BadRequestException(
            'Cannot remove transitions from an active blueprint. Turn it off first, or add transitions instead of removing them.',
          );
        }
      }
    }

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

    const updated = await this.prisma.blueprint.update({ where: { id }, data: safe });
    if (data.transitions !== undefined) {
      await this.syncWorkflowLinks(id, orgId, data.transitions as BlueprintTransition[]);
    }
    return updated;
  }

  // Links (or unlinks) a specific transition to a centrally-managed Workflow
  // entity. Used both when linking an existing workflow (same-tab edit, saved
  // normally via `update`) and when a workflow is created in a separate tab
  // (that tab has no access to this blueprint's in-memory draft, so it calls
  // this endpoint directly to persist the link once it has a real workflow id).
  async linkWorkflowToTransition(id: string, transitionId: string, orgId: string, workflowId: string | null) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');

    const transitions = ((bp.transitions as unknown as BlueprintTransition[]) || []).slice();
    const idx = transitions.findIndex(t => t.id === transitionId);
    if (idx === -1) throw new NotFoundException('Transition not found');

    transitions[idx] = { ...transitions[idx], workflowId: workflowId ?? undefined };

    const updated = await this.prisma.blueprint.update({
      where: { id },
      data: { transitions: transitions as any, version: (bp.version ?? 1) + 1 },
    });
    await this.syncWorkflowLinks(id, orgId, transitions);
    return updated;
  }

  // Keeps each linked Workflow's own back-reference (linkedBlueprintId/
  // linkedTransitionId) in sync with this blueprint's transitions — this is what
  // lets the Workflow engine exclude blueprint-linked workflows from firing via
  // their own native trigger (see WorkflowsService.executeForRecord), so a linked
  // workflow only ever runs through its specific transition, never "anywhere".
  private async syncWorkflowLinks(blueprintId: string, orgId: string, transitions: BlueprintTransition[]): Promise<void> {
    const linkedWorkflowIds = Array.from(new Set(transitions.map(t => t.workflowId).filter(Boolean))) as string[];

    // Clear stale back-references: a workflow that used to point to this
    // blueprint but is no longer referenced by any current transition.
    await this.prisma.workflow.updateMany({
      where: {
        organizationId: orgId,
        linkedBlueprintId: blueprintId,
        ...(linkedWorkflowIds.length > 0 ? { id: { notIn: linkedWorkflowIds } } : {}),
      },
      data: { linkedBlueprintId: null, linkedTransitionId: null },
    }).catch(() => {});

    for (const t of transitions) {
      if (!t.workflowId) continue;
      await this.prisma.workflow.updateMany({
        where: { id: t.workflowId, organizationId: orgId },
        data: { linkedBlueprintId: blueprintId, linkedTransitionId: t.id },
      }).catch(() => {});
    }
  }

  async remove(id: string, orgId: string) {
    const bp = await this.prisma.blueprint.findFirst({ where: { id, organizationId: orgId } });
    if (!bp) throw new NotFoundException('Blueprint not found');
    await this.prisma.workflow.updateMany({
      where: { organizationId: orgId, linkedBlueprintId: id },
      data: { linkedBlueprintId: null, linkedTransitionId: null },
    }).catch(() => {});
    await this.prisma.$executeRaw`DELETE FROM blueprint_tasks WHERE blueprintId = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM blueprints WHERE id = ${id}`;
    return { deleted: true };
  }

  // ── Runtime: available transitions for a record ──────────────────────────

  async getAvailableTransitions(recordId: string, userId: string, orgId: string) {
    // Place a stage-less record (never started, or predating this blueprint)
    // into the first phase before computing anything below — stages start
    // by default, no manual "Start Process" step required.
    await this.autoInitializeIfNeeded(recordId, orgId, userId);

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

    const stageLock = currentStage
      ? normalizeStageLock(fieldLocks[currentStage.id] ?? fieldLocks[currentStage.name], blueprint.id, currentStage.id)
      : null;
    const lockedFields: string[] = stageLock?.fields ?? [];
    const canOverrideLockedFields = !!(stageLock && user && canOverrideLock(stageLock, user));

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

      const conditionTree = normalizeTransitionConditions(t.conditions, t.conditionsLogic);
      if (!evaluateConditionNode(conditionTree, recordData)) return false;

      return true;
    });

    return { blueprint, currentStage, availableTransitions, lockedFields, canOverrideLockedFields, phases, canInitialize };
  }

  // ── Runtime: auto-place a freshly created record into the first stage ────
  // Without this, a record created without an explicit status/stage value
  // sits outside every phase forever, and on_create/on_edit automatic
  // transitions can never fire for it (they require a valid current stage).

  async autoInitializeIfNeeded(recordId: string, orgId: string, userId: string): Promise<void> {
    try {
      const record = await this.prisma.record.findFirst({
        where: { id: recordId, organizationId: orgId, isDeleted: false },
      });
      if (!record) return;

      const blueprint = await this.prisma.blueprint.findFirst({
        where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
      });
      if (!blueprint) return;

      const phases = ((blueprint.phases as unknown as BlueprintPhase[]) || [])
        .slice()
        .sort((a, b) => a.order - b.order);
      if (!phases.length) return;

      const recordData   = (record.data as any) || {};
      const currentValue = recordData[blueprint.statusFieldName];
      const alreadyStaged = phases.some(p => p.id === currentValue || p.name === currentValue);
      if (alreadyStaged) return;

      const startPhase = phases[0];
      const newData = { ...recordData, [blueprint.statusFieldName]: startPhase.id };
      await this.prisma.record.update({ where: { id: recordId }, data: { data: newData, updatedById: userId } });

      await this.prisma.auditLog.create({
        data: {
          entityId:       recordId,
          entityType:     'record',
          action:         'BLUEPRINT_INITIALIZED',
          metadata:       { stage: startPhase.id, stageName: startPhase.name, auto: true },
          userId,
          organizationId: orgId,
        },
      });

      this.gateway.emitToOrg(orgId, 'blueprint:stage:changed', {
        recordId,
        fromStage: null,
        toStage:   startPhase.id,
        stageName: startPhase.name,
      });
    } catch (err) {
      this.logger.error(
        `autoInitializeIfNeeded failed for record ${recordId}: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
    }
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

    // Generate Request (blocks transition) — send to role/dept/users for processing
    const gen = (transition as any).generateRequest;
    const genBlocks = (transition as any).requestBlocksTransition;
    if (gen && genBlocks) {
      const modes: string[] = (transition as any).requestAssignModes ?? [];
      const roles: string[] = (transition as any).requestRoles ?? [];
      const depts: string[] = (transition as any).requestDepts ?? [];
      const userIds: string[] = (transition as any).requestUsers ?? [];
      const sentNote: string = (transition as any).requestNote ?? '';

      // Resolve users by role/dept
      const resolvedUserIds: Set<string> = new Set(userIds);
      if (modes.includes('role') && roles.length) {
        const byRole = await this.prisma.user.findMany({
          where: { organizationId: orgId, teamRole: { in: roles }, isActive: true },
          select: { id: true },
        });
        byRole.forEach(u => resolvedUserIds.add(u.id));
      }
      if (modes.includes('department') && depts.length) {
        const byDept = await this.prisma.user.findMany({
          where: { organizationId: orgId, department: { name: { in: depts } }, isActive: true },
          select: { id: true },
        });
        byDept.forEach(u => resolvedUserIds.add(u.id));
      }

      const reqTitle: string    = (transition as any).requestTitle ?? transition.name;
      const reqPriority: string = (transition as any).requestPriority ?? 'medium';
      const reqDueDays: number  = (transition as any).requestDueDays ?? 0;
      const dueDate = reqDueDays > 0
        ? new Date(Date.now() + reqDueDays * 86_400_000)
        : null;

      const createData = {
        blueprintId:    blueprint.id,
        recordId,
        moduleId:       record.moduleId,
        transitionId,
        transitionName: transition.name,
        fromStage:      currentPhase?.id ?? '',
        toStage:        transition.toPhaseId,
        organizationId: orgId,
        status:         'pending',
        requestType:    'request',
        sentNote:       sentNote || null,
        title:          reqTitle || null,
        priority:       reqPriority || 'medium',
        dueDate:        dueDate,
      };

      if (resolvedUserIds.size > 0) {
        for (const uid2 of resolvedUserIds) {
          await this.prisma.blueprintTask.create({ data: { ...createData, assignedToId: uid2 } });
        }
      } else if (modes.includes('role') && roles.length) {
        await this.prisma.blueprintTask.create({ data: { ...createData, assignedRole: roles[0] } });
      } else {
        await this.prisma.blueprintTask.create({ data: createData });
      }

      this.gateway.emitToOrg(orgId, 'blueprint:task:created', {
        recordId, transitionId, transitionName: transition.name,
      });

      return { status: 'pending_request', message: 'Request sent — awaiting processing' };
    }

    // Approval required — create pending task (legacy/alternative to generateRequest)
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
          requestType:    'approval',
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

    // Generate Request (non-blocking) — create task but still advance the stage
    if (gen && !genBlocks) {
      const modes: string[] = (transition as any).requestAssignModes ?? [];
      const roles: string[] = (transition as any).requestRoles ?? [];
      const depts: string[] = (transition as any).requestDepts ?? [];
      const userIds: string[] = (transition as any).requestUsers ?? [];
      const sentNote: string = (transition as any).requestNote ?? '';

      const resolvedUserIds: Set<string> = new Set(userIds);
      if (modes.includes('role') && roles.length) {
        const byRole = await this.prisma.user.findMany({
          where: { organizationId: orgId, teamRole: { in: roles }, isActive: true },
          select: { id: true },
        });
        byRole.forEach(u => resolvedUserIds.add(u.id));
      }
      if (modes.includes('department') && depts.length) {
        const byDept = await this.prisma.user.findMany({
          where: { organizationId: orgId, department: { name: { in: depts } }, isActive: true },
          select: { id: true },
        });
        byDept.forEach(u => resolvedUserIds.add(u.id));
      }

      const reqTitle2: string    = (transition as any).requestTitle ?? transition.name;
      const reqPriority2: string = (transition as any).requestPriority ?? 'medium';
      const reqDueDays2: number  = (transition as any).requestDueDays ?? 0;
      const dueDate2 = reqDueDays2 > 0
        ? new Date(Date.now() + reqDueDays2 * 86_400_000)
        : null;

      const createData = {
        blueprintId:    blueprint.id,
        recordId,
        moduleId:       record.moduleId,
        transitionId,
        transitionName: transition.name,
        fromStage:      currentPhase?.id ?? '',
        toStage:        transition.toPhaseId,
        organizationId: orgId,
        status:         'pending',
        requestType:    'request',
        sentNote:       sentNote || null,
        title:          reqTitle2 || null,
        priority:       reqPriority2 || 'medium',
        dueDate:        dueDate2,
      };

      if (resolvedUserIds.size > 0) {
        for (const uid2 of resolvedUserIds) {
          await this.prisma.blueprintTask.create({ data: { ...createData, assignedToId: uid2 } });
        }
      } else if (modes.includes('role') && roles.length) {
        await this.prisma.blueprintTask.create({ data: { ...createData, assignedRole: roles[0] } });
      } else {
        await this.prisma.blueprintTask.create({ data: createData });
      }
    }

    // No approval — update record stage directly
    return this.applyTransition({
      blueprint, transition, record, currentPhase, targetPhase, formData, userId, orgId,
    });
  }

  // ── Shared core: mutate stage, run actions, audit, notify, broadcast ─────
  // Used by every trigger type (manual, approval, condition, workflow, schedule)
  // so side-effects are identical regardless of how the transition fired.

  private async applyTransition(params: {
    blueprint: any;
    transition: BlueprintTransition;
    record: any;
    currentPhase: BlueprintPhase | undefined;
    targetPhase: BlueprintPhase | undefined;
    formData: Record<string, any>;
    userId: string;
    orgId: string;
  }): Promise<{ status: 'completed'; newStage: string; message: string }> {
    const { blueprint, transition, record, currentPhase, targetPhase, formData, userId, orgId } = params;
    const recordId = record.id;
    const recordData = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];
    const newStageValue = targetPhase?.id ?? transition.toPhaseId;

    let newData: Record<string, any> = { ...recordData, ...formData, [blueprint.statusFieldName]: newStageValue };

    // Resolved once against the record's stage prior to this transition — an
    // `update_field` action can't silently rewrite a field the record's current
    // stage has locked unless that specific action opts in via allowLockOverride.
    const fieldLock = await getLockInfoForRecordData(this.prisma, record.moduleId, orgId, recordData);

    // Process unified action list
    for (const action of (transition as any).actions ?? []) {
      const cfg: Record<string, any> = action.config ?? {};
      switch (action.type) {
        case 'add_tags': {
          const existing: string[] = Array.isArray(newData._tags) ? newData._tags : [];
          const toAdd: string[] = Array.isArray(cfg.tags) ? cfg.tags : [];
          newData._tags = [...new Set([...existing, ...toAdd])];
          break;
        }
        case 'remove_tags': {
          const existing: string[] = Array.isArray(newData._tags) ? newData._tags : [];
          const toRemove: string[] = Array.isArray(cfg.tags) ? cfg.tags : [];
          newData._tags = existing.filter((t: string) => !toRemove.includes(t));
          break;
        }
        case 'update_field': {
          if (!cfg.field) break;
          if (fieldLock && fieldLock.fields.includes(cfg.field) && !cfg.allowLockOverride) break;
          newData[cfg.field] = cfg.value ?? null;
          break;
        }
        case 'assign_user': {
          if (cfg.userId) newData._assignedUserId = cfg.userId;
          break;
        }
        case 'assign_role': {
          if (cfg.role) newData._assignedRole = cfg.role;
          break;
        }
        case 'assign_department': {
          if (cfg.department) newData._assignedDepartment = cfg.department;
          break;
        }
        case 'lock_record': {
          newData._locked = true;
          break;
        }
        case 'lock_fields': {
          const locked: string[] = Array.isArray(newData._lockedFields) ? newData._lockedFields : [];
          const toAdd: string[] = Array.isArray(cfg.fields) ? cfg.fields : [];
          newData._lockedFields = [...new Set([...locked, ...toAdd])];
          break;
        }
        case 'unlock_fields': {
          const locked: string[] = Array.isArray(newData._lockedFields) ? newData._lockedFields : [];
          const toRemove: string[] = Array.isArray(cfg.fields) ? cfg.fields : [];
          newData._lockedFields = locked.filter((f: string) => !toRemove.includes(f));
          break;
        }
      }
    }

    await this.prisma.record.update({
      where: { id: recordId },
      data: { data: newData, updatedById: userId },
    });

    this.workflows.executeForRecord(
      'RECORD_UPDATED',
      record.moduleId,
      orgId,
      { ...record, id: recordId, data: newData },
      recordData,
    ).catch(() => {});
    // A transition updates the record directly (above), never going through
    // RecordsService.update — so FIELD_CHANGED workflows need their own dispatch here
    // too, exactly like RECORD_UPDATED, or a workflow watching e.g. the status field
    // never fires when that field only ever changes via a transition button.
    this.workflows.executeForRecord(
      'FIELD_CHANGED',
      record.moduleId,
      orgId,
      { ...record, id: recordId, data: newData },
      recordData,
    ).catch(() => {});

    if (transition.transitionType === 'workflow' && transition.workflowId) {
      this.workflows.executeWorkflowById(
        transition.workflowId,
        orgId,
        { ...record, id: recordId, data: newData },
        recordData,
      ).catch((err) => {
        this.logger.error(`Linked workflow ${transition.workflowId} failed for transition "${transition.name}": ${err?.message}`);
      });
    }

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

    await this.handleScheduleLifecycle(blueprint, recordId, orgId, currentPhase, targetPhase);

    return {
      status:   'completed',
      newStage: newStageValue,
      message:  `Moved to "${targetPhase?.name ?? newStageValue}"`,
    };
  }

  // ── Automatic transitions: Condition + Workflow types ────────────────────
  // Called reactively after a record is saved. Fires at most one matching
  // transition per call — chained auto-transitions wait for the next save.

  async evaluateAutomaticTransitions(
    recordId: string,
    orgId: string,
    userId: string,
    trigger: 'on_create' | 'on_edit' | 'on_form_submit',
    changedFields: string[] = [],
    previousData?: Record<string, any>,
  ): Promise<void> {
    try {
      // Any record without a stage yet (never explicitly started, or created
      // before this blueprint existed) is placed into the first phase right
      // here — automation isn't gated behind a manual "Start Process" step.
      await this.autoInitializeIfNeeded(recordId, orgId, userId);

      const record = await this.prisma.record.findFirst({
        where: { id: recordId, organizationId: orgId, isDeleted: false },
      });
      if (!record) return;

      const blueprint = await this.prisma.blueprint.findFirst({
        where: { moduleId: record.moduleId, organizationId: orgId, isActive: true },
      });
      if (!blueprint) return;

      const phases      = (blueprint.phases as unknown as BlueprintPhase[]) || [];
      const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];
      const recordData  = (record.data as any) || {};
      const currentValue = recordData[blueprint.statusFieldName];
      const currentPhase = phases.find(p => p.id === currentValue || p.name === currentValue);
      if (!currentPhase) {
        // No phases defined on this blueprint at all — nothing to place it into.
        this.logger.debug(
          `evaluateAutomaticTransitions: record ${recordId} still has no valid stage ` +
          `(statusFieldName="${blueprint.statusFieldName}", value=${JSON.stringify(currentValue)}) — skipping`,
        );
        return;
      }

      const statusChanged = changedFields.includes(blueprint.statusFieldName);

      const candidates = transitions.filter(t => {
        const isCommon = t.isCommon === true || t.fromPhaseId === '*';
        if (!isCommon && t.fromPhaseId !== currentPhase.id) return false;

        const type = t.transitionType ?? 'manual';
        if (type === 'condition') return true;
        if (type === 'workflow') {
          switch (t.workflowTriggerType) {
            case 'on_create':        return trigger === 'on_create';
            case 'on_edit':           return trigger === 'on_edit';
            case 'on_form_submit':    return trigger === 'on_form_submit';
            case 'on_status_change':  return statusChanged;
            case 'always':
            default:
              // No trigger picked, or explicitly "always" — re-evaluate on every save.
              return true;
          }
        }
        return false;
      });

      for (const t of candidates) {
        const conditionTree = normalizeTransitionConditions(t.conditions, t.conditionsLogic);
        if (!evaluateConditionNode(conditionTree, recordData, changedFields, previousData)) continue;

        const targetPhase = phases.find(p => p.id === t.toPhaseId);
        await this.applyTransition({
          blueprint, transition: t, record, currentPhase, targetPhase,
          formData: {}, userId, orgId,
        });
        break; // one automatic transition per save
      }
    } catch (err) {
      // Automatic transitions must never break the record save that triggered them,
      // but the failure must still be visible somewhere — silently swallowing it
      // makes "the workflow didn't fire" impossible to diagnose.
      this.logger.error(
        `evaluateAutomaticTransitions failed for record ${recordId}: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
    }
  }

  // ── Schedule-type transitions ─────────────────────────────────────────────

  private async handleScheduleLifecycle(
    blueprint: any,
    recordId: string,
    orgId: string,
    currentPhase: BlueprintPhase | undefined,
    targetPhase: BlueprintPhase | undefined,
  ): Promise<void> {
    const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];

    // Leaving a phase cancels any pending schedule rows created for transitions
    // that originate from it — a record that moved on shouldn't still fire later.
    if (currentPhase) {
      const leavingIds = transitions
        .filter(t => t.fromPhaseId === currentPhase.id)
        .map(t => t.id);
      if (leavingIds.length) {
        await this.prisma.blueprintScheduledTransition.updateMany({
          where: { recordId, transitionId: { in: leavingIds }, executed: false, cancelled: false },
          data: { cancelled: true },
        });
      }
    }

    // Entering a phase schedules any outgoing schedule-type transitions from it.
    if (targetPhase) {
      const scheduleTransitions = transitions.filter(t => {
        const isCommon = t.isCommon === true || t.fromPhaseId === '*';
        return (t.transitionType ?? 'manual') === 'schedule' && (isCommon || t.fromPhaseId === targetPhase.id);
      });
      for (const t of scheduleTransitions) {
        const fireAt = this.computeScheduleFireAt(t);
        if (!fireAt) continue;
        await this.prisma.blueprintScheduledTransition.create({
          data: { blueprintId: blueprint.id, recordId, transitionId: t.id, organizationId: orgId, fireAt },
        });
      }
    }
  }

  private computeScheduleFireAt(t: BlueprintTransition): Date | null {
    const mode = t.scheduleMode ?? 'offset';
    if (mode === 'datetime') {
      return t.scheduleDateTime ? new Date(t.scheduleDateTime) : null;
    }
    if (mode === 'offset') {
      const value = Number(t.scheduleOffsetValue ?? 0);
      if (!value) return null;
      const unitMs: Record<string, number> = {
        minutes: 60_000,
        hours:   3_600_000,
        days:    86_400_000,
        weeks:   7 * 86_400_000,
        months:  30 * 86_400_000, // approximate — consistent with a simple offset, not calendar-exact
      };
      const ms = unitMs[t.scheduleOffsetUnit ?? 'days'] ?? unitMs.days;
      return new Date(Date.now() + value * ms);
    }
    // 'cron' mode is stored but not yet computed — needs a cron-expression parser,
    // deferred to a later pass. Returns null so no row is created (no silent misfire).
    return null;
  }

  /** Called by BlueprintSchedulerService for a due, non-cancelled scheduled row. */
  async fireScheduledTransition(scheduledId: string): Promise<void> {
    const scheduled = await this.prisma.blueprintScheduledTransition.findFirst({
      where: { id: scheduledId, executed: false, cancelled: false },
      include: { blueprint: true },
    });
    if (!scheduled) return;

    const record = await this.prisma.record.findFirst({
      where: { id: scheduled.recordId, organizationId: scheduled.organizationId, isDeleted: false },
    });
    if (!record) {
      await this.prisma.blueprintScheduledTransition.update({ where: { id: scheduledId }, data: { cancelled: true } });
      return;
    }

    const blueprint   = scheduled.blueprint;
    const phases      = (blueprint.phases as unknown as BlueprintPhase[]) || [];
    const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];
    const transition  = transitions.find(t => t.id === scheduled.transitionId);
    if (!transition) {
      await this.prisma.blueprintScheduledTransition.update({ where: { id: scheduledId }, data: { cancelled: true } });
      return;
    }

    const recordData   = (record.data as any) || {};
    const currentValue = recordData[blueprint.statusFieldName];
    const currentPhase = phases.find(p => p.id === currentValue || p.name === currentValue);

    // Defensive re-check: the record must still be on the phase this schedule fired from.
    const isCommon = transition.isCommon === true || transition.fromPhaseId === '*';
    if (!isCommon && transition.fromPhaseId !== currentPhase?.id) {
      await this.prisma.blueprintScheduledTransition.update({ where: { id: scheduledId }, data: { cancelled: true } });
      return;
    }

    const targetPhase = phases.find(p => p.id === transition.toPhaseId);

    // Mark executed BEFORE applying — applyTransition's own schedule-lifecycle
    // cancels pending rows for transitions leaving the current phase, which
    // includes this very row (its own fromPhaseId matches); marking it executed
    // first excludes it from that cancellation query so it doesn't end up both
    // executed and cancelled.
    await this.prisma.blueprintScheduledTransition.update({ where: { id: scheduledId }, data: { executed: true } });

    await this.applyTransition({
      blueprint, transition, record, currentPhase, targetPhase,
      formData: {}, userId: record.updatedById ?? record.createdById, orgId: scheduled.organizationId,
    });
  }

  // ── Pending tasks ────────────────────────────────────────────────────────

  async getMyBlueprintTaskCount(userId: string, orgId: string): Promise<number> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { teamRole: true },
    });
    return this.prisma.blueprintTask.count({
      where: {
        organizationId: orgId,
        status: 'pending',
        OR: [
          { assignedToId: userId },
          { assignedRole: user?.teamRole ?? '__none__' },
        ],
      },
    });
  }

  async getMyBlueprintTasks(userId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { role: true, teamRole: true },
    });

    const tasks = await this.prisma.blueprintTask.findMany({
      where: {
        organizationId: orgId,
        status: 'pending',
        OR: [
          { assignedToId: userId },
          { assignedRole: user?.teamRole ?? '__none__' },
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

    // Enrich with basic record data for display
    const enriched = await Promise.all(tasks.map(async task => {
      const record = await this.prisma.record.findFirst({
        where: { id: task.recordId },
        select: { data: true },
      });
      return { ...task, recordData: (record?.data as any) ?? {} };
    }));

    return enriched;
  }

  async markTaskSeen(taskId: string, userId: string, orgId: string) {
    const task = await this.prisma.blueprintTask.findFirst({
      where: { id: taskId, organizationId: orgId },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.seenAt) return task; // already seen
    return this.prisma.blueprintTask.update({
      where: { id: taskId },
      data: { seenAt: new Date() },
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
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        comment,
        processedAt: new Date(),
      },
    });

    if (action === 'approve') {
      const record = await this.prisma.record.findFirst({
        where: { id: task.recordId, organizationId: orgId, isDeleted: false },
      });
      if (record) {
        const blueprint = task.blueprint;
        const phases      = (blueprint.phases as unknown as BlueprintPhase[]) || [];
        const transitions = (blueprint.transitions as unknown as BlueprintTransition[]) || [];
        const transition  = transitions.find(t => t.id === task.transitionId);
        const currentPhase = phases.find(p => p.id === task.fromStage || p.name === task.fromStage);
        const targetPhase  = phases.find(p => p.id === task.toStage || p.name === task.toStage);

        if (transition) {
          // Same shared core manual transitions use — approval-driven stage
          // changes now run actions[], hit the Workflows hook, and write the
          // same audit metadata shape as an instant transition.
          await this.applyTransition({
            blueprint, transition, record, currentPhase, targetPhase,
            formData: {}, userId, orgId,
          });
        } else {
          // Fallback for a task whose transition was since deleted from the
          // blueprint — preserves the previous (pre-refactor) minimal behavior.
          const recordData = (record.data as any) || {};
          await this.prisma.record.update({
            where: { id: task.recordId },
            data: {
              data: { ...recordData, [blueprint.statusFieldName]: task.toStage },
              updatedById: userId,
            },
          });
          this.gateway.emitToOrg(orgId, 'blueprint:stage:changed', {
            recordId:       task.recordId,
            moduleId:       task.moduleId,
            fromStage:      task.fromStage,
            toStage:        task.toStage,
            transitionName: task.transitionName,
          });
        }
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
      ? normalizeStageLock(fieldLocks[currentPhase.id] ?? fieldLocks[currentPhase.name], blueprint.id, currentPhase.id).fields
      : [];

    const availableTransitions = transitions.filter((t: any) => {
      if (t.fromPhaseId !== currentPhase?.id) return false;
      return evaluateConditionNode(normalizeTransitionConditions(t.conditions, t.conditionsLogic), recordData);
    });

    const treeActions = blueprint.treeData
      ? this.evaluateTree(blueprint.treeData, recordData).actions
      : [];

    return { blueprint, currentPhase, lockedFields, availableTransitions, treeActions };
  }

  private evalCondition(cond: any, data: Record<string, any>, changedFields: string[] = []): boolean {
    return evaluateLeaf({ type: 'condition', fieldName: cond.fieldName ?? cond.field, operator: cond.operator, value: cond.value }, data, changedFields);
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
