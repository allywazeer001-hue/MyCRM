import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ProcessController } from './process.controller';
import { ProcessService } from './process.service';

@Module({
  imports: [PrismaModule, NotificationsModule, WebsocketModule],
  controllers: [ProcessController],
  providers: [ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}
