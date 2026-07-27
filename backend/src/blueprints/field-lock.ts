import { PrismaService } from '../prisma/prisma.service';

export interface StageLockConfig {
  fields: string[];
  overrideRoles: string[];
  overrideUserIds: string[];
  blueprintId: string;
  stageId: string;
}

export interface LockOverrideUser {
  id: string;
  role?: string;
}

// `Blueprint.fieldLocks` is stored as `{ [stageId]: string[] | StageLockValue }` —
// a plain string[] is the legacy shape (locked fields, no override permissions,
// from before this feature had an admin UI at all); the new shape adds override
// roles/users. Normalizing here means every caller gets one consistent shape
// regardless of which era a given blueprint's data was written in.
export function normalizeStageLock(raw: any, blueprintId: string, stageId: string): StageLockConfig {
  if (Array.isArray(raw)) {
    return { fields: raw, overrideRoles: [], overrideUserIds: [], blueprintId, stageId };
  }
  if (raw && typeof raw === 'object') {
    return {
      fields: Array.isArray(raw.fields) ? raw.fields : [],
      overrideRoles: Array.isArray(raw.overrideRoles) ? raw.overrideRoles : [],
      overrideUserIds: Array.isArray(raw.overrideUserIds) ? raw.overrideUserIds : [],
      blueprintId,
      stageId,
    };
  }
  return { fields: [], overrideRoles: [], overrideUserIds: [], blueprintId, stageId };
}

/**
 * Resolves the effective field-lock config for a record right now, based on its
 * module's active Blueprint and current stage. Returns null when there's no
 * blueprint, no current stage, or nothing locked at that stage.
 */
export async function getLockInfoForRecord(
  prisma: PrismaService,
  recordId: string,
  orgId: string,
): Promise<StageLockConfig | null> {
  const record = await prisma.record.findFirst({ where: { id: recordId, organizationId: orgId, isDeleted: false } });
  if (!record) return null;
  return getLockInfoForRecordData(prisma, record.moduleId, orgId, (record.data as any) || {});
}

export async function getLockInfoForRecordData(
  prisma: PrismaService,
  moduleId: string,
  orgId: string,
  recordData: Record<string, any>,
): Promise<StageLockConfig | null> {
  const blueprint = await prisma.blueprint.findFirst({
    where: { moduleId, organizationId: orgId, isActive: true },
  });
  return resolveStageLock(blueprint, recordData);
}

/**
 * Same resolution as `getLockInfoForRecordData`, but takes an already-loaded
 * blueprint instead of querying for it — lets callers that process many
 * records for the same module (e.g. bulk field updates) fetch the blueprint
 * once instead of once per record.
 */
export function resolveStageLock(
  blueprint: { id: string; phases: any; fieldLocks: any; statusFieldName: string } | null,
  recordData: Record<string, any>,
): StageLockConfig | null {
  if (!blueprint) return null;

  const phases = (blueprint.phases as any[]) || [];
  const fieldLocks = (blueprint.fieldLocks as any) || {};
  const currentValue = recordData[blueprint.statusFieldName];
  const currentStage = phases.find((p: any) => p.id === currentValue || p.name === currentValue);
  if (!currentStage) return null;

  const raw = fieldLocks[currentStage.id] ?? fieldLocks[currentStage.name];
  if (!raw) return null;

  const lock = normalizeStageLock(raw, blueprint.id, currentStage.id);
  return lock.fields.length > 0 ? lock : null;
}

export function canOverrideLock(lock: StageLockConfig, user: LockOverrideUser): boolean {
  if (user.role && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return true;
  if (user.role && lock.overrideRoles.includes(user.role)) return true;
  if (lock.overrideUserIds.includes(user.id)) return true;
  return false;
}

export interface PartitionedFields {
  allowed: Record<string, any>;
  skipped: { field: string; reason: 'LOCKED' | 'REASON_REQUIRED' }[];
  overridden: string[];
}

/**
 * Splits a submitted data patch into what's safe to apply vs. what must be
 * skipped because it touches a locked field the caller can't (yet) change.
 * `hasReason` gates whether an authorized override actually goes through, or
 * is held back pending a reason (see RecordsService.update).
 */
export function partitionLockedFields(
  submittedData: Record<string, any>,
  lock: StageLockConfig | null,
  user: LockOverrideUser,
  hasReason: boolean,
): PartitionedFields {
  if (!lock) return { allowed: submittedData, skipped: [], overridden: [] };

  const allowed: Record<string, any> = {};
  const skipped: PartitionedFields['skipped'] = [];
  const overridden: string[] = [];
  const canOverride = canOverrideLock(lock, user);

  for (const [field, value] of Object.entries(submittedData)) {
    if (!lock.fields.includes(field)) {
      allowed[field] = value;
      continue;
    }
    if (!canOverride) {
      skipped.push({ field, reason: 'LOCKED' });
      continue;
    }
    if (!hasReason) {
      skipped.push({ field, reason: 'REASON_REQUIRED' });
      continue;
    }
    allowed[field] = value;
    overridden.push(field);
  }

  return { allowed, skipped, overridden };
}
