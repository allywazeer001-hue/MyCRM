import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignProcessorService } from './campaign-processor.service';

@Injectable()
export class CampaignProcessorScheduler {
  private readonly logger = new Logger(CampaignProcessorScheduler.name);

  constructor(private readonly processor: CampaignProcessorService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDueCampaigns(): Promise<void> {
    try {
      await this.processor.processDueCampaigns();
    } catch (err: any) {
      this.logger.error(`[Scheduler] Campaign processing error: ${err?.message}`);
    }
  }
}
