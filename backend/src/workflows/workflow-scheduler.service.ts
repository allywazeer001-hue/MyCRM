import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class WorkflowSchedulerService {
  private readonly logger = new Logger(WorkflowSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Cron('*/5 * * * *')
  async handleScheduledWorkflows(): Promise<void> {
    const now = new Date();

    const workflows = await this.prisma.workflow.findMany({
      where: { trigger: 'SCHEDULED', isActive: true },
      include: {
        actions: { orderBy: { order: 'asc' } },
        ruleGroups: { orderBy: { order: 'asc' } },
      },
    });

    for (const wf of workflows) {
      const cfg = (wf.triggerConfig as any) || {};
      try {
        if (cfg.scheduleType === 'RECURRING') {
          await this.handleRecurring(wf, cfg, now);
        } else if (cfg.scheduleType === 'DATE_FIELD') {
          await this.handleDateField(wf, cfg, now);
        }
      } catch (err: any) {
        this.logger.error(`[Scheduler] Workflow ${wf.id} error: ${err?.message}`);
      }
    }
  }

  private async handleRecurring(wf: any, cfg: any, now: Date): Promise<void> {
    if (!this.isRecurringDue(cfg, now)) return;

    const key = this.buildRecurringKey(cfg, now);
    const existing = await this.prisma.workflowScheduleLog.findUnique({
      where: { workflowId_triggerKey: { workflowId: wf.id, triggerKey: key } },
    });
    if (existing) return;

    await this.prisma.workflowScheduleLog.create({
      data: { workflowId: wf.id, triggerKey: key },
    });

    this.logger.log(`[Scheduler] Running recurring workflow "${wf.name}" (key: ${key})`);
    await this.workflowsService.executeScheduledWorkflow(wf, wf.organizationId);
  }

  private async handleDateField(wf: any, cfg: any, now: Date): Promise<void> {
    if (!wf.moduleId) return;

    const { fieldName, offset = 0, time = '09:00' } = cfg;
    if (!fieldName) return;

    const [tHour, tMin] = (time as string).split(':').map(Number);
    if (now.getHours() !== tHour || Math.abs(now.getMinutes() - tMin) > 4) return;

    // Compute the date the field must equal (today + offset)
    const target = new Date(now);
    target.setDate(target.getDate() + Number(offset || 0));
    const targetDate = target.toISOString().split('T')[0];

    const records = await this.prisma.record.findMany({
      where: { moduleId: wf.moduleId, organizationId: wf.organizationId, isDeleted: false },
    });

    for (const record of records) {
      const fieldVal = (record.data as any)?.[fieldName];
      if (!fieldVal) continue;
      try {
        const recordDate = new Date(fieldVal).toISOString().split('T')[0];
        if (recordDate !== targetDate) continue;
      } catch { continue; }

      const key = `${targetDate}:${record.id}`;
      const existing = await this.prisma.workflowScheduleLog.findUnique({
        where: { workflowId_triggerKey: { workflowId: wf.id, triggerKey: key } },
      });
      if (existing) continue;

      await this.prisma.workflowScheduleLog.create({
        data: { workflowId: wf.id, triggerKey: key },
      });

      this.logger.log(`[Scheduler] Date-field trigger "${wf.name}" → record ${record.id}`);
      await this.workflowsService.executeScheduledWorkflow(wf, wf.organizationId, record);
    }
  }

  private isRecurringDue(cfg: any, now: Date): boolean {
    const { frequency, time = '08:00' } = cfg;
    const [tHour, tMin] = (time as string).split(':').map(Number);
    if (now.getHours() !== tHour) return false;
    if (Math.abs(now.getMinutes() - tMin) > 4) return false;

    switch (frequency) {
      case 'DAILY':     return true;
      case 'WEEKDAYS':  return now.getDay() >= 1 && now.getDay() <= 5;
      case 'WEEKLY':    return now.getDay() === (cfg.dayOfWeek ?? 1);
      case 'MONTHLY':   return now.getDate() === (cfg.dayOfMonth ?? 1);
      case 'QUARTERLY': return [0, 3, 6, 9].includes(now.getMonth()) && now.getDate() === (cfg.dayOfMonth ?? 1);
      case 'YEARLY':    return now.getMonth() === (cfg.month ?? 0) && now.getDate() === (cfg.dayOfMonth ?? 1);
      default:          return false;
    }
  }

  private buildRecurringKey(cfg: any, now: Date): string {
    const d = now.toISOString().split('T')[0];
    switch (cfg.frequency) {
      case 'DAILY':
      case 'WEEKDAYS':  return d;
      case 'WEEKLY':    return `w${now.getFullYear()}-${this.isoWeek(now)}`;
      case 'MONTHLY':   return `${now.getFullYear()}-${now.getMonth() + 1}`;
      case 'QUARTERLY': return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
      case 'YEARLY':    return String(now.getFullYear());
      default:          return d;
    }
  }

  private isoWeek(d: Date): number {
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - oneJan.getTime()) / 86_400_000 + oneJan.getDay() + 1) / 7);
  }
}
