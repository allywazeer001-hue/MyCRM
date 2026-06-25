import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarSyncService } from './calendar-sync.service';
import { CalendarSyncController } from './calendar-sync.controller';
import { GoogleSheetsService } from './google-sheets.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [CalendarSyncService, GoogleSheetsService],
  controllers: [CalendarSyncController],
  exports: [CalendarSyncService, GoogleSheetsService],
})
export class CalendarSyncModule {}
