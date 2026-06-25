import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProcessService } from './process.service';
import { CreateBlueprintDto, UpdateBlueprintDto } from './dto/create-blueprint.dto';
import { TaskActionDto } from './dto/task-action.dto';

@Controller('process')
@UseGuards(JwtAuthGuard)
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Get('blueprints')
  getBlueprints(@CurrentUser() user: any) {
    return this.processService.getBlueprints(user.organizationId);
  }

  @Post('blueprints')
  createBlueprint(
    @Body() dto: CreateBlueprintDto,
    @CurrentUser() user: any,
  ) {
    return this.processService.createBlueprint(dto, user.organizationId);
  }

  @Get('blueprints/:id')
  getBlueprintById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.processService.getBlueprintById(id, user.organizationId);
  }

  @Patch('blueprints/:id')
  updateBlueprint(
    @Param('id') id: string,
    @Body() dto: UpdateBlueprintDto,
    @CurrentUser() user: any,
  ) {
    return this.processService.updateBlueprint(id, dto, user.organizationId);
  }

  @Delete('blueprints/:id')
  deleteBlueprint(@Param('id') id: string, @CurrentUser() user: any) {
    return this.processService.deleteBlueprint(id, user.organizationId);
  }

  @Post('start')
  startInstance(
    @Body() body: { blueprintId: string; recordId: string; recordModule: string },
    @CurrentUser() user: any,
  ) {
    return this.processService.startInstance(
      body.blueprintId,
      body.recordId,
      body.recordModule,
      user.id,
      user.organizationId,
    );
  }

  @Get('my-tasks')
  getMyTasks(@CurrentUser() user: any) {
    return this.processService.getMyTasks(user.id, user.organizationId);
  }

  @Post('tasks/:id/action')
  executeTaskAction(
    @Param('id') id: string,
    @Body() dto: TaskActionDto,
    @CurrentUser() user: any,
  ) {
    return this.processService.executeTaskAction(id, user.id, dto);
  }

  @Patch('tasks/:id/seen')
  markTaskSeen(@Param('id') id: string, @CurrentUser() user: any) {
    return this.processService.markTaskSeen(id, user.id);
  }

  @Get('instances/:id/timeline')
  getInstanceTimeline(@Param('id') id: string, @CurrentUser() user: any) {
    return this.processService.getInstanceTimeline(id, user.organizationId);
  }

  @Get('monitor')
  getMonitoringStats(@CurrentUser() user: any) {
    return this.processService.getMonitoringStats(user.organizationId);
  }
}
