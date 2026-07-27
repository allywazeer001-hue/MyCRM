import { Module } from '@nestjs/common';
import { ScheduledConfigurationsService } from './scheduled-configurations.service';
import { ScheduledConfigurationsController } from './scheduled-configurations.controller';
import { ScheduledConfigurationsScheduler } from './scheduled-configurations.scheduler';
import { FieldsModule } from '../fields/fields.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [FieldsModule, AnalyticsModule],
  controllers: [ScheduledConfigurationsController],
  providers: [ScheduledConfigurationsService, ScheduledConfigurationsScheduler],
})
export class ScheduledConfigurationsModule {}
