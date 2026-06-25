import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskPanelsService } from './task-panels.service';
import { CreateTaskPanelDto, UpdateTaskPanelDto } from './dto/task-panel.dto';

@UseGuards(JwtAuthGuard)
@Controller('task-panels')
export class TaskPanelsController {
  constructor(private readonly taskPanelsService: TaskPanelsService) {}

  @Get()
  getPanelsForUser(@CurrentUser() user: any) {
    return this.taskPanelsService.getPanelsForUser(user.id, user.role, user.organizationId);
  }

  @Get('admin')
  getAllPanels(@CurrentUser() user: any) {
    return this.taskPanelsService.getAllPanels(user.organizationId);
  }

  @Get(':id/records')
  getPanelRecords(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskPanelsService.getPanelRecords(id, user.id, user.role, user.organizationId);
  }

  @Post()
  createPanel(@Body() dto: CreateTaskPanelDto, @CurrentUser() user: any) {
    return this.taskPanelsService.createPanel(dto, user.organizationId);
  }

  @Patch(':id')
  updatePanel(
    @Param('id') id: string,
    @Body() dto: UpdateTaskPanelDto,
    @CurrentUser() user: any,
  ) {
    return this.taskPanelsService.updatePanel(id, dto, user.organizationId);
  }

  @Delete(':id')
  deletePanel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskPanelsService.deletePanel(id, user.organizationId);
  }
}
