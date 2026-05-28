import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PortalBuilderService } from './portal-builder.service';

@UseGuards(JwtAuthGuard)
@Controller('portal/admin/builder')
export class PortalBuilderController {
  constructor(private readonly builderService: PortalBuilderService) {}

  // Pages
  @Get('pages')
  listPages(@CurrentUser() user: any) {
    return this.builderService.listPages(user.organizationId);
  }

  @Get('pages/:id')
  getPage(@CurrentUser() user: any, @Param('id') id: string) {
    return this.builderService.getPage(user.organizationId, id);
  }

  @Post('pages')
  createPage(@CurrentUser() user: any, @Body() dto: any) {
    return this.builderService.createPage(user.organizationId, dto);
  }

  @Patch('pages/:id')
  updatePage(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.builderService.updatePage(user.organizationId, id, dto);
  }

  @Delete('pages/:id')
  deletePage(@CurrentUser() user: any, @Param('id') id: string) {
    return this.builderService.deletePage(user.organizationId, id);
  }

  // Menu
  @Get('menu')
  listMenuItems(@CurrentUser() user: any) {
    return this.builderService.listMenuItems(user.organizationId);
  }

  @Post('menu')
  saveMenuItems(@CurrentUser() user: any, @Body() dto: { items: any[] }) {
    return this.builderService.saveMenuItems(user.organizationId, dto.items);
  }

  // Announcements
  @Get('announcements')
  listAnnouncements(@CurrentUser() user: any) {
    return this.builderService.listAnnouncements(user.organizationId);
  }

  @Post('announcements')
  createAnnouncement(@CurrentUser() user: any, @Body() dto: any) {
    return this.builderService.createAnnouncement(user.organizationId, dto);
  }

  @Patch('announcements/:id')
  updateAnnouncement(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.builderService.updateAnnouncement(user.organizationId, id, dto);
  }

  @Delete('announcements/:id')
  deleteAnnouncement(@CurrentUser() user: any, @Param('id') id: string) {
    return this.builderService.deleteAnnouncement(user.organizationId, id);
  }

  @Post('announcements/broadcast')
  broadcast(@CurrentUser() user: any, @Body() dto: any) {
    return this.builderService.broadcastNotification(user.organizationId, dto);
  }
}
