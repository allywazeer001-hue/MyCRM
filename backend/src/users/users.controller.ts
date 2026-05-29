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

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.usersService.update(id, user.organizationId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.remove(id, user.organizationId);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.reactivate(id, user.organizationId);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.suspend(id, user.organizationId, user.id);
  }

  @Patch(':id/unsuspend')
  unsuspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.unsuspend(id, user.organizationId, user.id);
  }

  @Patch(':id/lock')
  lock(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.lock(id, user.organizationId, user.id);
  }

  @Patch(':id/unlock')
  unlock(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.unlock(id, user.organizationId, user.id);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.resetPassword(id, user.organizationId, user.id);
  }

  @Patch(':id/force-password-reset')
  forcePasswordReset(@Param('id') id: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user) && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.forcePasswordReset(id, user.organizationId, user.id);
  }

  @Get(':id/permissions')
  getPermissionSummary(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getPermissionSummary(id, user.organizationId);
  }

  @Get(':id/permission-overrides')
  getPermissionOverrides(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getPermissionOverrides(id, user.organizationId);
  }

  @Post(':id/permission-overrides')
  setPermissionOverride(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.setPermissionOverride(id, user.organizationId, user.id, body);
  }

  @Delete('permission-overrides/:overrideId')
  removePermissionOverride(@Param('overrideId') overrideId: string, @CurrentUser() user: any) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Only Super Admin can perform this action');
    }
    return this.usersService.removePermissionOverride(overrideId, user.organizationId, user.id);
  }
}
