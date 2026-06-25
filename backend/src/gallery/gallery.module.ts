import { Module } from '@nestjs/common';
import { GalleryController, GalleryServeController } from './gallery.controller';
import { GalleryService } from './gallery.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GalleryController, GalleryServeController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
