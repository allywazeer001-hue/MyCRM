import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailsService } from './emails.service';

@Injectable()
export class EmailsScheduler {
  private readonly logger = new Logger(EmailsScheduler.name);

  constructor(private readonly emails: EmailsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDueScheduledEmails(): Promise<void> {
    try {
      await this.emails.processDueScheduled();
    } catch (err: any) {
      this.logger.error(`[Scheduler] Due scheduled emails error: ${err?.message}`);
    }
  }
}
