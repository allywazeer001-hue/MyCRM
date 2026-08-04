import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt } from '../connected-apps/crypto/connected-app-crypto.util';
import { SmsProviderFactory } from '../providers/sms/sms-provider.factory';
import { WhatsAppProviderFactory } from '../providers/whatsapp/whatsapp-provider.factory';

export interface UpsertCommunicationProviderDto {
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  provider: 'BEEM' | 'AFRICAS_TALKING' | 'TWILIO' | 'META_WHATSAPP' | 'RESEND' | 'SMTP';
  label: string;
  config: Record<string, unknown>;
  /** Plaintext secret fields (e.g. { apiKey, secretKey } or { accessToken }) — encrypted before storage, never returned. */
  secret?: Record<string, unknown>;
  isDefault?: boolean;
  isActive?: boolean;
}

// Never sent back to the frontend — secretEnc is write-only from the API's perspective.
function toPublic(row: any) {
  const { secretEnc, ...rest } = row;
  return { ...rest, hasCredentials: !!secretEnc };
}

@Injectable()
export class CommunicationProvidersService {
  constructor(
    private prisma: PrismaService,
    private smsFactory: SmsProviderFactory,
    private whatsappFactory: WhatsAppProviderFactory,
  ) {}

  async list(organizationId: string, channel?: string) {
    const rows = await this.prisma.communicationProvider.findMany({
      where: { organizationId, ...(channel ? { channel: channel as any } : {}) },
      orderBy: [{ channel: 'asc' }, { isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toPublic);
  }

  async create(organizationId: string, dto: UpsertCommunicationProviderDto) {
    if (dto.isDefault) await this.clearDefault(organizationId, dto.channel);

    const row = await this.prisma.communicationProvider.create({
      data: {
        organizationId,
        channel: dto.channel,
        provider: dto.provider,
        label: dto.label,
        config: (dto.config ?? {}) as any,
        secretEnc: dto.secret ? encrypt(JSON.stringify(dto.secret)) : null,
        isDefault: !!dto.isDefault,
        isActive: dto.isActive ?? true,
      },
    });
    return toPublic(row);
  }

  async update(id: string, organizationId: string, dto: Partial<UpsertCommunicationProviderDto>) {
    const existing = await this.prisma.communicationProvider.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Provider not found');

    if (dto.isDefault) await this.clearDefault(organizationId, existing.channel);

    const row = await this.prisma.communicationProvider.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.config !== undefined ? { config: dto.config as any } : {}),
        ...(dto.secret !== undefined ? { secretEnc: encrypt(JSON.stringify(dto.secret)) } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return toPublic(row);
  }

  async remove(id: string, organizationId: string) {
    const existing = await this.prisma.communicationProvider.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Provider not found');
    await this.prisma.communicationProvider.delete({ where: { id } });
    return { success: true };
  }

  private async clearDefault(organizationId: string, channel: string) {
    await this.prisma.communicationProvider.updateMany({
      where: { organizationId, channel: channel as any, isDefault: true },
      data: { isDefault: false },
    });
  }

  /** Actually calls the provider's API — never just checks that credentials exist (Section 29). */
  async testConnection(id: string, organizationId: string) {
    const row = await this.prisma.communicationProvider.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundException('Provider not found');

    let result: { success: boolean; message: string };
    try {
      if (row.channel === 'SMS') {
        const { provider } = await this.smsFactory.resolve(organizationId, id);
        result = await provider.testConnection();
      } else if (row.channel === 'WHATSAPP') {
        const { provider } = await this.whatsappFactory.resolve(organizationId, id);
        result = await provider.testConnection();
      } else {
        throw new BadRequestException('Email providers use the existing Resend configuration — nothing to test here yet.');
      }
    } catch (err: any) {
      result = { success: false, message: err?.message ?? 'Test failed' };
    }

    await this.prisma.communicationProvider.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.success ? 'success' : 'failed',
        lastTestError: result.success ? null : result.message,
      },
    });

    return result;
  }

  /** Sends one real message through the given provider to a phone number the caller supplies — proves CRM → Backend → Provider → Recipient end to end (Section 29). */
  async sendTest(id: string, organizationId: string, destination: string, message?: string) {
    const row = await this.prisma.communicationProvider.findFirst({ where: { id, organizationId } });
    if (!row) throw new NotFoundException('Provider not found');

    if (row.channel === 'SMS') {
      const { provider } = await this.smsFactory.resolve(organizationId, id);
      return provider.sendSms({ to: destination, message: message || 'This is a test message from your CRM.' });
    }
    if (row.channel === 'WHATSAPP') {
      throw new BadRequestException('Send a test WhatsApp message from a campaign using an approved template — WhatsApp cannot send free-form text outside an active conversation.');
    }
    throw new BadRequestException('Use "Send Test Email" on the Email Templates page for the email channel.');
  }
}
