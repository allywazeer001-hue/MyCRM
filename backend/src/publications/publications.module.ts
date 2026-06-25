import { Module } from '@nestjs/common';
import { PublicationsService } from './publications.service';
import { PublicationsController, PortalPublicationsController } from './publications.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicationsController, PortalPublicationsController],
  providers: [PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
