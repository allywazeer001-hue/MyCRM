import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  // Data endpoint — supports filter groups + aggregation
  @Post('data/:moduleId')
  getData(@Param('moduleId') moduleId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.getAnalytics(moduleId, user.organizationId, body);
  }

  // Legacy GET endpoint for existing dashboards
  @Get(':moduleId')
  getDataGet(
    @Param('moduleId') moduleId: string,
    @Query('groupByField') groupByField: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getAnalytics(moduleId, user.organizationId, { groupByField });
  }

  // Kanban
  @Post('kanban/:moduleId')
  getKanban(
    @Param('moduleId') moduleId: string,
    @Body() body: { statusField: string; filterGroup?: any },
    @CurrentUser() user: any,
  ) {
    return this.svc.getKanban(moduleId, user.organizationId, body.statusField, body.filterGroup);
  }

  // Saved Views
  @Get('views/list')
  getViews(@CurrentUser() user: any) {
    return this.svc.getViews(user.organizationId);
  }

  @Post('views')
  createView(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createView(user.organizationId, user.id, body);
  }

  @Patch('views/:id')
  updateView(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateView(id, user.organizationId, body);
  }

  @Delete('views/:id')
  deleteView(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteView(id, user.organizationId);
  }

  @Patch('views/:id/toggle-pin')
  @HttpCode(200)
  togglePinView(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.togglePinView(id, user.organizationId);
  }

  // Saved Filters
  @Get('saved-filters')
  getSavedFilters(@Query('context') context: string, @CurrentUser() user: any) {
    return this.svc.getSavedFilters(user.organizationId, context);
  }

  @Post('saved-filters')
  createSavedFilter(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createSavedFilter(user.organizationId, user.id, body);
  }

  @Patch('saved-filters/:id')
  updateSavedFilter(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateSavedFilter(id, user.organizationId, body);
  }

  @Delete('saved-filters/:id')
  deleteSavedFilter(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteSavedFilter(id, user.organizationId);
  }

  // Targets
  @Get('targets/list')
  getTargets(@CurrentUser() user: any) {
    return this.svc.getTargets(user.organizationId);
  }

  @Post('targets')
  createTarget(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createTarget(user.organizationId, body);
  }

  @Patch('targets/:id')
  updateTarget(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateTarget(id, user.organizationId, body);
  }

  @Delete('targets/:id')
  deleteTarget(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteTarget(id, user.organizationId);
  }

  @Post('targets/:id/compute')
  computeTarget(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.computeTargetCurrent(id, user.organizationId);
  }
}
