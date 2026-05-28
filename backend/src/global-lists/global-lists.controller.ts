import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { GlobalListsService } from './global-lists.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('global-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('global-lists')
export class GlobalListsController {
  constructor(private svc: GlobalListsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }

  // Items

  @Get(':id/items')
  getItems(
    @Param('id') id: string,
    @Query('parentId') parentId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItems(id, user.organizationId, parentId);
  }

  @Get(':id/tree')
  getTree(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getItemTree(id, user.organizationId);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addItem(id, user.organizationId, body);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.svc.updateItem(id, user.organizationId, itemId, body);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.removeItem(id, user.organizationId, itemId);
  }

  @Get(':id/items/:itemId/children')
  getChildren(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItemChildren(id, user.organizationId, itemId);
  }
}
