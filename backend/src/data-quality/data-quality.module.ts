import { Module } from '@nestjs/common';
import { DataQualityService } from './data-quality.service';
import { DataQualityController } from './data-quality.controller';
import { DataQualityScheduler } from './data-quality.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [NotificationsModule, PermissionsModule],
  controllers: [DataQualityController],
  providers: [DataQualityService, DataQualityScheduler],
  exports: [DataQualityService],
})
export class DataQualityModule {}
