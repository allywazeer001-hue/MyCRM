import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController, PublicAnnouncementsController } from './announcements.controller';

@Module({
  controllers: [AnnouncementsController, PublicAnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
