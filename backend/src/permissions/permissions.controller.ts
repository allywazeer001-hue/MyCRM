import { Controller, Get, Post, Query, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private svc: PermissionsService) {}

  @Post()
  set(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.setPermission(user.organizationId, body);
  }

  @Get()
  get(
    @Query('role') role: string,
    @Query('moduleId') moduleId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.getPermissions(user.organizationId, role, moduleId);
  }

  @Get('matrix')
  matrix(@CurrentUser() user: any) {
    return this.svc.getMatrix(user.organizationId);
  }

  @Post('bulk')
  bulk(
    @Body('role') role: string,
    @Body('permissions') permissions: any[],
    @CurrentUser() user: any,
  ) {
    return this.svc.setBulkPermissions(user.organizationId, role, permissions);
  }

  @Post('seed/:moduleId')
  seed(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.svc.seedModulePermissions(user.organizationId, moduleId);
  }
}
