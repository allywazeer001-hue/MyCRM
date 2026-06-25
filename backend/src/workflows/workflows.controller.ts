import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.workflowsService.create(user.organizationId, body);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.workflowsService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.workflowsService.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.remove(id, user.organizationId);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.toggle(id, user.organizationId);
  }

  @Get(':id/executions')
  getExecutions(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflowsService.getExecutions(id, user.organizationId);
  }

  @Post(':id/execute-on-record')
  async executeOnRecord(
    @Param('id') id: string,
    @Body() body: { recordId: string; trigger: string; data: Record<string, any>; previousData?: Record<string, any> },
    @CurrentUser() user: any,
  ) {
    const workflow = await this.workflowsService.findOne(id, user.organizationId);
    if (!workflow || !(workflow as any).isActive) return { executed: false, actionsExecuted: 0 };
    const fakeRecord = {
      id: body.recordId,
      moduleId: (workflow as any).moduleId,
      data: body.data,
      organizationId: user.organizationId,
      createdById: user.id,
    };
    await this.workflowsService.executeWorkflow(workflow as any, fakeRecord as any, user.organizationId);
    return { executed: true, actionsExecuted: ((workflow as any).actions?.length ?? 0) };
  }
}
