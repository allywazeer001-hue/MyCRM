import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestTypesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.requestType.findMany({
      where: { organizationId: orgId },
      include: { blueprint: { select: { id: true, name: true } }, _count: { select: { requests: true } } },
      orderBy: { name: 'asc' },
    });
  }

  get(id: string, orgId: string) {
    return this.prisma.requestType.findFirstOrThrow({ where: { id, organizationId: orgId }, include: { blueprint: true } });
  }

  create(orgId: string, body: any) {
    return this.prisma.requestType.create({
      data: { name: body.name, description: body.description, icon: body.icon ?? 'FileText', color: body.color ?? '#3b82f6', prefix: (body.prefix ?? 'REQ').toUpperCase(), blueprintId: body.blueprintId ?? null, organizationId: orgId, fields: body.fields ?? [] },
    });
  }

  async update(id: string, orgId: string, body: any) {
    await this.prisma.requestType.findFirstOrThrow({ where: { id, organizationId: orgId } });
    return this.prisma.requestType.update({ where: { id }, data: { name: body.name, description: body.description, icon: body.icon, color: body.color, prefix: body.prefix ? body.prefix.toUpperCase() : undefined, blueprintId: body.blueprintId !== undefined ? body.blueprintId : undefined, fields: body.fields, isActive: body.isActive } });
  }

  async remove(id: string, orgId: string) {
    await this.prisma.requestType.findFirstOrThrow({ where: { id, organizationId: orgId } });
    return this.prisma.requestType.delete({ where: { id } });
  }
}
