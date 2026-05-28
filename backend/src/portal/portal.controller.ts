import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PortalAuthGuard, CurrentPortalUser } from './portal-auth.guard';
import { PortalService } from './portal.service';
import { PortalBuilderService } from './portal-builder.service';
import { PortalFieldService } from './portal-field.service';
import { PortalDocumentService } from './portal-document.service';

@UseGuards(PortalAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(
    private portalService: PortalService,
    private builderService: PortalBuilderService,
    private fieldService: PortalFieldService,
    private documentService: PortalDocumentService,
  ) {}

  @Get('me')
  getProfile(@CurrentPortalUser() user: any) {
    return this.portalService.getProfile(user.portalUserId);
  }

  @Patch('me')
  updateProfile(@CurrentPortalUser() user: any, @Body() body: any) {
    return this.portalService.updateProfile(user.portalUserId, body);
  }

  @Get('dashboard')
  getDashboard(@CurrentPortalUser() user: any) {
    return this.portalService.getDashboardSummary(user.portalUserId);
  }

  @Get('record')
  getRecord(@CurrentPortalUser() user: any) {
    return this.portalService.getRecordData(user.portalUserId);
  }

  @Patch('record')
  updateRecord(@CurrentPortalUser() user: any, @Body() body: Record<string, any>) {
    return this.portalService.updateRecordField(user.portalUserId, body);
  }

  @Get('pages/:slug/data')
  getPageData(@CurrentPortalUser() user: any, @Param('slug') slug: string) {
    return this.portalService.getPageData(user.portalUserId, slug);
  }

  @Patch('pages/:slug/data')
  savePageData(
    @CurrentPortalUser() user: any,
    @Param('slug') slug: string,
    @Body() body: { updates: Array<{ fieldKey: string; value: any }> },
  ) {
    return this.portalService.savePageData(user.portalUserId, slug, body.updates ?? []);
  }

  @Get('notifications')
  getNotifications(
    @CurrentPortalUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.portalService.getNotifications(user.portalUserId, page, limit);
  }

  @Patch('notifications/read-all')
  markAllRead(@CurrentPortalUser() user: any) {
    return this.portalService.markAllNotificationsRead(user.portalUserId);
  }

  @Patch('notifications/:id/read')
  markRead(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.portalService.markNotificationRead(user.portalUserId, id);
  }

  @Get('announcements')
  getAnnouncements(@CurrentPortalUser() user: any) {
    return this.portalService.getAnnouncements(user.organizationId);
  }

  @Get('menu')
  getMenu(@CurrentPortalUser() user: any) {
    return this.builderService.getPublicMenuItems(user.organizationId);
  }

  @Get('pages/:slug')
  getPage(@CurrentPortalUser() user: any, @Param('slug') slug: string) {
    return this.builderService.getPublishedPageFull(user.organizationId, slug);
  }

  // ── Dynamic portal fields ─────────────────────────────────────────────────

  @Get('fields')
  getFields(@CurrentPortalUser() user: any) {
    return this.fieldService.getFieldsWithValues(user.portalUserId);
  }

  @Patch('fields')
  updateFields(@CurrentPortalUser() user: any, @Body() body: { updates: Array<{ fieldKey: string; value: any }> }) {
    const map: Record<string, any> = {};
    for (const { fieldKey, value } of (body.updates ?? [])) map[fieldKey] = value;
    return this.fieldService.updateFieldValues(user.portalUserId, map);
  }

  // ── Documents ─────────────────────────────────────────────────────────────

  @Get('documents')
  listDocuments(@CurrentPortalUser() user: any) {
    return this.documentService.listDocuments(user.portalUserId);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentPortalUser() user: any,
    @UploadedFile() file: any,
    @Body() dto: any,
  ) {
    return this.documentService.uploadDocument(user.portalUserId, user.organizationId, file, dto);
  }

  @Delete('documents/:id')
  deleteDocument(@CurrentPortalUser() user: any, @Param('id') id: string) {
    return this.documentService.deleteDocument(user.portalUserId, id);
  }
}
