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
    return this.svc.findAll(user.organizationId, user.id, user.role);
  }

  // Folders — MUST be before @Get(':id') so 'folders' is not matched as an id

  @Get('folders')
  getFolders(@CurrentUser() user: any) {
    return this.svc.getFolders(user.organizationId, user.id, user.role, user.departmentId ?? null);
  }

  @Post('folders')
  createFolder(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createFolder(user.organizationId, user.id, body);
  }

  @Patch('folders/:folderId')
  updateFolder(@Param('folderId') folderId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateFolder(folderId, user.organizationId, user.id, user.role, body);
  }

  @Delete('folders/:folderId')
  deleteFolder(@Param('folderId') folderId: string, @CurrentUser() user: any) {
    return this.svc.deleteFolder(folderId, user.organizationId, user.id, user.role);
  }

  @Get('folders/:folderId/forms')
  getFolderForms(@Param('folderId') folderId: string, @CurrentUser() user: any) {
    return this.svc.getFolderForms(folderId, user.organizationId);
  }

  // Shared — MUST be before @Get(':id')

  @Get('shared')
  getSharedForms(@CurrentUser() user: any) {
    return this.svc.getSharedForms(user.organizationId, user.id, user.role, user.departmentId ?? null);
  }

  @Get('shared-folders')
  getSharedFolders(@CurrentUser() user: any) {
    return this.svc.getSharedFolders(user.organizationId, user.id, user.role, user.departmentId ?? null);
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

  // Form sharing settings

  @Get(':id/sharing')
  getFormSharing(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getFormSharing(id, user.organizationId);
  }

  @Patch(':id/sharing')
  updateFormSharing(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateFormSharing(id, user.organizationId, user.id, user.role, body);
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
    // req.ip now resolves correctly via the 'trust proxy' setting in main.ts —
    // it previously always returned the Next.js rewrite proxy's own loopback
    // address instead of the actual submitter's IP (the || fallback below
    // never ran, since req.ip was never falsy). Kept as a defensive fallback
    // only for the case where a request arrives with no proxy hop at all.
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const ua = req.headers['user-agent'];
    return this.svc.submitPublicForm(token, body, ip, ua);
  }

  @Post(':token/extract-document')
  extractDocument(
    @Param('token') token: string,
    @Body() body: { fileBase64: string; mediaType: string },
  ) {
    return this.svc.extractDocument(token, body.fileBase64, body.mediaType);
  }
}
