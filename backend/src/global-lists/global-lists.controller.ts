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

  @Get('published')
  getPublished() {
    return this.svc.getPublishedLists();
  }

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

  // ── Cross-List Relationship ────────────────────────────────────────────────

  @Patch(':id/link-parent')
  linkParentList(
    @Param('id') id: string,
    @Body() body: { parentListId: string | null },
    @CurrentUser() user: any,
  ) {
    return this.svc.setLinkedParentList(id, user.organizationId, body.parentListId);
  }

  // Items filtered by linked parent item (for cascading dropdowns)
  @Get(':id/by-parent/:parentItemId')
  getByLinkedParent(
    @Param('id') id: string,
    @Param('parentItemId') parentItemId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItemsByLinkedParent(id, user.organizationId, parentItemId);
  }

  // Link/unlink a child list from a specific item
  @Patch(':id/items/:itemId/link-child-list')
  linkItemChildList(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { childListId: string | null },
    @CurrentUser() user: any,
  ) {
    return this.svc.linkItemChildList(id, user.organizationId, itemId, body.childListId);
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  @Get(':id/items')
  getItems(
    @Param('id') id: string,
    @Query('parentId') parentId: string,
    @Query('search') search: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItems(id, user.organizationId, parentId, search);
  }

  @Get(':id/tree')
  getTree(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getItemTree(id, user.organizationId);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.addItem(id, user.organizationId, body);
  }

  @Post(':id/items/bulk')
  bulkCreateItems(
    @Param('id') id: string,
    @Body() body: { items: Array<{ label: string; parentId?: string | null; linkedParentItemId?: string | null; value?: string; order?: number }> },
    @CurrentUser() user: any,
  ) {
    return this.svc.bulkCreateItems(user.organizationId, id, body.items ?? []);
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

  @Get(':id/items/:itemId')
  getItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItem(id, user.organizationId, itemId);
  }

  @Get(':id/items/:itemId/children')
  getChildren(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItemChildren(id, user.organizationId, itemId);
  }

  @Get(':id/items/:itemId/ancestors')
  getAncestors(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getItemAncestors(id, user.organizationId, itemId);
  }
}
