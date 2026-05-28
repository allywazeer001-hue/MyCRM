import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BlueprintsService } from './blueprints.service';

@UseGuards(JwtAuthGuard)
@Controller('blueprints')
export class BlueprintsController {
  constructor(private readonly blueprintsService: BlueprintsService) {}

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
