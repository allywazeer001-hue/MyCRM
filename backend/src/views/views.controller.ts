import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ViewsService } from './views.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('views')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules/:moduleId/views')
export class ViewsController {
  constructor(private svc: ViewsService) {}

  @Post()
  create(@Param('moduleId') moduleId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(moduleId, user.organizationId, user.id, body);
  }

  @Get()
  findByModule(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.svc.findByModule(moduleId, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, body);
  }

  @Patch(':id/toggle-pin')
  @HttpCode(200)
  togglePin(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.togglePin(id, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }
}
