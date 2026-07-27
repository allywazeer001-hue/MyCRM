import { Module } from '@nestjs/common';
import { BlueprintsController } from './blueprints.controller';
import { BlueprintsService } from './blueprints.service';
import { BlueprintSchedulerService } from './blueprint-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [PrismaModule, NotificationsModule, WebsocketModule, WorkflowsModule],
  controllers: [BlueprintsController],
  providers: [BlueprintsService, BlueprintSchedulerService],
  exports: [BlueprintsService],
})
export class BlueprintsModule {}
