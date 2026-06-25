import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'gallery');
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const GALLERY_CATEGORIES = [
  'Publications',
  'Events',
  'Learning Materials',
  'Marketing Assets',
  'Reports',
  'General Documents',
];

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
  }

  async uploadFile(
    orgId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: { name?: string; description?: string; category?: string; tags?: string },
  ) {
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 50 MB limit');

    const dir = path.join(UPLOAD_BASE, orgId);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const fileUrl = `/api/v1/gallery/serve/${orgId}/${encodeURIComponent(fileName)}`;
    const tags = meta.tags ? JSON.parse(meta.tags) : [];
    const category = GALLERY_CATEGORIES.includes(meta.category ?? '') ? meta.category! : 'General Documents';

    return this.prisma.galleryFile.create({
      data: {
        organizationId: orgId,
        uploadedById: userId,
        name: meta.name || file.originalname,
        originalName: file.originalname,
        description: meta.description,
        fileUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        category,
        tags,
      },
    });
  }

  async findAll(
    orgId: string,
    query: { category?: string; search?: string; archived?: string },
  ) {
    const where: any = { organizationId: orgId, isArchived: query.archived === 'true' };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }
    return this.prisma.galleryFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const file = await this.prisma.galleryFile.findFirst({ where: { id, organizationId: orgId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async update(orgId: string, id: string, data: Partial<{ name: string; description: string; category: string; tags: any[] }>) {
    await this.findOne(orgId, id);
    return this.prisma.galleryFile.update({ where: { id }, data });
  }

  async archive(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.galleryFile.update({ where: { id }, data: { isArchived: true } });
  }

  async unarchive(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.galleryFile.update({ where: { id }, data: { isArchived: false } });
  }

  async delete(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.galleryFile.delete({ where: { id } });
  }

  serveFile(orgId: string, filename: string) {
    const filePath = path.join(UPLOAD_BASE, orgId, decodeURIComponent(filename));
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found');
    const realPath = fs.realpathSync(filePath);
    const realBase = fs.realpathSync(UPLOAD_BASE);
    if (!realPath.startsWith(realBase)) throw new NotFoundException('File not found');
    return { filePath: realPath, filename: path.basename(realPath) };
  }

  async trackDownload(id: string) {
    return this.prisma.galleryFile.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  async getStats(orgId: string) {
    const [total, archived, byCategory] = await Promise.all([
      this.prisma.galleryFile.count({ where: { organizationId: orgId, isArchived: false } }),
      this.prisma.galleryFile.count({ where: { organizationId: orgId, isArchived: true } }),
      this.prisma.galleryFile.groupBy({
        by: ['category'],
        where: { organizationId: orgId, isArchived: false },
        _count: { id: true },
      }),
    ]);

    const sizeAgg = await this.prisma.galleryFile.aggregate({
      where: { organizationId: orgId, isArchived: false },
      _sum: { fileSize: true },
    });

    const mostDownloaded = await this.prisma.galleryFile.findMany({
      where: { organizationId: orgId, isArchived: false, downloadCount: { gt: 0 } },
      orderBy: { downloadCount: 'desc' },
      take: 5,
    });

    const recentlyUploaded = await this.prisma.galleryFile.findMany({
      where: { organizationId: orgId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      total,
      archived,
      storageBytes: sizeAgg._sum.fileSize ?? 0,
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count.id })),
      mostDownloaded,
      recentlyUploaded,
    };
  }

  getCategories() {
    return GALLERY_CATEGORIES;
  }
}
