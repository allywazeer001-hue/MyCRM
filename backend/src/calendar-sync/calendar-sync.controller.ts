import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, Res, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CalendarSyncService } from './calendar-sync.service';
import { GoogleSheetsService } from './google-sheets.service';

@Controller('calendar-sync')
export class CalendarSyncController {
  private readonly logger = new Logger(CalendarSyncController.name);

  constructor(
    private readonly svc: CalendarSyncService,
    private readonly sheets: GoogleSheetsService,
  ) {}

  // ── OAuth ───────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('auth/url')
  getAuthUrl(@CurrentUser() user: any, @Query('returnTo') returnTo?: string) {
    const url = this.svc.getAuthUrl(user.id, user.orgId ?? user.organizationId, returnTo);
    return { url };
  }

  // This endpoint is called by Google — no JWT (the state param carries user identity)
  @Get('auth/callback')
  async handleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      const redirectUrl = await this.svc.handleOAuthCallback(code, state);
      return res.redirect(redirectUrl);
    } catch (err: any) {
      this.logger.error('OAuth callback error:', err?.message);
      const base = process.env.FRONTEND_URL?.split(',')[0] ?? 'http://localhost:3000';
      return res.redirect(`${base}/settings/calendar-sync?error=${encodeURIComponent(err?.message ?? 'Connection failed')}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser() user: any) {
    await this.svc.disconnect(user.id);
  }

  // ── Status & calendars ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@CurrentUser() user: any) {
    return this.svc.getStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('calendars')
  listCalendars(@CurrentUser() user: any) {
    return this.svc.listCalendars(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('calendars/create-cloudbox')
  createCloudBoxCalendar(@CurrentUser() user: any) {
    return this.svc.createCloudBoxCalendar(user.id);
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  saveSettings(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.saveSettings(user.id, body);
  }

  // ── Sync ─────────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('sync/tasks/bulk')
  bulkSyncTasks(@CurrentUser() user: any) {
    const uid = user.id;
    const oid = user.orgId ?? user.organizationId;
    return this.svc.bulkSyncTasks(uid, oid);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync/tasks/:id')
  syncSingleTask() {
    return { message: 'Trigger sync via workspace operations or use bulk sync' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sync/tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSyncForTask(@Param('id') id: string, @CurrentUser() user: any) {
    await this.svc.removeSyncForTask(id, user.id);
  }

  // ── Status per task ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('status/tasks')
  getSyncStatusForTasks(@CurrentUser() user: any, @Body('taskIds') taskIds: string[]) {
    return this.svc.getSyncStatusForTasks(taskIds ?? [], user.id);
  }

  // ── Google Sheets ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('sheets')
  listSheets(@CurrentUser() user: any) {
    return this.sheets.listSheets(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sheets')
  createSheet(@CurrentUser() user: any, @Body('title') title: string) {
    return this.sheets.createSheet(user.id, title || 'Form Responses');
  }

  @UseGuards(JwtAuthGuard)
  @Get('sheets/:spreadsheetId/tabs')
  getSheetTabs(@CurrentUser() user: any, @Param('spreadsheetId') spreadsheetId: string) {
    return this.sheets.getSheetTabs(user.id, spreadsheetId);
  }
}
