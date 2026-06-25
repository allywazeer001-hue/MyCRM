import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private svc: OrganizationsService) {}

  // ── Platform Super Admin endpoints ────────────────────────────────────────────

  /** List ALL organizations — platform SUPER_ADMIN only */
  @Get()
  findAll(@CurrentUser() user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.findAll();
  }

  /** Create a new organization — platform SUPER_ADMIN only */
  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.create(body);
  }

  // ── Current user's organization (literal routes before :id) ──────────────────

  /** Get current user's organization */
  @Get('me')
  getMyOrg(@CurrentUser() user: any) {
    return this.svc.findOne(user.organizationId);
  }

  /** Get current user's organization usage statistics */
  @Get('me/stats')
  getMyOrgStats(@CurrentUser() user: any) {
    return this.svc.getStats(user.organizationId);
  }

  /** Update current user's organization profile — ADMIN+ */
  @Patch('me')
  updateMyOrg(@CurrentUser() user: any, @Body() body: any) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return this.svc.update(user.organizationId, body);
  }

  // ── Platform Super Admin: specific organization management ───────────────────

  /** Get a specific organization — SUPER_ADMIN only */
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.findOne(id);
  }

  /** Get stats for a specific organization — SUPER_ADMIN only */
  @Get(':id/stats')
  getStats(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.getStats(id);
  }

  /** Update a specific organization — SUPER_ADMIN only */
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.update(id, body);
  }

  /** Suspend an organization — SUPER_ADMIN only */
  @Patch(':id/suspend')
  suspend(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.suspend(id);
  }

  /** Re-activate a suspended organization — SUPER_ADMIN only */
  @Patch(':id/activate')
  activate(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.activate(id);
  }

  /** Deactivate (soft-delete) an organization — SUPER_ADMIN only */
  @Delete(':id')
  deactivate(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.deactivate(id);
  }

  /** Permanently delete an organization and ALL its data — SUPER_ADMIN only */
  @Delete(':id/permanent')
  hardDelete(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Platform admin access required');
    return this.svc.hardDelete(id, user.id);
  }
}
