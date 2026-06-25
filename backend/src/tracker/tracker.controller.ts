import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TrackerService } from './tracker.service';

@Controller('tracker')
@UseGuards(JwtAuthGuard)
export class TrackerController {
  constructor(private readonly svc: TrackerService) {}

  // ── Trackers ──────────────────────────────────────────────────────────────

  @Get()
  list(@CurrentUser() user: any) {
    return this.svc.list(user.organizationId, user.id);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, user.id, body);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.get(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }

  // ── Criteria ──────────────────────────────────────────────────────────────

  @Post(':id/criteria')
  addCriteria(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addCriteria(id, user.organizationId, body);
  }

  @Patch(':id/criteria/:cid')
  updateCriteria(@Param('id') id: string, @Param('cid') cid: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateCriteria(id, cid, user.organizationId, body);
  }

  @Delete(':id/criteria/:cid')
  deleteCriteria(@Param('id') id: string, @Param('cid') cid: string, @CurrentUser() user: any) {
    return this.svc.deleteCriteria(id, cid, user.organizationId);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  @Get(':id/sessions')
  getSessions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getSessions(id, user.organizationId);
  }

  @Post(':id/sessions')
  createSession(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.createSession(id, user.organizationId, body);
  }

  @Patch(':id/sessions/:sid')
  updateSession(@Param('id') id: string, @Param('sid') sid: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateSession(id, sid, user.organizationId, body);
  }

  @Delete(':id/sessions/:sid')
  deleteSession(@Param('id') id: string, @Param('sid') sid: string, @CurrentUser() user: any) {
    return this.svc.deleteSession(id, sid, user.organizationId);
  }

  // ── Performance Bands ─────────────────────────────────────────────────────

  @Get(':id/bands')
  getBands(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getBands(id, user.organizationId);
  }

  @Post(':id/bands')
  createBand(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.createBand(id, user.organizationId, body);
  }

  @Patch(':id/bands/:bid')
  updateBand(@Param('id') id: string, @Param('bid') bid: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateBand(id, bid, user.organizationId, body);
  }

  @Delete(':id/bands/:bid')
  deleteBand(@Param('id') id: string, @Param('bid') bid: string, @CurrentUser() user: any) {
    return this.svc.deleteBand(id, bid, user.organizationId);
  }

  // ── Grid + Scores ─────────────────────────────────────────────────────────

  @Get(':id/grid')
  getGrid(
    @Param('id') id: string,
    @Query('sessionId') sessionId: string,
    @Query('search') search: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getGrid(id, user.organizationId, sessionId, search);
  }

  @Post(':id/scores')
  saveScore(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.saveScore(id, user.organizationId, body);
  }

  // ── Record History ────────────────────────────────────────────────────────

  @Get(':id/records/:recordId/history')
  getRecordHistory(@Param('id') id: string, @Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.svc.getRecordHistory(id, user.organizationId, recordId);
  }

  // ── Performance Summary ───────────────────────────────────────────────────

  @Get(':id/performance')
  getPerformance(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getPerformance(id, user.organizationId);
  }
}
