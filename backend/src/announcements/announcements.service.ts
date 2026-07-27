import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SINGLETON_ID = 'global';

export interface UpdateAnnouncementDto {
  message: string;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
}

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  // ── Admin: full record, regardless of active state ──────────────────────────
  async getForAdmin() {
    const row = await this.prisma.platformAnnouncement.findUnique({ where: { id: SINGLETON_ID } });
    return (
      row ?? {
        id: SINGLETON_ID, message: '', isActive: false,
        startDate: null, endDate: null, dailyStartTime: null, dailyEndTime: null,
        updatedAt: null,
      }
    );
  }

  // ── Public: only surfaced when active AND within its schedule (if any) ──────
  async getActive() {
    const row = await this.prisma.platformAnnouncement.findUnique({ where: { id: SINGLETON_ID } });
    if (!row || !row.isActive) return null;

    const now = new Date();
    if (row.startDate && now < row.startDate) return null;
    if (row.endDate && now > row.endDate) return null;

    if (row.dailyStartTime && row.dailyEndTime) {
      const nowTime = now.toTimeString().slice(0, 5); // "HH:MM", zero-padded — safe to compare as strings
      if (nowTime < row.dailyStartTime || nowTime > row.dailyEndTime) return null;
    }

    return { message: row.message, updatedAt: row.updatedAt };
  }

  upsert(dto: UpdateAnnouncementDto) {
    const data = {
      message: dto.message,
      isActive: dto.isActive,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      dailyStartTime: dto.dailyStartTime || null,
      dailyEndTime: dto.dailyEndTime || null,
    };
    return this.prisma.platformAnnouncement.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  }

  unpublish() {
    return this.prisma.platformAnnouncement.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, message: '', isActive: false },
      update: { isActive: false },
    });
  }
}
