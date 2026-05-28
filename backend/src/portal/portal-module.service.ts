import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortalAuthService } from './portal-auth.service';

@Injectable()
export class PortalModuleService {
  constructor(
    private prisma: PrismaService,
    private authService: PortalAuthService,
  ) {}

  // ── Module config list ────────────────────────────────────────────────────────

  async listModuleConfigs(organizationId: string) {
    const [modules, configs] = await Promise.all([
      this.prisma.dynamicModule.findMany({
        where: { organizationId, isActive: true },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, slug: true, icon: true, color: true },
      }),
      this.prisma.portalModuleConfig.findMany({
        where: { organizationId },
        include: { fieldMappings: { orderBy: { order: 'asc' } } },
      }),
    ]);

    const configMap = new Map(configs.map(c => [c.moduleId, c]));
    return modules.map(mod => ({
      module: mod,
      config: configMap.get(mod.id) ?? null,
      isEnabled: configMap.get(mod.id)?.isEnabled ?? false,
      mappingCount: configMap.get(mod.id)?.fieldMappings?.length ?? 0,
    }));
  }

  // ── Single module config ──────────────────────────────────────────────────────

  async getModuleConfig(organizationId: string, moduleId: string) {
    await this.assertModuleOwnership(organizationId, moduleId);
    const config = await this.prisma.portalModuleConfig.findUnique({
      where: { moduleId },
      include: { fieldMappings: { orderBy: { order: 'asc' } } },
    });
    const module = await this.prisma.dynamicModule.findUnique({
      where: { id: moduleId },
      include: {
        fields: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { options: true } },
      },
    });
    return { config, module };
  }

  async upsertModuleConfig(organizationId: string, moduleId: string, dto: {
    isEnabled?: boolean; portalLabel?: string; portalType?: string;
    menuItems?: any[]; dashboardLayout?: any; theme?: any;
  }) {
    await this.assertModuleOwnership(organizationId, moduleId);
    const mod = await this.prisma.dynamicModule.findUnique({ where: { id: moduleId }, select: { name: true } });
    return this.prisma.portalModuleConfig.upsert({
      where: { moduleId },
      create: {
        organizationId,
        moduleId,
        portalLabel: dto.portalLabel ?? `${mod?.name} Portal`,
        portalType: dto.portalType ?? 'standard',
        isEnabled: dto.isEnabled ?? true,
        menuItems: dto.menuItems ?? [],
        dashboardLayout: dto.dashboardLayout ?? {},
        theme: dto.theme ?? {},
      },
      update: {
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.portalLabel && { portalLabel: dto.portalLabel }),
        ...(dto.portalType && { portalType: dto.portalType }),
        ...(dto.menuItems !== undefined && { menuItems: dto.menuItems }),
        ...(dto.dashboardLayout !== undefined && { dashboardLayout: dto.dashboardLayout }),
        ...(dto.theme !== undefined && { theme: dto.theme }),
      },
      include: { fieldMappings: { orderBy: { order: 'asc' } } },
    });
  }

  // ── Field mappings ────────────────────────────────────────────────────────────

  async saveFieldMappings(organizationId: string, moduleId: string, mappings: Array<{
    crmFieldName: string; portalFieldName: string; displayLabel: string;
    isIdentity?: boolean; isEditable?: boolean; isVisible?: boolean; order?: number;
  }>) {
    await this.assertModuleOwnership(organizationId, moduleId);

    let config = await this.prisma.portalModuleConfig.findUnique({ where: { moduleId } });
    if (!config) {
      const mod = await this.prisma.dynamicModule.findUnique({ where: { id: moduleId }, select: { name: true } });
      config = await this.prisma.portalModuleConfig.create({
        data: { organizationId, moduleId, portalLabel: `${mod?.name} Portal`, isEnabled: true },
      });
    }

    await this.prisma.portalFieldMapping.deleteMany({ where: { portalModuleConfigId: config.id } });

    if (mappings.length > 0) {
      await this.prisma.portalFieldMapping.createMany({
        data: mappings.map((m, i) => ({
          portalModuleConfigId: config!.id,
          crmFieldName: m.crmFieldName,
          portalFieldName: m.portalFieldName,
          displayLabel: m.displayLabel,
          isIdentity: m.isIdentity ?? false,
          isEditable: m.isEditable ?? false,
          isVisible: m.isVisible ?? true,
          order: m.order ?? i,
        })),
      });
    }

    return this.prisma.portalModuleConfig.findUnique({
      where: { moduleId },
      include: { fieldMappings: { orderBy: { order: 'asc' } } },
    });
  }

  // ── Create portal user from CRM record ────────────────────────────────────────

  async createPortalUserFromRecord(organizationId: string, recordId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const existing = await this.prisma.portalUser.findFirst({
      where: { recordId, organizationId },
    });
    if (existing) {
      return { existed: true, user: this.authService.sanitize(existing) };
    }

    const config = await this.prisma.portalModuleConfig.findUnique({
      where: { moduleId: record.moduleId },
      include: { fieldMappings: { where: { isIdentity: true }, orderBy: { order: 'asc' } } },
    });
    if (!config || !config.isEnabled) {
      throw new BadRequestException('Portal is not enabled for this module. Enable it in Settings → Portal Settings first.');
    }

    const data = record.data as Record<string, any>;
    const mapped: Record<string, string> = {};
    for (const fm of config.fieldMappings) {
      const val = data[fm.crmFieldName];
      if (val !== null && val !== undefined && String(val).trim()) {
        mapped[fm.portalFieldName] = String(val).trim();
      }
    }

    if (!mapped['email']) {
      throw new BadRequestException('No email field is mapped as identity. Configure field mappings in Portal Settings first.');
    }
    if (!mapped['firstName'] && !mapped['lastName']) {
      throw new BadRequestException('No first/last name field is mapped as identity. Configure field mappings in Portal Settings first.');
    }

    const user = await this.authService.autoCreateUser({
      email: mapped['email'],
      firstName: mapped['firstName'] || 'Portal',
      lastName: mapped['lastName'] || 'User',
      phone: mapped['phone'],
      type: this.inferUserType(config.portalType),
      organizationId,
      moduleId: record.moduleId,
      recordId,
    });

    return { existed: false, user };
  }

  // ── Check if record already has a portal user ─────────────────────────────────

  async getRecordPortalStatus(organizationId: string, recordId: string) {
    const [config, portalUser] = await Promise.all([
      this.prisma.record.findFirst({
        where: { id: recordId, organizationId, isDeleted: false },
        select: { moduleId: true },
      }).then(r => r ? this.prisma.portalModuleConfig.findUnique({
        where: { moduleId: r.moduleId },
        select: { isEnabled: true, portalLabel: true, portalType: true },
      }) : null),
      this.prisma.portalUser.findFirst({
        where: { recordId, organizationId },
        select: { id: true, email: true, firstName: true, lastName: true, accountStatus: true, lastLoginAt: true },
      }),
    ]);
    return { portalEnabled: config?.isEnabled ?? false, portalLabel: config?.portalLabel, portalUser };
  }

  // ── Sync CRM record → portal user identity fields ─────────────────────────────

  async syncRecordToPortal(organizationId: string, recordId: string) {
    const record = await this.prisma.record.findFirst({
      where: { id: recordId, organizationId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Record not found');

    const portalUser = await this.prisma.portalUser.findFirst({ where: { recordId, organizationId } });
    if (!portalUser) return { synced: false, message: 'No portal user linked to this record' };

    const config = await this.prisma.portalModuleConfig.findUnique({
      where: { moduleId: record.moduleId },
      include: { fieldMappings: { where: { isIdentity: true } } },
    });
    if (!config) return { synced: false, message: 'No portal config for this module' };

    const data = record.data as Record<string, any>;
    const update: any = {};
    for (const fm of config.fieldMappings) {
      const val = data[fm.crmFieldName];
      if (val !== null && val !== undefined) {
        if (fm.portalFieldName === 'firstName') update.firstName = String(val).trim();
        else if (fm.portalFieldName === 'lastName') update.lastName = String(val).trim();
        else if (fm.portalFieldName === 'phone') update.phone = String(val).trim();
      }
    }

    if (Object.keys(update).length === 0) return { synced: false, message: 'No identity fields to sync' };

    await this.prisma.portalUser.update({ where: { id: portalUser.id }, data: update });
    return { synced: true, updated: Object.keys(update) };
  }

  // ── Get field mappings for a portal user's view (visible only) ────────────────

  async getVisibleMappings(moduleId: string) {
    const config = await this.prisma.portalModuleConfig.findUnique({
      where: { moduleId },
      include: { fieldMappings: { where: { isVisible: true }, orderBy: { order: 'asc' } } },
    });
    return config;
  }

  async getEditableMappings(moduleId: string) {
    const config = await this.prisma.portalModuleConfig.findUnique({
      where: { moduleId },
      include: { fieldMappings: { where: { isEditable: true }, orderBy: { order: 'asc' } } },
    });
    return config?.fieldMappings ?? [];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async assertModuleOwnership(organizationId: string, moduleId: string) {
    const mod = await this.prisma.dynamicModule.findFirst({
      where: { id: moduleId, organizationId },
    });
    if (!mod) throw new NotFoundException('Module not found');
  }

  private inferUserType(portalType: string): string {
    const map: Record<string, string> = {
      academic: 'student', medical: 'patient', hr: 'employee',
      crm: 'client', vendor: 'vendor', member: 'member',
    };
    return map[portalType] ?? 'member';
  }
}
