"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalleryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = require("fs");
const path = require("path");
const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'gallery');
const MAX_SIZE = 50 * 1024 * 1024;
const GALLERY_CATEGORIES = [
    'Publications',
    'Events',
    'Learning Materials',
    'Marketing Assets',
    'Reports',
    'General Documents',
];
let GalleryService = class GalleryService {
    constructor(prisma) {
        this.prisma = prisma;
        fs.mkdirSync(UPLOAD_BASE, { recursive: true });
    }
    async uploadFile(orgId, userId, file, meta) {
        if (file.size > MAX_SIZE)
            throw new common_1.BadRequestException('File exceeds 50 MB limit');
        const dir = path.join(UPLOAD_BASE, orgId);
        fs.mkdirSync(dir, { recursive: true });
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const filePath = path.join(dir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        const fileUrl = `/api/v1/gallery/serve/${orgId}/${encodeURIComponent(fileName)}`;
        const tags = meta.tags ? JSON.parse(meta.tags) : [];
        const category = GALLERY_CATEGORIES.includes(meta.category ?? '') ? meta.category : 'General Documents';
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
    async findAll(orgId, query) {
        const where = { organizationId: orgId, isArchived: query.archived === 'true' };
        if (query.category)
            where.category = query.category;
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
    async findOne(orgId, id) {
        const file = await this.prisma.galleryFile.findFirst({ where: { id, organizationId: orgId } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        return file;
    }
    async update(orgId, id, data) {
        await this.findOne(orgId, id);
        return this.prisma.galleryFile.update({ where: { id }, data });
    }
    async archive(orgId, id) {
        await this.findOne(orgId, id);
        return this.prisma.galleryFile.update({ where: { id }, data: { isArchived: true } });
    }
    async unarchive(orgId, id) {
        await this.findOne(orgId, id);
        return this.prisma.galleryFile.update({ where: { id }, data: { isArchived: false } });
    }
    async delete(orgId, id) {
        await this.findOne(orgId, id);
        return this.prisma.galleryFile.delete({ where: { id } });
    }
    serveFile(orgId, filename) {
        const filePath = path.join(UPLOAD_BASE, orgId, decodeURIComponent(filename));
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('File not found');
        const realPath = fs.realpathSync(filePath);
        const realBase = fs.realpathSync(UPLOAD_BASE);
        if (!realPath.startsWith(realBase))
            throw new common_1.NotFoundException('File not found');
        return { filePath: realPath, filename: path.basename(realPath) };
    }
    async trackDownload(id) {
        return this.prisma.galleryFile.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        });
    }
    async getStats(orgId) {
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
};
exports.GalleryService = GalleryService;
exports.GalleryService = GalleryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GalleryService);
//# sourceMappingURL=gallery.service.js.map