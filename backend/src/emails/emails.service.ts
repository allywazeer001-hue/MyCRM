import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

export interface Recipient {
  email: string;
  name?: string;
  mergeData?: Record<string, string>; // e.g. { firstName: 'Ali', customLink: 'https://...' }
  // Per-recipient override — needed for bulk sends across many different records
  // (falls back to SendEmailDto.recordId when a single record is being emailed).
  recordId?: string;
}

export interface SendEmailDto {
  recipients: Recipient[];
  subject: string;
  body: string;           // HTML body with {{merge}} tags
  templateId?: string;
  // Optional — which record this send is about, so it shows up on that record's
  // own email history. Only meaningful when sending to a single record's contact;
  // left undefined for template broadcasts / bulk sends across many records.
  recordId?: string;
  // Where replies should go, if different from the sending address.
  replyTo?: string;
}

function pctOf(count: number, of: number): number {
  return of > 0 ? Math.round((count / of) * 100) : 0;
}

export interface ScheduleEmailDto extends SendEmailDto {
  sendAt: string; // ISO datetime
}

const BOUNCE_PATTERN = /mailbox unavailable|user unknown|no such user|does not exist|invalid recipient|recipient rejected|mailbox not found|address rejected/i;
const BOUNCE_CODES = new Set([550, 551, 553, 554]);

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
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
  }

  // ── send via Resend's HTTPS API ──────────────────────────────────────────
  // Not SMTP: Railway blocks outbound SMTP entirely below its Pro plan (a
  // documented anti-spam restriction), which made direct nodemailer/Gmail
  // sends time out in production despite working fine on localhost. Resend
  // talks HTTPS, so it works on any hosting plan.
  private resendClient(): Resend | null {
    const apiKey = this.config.get('RESEND_API_KEY');
    return apiKey ? new Resend(apiKey) : null;
  }

  // Public base URL the open-tracking pixel must be reachable at — reuses
  // FRONTEND_URL (first entry, since that var is a comma-separated CORS allow-list)
  // because the Next.js app already proxies /api/v1/* to this backend.
  private publicBaseUrl(): string {
    const raw = this.config.get('FRONTEND_URL') ?? '';
    return String(raw).split(',')[0].trim().replace(/\/$/, '');
  }

  private trackingPixel(logId: string): string {
    const base = this.publicBaseUrl();
    if (!base) return '';
    return `<img src="${base}/api/v1/public/emails/track/${logId}" width="1" height="1" alt="" style="display:none" />`;
  }

  // Images uploaded from the template canvas are stored under the frontend's own
  // /uploads folder and saved with a *relative* src (e.g. "/uploads/x.png") — fine
  // inside the app (the browser resolves it against the current page), but an
  // email client has no "current page" to resolve against, so the image just
  // shows a broken-image icon. Rewriting to an absolute URL here, at send time,
  // is what actually makes the photo load in the recipient's inbox.
  private rewriteImagesToAbsolute(html: string): string {
    const base = this.publicBaseUrl();
    if (!base) return html;
    return html.replace(/(<img[^>]*?\bsrc\s*=\s*)(["'])\/(?!\/)([^"']*)\2/gi, (_match, prefix, quote, path) => `${prefix}${quote}${base}/${path}${quote}`);
  }

  // Routes every http(s) link in the body through a public redirect that records
  // the click before forwarding — mailto:/tel: links are left untouched.
  private rewriteLinksForTracking(html: string, logId: string): string {
    const base = this.publicBaseUrl();
    if (!base) return html;
    return html.replace(/href\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi, (_match, quote, url) => {
      const redirect = `${base}/api/v1/public/emails/click/${logId}?u=${encodeURIComponent(url)}`;
      return `href=${quote}${redirect}${quote}`;
    });
  }

  // Best-effort bounce detection from Resend's synchronous send-time error only —
  // real bounces (mailbox full, etc.) happen asynchronously and would need Resend's
  // webhook events to classify properly; out of scope here. Anything that fails
  // immediately (bad address format, auth, rate limit) stays 'failed'.
  private classifySendError(err: any): { status: string; message: string } {
    const message = String(err?.response ?? err?.message ?? err ?? 'Unknown error');
    const code = Number(err?.responseCode ?? err?.code);
    const isBounce = BOUNCE_CODES.has(code) || BOUNCE_PATTERN.test(message);
    return { status: isBounce ? 'bounced' : 'failed', message };
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

    const client = this.resendClient();
    const from = this.config.get('EMAIL_FROM') ?? this.config.get('SMTP_FROM') ?? 'noreply@example.com';
    // Falls back to a real inbox even when the sender ("from") is a shared
    // testing address (e.g. Resend's onboarding@resend.dev) that can't itself
    // receive replies — so replies always land somewhere read, by default.
    const replyTo = dto.replyTo || this.config.get('DEFAULT_REPLY_TO') || this.config.get('SMTP_USER') || undefined;
    const batchId = randomUUID();

    const results = await Promise.allSettled(
      dto.recipients.map(async (r) => {
        const mergeData = { name: r.name ?? '', email: r.email, ...(r.mergeData ?? {}) };
        const resolvedSubject = this.resolve(subjectTemplate, mergeData);
        const resolvedBody    = this.resolve(bodyTemplate, mergeData);

        // Generated up front so the tracking pixel/links can reference this exact
        // log row before it exists — the row is created after send with this id.
        const logId = randomUUID();
        const absoluteImageBody = this.rewriteImagesToAbsolute(resolvedBody);
        const linkTrackedBody = this.rewriteLinksForTracking(absoluteImageBody, logId);
        const bodyWithPixel = linkTrackedBody + this.trackingPixel(logId);

        let status = 'sent';
        let errorMsg: string | undefined;

        if (client) {
          try {
            const { error } = await client.emails.send({
              from, to: r.email, subject: resolvedSubject, html: bodyWithPixel,
              ...(replyTo ? { replyTo } : {}),
            });
            if (error) {
              const classified = this.classifySendError(error);
              status = classified.status;
              errorMsg = classified.message;
              this.logger.error(`Failed to send to ${r.email}: ${errorMsg}`);
            }
          } catch (err) {
            const classified = this.classifySendError(err);
            status = classified.status;
            errorMsg = classified.message;
            this.logger.error(`Failed to send to ${r.email}: ${errorMsg}`);
          }
        } else {
          // No RESEND_API_KEY configured — nothing was actually sent, so this must not be recorded as 'sent'.
          status = 'failed';
          errorMsg = 'Email sending is not configured on this server — email was not sent.';
          this.logger.warn(`Resend not configured — skipped sending to ${r.email}`);
        }

        try {
          return await this.prisma.emailLog.create({
            data: {
              id: logId,
              organizationId,
              sentById,
              recordId: r.recordId ?? dto.recordId ?? null,
              batchId,
              templateId: dto.templateId ?? null,
              toEmail: r.email,
              toName: r.name ?? null,
              subject: resolvedSubject,
              body: bodyWithPixel,
              replyTo: replyTo ?? null,
              status,
              errorMsg: errorMsg ?? null,
            },
          });
        } catch (dbErr: any) {
          // A failed send-time error must never be lost silently — if the log
          // row itself can't be written, at least surface why in the logs.
          this.logger.error(`Failed to record EmailLog for ${r.email} (status was '${status}'): ${dbErr?.message}`);
          throw dbErr;
        }
      }),
    );

    const sent    = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'sent').length;
    const bounced = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'bounced').length;
    const failed  = results.length - sent - bounced;
    return { batchId, sent, bounced, failed };
  }

  // ── resend a single failed/bounced email ──────────────────────────────────
  // Reuses the exact subject/body already stored (including the tracking pixel
  // and rewritten links from the original send) so a resend is a true retry,
  // not a re-render — records a new EmailLog row rather than mutating the old
  // one, so the original attempt stays visible in history.
  async resend(logId: string, organizationId: string) {
    const original = await this.prisma.emailLog.findFirst({ where: { id: logId, organizationId } });
    if (!original) throw new NotFoundException('Email not found');

    const client = this.resendClient();
    const from = this.config.get('EMAIL_FROM') ?? this.config.get('SMTP_FROM') ?? 'noreply@example.com';

    let status = 'sent';
    let errorMsg: string | undefined;

    if (client) {
      try {
        const { error } = await client.emails.send({
          from, to: original.toEmail, subject: original.subject, html: original.body,
          ...(original.replyTo ? { replyTo: original.replyTo } : {}),
        });
        if (error) {
          const classified = this.classifySendError(error);
          status = classified.status;
          errorMsg = classified.message;
        }
      } catch (err) {
        const classified = this.classifySendError(err);
        status = classified.status;
        errorMsg = classified.message;
      }
    } else {
      status = 'failed';
      errorMsg = 'Email sending is not configured on this server — email was not sent.';
    }

    if (status === 'sent') this.logger.log(`Resent to ${original.toEmail}`);
    else this.logger.error(`Resend failed for ${original.toEmail}: ${errorMsg}`);

    return this.prisma.emailLog.create({
      data: {
        id: randomUUID(),
        organizationId,
        sentById: original.sentById,
        recordId: original.recordId,
        batchId: original.batchId,
        templateId: original.templateId,
        toEmail: original.toEmail,
        toName: original.toName,
        subject: original.subject,
        body: original.body,
        replyTo: original.replyTo,
        status,
        errorMsg: errorMsg ?? null,
      },
    });
  }

  // ── history ───────────────────────────────────────────────────────────────
  findAll(organizationId: string, sentById?: string) {
    return this.prisma.emailLog.findMany({
      where: { organizationId, ...(sentById ? { sentById } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 200,
      select: {
        id: true, toEmail: true, toName: true, subject: true,
        status: true, openedAt: true, sentAt: true, templateId: true,
        sentBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  findByRecord(recordId: string, organizationId: string) {
    return this.prisma.emailLog.findMany({
      where: { recordId, organizationId },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true, toEmail: true, toName: true, subject: true,
        status: true, openedAt: true, sentAt: true, errorMsg: true, remark: true,
        sentBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // Summary for one record's own Emails tab — total sent, opened, and the
  // resulting open rate for that specific entity.
  async getRecordStats(recordId: string, organizationId: string) {
    const [total, delivered, opened] = await Promise.all([
      this.prisma.emailLog.count({ where: { recordId, organizationId } }),
      this.prisma.emailLog.count({ where: { recordId, organizationId, status: 'sent' } }),
      this.prisma.emailLog.count({ where: { recordId, organizationId, status: 'sent', openedAt: { not: null } } }),
    ]);
    return { total, delivered, opened, notOpened: delivered - opened, openRate: pctOf(opened, delivered) };
  }

  findOne(id: string, organizationId: string) {
    return this.prisma.emailLog.findFirst({ where: { id, organizationId } });
  }

  // Attach a free-text remark to a set of emails (e.g. "all unopened in this
  // campaign") — shows up on each affected record's own Emails tab.
  async bulkRemark(ids: string[], remark: string, organizationId: string) {
    const res = await this.prisma.emailLog.updateMany({
      where: { id: { in: ids }, organizationId },
      data: { remark },
    });
    return { updated: res.count };
  }

  // Record ids belonging to one module — lets "mass email" queries scope to
  // "every email ever sent about a record in this module" via the loose
  // (non-relational) recordId string on EmailLog.
  private async recordIdsForModule(moduleId: string, organizationId: string): Promise<string[]> {
    const records = await this.prisma.record.findMany({
      where: { moduleId, organizationId },
      select: { id: true },
    });
    return records.map(r => r.id);
  }

  // ── stats — funnel counts for the org's whole send history, or one module's ─
  async getStats(organizationId: string, moduleId?: string) {
    const where: any = { organizationId };
    if (moduleId) where.recordId = { in: await this.recordIdsForModule(moduleId, organizationId) };

    const [total, failed, bounced, opened, clicked] = await Promise.all([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.count({ where: { ...where, status: 'failed' } }),
      this.prisma.emailLog.count({ where: { ...where, status: 'bounced' } }),
      this.prisma.emailLog.count({ where: { ...where, status: 'sent', openedAt: { not: null } } }),
      this.prisma.emailLog.count({ where: { ...where, status: 'sent', clickedAt: { not: null } } }),
    ]);
    const delivered = total - failed - bounced;
    return { total, sent: delivered, delivered, failed, bounced, opened, notOpened: delivered - opened, clicked, notClicked: opened - clicked };
  }

  // ── campaign reports — one row per send() batch, not one row per recipient ─
  async getReports(organizationId: string, filters: { subject?: string; from?: string; to?: string; moduleId?: string }) {
    const where: any = { organizationId };
    if (filters.subject) where.subject = { contains: filters.subject };
    if (filters.from || filters.to) {
      where.sentAt = {};
      if (filters.from) where.sentAt.gte = new Date(filters.from);
      if (filters.to) where.sentAt.lte = new Date(filters.to);
    }
    if (filters.moduleId) where.recordId = { in: await this.recordIdsForModule(filters.moduleId, organizationId) };

    const logs = await this.prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 2000,
      select: { id: true, batchId: true, subject: true, status: true, openedAt: true, clickedAt: true, sentAt: true },
    });

    type Batch = {
      batchId: string; subject: string; sentAt: Date; total: number;
      delivered: number; failed: number; bounced: number;
      opened: number; notOpened: number; clicked: number; notClicked: number;
    };
    const batches = new Map<string, Batch>();
    for (const log of logs) {
      // Legacy logs (sent before batchId existed) each become their own single-recipient batch.
      const key = log.batchId ?? log.id;
      if (!batches.has(key)) {
        batches.set(key, { batchId: key, subject: log.subject, sentAt: log.sentAt, total: 0, delivered: 0, failed: 0, bounced: 0, opened: 0, notOpened: 0, clicked: 0, notClicked: 0 });
      }
      const b = batches.get(key)!;
      b.total++;
      if (log.status === 'bounced') b.bounced++;
      else if (log.status === 'failed') b.failed++;
      else {
        b.delivered++;
        if (log.openedAt) {
          b.opened++;
          if (log.clickedAt) b.clicked++; else b.notClicked++;
        } else {
          b.notOpened++;
        }
      }
      if (log.sentAt < b.sentAt) b.sentAt = log.sentAt; // earliest recipient in the batch
    }

    return [...batches.values()].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  // Single-campaign summary — the funnel counts + "Email Details" header fields
  // behind one report's detail page.
  async getBatchSummary(batchId: string, organizationId: string) {
    const logs = await this.prisma.emailLog.findMany({
      where: { organizationId, OR: [{ batchId }, { id: batchId }] },
      orderBy: { sentAt: 'asc' },
      select: {
        subject: true, status: true, openedAt: true, clickedAt: true, sentAt: true,
        toEmail: true, toName: true, templateId: true, replyTo: true,
        sentBy: { select: { firstName: true, lastName: true } },
        template: { select: { name: true } },
      },
    });
    if (logs.length === 0) return null;

    const first = logs[0];
    const summary = {
      batchId, subject: first.subject, sentAt: first.sentAt, total: 0,
      delivered: 0, failed: 0, bounced: 0, opened: 0, notOpened: 0, clicked: 0, notClicked: 0,
      templateId: first.templateId, templateName: first.template?.name ?? null,
      sentByName: first.sentBy ? `${first.sentBy.firstName} ${first.sentBy.lastName}`.trim() : null,
      replyTo: first.replyTo, fromEmail: this.config.get('SMTP_FROM') ?? null,
      firstRecipient: first.toName || first.toEmail,
    };
    for (const log of logs) {
      summary.total++;
      if (log.status === 'bounced') summary.bounced++;
      else if (log.status === 'failed') summary.failed++;
      else {
        summary.delivered++;
        if (log.openedAt) {
          summary.opened++;
          if (log.clickedAt) summary.clicked++; else summary.notClicked++;
        } else {
          summary.notOpened++;
        }
      }
      if (log.sentAt < summary.sentAt) summary.sentAt = log.sentAt;
    }
    return summary;
  }

  // Individual recipients within one campaign/batch, optionally narrowed to a
  // single funnel stage — the drill-down view behind each stage in the report.
  getBatchRecipients(batchId: string, organizationId: string, stage?: string) {
    const stageWhere: Record<string, any> = {
      delivered:   { status: 'sent' },
      bounced:     { status: 'bounced' },
      failed:      { status: 'failed' },
      opened:      { status: 'sent', openedAt: { not: null } },
      not_opened:  { status: 'sent', openedAt: null },
      clicked:     { status: 'sent', clickedAt: { not: null } },
      not_clicked: { status: 'sent', openedAt: { not: null }, clickedAt: null },
    };
    return this.prisma.emailLog.findMany({
      where: {
        organizationId,
        OR: [{ batchId }, { id: batchId }],
        ...(stage && stageWhere[stage] ? stageWhere[stage] : {}),
      },
      orderBy: { toEmail: 'asc' },
      select: { id: true, toEmail: true, toName: true, status: true, openedAt: true, clickedAt: true, errorMsg: true },
    });
  }

  // ── open/click tracking — called by public endpoints, no org scoping (the
  // urls only contain an opaque log id, nothing guessable/sensitive) ─────────
  async trackOpen(logId: string) {
    try {
      await this.prisma.emailLog.updateMany({
        where: { id: logId, openedAt: null },
        data: { openedAt: new Date() },
      });
    } catch {
      // A malformed/unknown id must never break the pixel response.
    }
  }

  async trackClick(logId: string, url: string): Promise<string> {
    try {
      await this.prisma.emailLog.updateMany({
        where: { id: logId, clickedAt: null },
        data: { clickedAt: new Date() },
      });
    } catch {
      // A malformed/unknown id must never block the redirect.
    }
    return url || this.publicBaseUrl() || '/';
  }

  // ── audience — the organization's own email + every active user's email,
  // so a mass send can target "everyone in my organization" directly ─────────
  async getAudience(organizationId: string) {
    const [org, users] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true, email: true } }),
      this.prisma.user.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, email: true, firstName: true, lastName: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);
    return {
      organizationName: org?.name ?? '',
      organizationEmail: org?.email ?? null,
      users: users.map(u => ({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`.trim() })),
    };
  }

  // ── scheduled sends ─────────────────────────────────────────────────────────
  schedule(organizationId: string, sentById: string, dto: ScheduleEmailDto) {
    return this.prisma.scheduledEmail.create({
      data: {
        organizationId,
        sentById,
        recipients: dto.recipients as any,
        subject: dto.subject,
        body: dto.body,
        templateId: dto.templateId ?? null,
        replyTo: dto.replyTo ?? null,
        sendAt: new Date(dto.sendAt),
      },
    });
  }

  listScheduled(organizationId: string) {
    return this.prisma.scheduledEmail.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { sendAt: 'asc' },
    });
  }

  cancelScheduled(id: string, organizationId: string) {
    return this.prisma.scheduledEmail.updateMany({
      where: { id, organizationId, status: 'pending' },
      data: { status: 'cancelled' },
    });
  }

  // Called by EmailsScheduler once a minute — sends every due row, then marks it.
  async processDueScheduled() {
    const due = await this.prisma.scheduledEmail.findMany({
      where: { status: 'pending', sendAt: { lte: new Date() } },
    });

    for (const row of due) {
      try {
        await this.send(row.organizationId, row.sentById, {
          recipients: row.recipients as unknown as Recipient[],
          subject: row.subject,
          body: row.body,
          templateId: row.templateId ?? undefined,
          replyTo: row.replyTo ?? undefined,
        });
        await this.prisma.scheduledEmail.update({ where: { id: row.id }, data: { status: 'sent', sentAt: new Date() } });
      } catch (err: any) {
        this.logger.error(`Scheduled email ${row.id} failed: ${err?.message}`);
        await this.prisma.scheduledEmail.update({ where: { id: row.id }, data: { status: 'failed', errorMsg: err?.message ?? 'Unknown error' } });
      }
    }
  }
}
