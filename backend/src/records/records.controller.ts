import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { RecordsService } from './records.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('records')
export class LookupController {
  constructor(private recordsService: RecordsService) {}

  @Get('lookup')
  lookup(
    @Query('moduleId') moduleId: string,
    @Query('displayField') displayField: string,
    @Query('search') search: string,
    @CurrentUser() user: any,
  ) {
    return this.recordsService.lookupSearch(user.organizationId, moduleId, displayField, search || '');
  }
}

@ApiTags('records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules/:moduleId/records')
export class RecordsController {
  constructor(private recordsService: RecordsService) {}

  @Post()
  create(@Param('moduleId') moduleId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recordsService.create(moduleId, user.organizationId, user.id, body);
  }

  @Get()
  findAll(@Param('moduleId') moduleId: string, @Query() query: any, @CurrentUser() user: any) {
    return this.recordsService.findAll(moduleId, user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.recordsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.recordsService.update(id, user.organizationId, user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.recordsService.softDelete(id, user.organizationId, user.id);
  }

  @Post('bulk-delete')
  bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: any) {
    return this.recordsService.bulkDelete(ids, user.organizationId, user.id);
  }

  @Post('bulk-update')
  bulkUpdate(@Body() body: any, @CurrentUser() user: any) {
    return this.recordsService.bulkUpdateField(
      body.ids,
      body.fieldName,
      body.value,
      user.organizationId,
    );
  }

  @Get('import/template')
  async getImportTemplate(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const csv = await this.recordsService.getImportTemplate(moduleId, user.organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import-template.csv"`);
    res.send(csv);
  }

  @Post('import/preview')
  importPreview(@Body('csvText') csvText: string) {
    return this.recordsService.importPreview(csvText);
  }

  @Post('import/run')
  importRun(
    @Param('moduleId') moduleId: string,
    @Body('csvText') csvText: string,
    @Body('mapping') mapping: Record<string, string>,
    @CurrentUser() user: any,
  ) {
    return this.recordsService.importCsv(moduleId, user.organizationId, user.id, csvText, mapping);
  }

  @Get('export/csv')
  async exportCsv(
    @Param('moduleId') moduleId: string,
    @Query('filterGroup') filterGroup: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const csv = await this.recordsService.exportCsv(moduleId, user.organizationId, filterGroup);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="export-${Date.now()}.csv"`);
    res.send(csv);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body('content') content: string, @CurrentUser() user: any) {
    return this.recordsService.addComment(id, user.organizationId, user.id, content);
  }
}
