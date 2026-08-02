import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { ProcessService } from '../process/process.service';
import { BlueprintsService } from '../blueprints/blueprints.service';
import { RelationResolverService } from './relation-resolver.service';
import { AppGateway } from '../websocket/app.gateway';
import { getLockInfoForRecordData, partitionLockedFields, resolveStageLock } from '../blueprints/field-lock';
import { conditionTreeToPrismaWhere } from './integration-filter';
import { WebhookDispatchService } from '../connected-apps/webhook-dispatch.service';
@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private workflows: WorkflowsService,
    private readonly processService: ProcessService,
    private readonly blueprints: BlueprintsService,
    private readonly resolver: RelationResolverService,
    private readonly gateway: AppGateway,
    private readonly webhookDispatch: WebhookDispatchService,
  ) {}

  async create(moduleId: string, orgId: string, userId: string, data: Record<string, any>) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, include: { options: true } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const enrichedData = { ...data };
    for (const field of mod.fields) {
      if (field.type === 'AUTO_NUMBER') {
        enrichedData[field.name] = await this.generateAutoNumber(field, moduleId, orgId);
      }
    }

    const record = await this.prisma.record.create({
      data: { moduleId, organizationId: orgId, createdById: userId, data: enrichedData },
    });

    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: orgId,
        action: 'RECORD_CREATED', entityType: mod.name, entityId: record.id,
        metadata: { moduleId },
      },
    });

    // Fire RECORD_CREATED workflows asynchronously (don't block the response)
    this.workflows.executeForRecord('RECORD_CREATED', moduleId, orgId, record).catch(() => {});
    this.processService.triggerForRecord(record.id, moduleId, "status", (enrichedData as any).status || "", userId, orgId).catch(() => {});
    this.blueprints.evaluateAutomaticTransitions(record.id, orgId, userId, 'on_create').catch(() => {});
    this.webhookDispatch.dispatchRecordChange(moduleId, orgId, record.id).catch(() => {});

    return record;
  }

  // Public — also called by FormsService (form-submission backfill) so both
  // callers share one implementation instead of drifting copies.
  //
  // Uses a persisted counter (settings.currentValue) instead of deriving the
  // next number from a live `COUNT(*)` of the module's records. The old
  // count-based approach meant "Starting Number" couldn't actually reset
  // anything — the live count kept climbing regardless, so changing it had
  // no effect once any records existed, and deleting/archiving records could
  // silently reuse an already-issued number. A persisted counter is only
  // ever moved forward by generating a number or by an explicit reset (see
  // FieldsService.resetAutoNumber), so it stays stable and restartable.
  //
  // First-time use (currentValue not set yet) falls back to the existing
  // record count so a field that's been generating numbers under the old
  // scheme doesn't jump backwards and collide with numbers already in use.
  async generateAutoNumber(field: any, moduleId: string, orgId: string): Promise<string> {
    const settings = (field.settings as any) || {};
    const prefix = settings.prefix || '';
    const suffix = settings.suffix || '';
    const startingNumber = settings.startingNumber ?? 1;
    const paddingLength = settings.paddingLength ?? 5;

    const current = typeof settings.currentValue === 'number'
      ? settings.currentValue
      : (await this.prisma.record.count({ where: { moduleId, organizationId: orgId } })) + startingNumber - 1;

    const next = current + 1;
    await this.prisma.field.update({ where: { id: field.id }, data: { settings: { ...settings, currentValue: next } } });

    const padded = String(next).padStart(paddingLength, '0');
    const parts = [prefix, padded, suffix].filter(Boolean);
    return parts.join('-');
  }

  // Distinct values a field actually holds across a module's records — used by pickers that let
  // an admin choose a concrete value for a field (e.g. the Visualization Context "Camp Name"
  // picker) without needing to know the data in advance. Capped so a huge/free-text field can't
  // return an unusably large list.
  // A previous version fetched only the first 5000 records (no ORDER BY, so an arbitrary
  // DB-chosen subset) and extracted values in JS — any value that only appeared outside
  // that window silently never showed up in the dropdown once a module grew past 5000
  // records. Extracting DISTINCT at the SQL level scans the whole table and is both
  // correct and far cheaper than pulling every record's JSON into Node to dedupe by hand.
  async distinctFieldValues(moduleId: string, orgId: string, fieldName: string, limit = 200): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ val: string | null }[]>`
      SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(data, CONCAT('$.', ${fieldName}))) AS val
      FROM records
      WHERE moduleId = ${moduleId} AND organizationId = ${orgId} AND isDeleted = false
        AND JSON_EXTRACT(data, CONCAT('$.', ${fieldName})) IS NOT NULL
      LIMIT ${limit}
    `;
    return rows
      .map((r) => r.val)
      .filter((v): v is string => v !== null && v !== undefined && v !== '')
      .sort((a, b) => a.localeCompare(b));
  }

  // Additive, role-scoped field visibility on top of confidentiality above —
  // reads Permission.fieldOverrides (set via the Access Control field editor,
  // see permissions.controller.ts) for this exact role+module, and resolves
  // its fieldId keys to field names. SUPER_ADMIN always bypasses, matching
  // the bypass convention used everywhere else permission checks happen.
  private async getRoleFieldOverrides(orgId: string, moduleId: string, role?: string): Promise<{ hidden: string[]; readonly: string[] }> {
    if (!role || role === 'SUPER_ADMIN') return { hidden: [], readonly: [] };

    const perm = await this.prisma.permission.findFirst({
      where: { organizationId: orgId, moduleId, role },
      select: { fieldOverrides: true },
    });
    const overrides = (perm?.fieldOverrides as Record<string, string>) || {};
    const fieldIds = Object.keys(overrides);
    if (fieldIds.length === 0) return { hidden: [], readonly: [] };

    const fieldRows = await this.prisma.field.findMany({
      where: { id: { in: fieldIds } },
      select: { id: true, name: true },
    });
    const idToName = new Map(fieldRows.map((f) => [f.id, f.name]));

    const hidden: string[] = [];
    const readonly: string[] = [];
    for (const [fieldId, level] of Object.entries(overrides)) {
      const name = idToName.get(fieldId);
      if (!name) continue;
      if (level === 'hidden') hidden.push(name);
      else if (level === 'readonly') readonly.push(name);
    }
    return { hidden, readonly };
  }

  async findAll(moduleId: string, orgId: string, query: any, canSeeConfidential = false, viewerRole?: string) {
    const { page = 1, limit = 25, search, filterGroup, sortField, sortDir, showArchived } = query;
    const where: any = { moduleId, organizationId: orgId, isDeleted: false };
    if (!showArchived || showArchived === 'false') where.isArchived = false;

    const hasFilter = !!(filterGroup || search);

    // When sorting by a data (JSON) field we must fetch all records then sort in memory.
    const needsInMemorySort = !!(sortField && sortField !== 'createdAt');
    const needsFullFetch    = !!(hasFilter || needsInMemorySort);

    let records = await this.prisma.record.findMany({
      where,
      include: { createdBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: (!sortField || sortField === 'createdAt') ? (sortDir === 'asc' ? 'asc' : 'desc') : 'desc' },
      take: needsFullFetch ? 5000 : Number(limit),
      skip: needsFullFetch ? 0 : (Number(page) - 1) * Number(limit),
    });

    if (search) {
      const s = (search as string).toLowerCase();
      records = records.filter(r => JSON.stringify(r.data).toLowerCase().includes(s));
    }

    if (filterGroup) {
      try {
        const fg = typeof filterGroup === 'string' ? JSON.parse(filterGroup) : filterGroup;
        records = records.filter(r => this.applyFilterGroup(r.data as any, fg));
      } catch {}
    }

    // In-memory sort by JSON data field
    if (sortField && sortField !== 'createdAt') {
      const dir = sortDir === 'asc' ? 1 : -1;
      records.sort((a, b) => {
        const av = (a.data as any)?.[sortField] ?? '';
        const bv = (b.data as any)?.[sortField] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
        return cmp * dir;
      });
    }

    const total = needsFullFetch ? records.length : await this.prisma.record.count({ where });

    const paged = needsFullFetch
      ? records.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit))
      : records;

    const moduleFields = await this.prisma.field.findMany({ where: { moduleId, isActive: true }, include: { options: true } });
    const { hidden: roleHidden } = await this.getRoleFieldOverrides(orgId, moduleId, viewerRole);
    const resolvedData = await this.resolver.resolveRecords(paged, moduleFields, canSeeConfidential, roleHidden);

    return {
      data: resolvedData,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  }

  private applyFilterGroup(data: any, group: any): boolean {
    const results: boolean[] = [
      ...group.conditions.map((c: any) => this.applyCondition(data, c)),
      ...(group.groups || []).map((g: any) => this.applyFilterGroup(data, g)),
    ];
    if (results.length === 0) return true;
    return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private applyCondition(data: any, c: any): boolean {
    const raw = data?.[c.field];
    const val = raw ?? '';
    const cv = c.value ?? '';

    switch (c.operator) {
      case 'is':           return Array.isArray(raw) ? raw.map(String).includes(String(cv)) : String(val) === String(cv);
      case 'is_not':       return Array.isArray(raw) ? !raw.map(String).includes(String(cv)) : String(val) !== String(cv);
      case 'contains':     return String(val).toLowerCase().includes(String(cv).toLowerCase());
      case 'not_contains': return !String(val).toLowerCase().includes(String(cv).toLowerCase());
      case 'starts_with':  return String(val).toLowerCase().startsWith(String(cv).toLowerCase());
      case 'ends_with':    return String(val).toLowerCase().endsWith(String(cv).toLowerCase());
      case 'empty':        return !raw || raw === '' || (Array.isArray(raw) && raw.length === 0);
      case 'not_empty':    return !!raw && raw !== '' && !(Array.isArray(raw) && raw.length === 0);
      case 'eq':           return Number(val) === Number(cv);
      case 'neq':          return Number(val) !== Number(cv);
      case 'lt':           return Number(val) < Number(cv);
      case 'lte':          return Number(val) <= Number(cv);
      case 'gt':           return Number(val) > Number(cv);
      case 'gte':          return Number(val) >= Number(cv);
      case 'between':      return Number(val) >= Number(cv) && Number(val) <= Number(c.value2);
      case 'today':        { const d = new Date(); const v = new Date(val); return v.toDateString() === d.toDateString(); }
      case 'yesterday':    { const d = new Date(); d.setDate(d.getDate() - 1); return new Date(val).toDateString() === d.toDateString(); }
      case 'this_week':    { const now = new Date(); const ws = new Date(now); ws.setDate(now.getDate() - now.getDay()); return new Date(val) >= ws && new Date(val) <= now; }
      case 'this_month':   { const now = new Date(); const d = new Date(val); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }
      case 'last_month':   { const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const d = new Date(val); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); }
      case 'date_between': { const d = new Date(val); return d >= new Date(cv) && d <= new Date(c.value2); }
      default:             return true;
    }
  }

  async findOne(id: string, orgId: string, canSeeConfidential = false, viewerRole?: string) {
    const record = await this.prisma.record.findFirst({
      where: { id, organizationId: orgId, isDeleted: false },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        module: {
          include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { options: true } } },
        },
        comments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        files: true,
      },
    });
    if (!record) throw new NotFoundException('Record not found');
    const moduleFields = record.module?.fields ?? await this.prisma.field.findMany({ where: { moduleId: record.moduleId, isActive: true }, include: { options: true } });
    const { hidden: roleHidden } = await this.getRoleFieldOverrides(orgId, record.moduleId, viewerRole);
    return this.resolver.resolveRecord(record, moduleFields, canSeeConfidential, roleHidden);
  }

  async update(
    id: string,
    orgId: string | null,
    userId: string,
    data: Record<string, any>,
    lockCtx?: { role?: string; lockOverrideReason?: string },
    canSeeConfidential = false,
  ) {
    const where: any = orgId ? { id, organizationId: orgId, isDeleted: false } : { id, isDeleted: false };
    const record = await this.prisma.record.findFirst({ where });
    if (!record) throw new NotFoundException('Record not found');

    // Use record's actual org for audit log (orgId may be null for SUPER_ADMIN cross-org access)
    const auditOrgId = orgId ?? record.organizationId;

    // The blueprint's stage/status field must only change via transition execution
    // (manual button click or automatic evaluation) — never via a plain record save.
    // Otherwise a form still holding a stale copy of this field (e.g. left open while
    // an automatic transition fires in the background) silently reverts the stage
    // the next time it's saved.
    const blueprint = await this.prisma.blueprint.findFirst({
      where: { moduleId: record.moduleId, organizationId: auditOrgId, isActive: true },
      select: { statusFieldName: true },
    });
    const submittedData = { ...data };
    if (blueprint?.statusFieldName && blueprint.statusFieldName in submittedData) {
      delete submittedData[blueprint.statusFieldName];
    }

    // Field-Level Confidentiality: a non-privileged caller's own copy of this
    // record never had the real value in the first place (it was stripped on
    // fetch) — so whatever they submit for a confidential field is either
    // stale or blank. Drop it here rather than trust the client, otherwise
    // any save from a non-admin viewer silently wipes the real value.
    if (!canSeeConfidential) {
      const confidentialFields = await this.prisma.field.findMany({
        where: { moduleId: record.moduleId, isActive: true, isConfidential: true },
        select: { name: true },
      });
      for (const f of confidentialFields) delete submittedData[f.name];
    }

    // Role-scoped field overrides (Access Control field editor): a field
    // marked "hidden" or "readonly" for this viewer's role is dropped from
    // the submission the same way — see getRoleFieldOverrides above.
    const { hidden: roleHidden, readonly: roleReadonly } = await this.getRoleFieldOverrides(auditOrgId, record.moduleId, lockCtx?.role);
    for (const name of [...roleHidden, ...roleReadonly]) delete submittedData[name];

    const existingData = (record.data as Record<string, any>) || {};

    // Field Locks: a Blueprint stage can mark fields read-only. Locked fields the
    // caller isn't authorized to touch (or hasn't given an override reason for
    // yet) are silently dropped from this update rather than failing the whole
    // request — the rest of the submitted fields still save normally.
    const lock = await getLockInfoForRecordData(this.prisma, record.moduleId, auditOrgId, existingData);
    const { allowed: lockedFilteredData, skipped, overridden } = partitionLockedFields(
      submittedData,
      lock,
      { id: userId, role: lockCtx?.role },
      !!lockCtx?.lockOverrideReason?.trim(),
    );

    const mergedData = { ...existingData, ...lockedFilteredData };

    const updated = await this.prisma.record.update({
      where: { id },
      data: { data: mergedData, updatedById: userId },
    });

    // Capture old values only for the fields that changed (for activity log)
    const oldValues: Record<string, any> = {};
    for (const key of Object.keys(lockedFilteredData)) oldValues[key] = existingData[key] ?? null;

    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: auditOrgId,
        action: 'RECORD_UPDATED', entityType: 'Record', entityId: id,
        metadata: { oldValues, newValues: lockedFilteredData },
      },
    });

    if (overridden.length > 0 && lock) {
      await this.prisma.auditLog.create({
        data: {
          userId, organizationId: auditOrgId,
          action: 'FIELD_LOCK_OVERRIDE', entityType: 'Record', entityId: id,
          metadata: {
            fields: overridden.map(field => ({ field, oldValue: existingData[field] ?? null, newValue: lockedFilteredData[field] })),
            reason: lockCtx?.lockOverrideReason,
            blueprintId: lock.blueprintId,
            stageId: lock.stageId,
          },
        },
      });
    }

    this.gateway.emitToModule(record.moduleId, 'record:updated', { id, moduleId: record.moduleId, data: mergedData, updatedAt: updated.updatedAt });
    this.gateway.emitToOrg(auditOrgId, 'record:updated', { id, moduleId: record.moduleId, data: mergedData, updatedAt: updated.updatedAt });

    // Fire RECORD_UPDATED workflows asynchronously — plus FIELD_CHANGED workflows, which
    // additionally only match when the ONE field they watch actually changed (see
    // WorkflowsService.executeForRecord's fieldName gate), so picking a specific field
    // there doesn't fire on every unrelated edit the way RECORD_UPDATED does.
    this.workflows.executeForRecord(
      'RECORD_UPDATED', record.moduleId, auditOrgId,
      { ...updated, data: mergedData },
      existingData,
    ).catch(() => {});
    this.workflows.executeForRecord(
      'FIELD_CHANGED', record.moduleId, auditOrgId,
      { ...updated, data: mergedData },
      existingData,
    ).catch(() => {});
    this.blueprints.evaluateAutomaticTransitions(
      id, auditOrgId, userId, 'on_edit', Object.keys(lockedFilteredData), existingData,
    ).catch(() => {});
    this.webhookDispatch.dispatchRecordChange(record.moduleId, auditOrgId, id).catch(() => {});

    return { ...updated, _lockWarnings: skipped };
  }

  async softDelete(id: string, orgId: string | null, userId: string) {
    const where: any = orgId ? { id, organizationId: orgId } : { id };
    const record = await this.prisma.record.findFirst({ where });
    if (!record) throw new NotFoundException('Record not found');
    await this.prisma.record.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId, organizationId: orgId ?? record.organizationId, action: 'RECORD_DELETED', entityType: 'Record', entityId: id, metadata: {} },
    });
    return { success: true };
  }

  async bulkDelete(ids: string[], orgId: string, userId: string) {
    await this.prisma.record.updateMany({
      where: { id: { in: ids }, organizationId: orgId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true, count: ids.length };
  }

  async bulkUpdateField(ids: string[], fieldName: string, value: any, orgId: string) {
    // One query for every record instead of one findFirst per id, and the blueprint
    // used for stage-lock checks is fetched once per distinct module instead of once
    // per record — bulk updates commonly touch hundreds of records in the same module.
    const records = await this.prisma.record.findMany({
      where: { id: { in: ids }, organizationId: orgId, isDeleted: false },
    });
    const foundIds = new Set(records.map(r => r.id));
    const errors: string[] = ids.filter(id => !foundIds.has(id));
    const locked: string[] = [];

    const moduleIds = [...new Set(records.map(r => r.moduleId))];
    const blueprints = moduleIds.length
      ? await this.prisma.blueprint.findMany({ where: { moduleId: { in: moduleIds }, organizationId: orgId, isActive: true } })
      : [];
    const blueprintByModule = new Map(blueprints.map(bp => [bp.moduleId, bp]));

    const toUpdate: { id: string; data: Record<string, any> }[] = [];
    for (const record of records) {
      const currentData = (record.data as Record<string, any>) || {};

      // Mass update has no override path — a field locked at the record's current
      // stage is simply skipped, regardless of the caller's role.
      const lock = resolveStageLock(blueprintByModule.get(record.moduleId) ?? null, currentData);
      if (lock && lock.fields.includes(fieldName)) { locked.push(record.id); continue; }

      toUpdate.push({ id: record.id, data: { ...currentData, [fieldName]: value } });
    }

    const results = await Promise.allSettled(
      toUpdate.map(({ id, data }) => this.prisma.record.update({ where: { id }, data: { data } })),
    );
    let updated = 0;
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') updated++;
      else errors.push(toUpdate[i].id);
    });

    return { updated, errors, locked, total: ids.length };
  }

  async addComment(recordId: string, orgId: string, userId: string, content: string) {
    const record = await this.prisma.record.findFirst({ where: { id: recordId, organizationId: orgId } });
    if (!record) throw new NotFoundException('Record not found');
    return this.prisma.comment.create({
      data: { recordId, userId, content },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  // ── Activity log ────────────────────────────────────────────────────────────

  async getActivity(recordId: string, orgId: string) {
    const [auditLogs, comments] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityId: recordId, organizationId: orgId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.comment.findMany({
        where: { recordId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const entries = [
      ...auditLogs.map((log: any) => ({
        id: log.id, type: 'audit' as const,
        action: log.action, user: log.user,
        metadata: log.metadata, createdAt: log.createdAt,
      })),
      ...comments.map((c: any) => ({
        id: c.id, type: 'comment' as const,
        action: 'COMMENT_ADDED', user: c.user,
        metadata: { content: c.content }, createdAt: c.createdAt,
      })),
    ];

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ── Duplicate record ────────────────────────────────────────────────────────

  async duplicate(id: string, orgId: string, userId: string, canSeeConfidential = false) {
    const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId, isDeleted: false } });
    if (!record) throw new NotFoundException('Record not found');

    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: record.moduleId },
      include: { fields: { where: { isActive: true } } },
    });

    const sourceData = (record.data as Record<string, any>) || {};
    const duplicateData: Record<string, any> = {};
    const skipTypes = new Set(['AUTO_NUMBER', 'FORMULA', 'INLINE_SUBFORM']);

    for (const [key, value] of Object.entries(sourceData)) {
      const field = mod?.fields.find((f: any) => f.name === key);
      if (field && skipTypes.has(field.type)) continue;
      duplicateData[key] = value;
    }

    for (const field of mod?.fields ?? []) {
      if ((field as any).type === 'AUTO_NUMBER') {
        duplicateData[(field as any).name] = await this.generateAutoNumber(field as any, record.moduleId, orgId);
      }
    }

    const newRecord = await this.prisma.record.create({
      data: { moduleId: record.moduleId, organizationId: orgId, createdById: userId, data: duplicateData },
    });

    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: orgId,
        action: 'RECORD_CREATED', entityType: 'Record', entityId: newRecord.id,
        metadata: { moduleId: record.moduleId, duplicatedFrom: id },
      },
    });

    // The stored copy always carries the real confidential values (storage
    // is not a view-time concern) — but the RESPONSE must be masked the same
    // way any other record read is, so this doesn't become a bypass route.
    return this.resolver.resolveRecord(newRecord, mod?.fields ?? [], canSeeConfidential);
  }

  // ── Archive / Lock ───────────────────────────────────────────────────────────

  async setArchived(id: string, orgId: string, userId: string, archived: boolean) {
    const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId, isDeleted: false } });
    if (!record) throw new NotFoundException('Record not found');
    await (this.prisma.record as any).update({
      where: { id },
      data: { isArchived: archived, archivedAt: archived ? new Date() : null },
    });
    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: orgId,
        action: archived ? 'RECORD_ARCHIVED' : 'RECORD_UNARCHIVED',
        entityType: 'Record', entityId: id, metadata: {},
      },
    });
    return { success: true, isArchived: archived };
  }

  async setLocked(id: string, orgId: string, userId: string, locked: boolean) {
    const record = await this.prisma.record.findFirst({ where: { id, organizationId: orgId, isDeleted: false } });
    if (!record) throw new NotFoundException('Record not found');
    await (this.prisma.record as any).update({
      where: { id },
      data: { isLocked: locked, lockedAt: locked ? new Date() : null },
    });
    await this.prisma.auditLog.create({
      data: {
        userId, organizationId: orgId,
        action: locked ? 'RECORD_LOCKED' : 'RECORD_UNLOCKED',
        entityType: 'Record', entityId: id, metadata: {},
      },
    });
    return { success: true, isLocked: locked };
  }

  async exportCsv(moduleId: string, orgId: string, filterGroup?: string, canSeeConfidential = false): Promise<string> {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const result = await this.findAll(moduleId, orgId, { page: 1, limit: 5000, filterGroup }, canSeeConfidential);
    const fields = mod.fields.filter(f => !['FILE', 'IMAGE', 'SIGNATURE'].includes(f.type));

    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = ['ID', ...fields.map(f => f.label), 'Created At'].map(esc).join(',');
    const rows = result.data.map(r => {
      const d = r.data as Record<string, any>;
      return [
        r.id,
        ...fields.map(f => Array.isArray(d[f.name]) ? (d[f.name] as string[]).join('; ') : d[f.name]),
        new Date(r.createdAt).toISOString(),
      ].map(esc).join(',');
    });

    return [header, ...rows].join('\n');
  }

  // import methods removed

  private parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const vals = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
    return { headers, rows };
  }

  async importPreview(csvText: string) {
    const { headers, rows } = this.parseCsv(csvText);
    return { headers, preview: rows.slice(0, 5), total: rows.length };
  }

  async importCsv(
    moduleId: string, orgId: string, userId: string,
    csvText: string, mapping: Record<string, string>,
  ) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, include: { options: true } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const { rows } = this.parseCsv(csvText);
    let imported = 0;
    const errors: string[] = [];
    let lockedFieldsSkipped = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const data: Record<string, any> = {};
        for (const [csvCol, fieldName] of Object.entries(mapping)) {
          if (fieldName && rows[i][csvCol] !== undefined && rows[i][csvCol] !== '') {
            data[fieldName] = rows[i][csvCol];
          }
        }
        for (const field of mod.fields) {
          if (field.type === 'AUTO_NUMBER') {
            data[field.name] = await this.generateAutoNumber(field, moduleId, orgId);
          }
        }

        // Imports have no override path either — if the mapped row lands the new
        // record directly in a stage that locks fields, those fields are dropped
        // from the imported data rather than failing the whole row.
        const lock = await getLockInfoForRecordData(this.prisma, moduleId, orgId, data);
        if (lock) {
          for (const field of lock.fields) {
            if (field in data) { delete data[field]; lockedFieldsSkipped++; }
          }
        }

        await this.prisma.record.create({
          data: { moduleId, organizationId: orgId, createdById: userId, data },
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 2}: ${err?.message || 'Unknown error'}`);
      }
    }

    if (imported > 0) {
      await this.prisma.auditLog.create({
        data: {
          userId, organizationId: orgId,
          action: 'RECORDS_IMPORTED', entityType: mod.name, entityId: moduleId,
          metadata: { imported, errors: errors.length, lockedFieldsSkipped },
        },
      });
    }

    return { imported, errors, lockedFieldsSkipped, total: rows.length };
  }

  async getImportTemplate(moduleId: string, orgId: string): Promise<string> {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
      include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    });
    if (!mod) throw new NotFoundException('Module not found');

    const fields = mod.fields.filter(f => !['AUTO_NUMBER', 'FILE', 'IMAGE', 'SIGNATURE'].includes(f.type));
    const esc = (v: string) => /[,"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const header = fields.map(f => esc(f.label)).join(',');
    const example = fields.map(f => {
      switch (f.type) {
        case 'NUMBER': case 'DECIMAL': case 'CURRENCY': return '100';
        case 'BOOLEAN': return 'true';
        case 'DATE': return '2025-01-15';
        case 'DATETIME': return '2025-01-15T09:00:00';
        case 'EMAIL': return 'example@email.com';
        case 'PHONE': return '+1-555-0100';
        case 'URL': return 'https://example.com';
        case 'RATING': return '4';
        case 'PROGRESS': return '50';
        default: return `Example ${f.label}`;
      }
    }).map(esc).join(',');
    return [header, example].join('\n');
  }

  async lookupSearch(orgId: string, targetModuleId: string, displayField: string, search: string) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: targetModuleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Target module not found');

    const records = await this.prisma.record.findMany({
      where: { moduleId: targetModuleId, organizationId: orgId, isDeleted: false },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const filtered = search
      ? records.filter(r => {
          const val = (r.data as any)?.[displayField];
          return val && String(val).toLowerCase().includes(search.toLowerCase());
        })
      : records.slice(0, 20);

    return filtered.map(r => ({
      id: r.id,
      label: (r.data as any)?.[displayField] ?? r.id,
      data: r.data,
    }));
  }

  // ── Integration Field search ────────────────────────────────────────────────
  // Resolves everything (target module, search/display/column fields) from the
  // Integration field's own settings — the caller supplies only the field id,
  // never a module id directly, so a client can't point the search at a module
  // it wasn't configured for.
  // Public — also used by FormsService to resolve an Integration field's
  // config (source module + fields) without running a search, e.g. to build
  // or consume a prefill link.
  async resolveIntegrationField(fieldId: string, orgId: string) {
    const field = await this.prisma.field.findFirst({
      where: { id: fieldId, type: 'INTEGRATION', module: { organizationId: orgId } },
    });
    if (!field) throw new NotFoundException('Integration field not found');
    return this.resolveIntegrationSettings((field.settings as any) ?? {}, orgId);
  }

  // Shared by both the module-backed path (settings come off a real Field row)
  // and the standalone-form path (settings come off a CustomFieldDef inside
  // Form.settings.customFields — a JSON blob with no Field row at all).
  async resolveIntegrationSettings(settings: any, orgId: string) {
    const sourceModuleId: string | undefined = settings?.sourceModuleId;
    const searchFieldIds: string[] = settings?.searchFieldIds ?? [];
    const displayFieldId: string | undefined = settings?.displayFieldId;
    const resultColumnFieldIds: string[] = settings?.resultColumnFieldIds ?? [];
    if (!sourceModuleId) throw new NotFoundException('Integration field is not configured yet');

    // The standalone path's settings are just JSON on the form — confirm the
    // referenced module is actually in this org before trusting anything else in it.
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: sourceModuleId, organizationId: orgId } });
    if (!mod) throw new NotFoundException('Source module not found');

    // Fetch every field on the source module (not just the ones referenced by
    // search/display/columns) — the client-side mapping engine needs to resolve
    // an arbitrary sourceFieldId (from the form's mapping config) to a name, and
    // public forms can't call the authenticated /modules/:id/fields endpoint to
    // do that themselves.
    const allSourceFields = await this.prisma.field.findMany({ where: { moduleId: sourceModuleId } });
    const byId = new Map(allSourceFields.map(f => [f.id, f]));

    // Filter Criteria conditions are stored keyed by field NAME already (same
    // convention as the workflow condition-tree), so no id resolution is needed.
    const filterWhere = conditionTreeToPrismaWhere(settings?.filterCriteria);

    return {
      sourceModuleId,
      searchFieldNames: searchFieldIds.map(id => byId.get(id)?.name).filter(Boolean) as string[],
      searchFields: searchFieldIds
        .map(id => byId.get(id))
        .filter((f): f is typeof allSourceFields[number] => !!f)
        .map(f => ({ name: f.name, label: f.label })),
      displayFieldName: displayFieldId ? byId.get(displayFieldId)?.name : undefined,
      resultColumns: resultColumnFieldIds
        .map(id => ({ name: byId.get(id)?.name, label: byId.get(id)?.label }))
        .filter((c): c is { name: string; label: string } => !!c.name),
      sourceFields: allSourceFields.map(f => ({ id: f.id, name: f.name, label: f.label })),
      filterWhere,
      // Opt-in, off by default — lets a manual search-and-select on a PUBLIC
      // form also write mapped values back into the selected record, not
      // just prefill other fields on the same form. Off by default because
      // it lets any submitter search for and update an arbitrary record in
      // the source module; an admin must explicitly accept that tradeoff
      // per field.
      allowManualUpdate: !!settings?.allowManualUpdate,
    };
  }

  private async runIntegrationSearch(
    orgId: string,
    cfg: {
      sourceModuleId: string; searchFieldNames: string[]; searchFields: { name: string; label: string }[];
      displayFieldName?: string;
      resultColumns: { name: string; label: string }[]; sourceFields: { id: string; name: string; label: string }[];
      filterWhere?: any;
      allowManualUpdate?: boolean;
    },
    search: string,
    page: number,
    pageSize: number,
    // "Advanced search" — restricts matching to exactly this one configured
    // Search Field instead of OR-ing across all of them. Validated against
    // cfg.searchFieldNames (never trust a client-supplied field name outright)
    // so a visitor can't probe arbitrary fields the builder never exposed here.
    searchFieldName?: string,
  ) {
    const baseWhere: any = { moduleId: cfg.sourceModuleId, organizationId: orgId, isDeleted: false };
    const andClauses: any[] = [];
    const effectiveSearchFields = searchFieldName && cfg.searchFieldNames.includes(searchFieldName)
      ? [searchFieldName]
      : cfg.searchFieldNames;
    if (search && effectiveSearchFields.length > 0) {
      // MySQL's Prisma JSON filter takes `path` as a JSONPath *string*
      // ("$.fieldName") — the array form (`['fieldName']`) is Postgres-only
      // and silently matches nothing on MySQL instead of erroring.
      andClauses.push({ OR: effectiveSearchFields.map(name => ({ data: { path: `$.${name}`, string_contains: search } })) });
    }
    if (cfg.filterWhere) andClauses.push(cfg.filterWhere);
    const where: any = andClauses.length > 0 ? { ...baseWhere, AND: andClauses } : baseWhere;

    const [total, records] = await Promise.all([
      this.prisma.record.count({ where }),
      this.prisma.record.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);

    // When Advanced Search is restricting to one specific field, show THAT
    // field's value as the label — the visitor searched by it, so they expect
    // to see it, not whatever the (independently configured) Display Field
    // happens to be. Falls back to Display Field, then the first search
    // field, when searching across all of them (no single field to prefer) —
    // a raw record id is meaningless to a user picking a result.
    const activeSearchField = searchFieldName && cfg.searchFieldNames.includes(searchFieldName) ? searchFieldName : undefined;
    const fallbackFieldName = activeSearchField || cfg.displayFieldName || cfg.searchFieldNames[0];
    const items = records.map(r => {
      const data = (r.data as any) ?? {};
      const columns: Record<string, any> = {};
      for (const col of cfg.resultColumns) columns[col.name] = data[col.name];
      return { id: r.id, label: fallbackFieldName ? (data[fallbackFieldName] ?? r.id) : r.id, columns, data };
    });

    return {
      items, total, page, pageSize,
      columns: cfg.resultColumns, sourceFields: cfg.sourceFields, searchFields: cfg.searchFields,
      allowManualUpdate: !!cfg.allowManualUpdate,
    };
  }

  // Also used by FormsService for the public-form path — org there is derived
  // from the form (already verified), and the caller has already checked the
  // field actually belongs to that specific published form.
  async integrationSearch(orgId: string, fieldId: string, search: string, page = 1, pageSize = 20, searchFieldName?: string) {
    const cfg = await this.resolveIntegrationField(fieldId, orgId);
    return this.runIntegrationSearch(orgId, cfg, search || '', page, pageSize, searchFieldName);
  }

  // Standalone-form path — there's no Field row to look up by id, so the
  // caller (FormsService, which owns the form and can be trusted for the
  // settings it hands over) passes the CustomFieldDef's own settings directly.
  async integrationSearchWithConfig(orgId: string, settings: any, search: string, page = 1, pageSize = 20, searchFieldName?: string) {
    const cfg = await this.resolveIntegrationSettings(settings, orgId);
    return this.runIntegrationSearch(orgId, cfg, search || '', page, pageSize, searchFieldName);
  }
}
