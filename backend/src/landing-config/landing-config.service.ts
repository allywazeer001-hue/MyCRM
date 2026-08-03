import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SINGLETON_ID = 'global';

@Injectable()
export class LandingConfigService {
  constructor(private prisma: PrismaService) {}

  // ── Admin: the raw config, regardless of whether it's ever been saved ──────
  async getForAdmin() {
    const row = await this.prisma.platformLandingConfig.findUnique({ where: { id: SINGLETON_ID } });
    return row?.config ?? {};
  }

  // ── Public: same config, read by the marketing page for every visitor ──────
  async getPublic() {
    const row = await this.prisma.platformLandingConfig.findUnique({ where: { id: SINGLETON_ID } });
    return row?.config ?? {};
  }

  upsert(config: Record<string, unknown>) {
    return this.prisma.platformLandingConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, config: config as any },
      update: { config: config as any },
    });
  }
}
