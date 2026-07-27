import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { VisualizationTemplatesService } from './visualization-templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('visualization-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visualization-templates')
export class VisualizationTemplatesController {
  constructor(private svc: VisualizationTemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.id, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.id, user.organizationId);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user.id, user.organizationId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.id, user.organizationId);
  }

  @Post(':id/instantiate')
  instantiate(
    @Param('id') id: string,
    @Body() body: { contextValue: string; dashboardName?: string; createDashboard?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.svc.instantiate(
      id,
      user.id,
      user.organizationId,
      body.contextValue,
      body.dashboardName,
      body.createDashboard ?? true,
    );
  }
}
