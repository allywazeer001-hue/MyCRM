import { Module } from '@nestjs/common';
import { FormsService } from './forms.service';
import { FormsController, PublicFormsController } from './forms.controller';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [WorkflowsModule],
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
