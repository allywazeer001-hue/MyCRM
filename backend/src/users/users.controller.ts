import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private isSuperAdmin(user: any): boolean {
    return user?.role === 'SUPER_ADMIN';
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.create(user.organizationId, body);
  }

  // IMPORTANT: static routes must come BEFORE :id to avoid NestJS swallowing them as params
  @Get('me/permissions')
  getMyPermissions(@CurrentUser() user: any) {
    return this.usersService.getMyPermissions(user.id, user.organizationId);
  }

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getMyProfile(user.id, user.organizationId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.update(user.id, user.organizationId, body);
  }

  @Delete('me/activity')
  clearMyActivity(@CurrentUser() user: any) {
    return this.usersService.clearMyActivity(user.id, user.organizationId);
  }

  private resolveOrgId(user: any): string {
    return user.organizationId;
  }

  // Static route — must come before :id below (Nest matches in declaration
  // order, and :id would otherwise swallow "profile" as an id segment... it
  // wouldn't here since this has an extra path segment, but keeping the
  // convention already used for me/permissions and me/profile above).
  @Get(':id/profile')
  getUserProfile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getUserProfile(id, this.resolveOrgId(user));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, this.resolveOrgId(user));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.usersService.update(id, this.resolveOrgId(user), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.remove(id, this.resolveOrgId(user));
  }

  /** Permanently removes the user from the database. Restricted to ADMIN+. */
  @Delete(':id/permanent')
  hardDelete(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can permanently delete users');
    }
    return this.usersService.hardDelete(id, this.resolveOrgId(user));
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.reactivate(id, this.resolveOrgId(user));
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.suspend(id, this.resolveOrgId(user), user.id);
  }

  @Patch(':id/unsuspend')
  unsuspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.unsuspend(id, this.resolveOrgId(user), user.id);
  }

  @Patch(':id/lock')
  lock(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.lock(id, this.resolveOrgId(user), user.id);
  }

  @Patch(':id/unlock')
  unlock(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.unlock(id, this.resolveOrgId(user), user.id);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.resetPassword(id, this.resolveOrgId(user), user.id);
  }

  @Patch(':id/force-password-reset')
  forcePasswordReset(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.forcePasswordReset(id, this.resolveOrgId(user), user.id);
  }

  @Get(':id/permissions')
  getPermissionSummary(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getPermissionSummary(id, this.resolveOrgId(user));
  }

  @Get(':id/permission-overrides')
  getPermissionOverrides(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getPermissionOverrides(id, this.resolveOrgId(user));
  }

  @Post(':id/permission-overrides')
  setPermissionOverride(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.setPermissionOverride(id, this.resolveOrgId(user), user.id, body);
  }

  @Delete('permission-overrides/:overrideId')
  removePermissionOverride(@Param('overrideId') overrideId: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.removePermissionOverride(overrideId, user.organizationId, user.id);
  }
}
