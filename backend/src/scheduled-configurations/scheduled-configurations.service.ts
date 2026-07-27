import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FieldsService } from '../fields/fields.service';
import { AnalyticsService } from '../analytics/analytics.service';

export type ConfigurationActionType =
  | 'SET_FIELD_DEFAULT'
  | 'UPDATE_FIELD_OPTIONS'
  | 'UPDATE_SAVED_FILTER'
  | 'SET_WORKFLOW_ACTIVE';

const ACTION_TYPES: ConfigurationActionType[] = [
  'SET_FIELD_DEFAULT',
  'UPDATE_FIELD_OPTIONS',
  'UPDATE_SAVED_FILTER',
  'SET_WORKFLOW_ACTIVE',
];

/**
 * Computes the next fire time for a schedule. One-time schedules just use the picked
 * `runAt` verbatim. Recurring schedules step forward by whole days/weeks/months from
 * `now` until landing on the next occurrence of the configured time-of-day — deliberately
 * simple (no cron-expression engine) to match this codebase's existing scheduling
 * patterns, none of which parse real cron either.
 */
export function computeNextRunAt(
  now: Date,
  opts: {
    isRecurring: boolean;
    recurrencePattern?: string | null;
    recurrenceDayOfWeek?: number | null;
    recurrenceDayOfMonth?: number | null;
    timeOfDay: string;
    runAt?: Date | string | null;
  },
): Date {
  if (!opts.isRecurring) {
    if (!opts.runAt) throw new BadRequestException('A one-time schedule requires runAt');
    return new Date(opts.runAt);
  }

  const [hh, mm] = opts.timeOfDay.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) throw new BadRequestException('timeOfDay must be "HH:MM"');

  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hh, mm);

  switch (opts.recurrencePattern) {
    case 'DAILY':
      if (next <= now) next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY': {
      const targetDow = opts.recurrenceDayOfWeek ?? 0;
      const diff = (targetDow - next.getDay() + 7) % 7;
      next.setDate(next.getDate() + diff);
      if (next <= now) next.setDate(next.getDate() + 7);
      break;
    }
    case 'MONTHLY': {
      const targetDom = opts.recurrenceDayOfMonth ?? 1;
      next.setDate(targetDom);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDom);
      }
      break;
    }
    default:
      throw new BadRequestException('recurrencePattern must be DAILY, WEEKLY, or MONTHLY');
  }
  return next;
}

@Injectable()
export class ScheduledConfigurationsService {
  constructor(
    private prisma: PrismaService,
    private fields: FieldsService,
    private analytics: AnalyticsService,
  ) {}

  private assertAdmin(user: any) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can manage scheduled configurations');
    }
  }

  private validateActions(actions: any[]) {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }
    for (const a of actions) {
      if (!ACTION_TYPES.includes(a.type)) throw new BadRequestException(`Unknown action type: ${a.type}`);
      if (!a.targetId) throw new BadRequestException(`Action of type ${a.type} is missing targetId`);
    }
  }

  async findAll(orgId: string) {
    return this.prisma.scheduledConfiguration.findMany({
      where: { organizationId: orgId },
      include: {
        actions: { orderBy: { order: 'asc' } },
        executionLogs: { orderBy: { ranAt: 'desc' }, take: 1 },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const config = await this.prisma.scheduledConfiguration.findFirst({
      where: { id, organizationId: orgId },
      include: {
        actions: { orderBy: { order: 'asc' } },
        executionLogs: { orderBy: { ranAt: 'desc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!config) throw new NotFoundException('Scheduled configuration not found');
    return config;
  }

  async create(orgId: string, user: any, data: any) {
    this.assertAdmin(user);
    this.validateActions(data.actions);

    const nextRunAt = computeNextRunAt(new Date(), {
      isRecurring: !!data.isRecurring,
      recurrencePattern: data.recurrencePattern,
      recurrenceDayOfWeek: data.recurrenceDayOfWeek,
      recurrenceDayOfMonth: data.recurrenceDayOfMonth,
      timeOfDay: data.timeOfDay,
      runAt: data.runAt,
    });

    return this.prisma.scheduledConfiguration.create({
      data: {
        name: data.name?.trim() || 'Untitled Schedule',
        description: data.description ?? null,
        organizationId: orgId,
        createdById: user.id,
        isActive: data.isActive ?? true,
        isRecurring: !!data.isRecurring,
        recurrencePattern: data.isRecurring ? data.recurrencePattern : null,
        recurrenceDayOfWeek: data.isRecurring && data.recurrencePattern === 'WEEKLY' ? data.recurrenceDayOfWeek : null,
        recurrenceDayOfMonth: data.isRecurring && data.recurrencePattern === 'MONTHLY' ? data.recurrenceDayOfMonth : null,
        timeOfDay: data.timeOfDay,
        runAt: data.isRecurring ? null : new Date(data.runAt),
        nextRunAt,
        actions: {
          create: data.actions.map((a: any, i: number) => ({
            type: a.type,
            targetId: a.targetId,
            config: a.config ?? {},
            order: i,
          })),
        },
      },
      include: { actions: true },
    });
  }

  async update(id: string, orgId: string, user: any, data: any) {
    this.assertAdmin(user);
    const existing = await this.findOne(id, orgId);

    const isRecurring = data.isRecurring ?? existing.isRecurring;
    const recurrencePattern = data.recurrencePattern ?? existing.recurrencePattern;
    const timeOfDay = data.timeOfDay ?? existing.timeOfDay;
    const runAt = data.runAt ?? existing.runAt;

    const nextRunAt = computeNextRunAt(new Date(), {
      isRecurring,
      recurrencePattern,
      recurrenceDayOfWeek: data.recurrenceDayOfWeek ?? existing.recurrenceDayOfWeek,
      recurrenceDayOfMonth: data.recurrenceDayOfMonth ?? existing.recurrenceDayOfMonth,
      timeOfDay,
      runAt,
    });

    const updateData: any = {
      nextRunAt,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : null,
      timeOfDay,
      runAt: isRecurring ? null : new Date(runAt),
    };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.recurrenceDayOfWeek !== undefined) updateData.recurrenceDayOfWeek = isRecurring && recurrencePattern === 'WEEKLY' ? data.recurrenceDayOfWeek : null;
    if (data.recurrenceDayOfMonth !== undefined) updateData.recurrenceDayOfMonth = isRecurring && recurrencePattern === 'MONTHLY' ? data.recurrenceDayOfMonth : null;

    if (data.actions !== undefined) {
      this.validateActions(data.actions);
      await this.prisma.configurationAction.deleteMany({ where: { scheduledConfigurationId: id } });
      updateData.actions = {
        create: data.actions.map((a: any, i: number) => ({
          type: a.type,
          targetId: a.targetId,
          config: a.config ?? {},
          order: i,
        })),
      };
    }

    return this.prisma.scheduledConfiguration.update({
      where: { id },
      data: updateData,
      include: { actions: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string, orgId: string, user: any) {
    this.assertAdmin(user);
    await this.findOne(id, orgId); // 404 guard
    await this.prisma.scheduledConfiguration.delete({ where: { id } }); // cascades actions + logs
    return { ok: true };
  }

  async setActive(id: string, orgId: string, user: any, isActive: boolean) {
    this.assertAdmin(user);
    const config = await this.findOne(id, orgId);
    const data: any = { isActive };
    // Re-arming a one-time schedule that already fired needs a fresh nextRunAt, or the
    // scheduler would immediately re-fire it on the very next poll.
    if (isActive && !config.isRecurring && config.nextRunAt < new Date()) {
      data.nextRunAt = config.runAt && config.runAt > new Date() ? config.runAt : new Date(Date.now() + 5 * 60 * 1000);
    }
    return this.prisma.scheduledConfiguration.update({ where: { id }, data });
  }

  /** Applies one action's change to its real target, reusing the exact same service
   *  methods a user would trigger by hand — nothing about how fields/filters/workflows
   *  normally get updated is touched by this feature. */
  private async executeAction(action: { id: string; type: string; targetId: string; config: any }, orgId: string) {
    try {
      switch (action.type as ConfigurationActionType) {
        case 'SET_FIELD_DEFAULT':
          await this.fields.update(action.targetId, orgId, { defaultValue: action.config?.defaultValue ?? null });
          break;
        case 'UPDATE_FIELD_OPTIONS':
          await this.fields.update(action.targetId, orgId, {
            options: action.config?.options ?? [],
            replaceExisting: action.config?.replaceExisting !== false,
          });
          break;
        case 'UPDATE_SAVED_FILTER':
          await this.analytics.updateSavedFilter(action.targetId, orgId, {
            conditions: action.config?.conditions ?? [],
            logic: action.config?.logic ?? 'AND',
          });
          break;
        case 'SET_WORKFLOW_ACTIVE':
          // A scheduled config sets an EXPLICIT state (not workflows.service's toggle(),
          // which just flips whatever the current value is — not idempotent/safe here).
          await this.prisma.workflow.update({
            where: { id: action.targetId },
            data: { isActive: !!action.config?.isActive },
          });
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      return { actionId: action.id, type: action.type, targetId: action.targetId, status: 'success' as const };
    } catch (err: any) {
      return { actionId: action.id, type: action.type, targetId: action.targetId, status: 'failed' as const, error: err?.message ?? 'Unknown error' };
    }
  }

  /** Fires a scheduled configuration right now — used by both the 5-minute poller and the
   *  builder UI's manual "Run Now" button. Always writes an execution log; advances
   *  recurring schedules to their next occurrence, or deactivates one-time ones. */
  async executeNow(id: string) {
    const config = await this.prisma.scheduledConfiguration.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: 'asc' } } },
    });
    if (!config) return null;

    const results = await Promise.all(config.actions.map((a) => this.executeAction(a, config.organizationId)));
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const status = failedCount === 0 ? 'success' : failedCount === results.length ? 'failed' : 'partial';
    const errorMessage = failedCount > 0
      ? results.filter((r) => r.status === 'failed').map((r: any) => r.error).join('; ')
      : null;

    await this.prisma.configurationExecutionLog.create({
      data: { scheduledConfigurationId: id, organizationId: config.organizationId, status, details: results, errorMessage },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: config.createdById,
        organizationId: config.organizationId,
        action: 'SCHEDULED_CONFIG_EXECUTED',
        entityType: 'ScheduledConfiguration',
        entityId: config.id,
        metadata: { status, actionCount: results.length, failedCount },
      },
    }).catch(() => {}); // audit trail is best-effort — never let a logging failure break execution

    if (config.isRecurring) {
      const nextRunAt = computeNextRunAt(new Date(), {
        isRecurring: true,
        recurrencePattern: config.recurrencePattern,
        recurrenceDayOfWeek: config.recurrenceDayOfWeek,
        recurrenceDayOfMonth: config.recurrenceDayOfMonth,
        timeOfDay: config.timeOfDay,
      });
      await this.prisma.scheduledConfiguration.update({ where: { id }, data: { lastRunAt: new Date(), nextRunAt } });
    } else {
      await this.prisma.scheduledConfiguration.update({ where: { id }, data: { lastRunAt: new Date(), isActive: false } });
    }

    return { status, results };
  }

  /** Manual trigger from the builder UI — same admin gate as every other mutation here. */
  async runNow(id: string, orgId: string, user: any) {
    this.assertAdmin(user);
    await this.findOne(id, orgId); // 404 guard
    return this.executeNow(id);
  }
}
