import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConnectedAppJwtGuard } from './guards/connected-app-jwt.guard';
import { FieldsService } from '../fields/fields.service';
import { RecordsService } from '../records/records.service';

type ConnectedAppPrincipal = { connectedAppId: string; organizationId: string; scopes: string[] };

/**
 * Generic read access to any module a Connected App was granted a
 * `module:<id>` scope for (e.g. a custom "Donors" or "Scholars" module the
 * org configured) — reuses FieldsService/RecordsService directly rather
 * than re-implementing pagination/search/sort.
 *
 * IMPORTANT for API consumers: Record.data is keyed by each Field's `name`,
 * NOT its `id` — read GET .../fields first and index into a record with
 * `record.data[field.name]`, never `record.data[field.id]`.
 */
@ApiTags('connected-apps')
@ApiBearerAuth()
@UseGuards(ConnectedAppJwtGuard, ThrottlerGuard)
@Controller('external/modules')
export class ExternalModulesController {
  constructor(
    private prisma: PrismaService,
    private fieldsService: FieldsService,
    private recordsService: RecordsService,
  ) {}

  private assertModuleScope(app: ConnectedAppPrincipal, moduleId: string) {
    if (!app.scopes.includes(`module:${moduleId}`)) {
      throw new ForbiddenException('This connection does not have permission to read this module');
    }
  }

  // Confirms the module both exists and belongs to the app's own org — a
  // 404 here must look identical to "module doesn't exist at all" so a
  // connection can never use this to probe whether some id belongs to a
  // different organization.
  private async assertModuleInOrg(moduleId: string, organizationId: string) {
    const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId }, select: { id: true } });
    if (!mod) throw new NotFoundException('Module not found');
  }

  private async touchLastApiCall(connectedAppId: string) {
    await this.prisma.connectedApp.update({ where: { id: connectedAppId }, data: { lastApiCallAt: new Date() } }).catch(() => {});
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':moduleId/fields')
  async fields(@CurrentUser() app: ConnectedAppPrincipal, @Param('moduleId') moduleId: string) {
    this.assertModuleScope(app, moduleId);
    await this.assertModuleInOrg(moduleId, app.organizationId);
    await this.touchLastApiCall(app.connectedAppId);

    return {
      note: "Record.data is keyed by each field's `name` (not `id`) — read record.data[field.name].",
      fields: await this.fieldsService.findByModule(moduleId, app.organizationId),
    };
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':moduleId/records')
  async records(
    @CurrentUser() app: ConnectedAppPrincipal,
    @Param('moduleId') moduleId: string,
    @Query() query: any,
  ) {
    this.assertModuleScope(app, moduleId);
    await this.assertModuleInOrg(moduleId, app.organizationId);
    await this.touchLastApiCall(app.connectedAppId);

    const { q, page, limit } = query;
    return this.recordsService.findAll(moduleId, app.organizationId, { page, limit, search: q });
  }

  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get(':moduleId/records/:id')
  async record(
    @CurrentUser() app: ConnectedAppPrincipal,
    @Param('moduleId') moduleId: string,
    @Param('id') id: string,
  ) {
    this.assertModuleScope(app, moduleId);
    await this.assertModuleInOrg(moduleId, app.organizationId);
    await this.touchLastApiCall(app.connectedAppId);

    // findOne doesn't take a moduleId — it's scoped by org only, so confirm
    // the record actually belongs to the requested module ourselves.
    const record = await this.recordsService.findOne(id, app.organizationId);
    if ((record as any).moduleId !== moduleId) throw new NotFoundException('Record not found');
    return record;
  }
}
