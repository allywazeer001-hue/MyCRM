import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailTemplatesService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, subject: true, body: true, createdAt: true, updatedAt: true },
    });
  }

  async findOne(id: string, organizationId: string) {
    const t = await this.prisma.emailTemplate.findFirst({ where: { id, organizationId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  create(organizationId: string, userId: string, data: { name: string; subject: string; body: string }) {
    return this.prisma.emailTemplate.create({
      data: { ...data, organizationId, createdById: userId },
    });
  }

  async update(id: string, organizationId: string, data: { name?: string; subject?: string; body?: string }) {
    await this.findOne(id, organizationId);
    return this.prisma.emailTemplate.update({ where: { id }, data });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.emailTemplate.update({ where: { id }, data: { isActive: false } });
  }
}
