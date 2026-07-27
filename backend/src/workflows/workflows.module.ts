import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowSchedulerService } from './workflow-scheduler.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowSchedulerService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
