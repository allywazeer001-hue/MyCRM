import { Controller, Get, Post, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailsService, SendEmailDto, ScheduleEmailDto } from './emails.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

// 1x1 transparent GIF — served by the open-tracking pixel endpoint.
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64',
);

@ApiTags('emails')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emails')
export class EmailsController {
  constructor(private svc: EmailsService) {}

  @Post('send')
  send(@Body() dto: SendEmailDto, @CurrentUser() user: any) {
    return this.svc.send(user.organizationId, user.id, dto);
  }

  @Post('schedule')
  schedule(@Body() dto: ScheduleEmailDto, @CurrentUser() user: any) {
    return this.svc.schedule(user.organizationId, user.id, dto);
  }

  @Get('scheduled')
  listScheduled(@CurrentUser() user: any) {
    return this.svc.listScheduled(user.organizationId);
  }

  @Post('scheduled/:id/cancel')
  cancelScheduled(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.cancelScheduled(id, user.organizationId);
  }

  @Get('stats')
  stats(@Query('moduleId') moduleId: string | undefined, @CurrentUser() user: any) {
    return this.svc.getStats(user.organizationId, moduleId);
  }

  @Get('reports')
  reports(
    @Query('subject') subject: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('moduleId') moduleId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.svc.getReports(user.organizationId, { subject, from, to, moduleId });
  }

  @Get('reports/:batchId/summary')
  batchSummary(@Param('batchId') batchId: string, @CurrentUser() user: any) {
    return this.svc.getBatchSummary(batchId, user.organizationId);
  }

  @Get('reports/:batchId/recipients')
  batchRecipients(
    @Param('batchId') batchId: string,
    @Query('stage') stage: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.svc.getBatchRecipients(batchId, user.organizationId, stage);
  }

  @Get('audience')
  audience(@CurrentUser() user: any) {
    return this.svc.getAudience(user.organizationId);
  }

  @Get('mine')
  findMine(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, user.id);
  }

  @Get('by-record/:recordId')
  findByRecord(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.svc.findByRecord(recordId, user.organizationId);
  }

  @Get('by-record/:recordId/stats')
  recordStats(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.svc.getRecordStats(recordId, user.organizationId);
  }

  @Post('remark')
  bulkRemark(@Body() body: { ids: string[]; remark: string }, @CurrentUser() user: any) {
    return this.svc.bulkRemark(body.ids, body.remark, user.organizationId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }
}

// ── Public — no auth. Email clients load this pixel with no session/headers. ─
@ApiTags('emails')
@Controller('public/emails')
export class PublicEmailsController {
  constructor(private svc: EmailsService) {}

  @Get('track/:id')
  async track(@Param('id') id: string, @Res() res: Response) {
    await this.svc.trackOpen(id);
    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    });
    res.end(TRANSPARENT_GIF);
  }

  @Get('click/:id')
  async click(@Param('id') id: string, @Query('u') url: string | undefined, @Res() res: Response) {
    const target = await this.svc.trackClick(id, url ?? '');
    res.redirect(302, target);
  }
}
