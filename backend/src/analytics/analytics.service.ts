import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

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
      case 'is':              return val === cv;
      case 'is_not':          return val !== cv;
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

  async getAnalytics(moduleId: string, orgId: string, params: AnalyticsParams) {
    const { groupByField, aggregation = 'COUNT', aggregateField, filterGroup } = params;

    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
    });
    if (!mod) throw new NotFoundException('Module not found');

    let records = await this.prisma.record.findMany({
      where: { moduleId, organizationId: orgId, isDeleted: false },
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

    // Group by field
    const groups: Record<string, any[]> = {};
    for (const r of records) {
      const key = String((r.data as any)?.[groupByField] ?? '(empty)');
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

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

  async getViews(orgId: string) {
    const views = await this.prisma.analyticsView.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
    });
    // Pinned views first
    return [...views.filter(v => v.isPinned), ...views.filter(v => !v.isPinned)];
  }

  async createView(orgId: string, userId: string, data: any) {
    return this.prisma.analyticsView.create({
      data: { ...data, organizationId: orgId, createdById: userId },
    });
  }

  async updateView(id: string, orgId: string, data: any) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    return this.prisma.analyticsView.update({ where: { id }, data });
  }

  async deleteView(id: string, orgId: string) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
    return this.prisma.analyticsView.delete({ where: { id } });
  }

  async togglePinView(id: string, orgId: string) {
    const view = await this.prisma.analyticsView.findFirst({ where: { id, organizationId: orgId } });
    if (!view) throw new NotFoundException('View not found');
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
