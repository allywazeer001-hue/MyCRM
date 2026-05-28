import { Module } from '@nestjs/common';
import { BlueprintsController } from './blueprints.controller';
import { BlueprintsService } from './blueprints.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BlueprintsController],
  providers: [BlueprintsService],
  exports: [BlueprintsService],
})
export class BlueprintsModule {}
