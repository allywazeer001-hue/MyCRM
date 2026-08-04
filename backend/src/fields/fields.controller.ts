import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Header } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules/:moduleId/fields')
export class FieldsController {
  constructor(private fieldsService: FieldsService) {}

  @Post()
  create(@Param('moduleId') moduleId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.fieldsService.create(moduleId, user.organizationId, body);
  }

  @Get()
  // Field definitions only change in Studio, not during normal record work —
  // same short-cache rationale as the module list above.
  @Header('Cache-Control', 'private, max-age=30')
  findByModule(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.fieldsService.findByModule(moduleId, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.fieldsService.update(id, user.organizationId, body);
  }

  @Post(':id/reset-auto-number')
  resetAutoNumber(@Param('id') id: string, @Body('startFrom') startFrom: number, @CurrentUser() user: any) {
    return this.fieldsService.resetAutoNumber(id, user.organizationId, startFrom);
  }

  @Post('reorder')
  reorder(@Param('moduleId') moduleId: string, @Body('fieldIds') fieldIds: string[], @CurrentUser() user: any) {
    return this.fieldsService.reorder(moduleId, user.organizationId, fieldIds);
  }

  @Get(':id/usage')
  checkUsage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fieldsService.checkUsage(id, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fieldsService.remove(id, user.organizationId);
  }
}
