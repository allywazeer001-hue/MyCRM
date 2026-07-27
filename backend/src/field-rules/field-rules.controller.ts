import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FieldRulesService } from './field-rules.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('field-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules/:moduleId/field-rules')
export class FieldRulesController {
  constructor(private svc: FieldRulesService) {}

  @Get()
  findAll(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.svc.findAll(moduleId, user.organizationId);
  }

  @Post()
  create(@Param('moduleId') moduleId: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.create(moduleId, user.organizationId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: any) {
    return this.svc.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }
}
