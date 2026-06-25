import { Module } from '@nestjs/common';
import { BlueprintsController } from './blueprints.controller';
import { BlueprintsService } from './blueprints.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, NotificationsModule, WebsocketModule],
  controllers: [BlueprintsController],
  providers: [BlueprintsService],
  exports: [BlueprintsService],
})
export class BlueprintsModule {}
