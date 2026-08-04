import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailsService } from '../../emails/emails.service';

export interface EmailChannelRecipient {
  campaignRecipientId: string;
  email: string;
  recordId?: string | null;
}

/**
 * Campaigns' email channel deliberately does NOT reimplement sending —
 * EmailsService already handles Resend, open/click tracking pixels, and
 * bounce classification (backend/src/emails/emails.service.ts). This adapter
 * just bridges one campaign's batch of recipients into that existing send()
 * call, then reconciles the resulting EmailLog rows back onto our own
 * CampaignRecipient rows by matching email address within the same batchId.
 */
@Injectable()
export class EmailChannelAdapter {
  constructor(
    private prisma: PrismaService,
    private emails: EmailsService,
  ) {}

  async sendBatch(
    organizationId: string,
    sentById: string,
    subject: string,
    body: string,
    recipients: EmailChannelRecipient[],
  ): Promise<void> {
    if (recipients.length === 0) return;

    const { batchId } = await this.emails.send(organizationId, sentById, {
      recipients: recipients.map(r => ({ email: r.email, recordId: r.recordId ?? undefined })),
      subject,
      body,
      includeUnsubscribeLink: true,
    });

    const logs = await this.prisma.emailLog.findMany({
      where: { batchId },
      select: { id: true, toEmail: true, status: true, errorMsg: true },
    });
    const byEmail = new Map(logs.map(l => [l.toEmail, l]));

    await Promise.all(recipients.map(async (r) => {
      const log = byEmail.get(r.email);
      if (!log) return;

      const status = log.status === 'sent' ? 'SENT' : log.status === 'bounced' ? 'BOUNCED' : 'FAILED';
      await this.prisma.campaignRecipient.update({
        where: { id: r.campaignRecipientId },
        data: {
          status,
          providerMessageId: log.id,
          failureReason: log.errorMsg ?? undefined,
          sentAt: status === 'SENT' ? new Date() : undefined,
          failedAt: status !== 'SENT' ? new Date() : undefined,
        },
      });
    }));
  }
}
