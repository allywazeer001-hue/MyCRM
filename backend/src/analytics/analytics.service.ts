import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCheckService, ShareableResource } from '../permissions/permission-check.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private perm: PermissionCheckService,
  ) {}

  // ── Filter engine ────────────────────────────────────────────────────────────
  // Applies a filter group (AND/OR with nested groups) to an array of records in JS.
  // We do in-memory filtering since records are stored as JSON — not in typed columns.

  applyFilterGroup(records: any[], group: FilterGroup): any[] {
    // Accept both 'logic' (frontend) and 'operator' (internal) field names
    const op: string = (group as any).logic || group.operator || 'AND';
    const conditions: FilterCondition[] = (group as any).conditions || [];
    const groups: FilterGroup[] = (group as any).groups || [];
    const allConditions = [
      ...conditions.map(c => (r: any) => this.matchCondition(r.data, c)),
      ...groups.map(g => (r: any) => this.applyFilterGroup([r], g).length > 0),
    ];
    if (allConditions.length === 0) return records;
    return records.filter(r =>
      op === 'AND'
        ? allConditions.every(fn => fn(r))
        : allConditions.some(fn => fn(r))
    );
  }

  private matchCondition(data: any, cond: FilterCondition): boolean {
    const rawVal = data?.[cond.field];
    const val = rawVal === null || rawVal === undefined ? '' : String(rawVal);
    const cv = cond.value ? String(cond.value) : '';

    switch (cond.operator) {
      // Case-insensitive to match how the report's own preview evaluates
      // "equals" filters (checkFilter in report-builder), and to tolerate
      // ordinary casing differences in free-typed dropdown/status values.
      case 'is':              return val.toLowerCase() === cv.toLowerCase();
      case 'is_not':          return val.toLowerCase() !== cv.toLowerCase();
      case 'contains':        return val.toLowerCase().includes(cv.toLowerCase());
      case 'not_contains':    return !val.toLowerCase().includes(cv.toLowerCase());
      case 'starts_with':     return val.toLowerCase().startsWith(cv.toLowerCase());
      case 'ends_with':       return val.toLowerCase().endsWith(cv.toLowerCase());
      case 'empty':           return val === '' || val === null;
      case 'not_empty':       return val !== '' && val !== null;
      // Number
      case 'eq':              return Number(rawVal) === Number(cv);
      case 'neq':             return Number(rawVal) !== Number(cv);
      case 'lt':              return Number(rawVal) < Number(cv);
      case 'lte':             return Number(rawVal) <= Number(cv);
      case 'gt':              return Number(rawVal) > Number(cv);
      case 'gte':             return Number(rawVal) >= Number(cv);
      case 'between': {
        const min = cv;
        const max = cond.value2 != null ? String(cond.value2) : cv.split(',')[1] ?? cv;
        return Number(rawVal) >= Number(min) && Number(rawVal) <= Number(max);
      }
      // Date
      case 'today': {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const d = new Date(rawVal); d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }
      case 'yesterday': {
        const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0);
        const d = new Date(rawVal); d.setHours(0, 0, 0, 0);
        return d.getTime() === y.getTime();
      }
      case 'this_week': {
        const now = new Date();
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(start.getDate() + 7);
        const d = new Date(rawVal);
        return d >= start && d < end;
      }
      case 'this_month': {
        const now = new Date();
        const d = new Date(rawVal);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      case 'date_between': {
        const from = cv;
        const to = cond.value2 != null ? String(cond.value2) : cv.split(',')[1] ?? cv;
        const d = new Date(rawVal);
        return d >= new Date(from) && d <= new Date(to);
      }
      default: return true;
    }
  }

  // ── Analytics aggregation ────────────────────────────────────────────────────

  async getAnalytics(moduleId: string, orgId: string, params: AnalyticsParams & { secondaryGroupByField?: string; barMode?: 'stacked' | 'grouped' }) {
    const { groupByField, aggregation = 'COUNT', aggregateField, filterGroup, secondaryGroupByField } = params;

    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
    });
    if (!mod) throw new NotFoundException('Module not found');

    // Data lives in a JSON column, so filtering/grouping happens in-memory below —
    // but we only ever need `data` for that, and a hard cap keeps one chart request
    // from scanning an unbounded number of records on very large modules.
    let records = await this.prisma.record.findMany({
      where: { moduleId, organizationId: orgId, isDeleted: false },
      select: { id: true, data: true },
      take: 50_000,
    });

    // Apply filters
    if (filterGroup) {
      records = this.applyFilterGroup(records, filterGroup);
    }

    const total = records.length;

    if (!groupByField) {
      // Aggregate only
      let value = total;
      if (aggregation === 'SUM' && aggregateField) {
        value = records.reduce((s, r) => s + (Number((r.data as any)?.[aggregateField]) || 0), 0);
      } else if (aggregation === 'AVG' && aggregateField) {
        const sum = records.reduce((s, r) => s + (Number((r.data as any)?.[aggregateField]) || 0), 0);
        value = total > 0 ? sum / total : 0;
      }
      return { total, value, data: [] };
    }

    // Group by primary field
    const groups: Record<string, any[]> = {};
    for (const r of records) {
      const key = String((r.data as any)?.[groupByField] ?? '(empty)');
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    // ── Single-level grouping (original behaviour) ──────────────────────────
    if (!secondaryGroupByField) {
      let data = Object.entries(groups).map(([name, recs]) => {
        let value = recs.length;
        if (aggregation === 'SUM' && aggregateField) {
          value = recs.reduce((s, r) => s + (Number((r.data as any)?.[aggregateField]) || 0), 0);
        } else if (aggregation === 'AVG' && aggregateField) {
          const sum = recs.reduce((s, r) => s + (Number((r.data as any)?.[aggregateField]) || 0), 0);
          value = recs.length > 0 ? sum / recs.length : 0;
        }
        return { name, value };
      });
      data.sort((a, b) => b.value - a.value);
      return { total, value: total, data };
    }

    // ── Multi-level grouping (secondary group → stacked/clustered bars) ─────
    // Collect all secondary group keys across all records
    const secondaryKeys = new Set<string>();
    for (const r of records) {
      const sk = String((r.data as any)?.[secondaryGroupByField] ?? '(empty)');
      secondaryKeys.add(sk);
    }
    const secKeys = [...secondaryKeys].sort();

    const data = Object.entries(groups).map(([name, recs]) => {
      const row: Record<string, any> = { name };
      for (const sk of secKeys) {
        const subset = recs.filter(r => String((r.data as any)?.[secondaryGroupByField] ?? '(empty)') === sk);
        let value = subset.length;
        if (aggregation === 'SUM' && aggregateField) {
          value = subset.reduce((s, r) => s + (Number((r.data as any)?.[aggregateField]) || 0), 0);
        } else if (aggregation === 'AVG' && aggregateField) {
          const sum = subset.reduce((s, r) => s + (Number((r.data as any)?.[aggregateField]) || 0), 0);
          value = subset.length > 0 ? sum / subset.length : 0;
        }
        row[sk] = value;
      }
      return row;
    });

    return { total, value: total, data, secondaryKeys: secKeys, isMultiLevel: true };
  }

  // Kanban grouping
  async getKanban(moduleId: string, orgId: string, statusField: string, filterGroup?: FilterGroup) {
    let records = await this.prisma.record.findMany({
      where: { moduleId, organizationId: orgId, isDeleted: false },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (filterGroup) records = this.applyFilterGroup(records, filterGroup);

    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId },
      include: { fields: { where: { name: statusField } } },
    });
    const field = mod?.fields?.[0];
    const options = field ? await this.prisma.fieldOption.findMany({ where: { fieldId: field.id } }) : [];

    const columns: Record<string, any[]> = {};
    for (const opt of options) columns[opt.value] = [];
    columns[''] = [];

    for (const r of records) {
      const key = String((r.data as any)?.[statusField] ?? '');
      if (!columns[key]) columns[key] = [];
      columns[key].push(r);
    }

    return {
      field,
      columns: Object.entries(columns).map(([key, records]) => ({
        key,
        label: options.find(o => o.value === key)?.label ?? (key || '(No Status)'),
        color: options.find(o => o.value === key)?.color,
        records,
      })),
    };
  }

  // ── Saved Views ──────────────────────────────────────────────────────────────

  async getViews(userId: string, orgId: string) {
    // Views are org-scoped but respect per-view sharing rules (isPublic / sharedRoles /
    // sharedDepartments / sharedUsers) — same "who can see" model as Dashboard.
    const views = await this.prisma.analyticsView.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    });
    const visible: typeof views = [];
    for (const v of views) {
      if (await this.perm.canViewResource(userId, orgId, v as unknown as ShareableResource)) {
        visible.push(v);
      }
    }
    // Pinned views first
    return [...visible.filter(v => v.isPinned), ...visible.filter(v => !v.isPinned)];
  }

  async getView(id: string, userId: string, orgId: string) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    const allowed = await this.perm.canViewResource(userId, orgId, view as unknown as ShareableResource);
    if (!allowed) throw new ForbiddenException('You do not have access to this visualization');
    return view;
  }

  async createView(orgId: string, userId: string, data: any) {
    return this.prisma.analyticsView.create({
      data: {
        name: data.name,
        config: data.config ?? {},
        organizationId: orgId,
        createdById: userId,
        isPublic: data.isPublic ?? false,
        sharedRoles: data.sharedRoles ?? [],
        sharedDepartments: data.sharedDepartments ?? [],
        sharedUsers: data.sharedUsers ?? [],
      },
    });
  }

  async updateView(id: string, userId: string, orgId: string, data: any) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    await this.perm.enforceCanEditResource(userId, orgId, view as unknown as ShareableResource);
    const allowed = ['name', 'config', 'isPinned', 'isPublic', 'sharedRoles', 'sharedDepartments', 'sharedUsers'];
    const clean: any = {};
    for (const k of allowed) if (data[k] !== undefined) clean[k] = data[k];
    return this.prisma.analyticsView.update({ where: { id }, data: clean });
  }

  async deleteView(id: string, userId: string, orgId: string) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    await this.perm.enforceCanEditResource(userId, orgId, view as unknown as ShareableResource);
    return this.prisma.analyticsView.delete({ where: { id } });
  }

  async togglePinView(id: string, userId: string, orgId: string) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    await this.perm.enforceCanEditResource(userId, orgId, view as unknown as ShareableResource);
    return this.prisma.analyticsView.update({ where: { id }, data: { isPinned: !view.isPinned } });
  }

  // ── Saved Filters ─────────────────────────────────────────────────────────────

  async getSavedFilters(orgId: string, context?: string) {
    const where: any = { organizationId: orgId };
    if (context) where.context = context;
    return this.prisma.savedFilter.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createSavedFilter(orgId: string, userId: string, data: any) {
    return this.prisma.savedFilter.create({
      data: { ...data, organizationId: orgId, createdById: userId },
    });
  }

  async updateSavedFilter(id: string, orgId: string, data: any) {
    const sf = await this.prisma.savedFilter.findFirst({ where: { id, organizationId: orgId } });
    if (!sf) throw new NotFoundException('Saved filter not found');
    return this.prisma.savedFilter.update({ where: { id }, data });
  }

  async deleteSavedFilter(id: string, orgId: string) {
    const sf = await this.prisma.savedFilter.findFirst({ where: { id, organizationId: orgId } });
    if (!sf) throw new NotFoundException('Saved filter not found');
    return this.prisma.savedFilter.delete({ where: { id } });
  }

  // ── Targets ──────────────────────────────────────────────────────────────────

  async getTargets(orgId: string) {
    return this.prisma.analyticsTarget.findMany({
      where: { organizationId: orgId },
      include: { module: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTarget(orgId: string, data: any) {
    return this.prisma.analyticsTarget.create({
      data: { ...data, organizationId: orgId },
      include: { module: { select: { id: true, name: true, icon: true } } },
    });
  }

  async updateTarget(id: string, orgId: string, data: any) {
    const target = await this.prisma.analyticsTarget.findFirst({ where: { id, organizationId: orgId } });
    if (!target) throw new NotFoundException('Target not found');
    return this.prisma.analyticsTarget.update({ where: { id }, data });
  }

  async deleteTarget(id: string, orgId: string) {
    const target = await this.prisma.analyticsTarget.findFirst({ where: { id, organizationId: orgId } });
    if (!target) throw new NotFoundException('Target not found');
    return this.prisma.analyticsTarget.delete({ where: { id } });
  }

  // Compute current value for a target from live records
  async computeTargetCurrent(id: string, orgId: string) {
    const target = await this.prisma.analyticsTarget.findFirst({ where: { id, organizationId: orgId } });
    if (!target) throw new NotFoundException('Target not found');

    let where: any = { moduleId: target.moduleId, organizationId: orgId, isDeleted: false };
    if (target.periodStart) where.createdAt = { gte: target.periodStart, ...(target.periodEnd ? { lte: target.periodEnd } : {}) };

    let currentValue = 0;
    if (target.aggregation === 'COUNT') {
      currentValue = await this.prisma.record.count({ where });
    } else if (target.aggregation === 'SUM' && target.fieldName) {
      const records = await this.prisma.record.findMany({ where });
      currentValue = records.reduce((s, r) => s + (Number((r.data as any)?.[target.fieldName!]) || 0), 0);
    } else if (target.aggregation === 'AVG' && target.fieldName) {
      const records = await this.prisma.record.findMany({ where });
      const sum = records.reduce((s, r) => s + (Number((r.data as any)?.[target.fieldName!]) || 0), 0);
      currentValue = records.length > 0 ? sum / records.length : 0;
    }

    await this.prisma.analyticsTarget.update({ where: { id }, data: { currentValue } });
    return { ...target, currentValue };
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FilterCondition {
  field: string;
  operator: string;
  value?: any;
  value2?: any;
}

interface FilterGroup {
  operator: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

interface AnalyticsParams {
  groupByField?: string;
  aggregation?: 'COUNT' | 'SUM' | 'AVG';
  aggregateField?: string;
  filterGroup?: FilterGroup;
}
