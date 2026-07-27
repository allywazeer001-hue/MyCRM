import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTemplateDto {
  name: string;
  subject: string;
  body: string;
  design?: object | null;
}

export interface UpdateTemplateDto {
  name?: string;
  subject?: string;
  body?: string;
  design?: object | null;
}

function parseDesign(raw: string | null | undefined): object | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function serializeDesign(design: object | null | undefined): string | null {
  if (design == null) return null;
  try { return JSON.stringify(design); } catch { return null; }
}

@Injectable()
export class EmailTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const rows = await this.prisma.emailTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, subject: true, body: true, design: true, createdAt: true, updatedAt: true },
    });
    return rows.map(r => ({ ...r, design: parseDesign(r.design) }));
  }

  async findOne(id: string, organizationId: string) {
    const t = await this.prisma.emailTemplate.findFirst({ where: { id, organizationId } });
    if (!t) throw new NotFoundException('Template not found');
    return { ...t, design: parseDesign(t.design) };
  }

  async create(organizationId: string, userId: string, data: CreateTemplateDto) {
    const row = await this.prisma.emailTemplate.create({
      data: {
        name: data.name,
        subject: data.subject,
        body: data.body,
        design: serializeDesign(data.design),
        organizationId,
        createdById: userId,
      },
    });
    return { ...row, design: parseDesign(row.design) };
  }

  async update(id: string, organizationId: string, data: UpdateTemplateDto) {
    await this.findOne(id, organizationId);
    const row = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(data.name    !== undefined && { name:    data.name }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body    !== undefined && { body:    data.body }),
        ...('design' in data           && { design:  serializeDesign(data.design) }),
      },
    });
    return { ...row, design: parseDesign(row.design) };
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.emailTemplate.update({ where: { id }, data: { isActive: false } });
  }
}
