import {
  Controller, Get, Post, Patch, Put, Body, Param, Query,
  UseGuards, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';
import { PortalModuleService } from './portal-module.service';

@UseGuards(JwtAuthGuard)
@Controller('portal/admin')
export class PortalAdminController {
  constructor(
    private authService: PortalAuthService,
    private portalService: PortalService,
    private moduleService: PortalModuleService,
  ) {}

  // ── Password Policy / Settings ────────────────────────────────────────────────

  @Get('settings')
  getSettings(@CurrentUser() user: any) {
    return this.authService.getSettings(user.organizationId);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: any, @Body() body: any) {
    return this.authService.updateSettings(user.organizationId, body);
  }

  // ── Portal Users ──────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.portalService.listUsers(user.organizationId, page, limit);
  }

  @Get('users/:id')
  getUserDetail(@CurrentUser() user: any, @Param('id') id: string) {
    return this.portalService.getAdminUserDetail(user.organizationId, id);
  }

  @Post('users')
  createUser(@CurrentUser() user: any, @Body() body: {
    email: string; firstName: string; lastName: string;
    type?: string; moduleId?: string; recordId?: string; phone?: string;
  }) {
    return this.authService.autoCreateUser({ ...body, organizationId: user.organizationId });
  }

  @Patch('users/:id/status')
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.portalService.updateAccountStatus(user.organizationId, id, body.status);
  }

  @Post('users/:id/reset')
  resetUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.portalService.resetToFirstLogin(user.organizationId, id);
  }

  @Patch('users/:id/role')
  setPortalRole(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { portalRole: string },
  ) {
    return this.portalService.setPortalRole(user.organizationId, id, body.portalRole);
  }

  @Patch('users/:id/admin')
  setPortalAdmin(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { isPortalAdmin: boolean },
  ) {
    return this.portalService.setPortalAdminFlag(user.organizationId, id, body.isPortalAdmin);
  }

  // ── Module Association ────────────────────────────────────────────────────────

  @Get('module-configs')
  listModuleConfigs(@CurrentUser() user: any) {
    return this.moduleService.listModuleConfigs(user.organizationId);
  }

  @Get('module-configs/:moduleId')
  getModuleConfig(@CurrentUser() user: any, @Param('moduleId') moduleId: string) {
    return this.moduleService.getModuleConfig(user.organizationId, moduleId);
  }

  @Patch('module-configs/:moduleId')
  upsertModuleConfig(
    @CurrentUser() user: any,
    @Param('moduleId') moduleId: string,
    @Body() body: any,
  ) {
    return this.moduleService.upsertModuleConfig(user.organizationId, moduleId, body);
  }

  @Get('module-configs/:moduleId/mappings')
  getFieldMappings(@CurrentUser() user: any, @Param('moduleId') moduleId: string) {
    return this.moduleService.getModuleConfig(user.organizationId, moduleId);
  }

  @Put('module-configs/:moduleId/mappings')
  saveFieldMappings(
    @CurrentUser() user: any,
    @Param('moduleId') moduleId: string,
    @Body() body: { mappings: any[] },
  ) {
    return this.moduleService.saveFieldMappings(user.organizationId, moduleId, body.mappings);
  }

  // ── Record → Portal User Actions ──────────────────────────────────────────────

  @Get('records/:recordId/portal-status')
  getRecordPortalStatus(@CurrentUser() user: any, @Param('recordId') recordId: string) {
    return this.moduleService.getRecordPortalStatus(user.organizationId, recordId);
  }

  @Post('records/:recordId/create-portal-user')
  createPortalUserFromRecord(@CurrentUser() user: any, @Param('recordId') recordId: string) {
    return this.moduleService.createPortalUserFromRecord(user.organizationId, recordId);
  }

  @Post('records/:recordId/sync')
  syncRecord(@CurrentUser() user: any, @Param('recordId') recordId: string) {
    return this.moduleService.syncRecordToPortal(user.organizationId, recordId);
  }
}
