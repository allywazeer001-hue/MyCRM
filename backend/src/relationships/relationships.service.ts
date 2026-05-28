import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelationshipsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, data: any) {
    return this.prisma.relationship.create({ data: { ...data, organizationId: orgId } });
  }

  async findAll(orgId: string) {
    return this.prisma.relationship.findMany({ where: { organizationId: orgId } });
  }

  async findByModule(moduleId: string, orgId: string) {
    return this.prisma.relationship.findMany({
      where: { organizationId: orgId, OR: [{ fromModuleId: moduleId }, { toModuleId: moduleId }] },
      include: { fromModule: true, toModule: true },
    });
  }
}
