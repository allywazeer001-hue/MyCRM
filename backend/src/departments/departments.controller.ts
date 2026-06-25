import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private depts: DepartmentsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.depts.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.depts.findOne(id, user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.depts.create(user.organizationId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.depts.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.depts.remove(id, user.organizationId);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.depts.getMembers(id, user.organizationId);
  }

  @Post(':id/members/:userId')
  addMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: any) {
    return this.depts.addMember(id, user.organizationId, userId);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: any) {
    return this.depts.removeMember(id, user.organizationId, userId);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.depts.getPermissions(id, user.organizationId);
  }

  @Patch(':id/permissions')
  updatePermissions(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.depts.updatePermissions(id, user.organizationId, body);
  }

  @Patch(':id/head')
  setHead(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { headUserId: string | null }) {
    return this.depts.setHead(id, user.organizationId, body.headUserId);
  }
}
