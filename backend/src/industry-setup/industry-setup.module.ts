import { Module } from '@nestjs/common';
import { IndustrySetupController } from './industry-setup.controller';
import { IndustrySetupService } from './industry-setup.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [IndustrySetupController],
  providers:   [IndustrySetupService],
  exports:     [IndustrySetupService],
})
export class IndustrySetupModule {}
