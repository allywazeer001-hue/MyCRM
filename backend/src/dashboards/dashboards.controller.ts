import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private svc: DashboardsService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) { return this.svc.create(user.organizationId, user.id, body); }

  @Get()
  findAll(@CurrentUser() user: any) { return this.svc.findAll(user.organizationId); }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.findOne(id, user.organizationId); }

  @Post(':id/widgets')
  addWidget(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.addWidget(id, user.organizationId, body); }

  @Delete('widgets/:widgetId')
  removeWidget(@Param('widgetId') widgetId: string) { return this.svc.removeWidget(widgetId); }

  @Get('analytics/:moduleId')
  getAnalytics(@Param('moduleId') moduleId: string, @Query() query: any, @CurrentUser() user: any) {
    return this.svc.getAnalytics(moduleId, user.organizationId, query);
  }
}
