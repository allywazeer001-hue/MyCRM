import { Module } from '@nestjs/common';
import { RecordRoutingController } from './record-routing.controller';
import { RecordRoutingService } from './record-routing.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecordRoutingController],
  providers: [RecordRoutingService],
  exports: [RecordRoutingService],
})
export class RecordRoutingModule {}
