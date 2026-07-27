import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_BASE = process.env.PORTAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'portal');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class PortalDocumentService {
  constructor(private prisma: PrismaService) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
  }

  async uploadDocument(
    portalUserId: string,
    orgId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    dto: { recordId?: string; moduleId?: string; fieldKey?: string },
  ) {
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 10 MB limit');

    const dir = path.join(UPLOAD_BASE, orgId, portalUserId);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const doc = await this.prisma.portalDocument.create({
      data: {
        organizationId: orgId,
        portalUserId,
        recordId: dto.recordId ?? null,
        moduleId: dto.moduleId ?? null,
        fieldKey: dto.fieldKey ?? null,
        fileName,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: `uploads/portal/${orgId}/${portalUserId}/${fileName}`,
      },
    });
    return doc;
  }

  async listDocuments(portalUserId: string) {
    return this.prisma.portalDocument.findMany({
      where: { portalUserId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fileName: true, originalName: true,
        fileSize: true, mimeType: true, filePath: true,
        fieldKey: true, createdAt: true,
      },
    });
  }

  async deleteDocument(portalUserId: string, docId: string) {
    const doc = await this.prisma.portalDocument.findFirst({ where: { id: docId, portalUserId } });
    if (!doc) throw new NotFoundException('Document not found');

    const abs = path.join(UPLOAD_BASE, doc.organizationId, doc.portalUserId, doc.fileName);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);

    await this.prisma.portalDocument.update({ where: { id: docId }, data: { status: 'DELETED' } });
    return { success: true };
  }

  // Admin: all docs for an org
  async listOrgDocuments(orgId: string, portalUserId?: string) {
    return this.prisma.portalDocument.findMany({
      where: { organizationId: orgId, status: 'ACTIVE', ...(portalUserId ? { portalUserId } : {}) },
      include: {
        portalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
