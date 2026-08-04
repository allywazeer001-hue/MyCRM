import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SmsProviderFactory } from '../providers/sms/sms-provider.factory';
import { WhatsAppProviderFactory } from '../providers/whatsapp/whatsapp-provider.factory';
import { EmailChannelAdapter } from '../providers/email/email-channel.adapter';

// Bounded per campaign per cron tick — keeps one tick well inside the
// once-a-minute window and respects provider rate limits (sequential, not
// blasted in parallel) instead of needing a real queue/concurrency limiter.
const SMS_WHATSAPP_BATCH_SIZE = 100;
const EMAIL_BATCH_SIZE = 200;

@Injectable()
export class CampaignProcessorService {
  private readonly logger = new Logger(CampaignProcessorService.name);
  // Single-instance in-memory guard against overlapping ticks — matches the
  // existing EmailsScheduler's risk level (no distributed lock either); fine
  // for a single Railway instance, would need a real lock if ever scaled out.
  private running = false;

  constructor(
    private prisma: PrismaService,
    private campaigns: CampaignsService,
    private smsFactory: SmsProviderFactory,
    private whatsappFactory: WhatsAppProviderFactory,
    private emailAdapter: EmailChannelAdapter,
  ) {}

  async processDueCampaigns(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.promoteDueCampaigns();
      const active = await this.prisma.campaign.findMany({
        where: { status: 'RUNNING' },
        include: { channels: true },
      });
      for (const campaign of active) {
        await this.processCampaignBatch(campaign);
      }
    } finally {
      this.running = false;
    }
  }

  private async promoteDueCampaigns() {
    const due = await this.prisma.campaign.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    });
    for (const c of due) {
      try {
        await this.campaigns.generateRecipientsIfNeeded(c.id);
        await this.prisma.campaign.update({ where: { id: c.id }, data: { status: 'RUNNING', startedAt: new Date() } });
      } catch (err: any) {
        this.logger.error(`Failed to start campaign ${c.id}: ${err?.message}`);
        await this.prisma.campaign.update({ where: { id: c.id }, data: { status: 'FAILED' } });
      }
    }
  }

  private async processCampaignBatch(campaign: any) {
    const smsWhatsapp = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, status: 'PENDING', channel: { in: ['SMS', 'WHATSAPP'] } },
      take: SMS_WHATSAPP_BATCH_SIZE,
    });
    const emailRecipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, status: 'PENDING', channel: 'EMAIL' },
      take: EMAIL_BATCH_SIZE,
    });

    for (const r of smsWhatsapp) {
      if (r.channel === 'SMS') await this.sendOneSms(campaign, r);
      else await this.sendOneWhatsApp(campaign, r);
    }

    if (emailRecipients.length > 0) {
      const channel = campaign.channels.find((c: any) => c.channel === 'EMAIL');
      await this.emailAdapter.sendBatch(
        campaign.organizationId,
        campaign.createdById,
        (channel?.content as any)?.subject ?? '',
        // Recipients already carry their own fully-personalized body; the
        // shared subject template still needs per-recipient merge fields —
        // EmailsService resolves those itself from each recipient's mergeData,
        // so we pass the raw subject template here, not the resolved one.
        (channel?.content as any)?.body ?? '',
        emailRecipients.map((r) => ({ campaignRecipientId: r.id, email: r.destination, recordId: r.recordId })),
      );
    }

    await this.finalizeIfDone(campaign.id);
  }

  private async sendOneSms(campaign: any, r: any) {
    try {
      const { provider } = await this.smsFactory.resolve(campaign.organizationId, r.providerId);
      const result = await provider.sendSms({ to: r.destination, message: r.personalizedMessage ?? '' });
      await this.prisma.campaignRecipient.update({
        where: { id: r.id },
        data: result.success
          ? { status: 'SENT', providerMessageId: result.providerMessageId, cost: result.cost, currency: result.currency, sentAt: new Date() }
          : { status: 'FAILED', failureReason: result.error, failedAt: new Date() },
      });
    } catch (err: any) {
      await this.prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED', failureReason: err?.message, failedAt: new Date() } });
    }
  }

  private async sendOneWhatsApp(campaign: any, r: any) {
    try {
      const channel = campaign.channels.find((c: any) => c.id === r.campaignChannelId);
      const content = (channel?.content as any) ?? {};
      const { provider } = await this.whatsappFactory.resolve(campaign.organizationId, r.providerId);
      const variables = (content.variableMapping ?? []).map((v: any, i: number) => ({ position: i + 1, value: v.value ?? '' }));
      const result = await provider.sendTemplateMessage({
        to: r.destination, templateName: content.templateName, languageCode: content.languageCode ?? 'en_US', variables,
      });
      await this.prisma.campaignRecipient.update({
        where: { id: r.id },
        data: result.success
          ? { status: 'SENT', providerMessageId: result.providerMessageId, sentAt: new Date() }
          : { status: 'FAILED', failureReason: result.error, failedAt: new Date() },
      });
    } catch (err: any) {
      await this.prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: 'FAILED', failureReason: err?.message, failedAt: new Date() } });
    }
  }

  private async finalizeIfDone(campaignId: string) {
    const remaining = await this.prisma.campaignRecipient.count({
      where: { campaignId, status: { in: ['PENDING', 'QUEUED', 'SENDING'] } },
    });
    if (remaining > 0) return;

    const [total, failed] = await Promise.all([
      this.prisma.campaignRecipient.count({ where: { campaignId } }),
      this.prisma.campaignRecipient.count({ where: { campaignId, status: { in: ['FAILED', 'BOUNCED'] } } }),
    ]);
    if (total === 0) return; // nothing generated (empty audience) — leave as RUNNING for visibility rather than guessing a status

    const status = failed === 0 ? 'COMPLETED' : failed === total ? 'FAILED' : 'PARTIALLY_FAILED';
    await this.prisma.campaign.update({ where: { id: campaignId }, data: { status, completedAt: new Date() } });
  }
}
