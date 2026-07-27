import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ScheduledConfigurationsService } from './scheduled-configurations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('scheduled-configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduled-configurations')
export class ScheduledConfigurationsController {
  constructor(private svc: ScheduledConfigurationsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, user, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, user, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId, user);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body('isActive') isActive: boolean, @CurrentUser() user: any) {
    return this.svc.setActive(id, user.organizationId, user, isActive);
  }

  @Post(':id/run-now')
  runNow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.runNow(id, user.organizationId, user);
  }
}
