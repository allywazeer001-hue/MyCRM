import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsController {
  constructor(private svc: FormsService) {}

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
    return this.svc.create(user.organizationId, user.id, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }

  // Sections

  @Post(':id/sections')
  addSection(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addSection(id, user.organizationId, body);
  }

  @Patch(':id/sections/:sectionId')
  updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.svc.updateSection(id, user.organizationId, sectionId, body);
  }

  @Delete(':id/sections/:sectionId')
  removeSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.removeSection(id, user.organizationId, sectionId);
  }

  // Form Fields

  @Get(':id/available-fields')
  getModuleFields(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getModuleFields(id, user.organizationId);
  }

  @Post(':id/fields')
  addField(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addField(id, user.organizationId, body);
  }

  @Patch(':id/fields/:formFieldId')
  updateField(
    @Param('id') id: string,
    @Param('formFieldId') formFieldId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.svc.updateField(id, user.organizationId, formFieldId, body);
  }

  @Delete(':id/fields/:formFieldId')
  removeField(
    @Param('id') id: string,
    @Param('formFieldId') formFieldId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.removeField(id, user.organizationId, formFieldId);
  }

  @Post(':id/fields/reorder')
  reorderFields(
    @Param('id') id: string,
    @Body('formFieldIds') formFieldIds: string[],
    @CurrentUser() user: any,
  ) {
    return this.svc.reorderFields(id, user.organizationId, formFieldIds);
  }

  // Permissions

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getPermissions(id, user.organizationId);
  }

  @Post(':id/permissions')
  setPermission(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.setPermission(id, user.organizationId, body);
  }

  // Token management

  @Post(':id/generate-token')
  generateToken(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.generateToken(id, user.organizationId);
  }

  @Post(':id/revoke-token')
  revokeToken(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.revokeToken(id, user.organizationId);
  }

  // Submissions

  @Get(':id/submissions')
  getSubmissions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getSubmissions(id, user.organizationId);
  }
}

// Public controller — no auth required
@ApiTags('public-forms')
@Controller('public/forms')
export class PublicFormsController {
  constructor(private svc: FormsService) {}

  @Get(':token')
  getPublicForm(@Param('token') token: string) {
    return this.svc.getPublicForm(token);
  }

  @Post(':token/submit')
  submitForm(@Param('token') token: string, @Body() body: any, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for'] as string;
    const ua = req.headers['user-agent'];
    return this.svc.submitPublicForm(token, body, ip, ua);
  }
}
