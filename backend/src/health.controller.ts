import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

// Unauthenticated on purpose — Railway's healthcheck hits this before the
// app is considered ready to receive traffic during a deploy swap. Checking
// the DB round-trip (not just "process is listening") means a deploy only
// cuts over once the app can genuinely serve requests, not just once the
// port is open.
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
  }
}
