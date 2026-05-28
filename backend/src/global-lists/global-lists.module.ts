import { Module } from '@nestjs/common';
import { GlobalListsService } from './global-lists.service';
import { GlobalListsController } from './global-lists.controller';

@Module({
  controllers: [GlobalListsController],
  providers: [GlobalListsService],
  exports: [GlobalListsService],
})
export class GlobalListsModule {}
