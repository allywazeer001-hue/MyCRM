import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecordRoutingService {
  constructor(private prisma: PrismaService) {}

  // ── Condition evaluation ─────────────────────────────────────────────────────

  private evalCondition(c: any, data: any): boolean {
    const raw = data?.[c.field];
    const val = raw === null || raw === undefined ? '' : String(raw);
    const cv  = String(c.value ?? '');
    switch (c.operator) {
      case 'is':           return val.toLowerCase() === cv.toLowerCase();
      case 'is_not':       return val.toLowerCase() !== cv.toLowerCase();
      case 'contains':     return val.toLowerCase().includes(cv.toLowerCase());
      case 'not_contains': return !val.toLowerCase().includes(cv.toLowerCase());
      case 'empty':        return raw === null || raw === undefined || raw === '';
      case 'not_empty':    return raw !== null && raw !== undefined && raw !== '';
      case 'gt':           return Number(raw) > Number(cv);
      case 'lt':           return Number(raw) < Number(cv);
      case 'gte':          return Number(raw) >= Number(cv);
      case 'lte':          return Number(raw) <= Number(cv);
      default:             return true;
    }
  }

  private matchesConditions(config: any, recordData: any): boolean {
    const conditions: any[] = config.filterConditions ?? [];
    if (!conditions.length) return true;
    const results = conditions.map((c: any) => this.evalCondition(c, recordData));
    return config.conditionsLogic === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  // ── Virtual queue engine ─────────────────────────────────────────────────────

  /**
   * Returns configs applicable to the given user (matched by role, dept, or jobTitle).
   * Empty targetRoles array means the config applies to everyone.
   */
  private async getApplicableConfigs(userId: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: {
        role: true,
        jobTitle: true,
        department: { select: { id: true, name: true } },
      },
    });

    const configs = await this.prisma.recordRoutingConfig.findMany({
      where: { organizationId: orgId, isEnabled: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Build a set of values to match against
    const userIdentifiers = new Set<string>([
      user?.role ?? '',
      user?.jobTitle ?? '',
      user?.department?.name ?? '',
      user?.department?.id ?? '',
    ].filter(Boolean));

    return configs.filter(cfg => {
      const targetRoles = (cfg.targetRoles as string[]) ?? [];
      if (!targetRoles.length) return true; // No restriction → everyone
      return targetRoles.some(r => userIdentifiers.has(r));
    });
  }

  /**
   * Virtual queue: for each applicable config, run the filter live against records.
   * No rows are stored — this is a pure query.
   */
  async getVirtualQueue(userId: string, orgId: string) {
    const configs = await this.getApplicableConfigs(userId, orgId);
    if (!configs.length) return [];

    const groups = await Promise.all(configs.map(async cfg => {
      const [allRecords, mod] = await Promise.all([
        this.prisma.record.findMany({
          where: { moduleId: cfg.moduleId, organizationId: orgId, isDeleted: false },
          select: { id: true, data: true, moduleId: true, createdAt: true, updatedAt: true, createdById: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        this.prisma.dynamicModule.findFirst({
          where: { id: cfg.moduleId },
          select: { slug: true, name: true, icon: true },
        }),
      ]);

      const matching = allRecords.filter(r =>
        this.matchesConditions(cfg, (r.data as any) ?? {}),
      );

      return {
        configId:      cfg.id,
        configName:    cfg.name,
        moduleId:      cfg.moduleId,
        moduleSlug:    mod?.slug ?? '',
        moduleName:    mod?.name ?? '',
        moduleIcon:    mod?.icon ?? null,
        displayFields: (cfg.displayFields as string[]) ?? [],
        actions:       (cfg.actions as any[]) ?? [],
        records:       matching,
        total:         matching.length,
      };
    }));

    return groups;
  }

  /** Execute a single configured action on one record */
  async executeAction(
    orgId: string,
    userId: string,
    recordId: string,
    configId: string,
    actionId: string,
  ) {
    const [record, cfg] = await Promise.all([
      this.prisma.record.findFirst({ where: { id: recordId, organizationId: orgId } }),
      this.prisma.recordRoutingConfig.findFirst({ where: { id: configId, organizationId: orgId } }),
    ]);
    if (!record) throw new NotFoundException('Record not found');
    if (!cfg)    throw new NotFoundException('Config not found');

    const actions: any[] = (cfg.actions as any[]) ?? [];
    const action = actions.find((a: any) => a.id === actionId);
    if (!action) throw new NotFoundException('Action not found');

    const newData = { ...(record.data as any) };
    for (const fu of action.fieldUpdates ?? []) {
      if (fu.field) newData[fu.field] = fu.value;
    }

    await this.prisma.record.update({
      where: { id: recordId },
      data: { data: newData, updatedById: userId },
    });

    return { success: true, actionName: action.name };
  }

  /** Execute an action on multiple records at once */
  async executeBulkAction(
    orgId: string,
    userId: string,
    recordIds: string[],
    configId: string,
    actionId: string,
  ) {
    const cfg = await this.prisma.recordRoutingConfig.findFirst({
      where: { id: configId, organizationId: orgId },
    });
    if (!cfg) throw new NotFoundException('Config not found');

    const actions: any[] = (cfg.actions as any[]) ?? [];
    const action = actions.find((a: any) => a.id === actionId);
    if (!action) throw new NotFoundException('Action not found');

    if (!action.fieldUpdates?.length) return { affected: 0 };

    const records = await this.prisma.record.findMany({
      where: { id: { in: recordIds }, organizationId: orgId, isDeleted: false },
    });

    let affected = 0;
    await Promise.all(records.map(async record => {
      const newData = { ...(record.data as any) };
      for (const fu of action.fieldUpdates) {
        if (fu.field) newData[fu.field] = fu.value;
      }
      await this.prisma.record.update({
        where: { id: record.id },
        data: { data: newData, updatedById: userId },
      });
      affected++;
    }));

    return { affected };
  }

  // ── Config CRUD ──────────────────────────────────────────────────────────────

  async findAllConfigs(orgId: string) {
    return this.prisma.recordRoutingConfig.findMany({
      where: { organizationId: orgId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneConfig(id: string, orgId: string) {
    const cfg = await this.prisma.recordRoutingConfig.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!cfg) throw new NotFoundException('Routing config not found');
    return cfg;
  }

  async createConfig(orgId: string, body: any) {
    return this.prisma.recordRoutingConfig.create({
      data: {
        name:             body.name,
        description:      body.description ?? null,
        moduleId:         body.moduleId,
        organizationId:   orgId,
        isEnabled:        body.isEnabled ?? true,
        priority:         body.priority ?? 0,
        targetRoles:      body.targetRoles ?? [],
        filterConditions: body.filterConditions ?? [],
        conditionsLogic:  body.conditionsLogic ?? 'AND',
        displayFields:    body.displayFields ?? [],
        actions:          body.actions ?? [],
      },
    });
  }

  async updateConfig(id: string, orgId: string, body: any) {
    await this.findOneConfig(id, orgId);
    return this.prisma.recordRoutingConfig.update({
      where: { id },
      data: {
        name:             body.name ?? undefined,
        description:      body.description ?? undefined,
        moduleId:         body.moduleId ?? undefined,
        isEnabled:        body.isEnabled ?? undefined,
        priority:         body.priority ?? undefined,
        targetRoles:      body.targetRoles ?? undefined,
        filterConditions: body.filterConditions ?? undefined,
        conditionsLogic:  body.conditionsLogic ?? undefined,
        displayFields:    body.displayFields ?? undefined,
        actions:          body.actions ?? undefined,
      },
    });
  }

  async toggleConfig(id: string, orgId: string) {
    const cfg = await this.findOneConfig(id, orgId);
    return this.prisma.recordRoutingConfig.update({
      where: { id },
      data: { isEnabled: !cfg.isEnabled },
    });
  }

  async deleteConfig(id: string, orgId: string) {
    await this.findOneConfig(id, orgId);
    return this.prisma.recordRoutingConfig.delete({ where: { id } });
  }
}
