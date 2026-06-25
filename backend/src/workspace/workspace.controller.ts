import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private svc: WorkspaceService) {}

  @Get('summary')
  summary(@CurrentUser() user: any) {
    return this.svc.getSummary(user.id, user.organizationId);
  }

  @Get('calendar')
  calendar(
    @CurrentUser() user: any,
    @Query('year')  year:  string,
    @Query('month') month: string,
  ) {
    return this.svc.getCalendarDots(user.id, user.organizationId, parseInt(year, 10), parseInt(month, 10));
  }

  @Get('tasks')
  tasks(
    @CurrentUser() user: any,
    @Query('filter') filter: string,
    @Query('date')   date:   string,
  ) {
    return this.svc.getTasks(user.id, user.organizationId, filter, date);
  }

  @Post('tasks')
  createTask(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.createTask(user.id, user.organizationId, body);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.updateTask(id, user.id, user.organizationId, body);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteTask(id, user.id, user.organizationId);
  }

  @Get('notes')
  notes(@CurrentUser() user: any) {
    return this.svc.getNotes(user.id, user.organizationId);
  }

  @Post('notes')
  createNote(@CurrentUser() user: any, @Body() body: any) {
    return this.svc.createNote(user.id, user.organizationId, body);
  }

  @Patch('notes/:id')
  updateNote(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.svc.updateNote(id, user.id, user.organizationId, body);
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNote(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.deleteNote(id, user.id, user.organizationId);
  }
}
