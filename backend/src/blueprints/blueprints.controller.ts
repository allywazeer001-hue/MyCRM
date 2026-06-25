import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BlueprintsService } from './blueprints.service';

@UseGuards(JwtAuthGuard)
@Controller('blueprints')
export class BlueprintsController {
  constructor(private readonly blueprintsService: BlueprintsService) {}

  // ── Existing CRUD ─────────────────────────────────────────────────────

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.blueprintsService.findAll(user.organizationId);
  }

  @Get('module/:moduleId')
  findForModule(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.blueprintsService.findForModule(moduleId, user.organizationId);
  }

  @Get('evaluate/:recordId')
  evaluate(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.blueprintsService.evaluateForRecord(recordId, user.organizationId);
  }

  // ── Runtime: transitions for a record (with permission check) ─────────

  @Get('for-record/:recordId')
  getForRecord(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.blueprintsService.getAvailableTransitions(recordId, user.id, user.organizationId);
  }

  @Get('for-record/:recordId/history')
  getStageHistory(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.blueprintsService.getStageHistory(recordId, user.organizationId);
  }

  // ── Runtime: initialize a record to its first stage ──────────────────────

  @Post('initialize-record')
  initializeRecord(@Body() body: any, @CurrentUser() user: any) {
    const { recordId, stageId } = body;
    return this.blueprintsService.initializeRecord(
      recordId,
      stageId,
      user.id,
      user.organizationId,
    );
  }

  // ── Runtime: execute a transition ─────────────────────────────────────

  @Post('execute-transition')
  executeTransition(@Body() body: any, @CurrentUser() user: any) {
    const { recordId, transitionId, formData } = body;
    return this.blueprintsService.executeTransition(
      recordId,
      transitionId,
      user.id,
      user.organizationId,
      formData ?? {},
    );
  }

  // ── Runtime: validate transition (used by Kanban drag) ────────────────

  @Post('validate-transition')
  validateTransition(@Body() body: any, @CurrentUser() user: any) {
    const { moduleId, fromStage, toStage } = body;
    return this.blueprintsService.validateTransition(
      moduleId,
      fromStage,
      toStage,
      user.id,
      user.organizationId,
    );
  }

  // ── Pending tasks ──────────────────────────────────────────────────────

  @Get('my-pending-tasks')
  getMyTasks(@CurrentUser() user: any) {
    return this.blueprintsService.getMyBlueprintTasks(user.id, user.organizationId);
  }

  @Get('record/:recordId/tasks')
  getRecordTasks(@Param('recordId') recordId: string, @CurrentUser() user: any) {
    return this.blueprintsService.getBlueprintTasksForRecord(recordId, user.organizationId);
  }

  @Post('pending-tasks/:id/action')
  completeTask(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; comment?: string },
    @CurrentUser() user: any,
  ) {
    return this.blueprintsService.completeBlueprintTask(
      id,
      body.action,
      body.comment,
      user.id,
      user.organizationId,
    );
  }

  // ── CRUD (continued) ──────────────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.blueprintsService.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.blueprintsService.create(user.organizationId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.blueprintsService.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.blueprintsService.remove(id, user.organizationId);
  }
}
