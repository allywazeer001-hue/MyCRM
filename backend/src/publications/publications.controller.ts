import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, Request,
} from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EngagementType } from '@prisma/client';

// ── Admin endpoints (JWT-protected) ──────────────────────────────────────────

@UseGuards(JwtAuthGuard)
@Controller('publications')
export class PublicationsController {
  constructor(private svc: PublicationsService) {}

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.svc.getDashboardStats(user.organizationId);
  }

  @Get('user-engagement/summary')
  getUserEngagement(@CurrentUser() user: any) {
    return this.svc.getUserEngagementSummary(user.organizationId);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query() query: { status?: string; search?: string },
  ) {
    return this.svc.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.findOne(user.organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePublicationDto) {
    return this.svc.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePublicationDto) {
    return this.svc.update(user.organizationId, id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.publish(user.organizationId, id);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.archive(user.organizationId, id);
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.unpublish(user.organizationId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.delete(user.organizationId, id);
  }

  @Get(':id/analytics')
  getAnalytics(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query() query: { from?: string; to?: string },
  ) {
    return this.svc.getAnalytics(user.organizationId, id, query);
  }
}

// ── Portal-facing endpoints (no auth — or portal token) ───────────────────────
// These are intentionally separate so the portal can call them with its own guard
// or without auth for public publications.

@Controller('portal-publications')
export class PortalPublicationsController {
  constructor(private svc: PublicationsService) {}

  @Get('feed/:orgId')
  getFeed(@Param('orgId') orgId: string) {
    return this.svc.getPortalFeed(orgId);
  }

  @Get(':orgId/:id')
  getPublication(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Query('portalUserId') portalUserId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.svc.getPortalPublication(orgId, id, portalUserId, userId);
  }

  @Post(':orgId/:id/engage')
  trackEngagement(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: {
      activityType: EngagementType;
      portalUserId?: string;
      userId?: string;
      metadata?: any;
      deviceInfo?: string;
    },
  ) {
    return this.svc.trackEngagement(
      orgId, id, body.activityType,
      body.portalUserId, body.userId, body.metadata, body.deviceInfo,
    );
  }
}
