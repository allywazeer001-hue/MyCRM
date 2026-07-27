import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduledConfigurationsService } from './scheduled-configurations.service';

@Injectable()
export class ScheduledConfigurationsScheduler {
  private readonly logger = new Logger(ScheduledConfigurationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly service: ScheduledConfigurationsService,
  ) {}

  @Cron('*/5 * * * *')
  async handleDueConfigurations(): Promise<void> {
    const due = await this.prisma.scheduledConfiguration.findMany({
      where: { isActive: true, nextRunAt: { lte: new Date() } },
      select: { id: true },
    });

    for (const row of due) {
      try {
        await this.service.executeNow(row.id);
      } catch (err: any) {
        this.logger.error(`[Scheduler] Scheduled configuration ${row.id} error: ${err?.message}`);
      }
    }
  }
}
