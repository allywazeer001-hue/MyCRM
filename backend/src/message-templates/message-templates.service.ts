import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertMessageTemplateDto {
  name: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';
  category?: string;
  subject?: string;
  body?: string;
  whatsappTemplateName?: string;
  whatsappTemplateLanguage?: string;
  variables?: { key: string; label: string }[];
  status?: string;
}

@Injectable()
export class MessageTemplatesService {
  constructor(private prisma: PrismaService) {}

  list(organizationId: string, channel?: string) {
    return this.prisma.messageTemplate.findMany({
      where: { organizationId, ...(channel ? { channel: channel as any } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const tpl = await this.prisma.messageTemplate.findFirst({ where: { id, organizationId } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  create(organizationId: string, createdById: string, dto: UpsertMessageTemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        organizationId,
        createdById,
        name: dto.name,
        channel: dto.channel,
        category: dto.category,
        subject: dto.subject,
        body: dto.body,
        whatsappTemplateName: dto.whatsappTemplateName,
        whatsappTemplateLanguage: dto.whatsappTemplateLanguage,
        variables: (dto.variables ?? []) as any,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, organizationId: string, dto: Partial<UpsertMessageTemplateDto>) {
    await this.findOne(id, organizationId);
    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.whatsappTemplateName !== undefined ? { whatsappTemplateName: dto.whatsappTemplateName } : {}),
        ...(dto.whatsappTemplateLanguage !== undefined ? { whatsappTemplateLanguage: dto.whatsappTemplateLanguage } : {}),
        ...(dto.variables !== undefined ? { variables: dto.variables as any } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.messageTemplate.delete({ where: { id } });
    return { success: true };
  }
}
