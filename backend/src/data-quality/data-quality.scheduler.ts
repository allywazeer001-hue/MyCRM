import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataQualityService } from './data-quality.service';

@Injectable()
export class DataQualityScheduler {
  private readonly logger = new Logger(DataQualityScheduler.name);

  constructor(private readonly dq: DataQualityService) {}

  // Runs every day at 02:00 — fires daily, weekly, and monthly scans based on config
  @Cron('0 2 * * *', { name: 'dq-daily' })
  async dailyScans() {
    this.logger.log('Running scheduled DAILY data quality scans');
    await this.dq.runScheduledScans('DAILY');
  }

  // Runs every Sunday at 03:00
  @Cron('0 3 * * 0', { name: 'dq-weekly' })
  async weeklyScans() {
    this.logger.log('Running scheduled WEEKLY data quality scans');
    await this.dq.runScheduledScans('WEEKLY');
  }

  // Runs on the 1st of every month at 04:00
  @Cron('0 4 1 * *', { name: 'dq-monthly' })
  async monthlyScans() {
    this.logger.log('Running scheduled MONTHLY data quality scans');
    await this.dq.runScheduledScans('MONTHLY');
  }
}
