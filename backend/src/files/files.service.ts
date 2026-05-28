import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, userId: string, data: any) {
    return this.prisma.file.create({ data: { ...data, organizationId: orgId, uploadedById: userId } });
  }

  async findByRecord(recordId: string) {
    return this.prisma.file.findMany({ where: { recordId } });
  }
}
