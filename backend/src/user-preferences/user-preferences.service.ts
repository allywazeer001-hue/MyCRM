import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string, key: string) {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId_key: { userId, key } },
    });
    return pref ? { key: pref.key, value: pref.value } : null;
  }

  async set(userId: string, key: string, value: any) {
    return this.prisma.userPreference.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value },
      update: { value },
    });
  }

  async remove(userId: string, key: string) {
    await this.prisma.userPreference.deleteMany({ where: { userId, key } });
    return { success: true };
  }
}
