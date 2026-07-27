import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RecordRoutingService } from './record-routing.service';

@UseGuards(JwtAuthGuard)
@Controller('record-routing')
export class RecordRoutingController {
  constructor(private svc: RecordRoutingService) {}

  // ── Virtual queue (all users) ────────────────────────────────────────────────

  @Get('my-queue')
  myQueue(@Req() req: any) {
    return this.svc.getVirtualQueue(req.user.id, req.user.organizationId);
  }

  @Post('action')
  executeAction(@Body() body: any, @Req() req: any) {
    return this.svc.executeAction(
      req.user.organizationId, req.user.id,
      body.recordId, body.configId, body.actionId,
    );
  }

  @Post('bulk-action')
  bulkAction(@Body() body: any, @Req() req: any) {
    return this.svc.executeBulkAction(
      req.user.organizationId, req.user.id,
      body.recordIds, body.configId, body.actionId,
    );
  }

  // ── Config CRUD (admin) ──────────────────────────────────────────────────────

  @Get('configs')
  listConfigs(@Req() req: any) {
    return this.svc.findAllConfigs(req.user.organizationId);
  }

  @Get('configs/:id')
  getConfig(@Param('id') id: string, @Req() req: any) {
    return this.svc.findOneConfig(id, req.user.organizationId);
  }

  @Post('configs')
  createConfig(@Body() body: any, @Req() req: any) {
    return this.svc.createConfig(req.user.organizationId, body);
  }

  @Patch('configs/:id')
  updateConfig(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.updateConfig(id, req.user.organizationId, body);
  }

  @Patch('configs/:id/toggle')
  toggleConfig(@Param('id') id: string, @Req() req: any) {
    return this.svc.toggleConfig(id, req.user.organizationId);
  }

  @Delete('configs/:id')
  deleteConfig(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteConfig(id, req.user.organizationId);
  }
}
