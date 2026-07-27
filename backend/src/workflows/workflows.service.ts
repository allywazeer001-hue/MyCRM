import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';
import { normalizeConditionTree, evaluateNode, validateConditionTree } from './condition-tree';
import { getLockInfoForRecordData } from '../blueprints/field-lock';

const _executingSet = new Map<string, Set<string>>();

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async create(orgId: string, data: any) {
    const { actions = [], ruleGroups, ...rest } = data;
    if (ruleGroups !== undefined) this.validateRuleGroups(ruleGroups);
    return this.prisma.workflow.create({
      data: {
        ...rest,
        organizationId: orgId,
        actions: {
          create: actions.map((a: any, i: number) => ({
            type: a.type,
            config: a.config || {},
            recipientUsers: a.recipientUsers || [],
            recipientDepts: a.recipientDepts || [],
            order: a.order ?? i,
          })),
        },
        ...(ruleGroups !== undefined
          ? { ruleGroups: { create: this.toRuleGroupCreateInput(ruleGroups) } }
          : {}),
      },
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
    });
  }

  private validateRuleGroups(ruleGroups: any[]): void {
    if (!Array.isArray(ruleGroups)) {
      throw new BadRequestException('ruleGroups must be an array');
    }
    for (const group of ruleGroups) {
      try {
        validateConditionTree(normalizeConditionTree(group.conditions));
      } catch (err: any) {
        throw new BadRequestException(`Invalid rule group "${group.name ?? ''}": ${err.message}`);
      }
    }
  }

  private toRuleGroupCreateInput(ruleGroups: any[]) {
    return ruleGroups.map((g: any, i: number) => ({
      name: g.name || `Rule ${i + 1}`,
      order: g.order ?? i,
      isActive: g.isActive ?? true,
      conditions: normalizeConditionTree(g.conditions) as any,
      actions: (Array.isArray(g.actions) ? g.actions : []) as any,
    }));
  }

  async findAll(orgId: string) {
    const where = { organizationId: orgId };
    const workflows = await this.prisma.workflow.findMany({
      where,
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Attach last execution to each workflow
    const withLastRun = await Promise.all(workflows.map(async wf => {
      const lastExec = await this.prisma.workflowExecution.findFirst({
        where: { workflowId: wf.id },
        orderBy: { startedAt: 'desc' },
        select: { status: true, startedAt: true, finishedAt: true, error: true },
      });
      return { ...wf, lastExecution: lastExec };
    }));
    return withLastRun;
  }

  async findOne(id: string, orgId: string) {
    const wf = await this.prisma.workflow.findFirst({
      where: { id, organizationId: orgId },
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
    });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async update(id: string, orgId: string, data: any) {
    await this.findOne(id, orgId);
    const { actions, ruleGroups, ...rest } = data;
    if (actions !== undefined) {
      await this.prisma.workflowAction.deleteMany({ where: { workflowId: id } });
      await this.prisma.workflowAction.createMany({
        data: actions.map((a: any, i: number) => ({
          workflowId: id,
          type: a.type,
          config: a.config || {},
          order: a.order ?? i,
          recipientUsers: a.recipientUsers || [],
          recipientDepts: a.recipientDepts || [],
        })),
      });
    }
    if (ruleGroups !== undefined) {
      this.validateRuleGroups(ruleGroups);
      await this.prisma.workflowRuleGroup.deleteMany({ where: { workflowId: id } });
      await this.prisma.workflowRuleGroup.createMany({
        data: this.toRuleGroupCreateInput(ruleGroups).map(g => ({ ...g, workflowId: id })),
      });
    }
    return this.prisma.workflow.update({
      where: { id },
      data: rest,
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
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
    trigger: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED' | 'FIELD_CHANGED' | 'FORM_SUBMITTED' | 'MANUAL',
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
        // A workflow linked to a Blueprint transition (see BlueprintsService
        // .syncWorkflowLinks) only runs through that specific transition, via
        // executeWorkflowById — never via its own native trigger. Otherwise it
        // could fire "anywhere" a record is saved, regardless of which phase/
        // transition is actually active, silently overriding unrelated saves.
        linkedTransitionId: null,
      },
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
    });

    for (const wf of workflows) {
      // FIELD_CHANGED additionally requires the ONE field it watches to have actually
      // changed — without this gate it would fire on every edit exactly like
      // RECORD_UPDATED, defeating the reason someone picks this trigger over that one.
      // A workflow with no fieldName configured yet is intentionally never matched,
      // rather than falling back to "any field" — that would silently misfire the
      // moment it's created, before the field has been picked in the builder.
      if (trigger === 'FIELD_CHANGED') {
        const fieldName = (wf.triggerConfig as any)?.fieldName;
        if (!fieldName) continue;
        const before = previousData?.[fieldName];
        const after = record?.data?.[fieldName];
        if (before === after) continue;
      }

      const ruleGroups = (wf as any).ruleGroups ?? [];
      let matchedGroups: any[] | undefined;

      if (ruleGroups.length > 0) {
        // This workflow has adopted rule groups — it no longer consults the legacy
        // conditions/actions fields at all, even if every group happens to be inactive.
        const activeGroups = ruleGroups.filter((g: any) => g.isActive);
        matchedGroups = activeGroups.filter((g: any) =>
          evaluateNode(normalizeConditionTree(g.conditions), record.data, previousData),
        );
        if (matchedGroups.length === 0) continue;
      } else {
        const tree = normalizeConditionTree(wf.conditions);
        if (!evaluateNode(tree, record.data, previousData)) continue;
      }

      // One-time guard: skip if this workflow already ran for this record
      if (!wf.isRepeatable && record.id) {
        const alreadyRan = await this.prisma.workflowExecution.findFirst({
          where: { workflowId: wf.id, recordId: record.id },
          select: { id: true },
        });
        if (alreadyRan) {
          this.logger.log(`Workflow ${wf.id} skipped — one-time, already ran for record ${record.id}`);
          continue;
        }
      }

      const orgSet = _executingSet.get(orgId) ?? new Set<string>();
      if (orgSet.has(wf.id)) { this.logger.warn('Circular workflow skip: ' + wf.id); continue; }
      orgSet.add(wf.id);
      _executingSet.set(orgId, orgSet);
      try {
        await this.executeWorkflow(wf, record, orgId, record.id ?? undefined, matchedGroups);
      } finally {
        orgSet.delete(wf.id);
        if (orgSet.size === 0) _executingSet.delete(orgId);
      }
    }
  }

  async executeWorkflow(wf: any, record: any, orgId: string, recordId?: string, matchedRuleGroups?: any[]) {
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: wf.id,
        recordId: recordId ?? record.id ?? undefined,
        status: 'RUNNING',
        input: { recordId: record.id, data: record.data },
      },
    });

    try {
      if (matchedRuleGroups !== undefined) {
        for (const group of matchedRuleGroups) {
          const groupActions = Array.isArray(group.actions) ? group.actions : [];
          const sorted = [...groupActions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          for (const action of sorted) {
            await this.executeAction(action, record, orgId);
          }
        }
      } else {
        for (const action of wf.actions) {
          await this.executeAction(action, record, orgId);
        }
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
        if (!cfg.allowLockOverride) {
          const lock = await getLockInfoForRecordData(this.prisma, record.moduleId, orgId, (record.data as any) || {});
          if (lock && lock.fields.includes(cfg.field)) break;
        }
        const previousData = { ...(record.data as any) };
        const value = cfg.value === '__NOW__' ? new Date().toISOString() : cfg.value;
        const newData = { ...(record.data as any), [cfg.field]: value };
        const setResult = await this.prisma.record.update({
          where: { id: record.id },
          data: { data: newData },
        });
        record.data = newData;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, data: newData });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: newData, updatedAt: setResult.updatedAt });
        // Chain into any other workflow watching the field this action just set —
        // without this, a SET_FIELD action changing e.g. application_status never
        // notifies a FIELD_CHANGED workflow watching that same field (awaited, not
        // fire-and-forget, so the circular-execution guard above stays accurate for
        // the whole chain rather than racing against it).
        await this.executeForRecord('RECORD_UPDATED', record.moduleId, orgId, record, previousData).catch(() => {});
        await this.executeForRecord('FIELD_CHANGED', record.moduleId, orgId, record, previousData).catch(() => {});
        break;
      }

      case 'UPDATE_RECORD': {
        if (!cfg.updates || !Array.isArray(cfg.updates)) break;
        const lock = cfg.allowLockOverride
          ? null
          : await getLockInfoForRecordData(this.prisma, record.moduleId, orgId, (record.data as any) || {});
        const previousData = { ...(record.data as any) };
        const patch: Record<string, any> = {};
        for (const u of cfg.updates) {
          if (lock && lock.fields.includes(u.field)) continue;
          patch[u.field] = u.value === '__NOW__' ? new Date().toISOString() : u.value;
        }
        const updated = { ...(record.data as any), ...patch };
        const upResult = await this.prisma.record.update({
          where: { id: record.id },
          data: { data: updated },
        });
        record.data = updated;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, data: updated });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: upResult.updatedAt });
        // Same chaining as SET_FIELD above.
        await this.executeForRecord('RECORD_UPDATED', record.moduleId, orgId, record, previousData).catch(() => {});
        await this.executeForRecord('FIELD_CHANGED', record.moduleId, orgId, record, previousData).catch(() => {});
        break;
      }

      case 'SEND_NOTIFICATION': {
        // Resolve @fieldName tokens from live record data (also accepts {{fieldName}})
        const recordData = (record.data as Record<string, any>) ?? {};
        const resolvedTitle   = this.resolveNotifTemplate(cfg.title   || 'Workflow Notification', recordData);
        const resolvedMessage = this.resolveNotifTemplate(cfg.message || '', recordData);

        // Build a deep-link to the exact record so the user can click straight through
        const notifModule = await this.prisma.dynamicModule.findFirst({
          where:  { id: record.moduleId },
          select: { slug: true },
        });
        const recordLink = notifModule ? `/m/${notifModule.slug}/${record.id}` : undefined;

        // Resolve recipient user IDs (direct users + department members)
        const allOrgUsers = await this.prisma.user.findMany({
          where:  { organizationId: orgId, isActive: true },
          select: { id: true, departmentId: true },
        });

        let targetIds: Set<string>;
        if (!cfg.userIds?.length && !cfg.recipientDepts?.length) {
          // No filter → everyone in org
          targetIds = new Set(allOrgUsers.map(u => u.id));
        } else {
          targetIds = new Set<string>(cfg.userIds ?? []);
          if (cfg.recipientDepts?.length) {
            allOrgUsers
              .filter(u => u.departmentId && cfg.recipientDepts.includes(u.departmentId))
              .forEach(u => targetIds.add(u.id));
          }
        }

        for (const u of allOrgUsers.filter(u => targetIds.has(u.id))) {
          const notif = await this.prisma.notification.create({
            data: {
              userId:         u.id,
              organizationId: orgId,
              title:          resolvedTitle,
              message:        resolvedMessage,
              type:           'WORKFLOW',
              ...(recordLink ? { link: recordLink } : {}),
            },
          });
          const unreadCount = await this.prisma.notification.count({ where: { userId: u.id, isRead: false } });
          this.gateway.emitToUser(u.id, 'notification:new', { ...notif, unreadCount });
        }
        break;
      }

      case 'ASSIGN_USER': {
        if (!cfg.field || !cfg.userId) break;
        const newData = { ...(record.data as any), [cfg.field]: cfg.userId };
        const assignResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: newData } });
        record.data = newData;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: newData, updatedAt: assignResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: newData, updatedAt: assignResult.updatedAt });
        break;
      }

      case 'TAG': {
        const tagsToAdd: string[] = Array.isArray(cfg.tags) ? cfg.tags : [];
        if (tagsToAdd.length === 0) break;
        const existingTags: string[] = Array.isArray((record.data as any).tags)
          ? (record.data as any).tags : [];
        const merged = Array.from(new Set([...existingTags, ...tagsToAdd]));
        const taggedData = { ...(record.data as any), tags: merged };
        const tagResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: taggedData } });
        record.data = taggedData;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: taggedData, updatedAt: tagResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: taggedData, updatedAt: tagResult.updatedAt });
        break;
      }

      case 'ADD_TAG': {
        type TagObj = { name: string; color: string };
        const toAdd: TagObj[] = Array.isArray(cfg.tags) ? cfg.tags : [];
        if (!toAdd.length) break;
        const existing: TagObj[] = Array.isArray((record.data as any)._tags) ? (record.data as any)._tags : [];
        const existingNames = new Set(existing.map((t: TagObj) => t.name));
        const merged = [...existing, ...toAdd.filter((t: TagObj) => t.name && !existingNames.has(t.name))];
        const updated = { ...(record.data as any), _tags: merged };
        const addTagResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: updated } });
        record.data = updated;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: addTagResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: addTagResult.updatedAt });
        break;
      }

      case 'REMOVE_TAG': {
        type TagObj = { name: string; color: string };
        const namesToRemove: string[] = (cfg.tagNames ?? (cfg.tags ?? []).map((t: any) => (typeof t === 'string' ? t : t?.name))).filter(Boolean);
        if (!namesToRemove.length) break;
        const existing: TagObj[] = Array.isArray((record.data as any)._tags) ? (record.data as any)._tags : [];
        const filtered = existing.filter((t: TagObj) => !namesToRemove.includes(t.name));
        const updated = { ...(record.data as any), _tags: filtered };
        const removeTagResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: updated } });
        record.data = updated;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: removeTagResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: removeTagResult.updatedAt });
        break;
      }

      case 'REPLACE_TAGS': {
        type TagObj = { name: string; color: string };
        const newTags: TagObj[] = Array.isArray(cfg.tags) ? cfg.tags : [];
        const updated = { ...(record.data as any), _tags: newTags };
        const replaceTagsResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: updated } });
        record.data = updated;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: replaceTagsResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: replaceTagsResult.updatedAt });
        break;
      }

      case 'CLEAR_TAGS': {
        const updated = { ...(record.data as any), _tags: [] };
        const clearTagsResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: updated } });
        record.data = updated;
        this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: clearTagsResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: updated, updatedAt: clearTagsResult.updatedAt });
        break;
      }

      case 'CREATE_RECORD': {
        if (!cfg.moduleId) break;
        // Start with any legacy static data, then apply field mappings on top
        const newRecordData: Record<string, any> = { ...(cfg.data || {}) };
        for (const mapping of (cfg.fieldMappings ?? [])) {
          if (!mapping.targetField) continue;
          if (mapping.type === 'reference' && mapping.sourceField) {
            newRecordData[mapping.targetField] = (record.data as any)[mapping.sourceField] ?? null;
          } else if (mapping.type === 'static') {
            newRecordData[mapping.targetField] = mapping.staticValue ?? '';
          }
        }
        // Generate AUTO_NUMBER values — always system-controlled, never user-mapped
        const targetMod = await this.prisma.dynamicModule.findFirst({
          where: { id: cfg.moduleId, organizationId: orgId },
          include: { fields: { where: { isActive: true } } },
        });
        if (targetMod) {
          const autoNumFields = (targetMod as any).fields.filter(
            (f: any) => String(f.type).toUpperCase() === 'AUTO_NUMBER',
          );
          for (const field of autoNumFields) {
            const s = (field.settings as any) || {};
            const count = await this.prisma.record.count({
              where: { moduleId: cfg.moduleId, organizationId: orgId },
            });
            const nextNum = count + (s.startingNumber ?? 1);
            const padded = String(nextNum).padStart(s.paddingLength ?? 5, '0');
            newRecordData[field.name] = [s.prefix, padded, s.suffix].filter(Boolean).join('-') || padded;
          }
        }
        await this.prisma.record.create({
          data: {
            moduleId: cfg.moduleId,
            organizationId: orgId,
            createdById: record.createdById,
            data: newRecordData,
          },
        });
        break;
      }

      case 'CHANGE_STATUS':
        if (cfg.fieldName && cfg.value !== undefined) {
          const previousStatusData = { ...(record.data as any) };
          const merged = { ...(record.data as any), [cfg.fieldName]: cfg.value };
          const statusResult = await this.prisma.record.update({ where: { id: record.id }, data: { data: merged } });
          record.data = merged;
          this.gateway.emitToModule(record.moduleId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: merged, updatedAt: statusResult.updatedAt });
          this.gateway.emitToOrg(orgId, 'record:updated', { id: record.id, moduleId: record.moduleId, data: merged, updatedAt: statusResult.updatedAt });
          // Same chaining as SET_FIELD/UPDATE_RECORD above.
          await this.executeForRecord('RECORD_UPDATED', record.moduleId, orgId, record, previousStatusData).catch(() => {});
          await this.executeForRecord('FIELD_CHANGED', record.moduleId, orgId, record, previousStatusData).catch(() => {});
        }
        break;

      case 'SEND_EMAIL': {
        const { to, subject, body: bodyTemplate } = cfg;
        if (!to) break;
        const resolvedTo = this.resolveTemplate(to, record.data as any);
        const resolvedSubject = this.resolveTemplate(subject || 'Workflow Notification', record.data as any);
        const resolvedBody = this.resolveTemplate(bodyTemplate || '', record.data as any);
        await this.sendEmail(resolvedTo, resolvedSubject, resolvedBody);
        break;
      }

      case 'WEBHOOK': {
        const { url, method = 'POST', headers: hdrs = {}, body: bodyTemplate = '' } = cfg;
        if (!url) break;
        const resolvedBody = this.resolveTemplate(bodyTemplate, record.data as any);
        const hdrsResolved: Record<string, string> = { 'Content-Type': 'application/json' };
        for (const [k, v] of Object.entries(hdrs as Record<string, string>)) {
          if (k) hdrsResolved[this.resolveTemplate(k, record.data as any)] = this.resolveTemplate(v, record.data as any);
        }
        const fetchOpts: any = { method: method.toUpperCase(), headers: hdrsResolved };
        if (!['GET', 'HEAD'].includes(fetchOpts.method)) fetchOpts.body = resolvedBody;
        const response = await fetch(url, fetchOpts);
        this.logger.log(`[Workflow] Webhook ${fetchOpts.method} ${url} → ${response.status}`);
        break;
      }

      case 'UPDATE_RELATED': {
        const { relationField, targetField, targetValue } = cfg;
        if (!relationField || !targetField) break;
        const relId = (record.data as any)[relationField];
        if (!relId) break;
        const relRecord = await this.prisma.record.findFirst({ where: { id: relId, isDeleted: false } });
        if (!relRecord) break;
        const existingData = (relRecord.data as Record<string, any>) || {};
        const resolved = this.resolveTemplate(String(targetValue ?? ''), record.data as any);
        const relatedData = { ...existingData, [targetField]: resolved };
        const relatedResult = await this.prisma.record.update({
          where: { id: relId },
          data: { data: relatedData },
        });
        this.gateway.emitToModule(relRecord.moduleId, 'record:updated', { id: relId, moduleId: relRecord.moduleId, data: relatedData, updatedAt: relatedResult.updatedAt });
        this.gateway.emitToOrg(orgId, 'record:updated', { id: relId, moduleId: relRecord.moduleId, data: relatedData, updatedAt: relatedResult.updatedAt });
        break;
      }

      case 'CREATE_TASK': {
        const { moduleId: taskModuleId, title, assigneeField, dueDate, priority, description } = cfg;
        if (!taskModuleId || !title) break;
        const taskData: Record<string, any> = {
          title: this.resolveTemplate(title, record.data as any),
          description: description ? this.resolveTemplate(description, record.data as any) : '',
          priority: priority || 'MEDIUM',
          status: 'TODO',
        };
        if (assigneeField && (record.data as any)[assigneeField]) {
          taskData.assignee = (record.data as any)[assigneeField];
        }
        if (dueDate) taskData.dueDate = this.resolveTemplate(dueDate, record.data as any);
        await this.prisma.record.create({
          data: {
            moduleId: taskModuleId,
            organizationId: orgId,
            createdById: record.createdById,
            data: taskData,
          },
        });
        break;
      }

      case 'DELAY': {
        const { duration = 5, unit = 'minutes' } = cfg;
        const ms =
          unit === 'seconds' ? Number(duration) * 1000 :
          unit === 'hours'   ? Number(duration) * 3_600_000 :
          unit === 'days'    ? Number(duration) * 86_400_000 :
                               Number(duration) * 60_000;
        await new Promise(resolve => setTimeout(resolve, Math.min(ms, 30_000)));
        break;
      }

      case 'TRIGGER_WORKFLOW': {
        const { workflowId: targetId } = cfg;
        if (!targetId) break;
        const orgSet = _executingSet.get(orgId) ?? new Set<string>();
        if (orgSet.has(targetId)) {
          this.logger.warn('[Workflow] Chain loop detected — skipping: ' + targetId);
          break;
        }
        const targetWf = await this.prisma.workflow.findFirst({
          where: { id: targetId, organizationId: orgId, isActive: true },
          include: {
            actions: { orderBy: { order: 'asc' } },
            ruleGroups: { orderBy: { order: 'asc' } },
          },
        });
        if (!targetWf) break;
        orgSet.add(targetId);
        _executingSet.set(orgId, orgSet);
        try {
          const targetRuleGroups = (targetWf as any).ruleGroups ?? [];
          const activeGroups = targetRuleGroups.length > 0
            ? targetRuleGroups.filter((g: any) => g.isActive)
            : undefined;
          await this.executeWorkflow(targetWf, record, orgId, undefined, activeGroups);
        } finally {
          orgSet.delete(targetId);
          if (orgSet.size === 0) _executingSet.delete(orgId);
        }
        break;
      }

      default:
        break;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private resolveTemplate(template: string, data: Record<string, any>): string {
    if (!template || typeof template !== 'string') return '';
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const v = data[key];
      return v === null || v === undefined ? '' : String(v);
    });
  }

  /** Resolves @fieldName tokens (notification-style) as well as {{fieldName}} (email-style). */
  private resolveNotifTemplate(template: string, data: Record<string, any>): string {
    if (!template || typeof template !== 'string') return '';
    return template
      .replace(/@([A-Za-z_][A-Za-z0-9_]*)/g, (_, key) => {
        const v = data[key];
        return v === null || v === undefined ? '' : String(v);
      })
      .replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const v = data[key];
        return v === null || v === undefined ? '' : String(v);
      });
  }

  // Uses Resend's HTTPS API, not SMTP — Railway blocks outbound SMTP below its
  // Pro plan, which silently times out nodemailer/Gmail sends in production
  // even though they work fine on localhost. See emails.service.ts for the
  // same fix applied to direct/mass email sending.
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('[Workflow] RESEND_API_KEY not configured — SEND_EMAIL skipped');
      return;
    }
    try {
      const { Resend } = require('resend'); // eslint-disable-line
      const resend = new Resend(apiKey);
      const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@app.com';
      const { error } = await resend.emails.send({ from, to, subject, html });
      if (error) {
        this.logger.warn(`[Workflow] SEND_EMAIL failed: ${error.message}`);
        return;
      }
      this.logger.log(`[Workflow] Email sent → ${to}: ${subject}`);
    } catch (err: any) {
      this.logger.warn(`[Workflow] SEND_EMAIL failed: ${err?.message}`);
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

  async executeScheduledWorkflow(wf: any, orgId: string, record?: any): Promise<void> {
    const placeholder = record ?? {
      id: `sched-${wf.id}`,
      data: {},
      moduleId: wf.moduleId || '',
      organizationId: orgId,
      createdById: null,
    };
    const ruleGroups = wf.ruleGroups ?? [];
    const activeGroups = ruleGroups.length > 0 ? ruleGroups.filter((g: any) => g.isActive) : undefined;
    await this.executeWorkflow(wf, placeholder as any, orgId, undefined, activeGroups);
  }

  /**
   * Directly executes one specific, explicitly-linked workflow (e.g. a Blueprint
   * transition's `workflowId`) — bypassing this workflow's own trigger-type
   * matching, since the caller already decided *when* to check. The workflow's
   * own rule-group (or legacy) conditions still gate whether its actions fire.
   */
  async executeWorkflowById(workflowId: string, orgId: string, record: any, previousData?: any): Promise<void> {
    const wf = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId: orgId, isActive: true },
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
    });
    if (!wf) return;

    const ruleGroups = (wf as any).ruleGroups ?? [];
    let matchedGroups: any[] | undefined;

    if (ruleGroups.length > 0) {
      const activeGroups = ruleGroups.filter((g: any) => g.isActive);
      matchedGroups = activeGroups.filter((g: any) =>
        evaluateNode(normalizeConditionTree(g.conditions), record.data, previousData),
      );
      if (matchedGroups.length === 0) return;
    } else {
      const tree = normalizeConditionTree(wf.conditions);
      if (!evaluateNode(tree, record.data, previousData)) return;
    }

    await this.executeWorkflow(wf, record, orgId, record.id ?? undefined, matchedGroups);
  }
}
