import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Query, ForbiddenException, createParamDecorator, ExecutionContext,
} from '@nestjs/common';
import { PortalCrmAdminGuard } from './portal-crm-admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PortalFieldService } from './portal-field.service';
import { PortalSectionService } from './portal-section.service';
import { PortalDocumentService } from './portal-document.service';
import { PortalService } from './portal.service';
import { PortalBuilderService } from './portal-builder.service';

const CurrentPortalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

@UseGuards(PortalCrmAdminGuard)
@Controller('portal/padmin')
export class PortalPadminController {
  constructor(
    private fieldService: PortalFieldService,
    private sectionService: PortalSectionService,
    private documentService: PortalDocumentService,
    private portalService: PortalService,
    private builderService: PortalBuilderService,
  ) {}

  // ── Sections ──────────────────────────────────────────────────────────────

  @Get('sections')
  listSections(@CurrentPortalUser() user: any, @Query('moduleConfigId') moduleConfigId?: string, @Query('pageId') pageId?: string) {
    return this.sectionService.listSections(user.organizationId, moduleConfigId, pageId);
  }

  @Post('sections')
  createSection(@CurrentPortalUser() user: any, @Body() dto: any) {
    return this.sectionService.createSection(user.organizationId, dto);
  }

  @Patch('sections/:id')
  updateSection(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.sectionService.updateSection(user.organizationId, id, dto);
  }

  @Delete('sections/:id')
  deleteSection(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.sectionService.deleteSection(user.organizationId, id);
  }

  @Post('sections/reorder')
  reorderSections(@CurrentPortalUser() user: any, @Body() dto: { ids: string[] }) {
    return this.sectionService.reorderSections(user.organizationId, dto.ids);
  }

  // ── Fields ────────────────────────────────────────────────────────────────

  @Get('fields')
  listFields(@CurrentPortalUser() user: any, @Query('moduleConfigId') moduleConfigId?: string, @Query('pageId') pageId?: string) {
    return this.fieldService.listFields(user.organizationId, moduleConfigId, pageId);
  }

  @Post('fields')
  createField(@CurrentPortalUser() user: any, @Body() dto: any) {
    return this.fieldService.createField(user.organizationId, dto);
  }

  @Patch('fields/:id')
  updateField(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.fieldService.updateField(user.organizationId, id, dto);
  }

  @Delete('fields/:id')
  deleteField(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.fieldService.deleteField(user.organizationId, id);
  }

  @Post('fields/reorder')
  reorderFields(@CurrentPortalUser() user: any, @Body() dto: { ids: string[] }) {
    return this.fieldService.reorderFields(user.organizationId, dto.ids);
  }

  @Get('crm-fields/:moduleId')
  getCrmFields(@CurrentPortalUser() user: any, @Param('moduleId') moduleId: string) {
    return this.fieldService.getCrmFieldsForModule(user.organizationId, moduleId);
  }

  @Get('crm-modules')
  listCrmModules(@CurrentPortalUser() user: any) {
    return this.builderService.listCrmModules(user.organizationId);
  }

  @Get('crm-modules/:moduleId/fields')
  getCrmModuleFields(@CurrentPortalUser() user: any, @Param('moduleId') moduleId: string) {
    return this.builderService.getCrmModuleFields(user.organizationId, moduleId);
  }

  @Get('crm-modules/:moduleId/related')
  detectRelatedModules(@CurrentPortalUser() user: any, @Param('moduleId') moduleId: string) {
    return this.builderService.detectRelatedModules(user.organizationId, moduleId);
  }

  @Get('crm-modules/:moduleId/suggest-sections')
  suggestSections(@CurrentPortalUser() user: any, @Param('moduleId') moduleId: string) {
    return this.builderService.suggestSectionsFromModule(user.organizationId, moduleId);
  }

  @Post('pages/:pageId/sections/from-module')
  createSectionFromModule(@CurrentPortalUser() user: any, @Param('pageId') pageId: string, @Body() dto: any) {
    return this.builderService.createSectionFromModule(user.organizationId, pageId, dto);
  }

  @Patch('pages/:pageId/primary-module')
  setPagePrimaryModule(@CurrentPortalUser() user: any, @Param('pageId') pageId: string, @Body() dto: any) {
    return this.builderService.setPagePrimaryModule(user.organizationId, pageId, dto);
  }

  @Patch('fields/:id/map-crm')
  mapFieldToCrm(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.builderService.mapPortalFieldToCrm(user.organizationId, id, dto);
  }

  @Patch('fields/:id/unmap-crm')
  unmapField(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.unmapPortalField(user.organizationId, id);
  }

  @Post('fields/:id/create-crm-field')
  createCrmField(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.builderService.createCrmFieldAndMap(user.organizationId, id, dto);
  }

  // ── Menu (append-only CRUD) ───────────────────────────────────────────────

  @Get('menu')
  listMenu(@CurrentPortalUser() user: any) {
    return this.builderService.listMenuItems(user.organizationId);
  }

  @Post('menu')
  addMenuItem(@CurrentPortalUser() user: any, @Body() dto: any) {
    return this.builderService.addMenuItem(user.organizationId, dto);
  }

  @Patch('menu/reorder')
  reorderMenu(@CurrentPortalUser() user: any, @Body() dto: { ids: string[] }) {
    return this.builderService.reorderMenuItems(user.organizationId, dto.ids);
  }

  @Patch('menu/:id')
  updateMenuItem(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.builderService.updateMenuItem(user.organizationId, id, dto);
  }

  @Delete('menu/:id')
  deleteMenuItem(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.deleteMenuItem(user.organizationId, id);
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  @Get('pages')
  listPages(@CurrentPortalUser() user: any) {
    return this.builderService.listPages(user.organizationId);
  }

  @Post('pages')
  createPage(@CurrentPortalUser() user: any, @Body() dto: any) {
    return this.builderService.createPage(user.organizationId, dto);
  }

  @Get('pages/:id')
  getPage(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.getPageFull(user.organizationId, id);
  }

  @Patch('pages/:id')
  updatePage(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.builderService.updatePage(user.organizationId, id, dto);
  }

  @Delete('pages/:id')
  deletePage(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.deletePage(user.organizationId, id);
  }

  @Post('pages/:id/duplicate')
  duplicatePage(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.duplicatePage(user.organizationId, id);
  }

  @Patch('pages/:id/publish')
  publishPage(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.builderService.updatePage(user.organizationId, id, { status: dto.status ?? 'PUBLISHED' });
  }

  @Post('pages/:id/republish')
  republishPage(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.republishPage(user.organizationId, id);
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  @Get('templates')
  listTemplates(@CurrentPortalUser() user: any) {
    return this.builderService.listTemplates(user.organizationId);
  }

  @Post('templates')
  saveTemplate(@CurrentPortalUser() user: any, @Body() dto: any) {
    return this.builderService.saveTemplate(user.organizationId, dto);
  }

  @Post('templates/:id/apply')
  applyTemplate(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.applyTemplate(user.organizationId, id);
  }

  @Delete('templates/:id')
  deleteTemplate(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.builderService.deleteTemplate(user.organizationId, id);
  }

  // ── Documents ─────────────────────────────────────────────────────────────

  @Get('documents')
  listDocuments(@CurrentPortalUser() user: any, @Query('portalUserId') userId?: string) {
    return this.documentService.listOrgDocuments(user.organizationId, userId);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @CurrentPortalUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 200,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.portalService.listUsers(user.organizationId, +page, +limit, search, status);
  }

  @Get('users/counts')
  @UseGuards(JwtAuthGuard)
  async getUserCounts(@CurrentUser() user: any) {
    return this.portalService.getUserStatusCounts(user.organizationId);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  async softDeleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only Super Admin can delete portal users');
    return this.portalService.softDelete(id, user.organizationId);
  }

  @Post('users/:id/restore')
  @UseGuards(JwtAuthGuard)
  async restoreUser(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only Super Admin can restore portal users');
    return this.portalService.restore(id, user.organizationId);
  }

  @Delete('users/:id/permanent')
  @UseGuards(JwtAuthGuard)
  async permanentDeleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Only Super Admin can permanently delete portal users');
    return this.portalService.permanentDelete(id, user.organizationId);
  }

  @Patch('users/:id/admin')
  toggleAdmin(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: { isPortalAdmin: boolean }) {
    return this.portalService.setPortalAdminFlag(user.organizationId, id, dto.isPortalAdmin);
  }

  @Patch('users/:id/role')
  updateRole(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: { portalRole: string }) {
    return this.portalService.setPortalRole(user.organizationId, id, dto.portalRole);
  }

  @Patch('users/:id/status')
  updateStatus(@CurrentPortalUser() user: any, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.portalService.updateAccountStatus(user.organizationId, id, dto.status);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  async getStats(@CurrentPortalUser() user: any) {
    const [users, sections, fields, docs, pages, menus] = await Promise.all([
      this.portalService.listUsers(user.organizationId, 1, 1),
      this.sectionService.listSections(user.organizationId),
      this.fieldService.listFields(user.organizationId),
      this.documentService.listOrgDocuments(user.organizationId),
      this.builderService.listPages(user.organizationId),
      this.builderService.listMenuItems(user.organizationId),
    ]);
    return {
      totalUsers: (users as any).total ?? 0,
      totalSections: sections.length,
      totalFields: fields.length,
      totalDocuments: docs.length,
      totalPages: (pages as any[]).length,
      totalMenuItems: (menus as any[]).length,
    };
  }
}
