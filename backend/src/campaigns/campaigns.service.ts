import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { applyFilterGroup } from '../common/filter-group.util';
import { resolveMergeFields, buildRecordMergeData, MergeFieldSource } from '../common/merge-fields.util';
import { isValidPhone, isValidEmail, normalizePhone } from '../common/contact-validation.util';
import { countSmsSegments } from '../providers/sms/sms-segments.util';
import { SmsProviderFactory } from '../providers/sms/sms-provider.factory';
import { WhatsAppProviderFactory } from '../providers/whatsapp/whatsapp-provider.factory';
import { EmailsService } from '../emails/emails.service';

export interface AudienceConfigDto {
  mode: 'view' | 'filter' | 'manual';
  moduleId: string;
  viewId?: string;
  filterGroup?: any;
  recordIds?: string[];
}

export interface CampaignChannelDto {
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  providerId?: string;
  content: Record<string, any>;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type?: string;
  tags?: string[];
  audienceConfig: AudienceConfigDto;
  channels: CampaignChannelDto[];
}

const RUNNING_STATES = ['SCHEDULED', 'QUEUED', 'RUNNING', 'PAUSED'];

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private smsFactory: SmsProviderFactory,
    private whatsappFactory: WhatsAppProviderFactory,
    private emails: EmailsService,
  ) {}

  // ── audience resolution ──────────────────────────────────────────────────

  private async resolveAudienceRecords(organizationId: string, audienceConfig: AudienceConfigDto) {
    const fields = await this.prisma.field.findMany({ where: { moduleId: audienceConfig.moduleId, isActive: true } });

    if (audienceConfig.mode === 'manual') {
      const records = await this.prisma.record.findMany({
        where: { id: { in: audienceConfig.recordIds ?? [] }, organizationId, isDeleted: false },
      });
      return { records, fields };
    }

    let filterGroup: any = audienceConfig.filterGroup ?? null;
    if (audienceConfig.mode === 'view' && audienceConfig.viewId) {
      const view = await this.prisma.view.findFirst({ where: { id: audienceConfig.viewId, organizationId } });
      const rawFilters = view?.filters as any;
      if (Array.isArray(rawFilters) && rawFilters.length > 0) {
        filterGroup = { logic: 'AND', conditions: rawFilters, groups: [] };
      } else if (rawFilters && typeof rawFilters === 'object' && Array.isArray(rawFilters.conditions)) {
        filterGroup = rawFilters;
      }
    }

    let records = await this.prisma.record.findMany({
      where: { moduleId: audienceConfig.moduleId, organizationId, isDeleted: false },
    });
    if (filterGroup && (filterGroup.conditions?.length || filterGroup.groups?.length)) {
      records = records.filter((r) => applyFilterGroup(r.data as any, filterGroup));
    }
    return { records, fields };
  }

  async previewAudience(organizationId: string, audienceConfig: AudienceConfigDto) {
    const { records, fields } = await this.resolveAudienceRecords(organizationId, audienceConfig);
    const phoneField = fields.find((f) => f.type === 'PHONE');
    const emailField = fields.find((f) => f.type === 'EMAIL');

    let smsReady = 0, emailReady = 0, missingPhone = 0, missingEmail = 0, invalidPhone = 0, invalidEmail = 0;
    for (const r of records) {
      const data = r.data as any;
      const phone = phoneField ? data?.[phoneField.name] : null;
      const email = emailField ? data?.[emailField.name] : null;

      if (!phone) missingPhone++;
      else if (!isValidPhone(phone)) invalidPhone++;
      else smsReady++;

      if (!email) missingEmail++;
      else if (!isValidEmail(email)) invalidEmail++;
      else emailReady++;
    }

    return {
      total: records.length,
      smsReady, whatsappReady: smsReady, emailReady,
      missingPhone, missingEmail, invalidPhone, invalidEmail,
      hasPhoneField: !!phoneField, hasEmailField: !!emailField,
    };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async create(organizationId: string, createdById: string, dto: CreateCampaignDto) {
    if (!dto.channels || dto.channels.length === 0) {
      throw new BadRequestException('Select at least one channel');
    }
    return this.prisma.campaign.create({
      data: {
        organizationId,
        createdById,
        name: dto.name,
        description: dto.description,
        type: (dto.type as any) ?? 'GENERAL_ANNOUNCEMENT',
        tags: (dto.tags ?? []) as any,
        audienceConfig: dto.audienceConfig as any,
        status: 'DRAFT',
        channels: {
          create: dto.channels.map((c) => ({
            channel: c.channel,
            providerId: c.providerId,
            content: c.content as any,
          })),
        },
      },
      include: { channels: true },
    });
  }

  async update(id: string, organizationId: string, dto: Partial<CreateCampaignDto>) {
    const campaign = await this.findOne(id, organizationId);
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Only draft campaigns can be edited — cancel and duplicate instead.');
    }

    if (dto.channels) {
      await this.prisma.campaignChannel.deleteMany({ where: { campaignId: id } });
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type !== undefined ? { type: dto.type as any } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags as any } : {}),
        ...(dto.audienceConfig !== undefined ? { audienceConfig: dto.audienceConfig as any } : {}),
        ...(dto.channels ? { channels: { create: dto.channels.map((c) => ({ channel: c.channel, providerId: c.providerId, content: c.content as any })) } } : {}),
      },
      include: { channels: true },
    });
  }

  async findAll(organizationId: string, filters: { search?: string; status?: string; channel?: string; type?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const where: any = { organizationId };
    if (filters.search) where.name = { contains: filters.search };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.channel) where.channels = { some: { channel: filters.channel } };

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where, include: { channels: true, createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { channels: true, createdBy: { select: { firstName: true, lastName: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async remove(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);
    if (RUNNING_STATES.includes(campaign.status) && campaign.status !== 'PAUSED') {
      throw new BadRequestException('Cancel a running campaign before deleting it');
    }
    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  async dashboardStats(organizationId: string) {
    const [byStatus, recipientTotals] = await Promise.all([
      this.prisma.campaign.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.campaignRecipient.groupBy({ by: ['status'], where: { campaign: { organizationId } }, _count: true }),
    ]);
    const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const recipientCounts = Object.fromEntries(recipientTotals.map((s) => [s.status, s._count]));
    const totalRecipients = recipientTotals.reduce((sum, s) => sum + s._count, 0);

    return {
      totalCampaigns: byStatus.reduce((sum, s) => sum + s._count, 0),
      draft: statusCounts.DRAFT ?? 0,
      scheduled: statusCounts.SCHEDULED ?? 0,
      running: statusCounts.RUNNING ?? 0,
      completed: statusCounts.COMPLETED ?? 0,
      failed: (statusCounts.FAILED ?? 0) + (statusCounts.PARTIALLY_FAILED ?? 0),
      totalRecipients,
      messagesSent: (recipientCounts.SENT ?? 0) + (recipientCounts.DELIVERED ?? 0) + (recipientCounts.OPENED ?? 0) + (recipientCounts.CLICKED ?? 0),
      delivered: recipientCounts.DELIVERED ?? 0,
      failedMessages: (recipientCounts.FAILED ?? 0) + (recipientCounts.BOUNCED ?? 0),
      pending: (recipientCounts.PENDING ?? 0) + (recipientCounts.QUEUED ?? 0),
      opened: recipientCounts.OPENED ?? 0,
      clicked: recipientCounts.CLICKED ?? 0,
    };
  }

  // ── sending / scheduling / lifecycle ─────────────────────────────────────

  async schedule(id: string, organizationId: string, scheduledAt: string, timezone?: string) {
    const campaign = await this.findOne(id, organizationId);
    if (campaign.status !== 'DRAFT') throw new BadRequestException('Only draft campaigns can be scheduled');
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt: new Date(scheduledAt), timezone },
    });
  }

  /** "Send now" is just "schedule for right now" — the same cron processor picks it up within a minute, so there's only ever one send code path. */
  async sendNow(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);
    if (campaign.status !== 'DRAFT') throw new BadRequestException('Only draft campaigns can be sent');
    return this.prisma.campaign.update({ where: { id }, data: { status: 'SCHEDULED', scheduledAt: new Date() } });
  }

  async pause(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);
    if (campaign.status !== 'RUNNING') throw new BadRequestException('Only running campaigns can be paused');
    return this.prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async resume(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);
    if (campaign.status !== 'PAUSED') throw new BadRequestException('Only paused campaigns can be resumed');
    return this.prisma.campaign.update({ where: { id }, data: { status: 'RUNNING' } });
  }

  async cancel(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);
    if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
      throw new BadRequestException('Campaign already finished');
    }
    await this.prisma.campaignRecipient.updateMany({
      where: { campaignId: id, status: { in: ['PENDING', 'QUEUED'] } },
      data: { status: 'CANCELLED' },
    });
    return this.prisma.campaign.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async retryFailed(id: string, organizationId: string, channel?: string) {
    await this.findOne(id, organizationId);
    const result = await this.prisma.campaignRecipient.updateMany({
      where: { campaignId: id, status: { in: ['FAILED', 'BOUNCED'] }, ...(channel ? { channel: channel as any } : {}) },
      data: { status: 'PENDING', retryCount: { increment: 1 }, failureReason: null },
    });
    if (result.count > 0) {
      await this.prisma.campaign.update({ where: { id }, data: { status: 'RUNNING' } });
    }
    return { retried: result.count };
  }

  // ── test send — one real message, outside the recipient/processor pipeline ─

  async sendTest(id: string, organizationId: string, channel: 'SMS' | 'WHATSAPP' | 'EMAIL', destination: string, userId: string) {
    const campaign = await this.findOne(id, organizationId);
    const channelRow = campaign.channels.find((c) => c.channel === channel);
    if (!channelRow) throw new BadRequestException(`Campaign has no ${channel} content configured`);

    const sampleMergeData: Record<string, string> = {
      First_Name: 'Test', Last_Name: 'User', Full_Name: 'Test User',
      Phone: destination, Email: destination,
    };
    const content = channelRow.content as any;

    if (channel === 'SMS') {
      const message = resolveMergeFields(content.message ?? '', sampleMergeData);
      const { provider } = await this.smsFactory.resolve(organizationId, channelRow.providerId);
      return provider.sendSms({ to: destination, message, senderId: content.senderId });
    }

    if (channel === 'WHATSAPP') {
      const { provider } = await this.whatsappFactory.resolve(organizationId, channelRow.providerId);
      const variables = (content.variableMapping ?? []).map((v: any, i: number) => ({
        position: i + 1,
        value: resolveMergeFields(v.value ?? '', sampleMergeData),
      }));
      return provider.sendTemplateMessage({
        to: destination, templateName: content.templateName, languageCode: content.languageCode ?? 'en_US', variables,
      });
    }

    // EMAIL
    const subject = resolveMergeFields(content.subject ?? '', sampleMergeData);
    const body = resolveMergeFields(content.body ?? '', sampleMergeData);
    return this.emails.send(organizationId, userId, { recipients: [{ email: destination }], subject, body });
  }

  // ── analytics / recipients ────────────────────────────────────────────────

  async getAnalytics(id: string, organizationId: string) {
    const campaign = await this.findOne(id, organizationId);
    const grouped = await this.prisma.campaignRecipient.groupBy({
      by: ['channel', 'status'], where: { campaignId: id }, _count: true,
    });

    const byChannel: Record<string, Record<string, number>> = {};
    let total = 0, sent = 0, delivered = 0, failed = 0, opened = 0, clicked = 0;
    for (const row of grouped) {
      byChannel[row.channel] ??= {};
      byChannel[row.channel][row.status] = row._count;
      total += row._count;
      if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(row.status)) sent += row._count;
      if (row.status === 'DELIVERED') delivered += row._count;
      if (['FAILED', 'BOUNCED'].includes(row.status)) failed += row._count;
      if (row.status === 'OPENED') opened += row._count;
      if (row.status === 'CLICKED') clicked += row._count;
    }

    return {
      campaign: { id: campaign.id, name: campaign.name, status: campaign.status },
      total, sent, delivered, failed, opened, clicked,
      deliveryRate: total > 0 ? Math.round(((total - failed) / total) * 1000) / 10 : 0,
      byChannel,
    };
  }

  async getRecipients(id: string, organizationId: string, filters: { channel?: string; status?: string; page?: number; limit?: number }) {
    await this.findOne(id, organizationId);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const where: any = { campaignId: id };
    if (filters.channel) where.channel = filters.channel;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.campaignRecipient.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** For the CRM record detail page's "Communication History" tab. */
  getRecordHistory(recordId: string, organizationId: string) {
    return this.prisma.campaignRecipient.findMany({
      where: { recordId, campaign: { organizationId } },
      include: { campaign: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── generating recipient rows (called by the processor) ───────────────────

  async generateRecipientsIfNeeded(campaignId: string) {
    const existing = await this.prisma.campaignRecipient.count({ where: { campaignId } });
    if (existing > 0) return existing;

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { channels: true } });
    if (!campaign) return 0;

    const audienceConfig = campaign.audienceConfig as unknown as AudienceConfigDto;
    const { records, fields } = await this.resolveAudienceRecords(campaign.organizationId, audienceConfig);
    const phoneField = fields.find((f) => f.type === 'PHONE');
    const emailField = fields.find((f) => f.type === 'EMAIL');
    const fieldSources: MergeFieldSource[] = fields.map((f) => ({ name: f.name, label: f.label, type: f.type }));

    const optOuts = await this.prisma.communicationOptOut.findMany({ where: { organizationId: campaign.organizationId } });
    const optOutSet = new Set(optOuts.map((o) => `${o.channel}:${o.destination.toLowerCase()}`));

    const rows: any[] = [];
    for (const channel of campaign.channels) {
      const content = channel.content as any;
      for (const record of records) {
        const data = record.data as any;
        const mergeData = buildRecordMergeData(data, fieldSources);

        if (channel.channel === 'EMAIL') {
          const email = emailField ? data?.[emailField.name] : null;
          if (!email || !isValidEmail(email) || optOutSet.has(`EMAIL:${String(email).toLowerCase()}`)) continue;
          rows.push({
            campaignId: campaign.id, campaignChannelId: channel.id, moduleId: audienceConfig.moduleId, recordId: record.id,
            channel: 'EMAIL', providerId: channel.providerId, destination: String(email).toLowerCase(),
            personalizedMessage: resolveMergeFields(content.body ?? '', mergeData), status: 'PENDING',
          });
          continue;
        }

        const phone = phoneField ? data?.[phoneField.name] : null;
        if (!phone || !isValidPhone(phone)) continue;
        const normalized = normalizePhone(String(phone))!;
        if (optOutSet.has(`${channel.channel}:${normalized.toLowerCase()}`)) continue;

        const message = channel.channel === 'SMS'
          ? resolveMergeFields(content.message ?? '', mergeData)
          : `Template: ${content.templateName ?? ''} — ${(content.variableMapping ?? []).map((v: any) => resolveMergeFields(v.value ?? '', mergeData)).join(', ')}`;

        rows.push({
          campaignId: campaign.id, campaignChannelId: channel.id, moduleId: audienceConfig.moduleId, recordId: record.id,
          channel: channel.channel, providerId: channel.providerId, destination: normalized,
          personalizedMessage: message, status: 'PENDING',
        });
      }
    }

    if (rows.length > 0) await this.prisma.campaignRecipient.createMany({ data: rows });
    return rows.length;
  }

  // ── opt-out / suppression list (Section 22) ───────────────────────────────

  listOptOuts(organizationId: string, channel?: string) {
    return this.prisma.communicationOptOut.findMany({
      where: { organizationId, ...(channel ? { channel: channel as any } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  addOptOut(organizationId: string, channel: 'SMS' | 'WHATSAPP' | 'EMAIL', destination: string, reason?: string) {
    const normalized = channel === 'EMAIL' ? destination.toLowerCase() : (normalizePhone(destination) ?? destination);
    return this.prisma.communicationOptOut.upsert({
      where: { organizationId_channel_destination: { organizationId, channel, destination: normalized } },
      create: { organizationId, channel, destination: normalized, reason: reason ?? 'Manually added' },
      update: { reason: reason ?? 'Manually added' },
    });
  }

  async removeOptOut(id: string, organizationId: string) {
    const existing = await this.prisma.communicationOptOut.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Opt-out entry not found');
    await this.prisma.communicationOptOut.delete({ where: { id } });
    return { success: true };
  }
}
