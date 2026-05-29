import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionCheckService } from './permission-check.service';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionCheckService],
  exports: [PermissionsService, PermissionCheckService],
})
export class PermissionsModule {}
