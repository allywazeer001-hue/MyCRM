import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'records');
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
  }

  async uploadFile(
    orgId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (file.size > MAX_SIZE) {
      throw new Error('File exceeds 25 MB limit');
    }

    const dir = path.join(UPLOAD_BASE, orgId);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // URL is routed through the Next.js proxy via /api/v1/files/serve/...
    const url = `/api/v1/files/serve/${orgId}/${encodeURIComponent(fileName)}`;
    return { url, filename: fileName, originalName: file.originalname, size: file.size, mimeType: file.mimetype };
  }

  serveFile(orgId: string, filename: string) {
    const filePath = path.join(UPLOAD_BASE, orgId, decodeURIComponent(filename));
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found');
    // Prevent path traversal
    const realPath = fs.realpathSync(filePath);
    const realBase = fs.realpathSync(UPLOAD_BASE);
    if (!realPath.startsWith(realBase)) throw new NotFoundException('File not found');
    return { filePath: realPath, filename: path.basename(realPath) };
  }

  async create(orgId: string, userId: string, data: any) {
    return this.prisma.file.create({ data: { ...data, organizationId: orgId, uploadedById: userId } });
  }

  async findByRecord(recordId: string) {
    return this.prisma.file.findMany({ where: { recordId } });
  }
}
