import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

export interface Recipient {
  email: string;
  name?: string;
  mergeData?: Record<string, string>; // e.g. { firstName: 'Ali', customLink: 'https://...' }
}

export interface SendEmailDto {
  recipients: Recipient[];
  subject: string;
  body: string;           // HTML body with {{merge}} tags
  templateId?: string;
}

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private templates: EmailTemplatesService,
  ) {}

  // ── resolve {{tag}} placeholders ─────────────────────────────────────────
  private resolve(text: string, data: Record<string, string> = {}): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
  }

  // ── send via nodemailer ───────────────────────────────────────────────────
  private async transport() {
    const nodemailer = await import('nodemailer');
    return nodemailer.createTransport({
      host:   this.config.get('SMTP_HOST'),
      port:   Number(this.config.get('SMTP_PORT') ?? 587),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  // ── bulk send with per-recipient merge data ───────────────────────────────
  async send(organizationId: string, sentById: string, dto: SendEmailDto) {
    let bodyTemplate = dto.body;
    let subjectTemplate = dto.subject;

    // If a template was selected, use its body/subject as base
    if (dto.templateId) {
      const tpl = await this.templates.findOne(dto.templateId, organizationId);
      bodyTemplate = dto.body || tpl.body;
      subjectTemplate = dto.subject || tpl.subject;
    }

    const smtpConfigured = !!this.config.get('SMTP_HOST');
    const transporter = smtpConfigured ? await this.transport() : null;
    const from = this.config.get('SMTP_FROM') ?? 'noreply@example.com';

    const results = await Promise.allSettled(
      dto.recipients.map(async (r) => {
        const mergeData = { name: r.name ?? '', email: r.email, ...(r.mergeData ?? {}) };
        const resolvedSubject = this.resolve(subjectTemplate, mergeData);
        const resolvedBody    = this.resolve(bodyTemplate, mergeData);

        let status = 'sent';
        let errorMsg: string | undefined;

        if (transporter) {
          try {
            await transporter.sendMail({ from, to: r.email, subject: resolvedSubject, html: resolvedBody });
          } catch (err) {
            status = 'failed';
            errorMsg = (err as Error).message;
            this.logger.error(`Failed to send to ${r.email}: ${errorMsg}`);
          }
        } else {
          this.logger.warn(`SMTP not configured — logged only. Would send to ${r.email}`);
        }

        return this.prisma.emailLog.create({
          data: {
            organizationId,
            sentById,
            templateId: dto.templateId ?? null,
            toEmail: r.email,
            toName: r.name ?? null,
            subject: resolvedSubject,
            body: resolvedBody,
            status,
            errorMsg: errorMsg ?? null,
          },
        });
      }),
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    return { sent, failed };
  }

  // ── history ───────────────────────────────────────────────────────────────
  findAll(organizationId: string, sentById?: string) {
    return this.prisma.emailLog.findMany({
      where: { organizationId, ...(sentById ? { sentById } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 200,
      select: {
        id: true, toEmail: true, toName: true, subject: true,
        status: true, sentAt: true, templateId: true,
        sentBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  findOne(id: string, organizationId: string) {
    return this.prisma.emailLog.findFirst({ where: { id, organizationId } });
  }
}
