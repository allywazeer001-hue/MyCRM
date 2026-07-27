import { Module } from '@nestjs/common';
import { PivotService } from './pivot.service';
import { PivotController } from './pivot.controller';

@Module({
  controllers: [PivotController],
  providers: [PivotService],
})
export class PivotModule {}
