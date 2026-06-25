import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskPanelsService {
  constructor(private prisma: PrismaService) {}

  // ─── Filter helpers (mirrors RecordsService logic) ───────────────────────

  private applyCondition(data: any, c: any): boolean {
    const raw = data?.[c.field];
    const val = raw ?? '';
    const cv = c.value ?? '';

    switch (c.operator) {
      case 'is':           return String(val) === String(cv);
      case 'is_not':       return String(val) !== String(cv);
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
      case 'this_month':   { const now = new Date(); const dv = new Date(val); return dv.getMonth() === now.getMonth() && dv.getFullYear() === now.getFullYear(); }
      case 'last_month':   { const now = new Date(); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const dv = new Date(val); return dv.getMonth() === lm.getMonth() && dv.getFullYear() === lm.getFullYear(); }
      case 'date_between': { const dv = new Date(val); return dv >= new Date(cv) && dv <= new Date(c.value2); }
      default:             return true;
    }
  }

  private applyFilterGroup(data: any, group: any): boolean {
    const results: boolean[] = [
      ...group.conditions.map((c: any) => this.applyCondition(data, c)),
      ...(group.groups || []).map((g: any) => this.applyFilterGroup(data, g)),
    ];
    if (results.length === 0) return true;
    return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  // ─── Role access helper ───────────────────────────────────────────────────

  private panelAllowsRole(panel: any, userRole: string): boolean {
    const roles: string[] = Array.isArray(panel.assigneeRoles)
      ? panel.assigneeRoles
      : JSON.parse(String(panel.assigneeRoles || '[]'));
    return roles.length === 0 || roles.includes(userRole);
  }

  // ─── Public methods ───────────────────────────────────────────────────────

  async getPanelsForUser(userId: string, userRole: string, organizationId: string) {
    const panels = await this.prisma.taskPanel.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });

    return panels.filter(panel => this.panelAllowsRole(panel, userRole));
  }

  async getAllPanels(organizationId: string) {
    return this.prisma.taskPanel.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' },
    });
  }

  async getPanelRecords(
    panelId: string,
    userId: string,
    userRole: string,
    organizationId: string,
  ) {
    // Find panel
    const panel = await this.prisma.taskPanel.findFirst({
      where: { id: panelId, organizationId },
    });
    if (!panel) throw new NotFoundException('Panel not found');

    // Verify role access
    if (!this.panelAllowsRole(panel, userRole)) {
      throw new NotFoundException('Panel not found');
    }

    // Load referenced module
    const module = await this.prisma.dynamicModule.findFirst({
      where: { id: panel.moduleId, organizationId },
    });
    if (!module) throw new NotFoundException('Module not found');

    // Load fields
    const fields = await this.prisma.field.findMany({
      where: { moduleId: panel.moduleId, isActive: true },
      include: { options: true },
    });

    // Build base query
    const sortField = panel.sortField || 'createdAt';
    const sortDir = (panel.sortDir as 'asc' | 'desc') || 'desc';
    const displayLimit = panel.displayLimit || 50;

    let records: any[] = await this.prisma.record.findMany({
      where: { moduleId: panel.moduleId, organizationId, isDeleted: false },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { [sortField]: sortDir },
      take: displayLimit,
    });

    // Apply filterGroup if non-empty
    const rawFilterGroup = panel.filterGroup;
    if (rawFilterGroup) {
      try {
        const fg =
          typeof rawFilterGroup === 'string'
            ? JSON.parse(rawFilterGroup)
            : rawFilterGroup;

        const hasConditions =
          fg &&
          typeof fg === 'object' &&
          Array.isArray((fg as any).conditions) &&
          (fg as any).conditions.length > 0;

        if (hasConditions) {
          records = records.filter(r => this.applyFilterGroup(r.data as any, fg));
        }
      } catch {
        // invalid filterGroup JSON — skip filtering
      }
    }

    // Determine "new" threshold
    const thresholdMs = (panel.newThresholdHours || 24) * 60 * 60 * 1000;
    const threshold = new Date(Date.now() - thresholdMs);

    // Enrich records with isNew flag
    const enrichedRecords = records.map(record => ({
      ...record,
      isNew: record.createdAt > threshold,
    }));

    const newCount = enrichedRecords.filter(r => r.isNew).length;

    return {
      panel,
      module,
      fields,
      records: enrichedRecords,
      total: enrichedRecords.length,
      newCount,
    };
  }

  async createPanel(dto: any, organizationId: string) {
    const agg = await this.prisma.taskPanel.aggregate({
      where: { organizationId },
      _max: { order: true },
    });
    const nextOrder = (agg._max.order ?? 0) + 1;

    return this.prisma.taskPanel.create({
      data: {
        ...dto,
        organizationId,
        order: nextOrder,
      },
    });
  }

  async updatePanel(id: string, dto: any, organizationId: string) {
    const panel = await this.prisma.taskPanel.findFirst({ where: { id, organizationId } });
    if (!panel) throw new NotFoundException('Panel not found');

    return this.prisma.taskPanel.update({
      where: { id },
      data: dto,
    });
  }

  async deletePanel(id: string, organizationId: string) {
    const panel = await this.prisma.taskPanel.findFirst({ where: { id, organizationId } });
    if (!panel) throw new NotFoundException('Panel not found');

    return this.prisma.taskPanel.delete({ where: { id } });
  }
}
