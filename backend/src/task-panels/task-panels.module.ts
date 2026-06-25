import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskPanelsService } from './task-panels.service';
import { TaskPanelsController } from './task-panels.controller';

@Module({
  imports: [PrismaModule],
  providers: [TaskPanelsService],
  controllers: [TaskPanelsController],
  exports: [TaskPanelsService],
})
export class TaskPanelsModule {}
