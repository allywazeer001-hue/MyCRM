import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BlueprintsService } from './blueprints.service';

@Injectable()
export class BlueprintSchedulerService {
  private readonly logger = new Logger(BlueprintSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blueprintsService: BlueprintsService,
  ) {}

  @Cron('*/5 * * * *')
  async handleScheduledTransitions(): Promise<void> {
    const due = await this.prisma.blueprintScheduledTransition.findMany({
      where: { executed: false, cancelled: false, fireAt: { lte: new Date() } },
    });

    for (const row of due) {
      try {
        await this.blueprintsService.fireScheduledTransition(row.id);
      } catch (err: any) {
        this.logger.error(`[Scheduler] Scheduled transition ${row.id} error: ${err?.message}`);
      }
    }
  }
}
