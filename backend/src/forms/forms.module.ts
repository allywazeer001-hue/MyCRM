import { Module } from '@nestjs/common';
import { FormsService } from './forms.service';
import { FormsController, PublicFormsController } from './forms.controller';
import { WorkflowsModule } from '../workflows/workflows.module';
import { CalendarSyncModule } from '../calendar-sync/calendar-sync.module';
import { BlueprintsModule } from '../blueprints/blueprints.module';
import { RecordsModule } from '../records/records.module';

@Module({
  imports: [WorkflowsModule, CalendarSyncModule, BlueprintsModule, RecordsModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
