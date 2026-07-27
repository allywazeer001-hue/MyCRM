import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ReportFoldersService } from './report-folders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('report-folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports/folders')
export class ReportFoldersController {
  constructor(private svc: ReportFoldersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.id, user.organizationId);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user.id, user.organizationId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.id, user.organizationId);
  }
}
