import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CampaignsService, AudienceConfigDto, CreateCampaignDto } from './campaigns.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private svc: CampaignsService) {}

  @Get('dashboard-stats')
  dashboardStats(@CurrentUser() user: any) {
    return this.svc.dashboardStats(user.organizationId);
  }

  @Get('records/:recordId/history')
  recordHistory(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.svc.getRecordHistory(recordId, user.organizationId);
  }

  @Post('preview-audience')
  previewAudience(@Body() audienceConfig: AudienceConfigDto, @CurrentUser() user: any) {
    return this.svc.previewAudience(user.organizationId, audienceConfig);
  }

  @Get()
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, query);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }

  @Get(':id/analytics')
  analytics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getAnalytics(id, user.organizationId);
  }

  @Get(':id/recipients')
  recipients(@Param('id') id: string, @Query() query: any, @CurrentUser() user: any) {
    return this.svc.getRecipients(id, user.organizationId, query);
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body() body: { scheduledAt: string; timezone?: string }, @CurrentUser() user: any) {
    return this.svc.schedule(id, user.organizationId, body.scheduledAt, body.timezone);
  }

  @Post(':id/send-now')
  sendNow(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.sendNow(id, user.organizationId);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.pause(id, user.organizationId);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.resume(id, user.organizationId);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.cancel(id, user.organizationId);
  }

  @Post(':id/retry-failed')
  retryFailed(@Param('id') id: string, @Body() body: { channel?: string }, @CurrentUser() user: any) {
    return this.svc.retryFailed(id, user.organizationId, body?.channel);
  }

  @Post(':id/send-test')
  sendTest(@Param('id') id: string, @Body() body: { channel: 'SMS' | 'WHATSAPP' | 'EMAIL'; destination: string }, @CurrentUser() user: any) {
    return this.svc.sendTest(id, user.organizationId, body.channel, body.destination, user.id);
  }
}

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication-opt-outs')
export class CommunicationOptOutsController {
  constructor(private svc: CampaignsService) {}

  @Get()
  list(@Query('channel') channel: string, @CurrentUser() user: any) {
    return this.svc.listOptOuts(user.organizationId, channel);
  }

  @Post()
  add(@Body() body: { channel: 'SMS' | 'WHATSAPP' | 'EMAIL'; destination: string; reason?: string }, @CurrentUser() user: any) {
    return this.svc.addOptOut(user.organizationId, body.channel, body.destination, body.reason);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.removeOptOut(id, user.organizationId);
  }
}
