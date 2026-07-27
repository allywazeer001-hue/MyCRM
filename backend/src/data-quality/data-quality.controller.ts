import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DataQualityService } from './data-quality.service';

@UseGuards(JwtAuthGuard)
@Controller('data-quality')
export class DataQualityController {
  constructor(private readonly dq: DataQualityService) {}

  // ── Config ──────────────────────────────────────────────────────────────────

  @Get('config')
  getConfig(@CurrentUser() user: any) {
    return this.dq.getConfig(user.organizationId);
  }

  @Put('config')
  updateConfig(@CurrentUser() user: any, @Body() body: any) {
    return this.dq.updateConfig(user.organizationId, body);
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.dq.getDashboard(user.organizationId);
  }

  // ── Scans ───────────────────────────────────────────────────────────────────

  @Post('scan')
  triggerScan(@CurrentUser() user: any, @Body() body: { moduleId?: string } = {}) {
    return this.dq.triggerScan(user.organizationId, user.id, 'MANUAL', { moduleId: body?.moduleId });
  }

  @Get('scans')
  listScans(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.dq.listScans(user.organizationId, limit ? parseInt(limit, 10) : 20);
  }

  @Get('scans/:id')
  getScanDetail(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dq.getScanDetail(user.organizationId, id);
  }

  @Get('scans/:id/report')
  getReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dq.getReport(user.organizationId, id);
  }

  // ── Issues ──────────────────────────────────────────────────────────────────

  @Get('issues')
  listIssues(
    @CurrentUser() user: any,
    @Query('scanId') scanId?: string,
    @Query('moduleId') moduleId?: string,
    @Query('issueType') issueType?: string,
    @Query('severity') severity?: string,
    @Query('isResolved') isResolved?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dq.listIssues(user.organizationId, {
      scanId,
      moduleId,
      issueType,
      severity,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Patch('issues/:id/resolve')
  resolveIssue(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dq.resolveIssue(user.organizationId, id, user.id);
  }

  @Post('issues/resolve-many')
  resolveMany(@CurrentUser() user: any, @Body() body: { ids: string[] }) {
    return this.dq.resolveMany(user.organizationId, body.ids, user.id);
  }

  // ── Merge ────────────────────────────────────────────────────────────────────

  @Post('merge')
  mergeRecords(
    @CurrentUser() user: any,
    @Body() body: { keepId: string; mergeId: string; fieldMap: Record<string, unknown> },
  ) {
    return this.dq.mergeRecords(
      user.organizationId,
      body.keepId,
      body.mergeId,
      user.id,
      body.fieldMap,
    );
  }

  // ── Quick check (called from frontend before save) ───────────────────────────

  @Post('check')
  quickCheck(
    @CurrentUser() user: any,
    @Body() body: { moduleId: string; data: Record<string, unknown>; recordId?: string },
  ) {
    return this.dq.quickCheck(user.organizationId, body.moduleId, body.data, body.recordId);
  }
}
