import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController, LookupController } from './records.controller';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [WorkflowsModule],
  controllers: [RecordsController, LookupController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
