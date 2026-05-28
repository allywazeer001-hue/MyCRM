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
exports.PortalDocumentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = require("fs");
const path = require("path");
const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'portal');
const MAX_SIZE = 10 * 1024 * 1024;
let PortalDocumentService = class PortalDocumentService {
    constructor(prisma) {
        this.prisma = prisma;
        fs.mkdirSync(UPLOAD_BASE, { recursive: true });
    }
    async uploadDocument(portalUserId, orgId, file, dto) {
        if (file.size > MAX_SIZE)
            throw new common_1.BadRequestException('File exceeds 10 MB limit');
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
    async listDocuments(portalUserId) {
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
    async deleteDocument(portalUserId, docId) {
        const doc = await this.prisma.portalDocument.findFirst({ where: { id: docId, portalUserId } });
        if (!doc)
            throw new common_1.NotFoundException('Document not found');
        const abs = path.join(process.cwd(), doc.filePath);
        if (fs.existsSync(abs))
            fs.unlinkSync(abs);
        await this.prisma.portalDocument.update({ where: { id: docId }, data: { status: 'DELETED' } });
        return { success: true };
    }
    async listOrgDocuments(orgId, portalUserId) {
        return this.prisma.portalDocument.findMany({
            where: { organizationId: orgId, status: 'ACTIVE', ...(portalUserId ? { portalUserId } : {}) },
            include: {
                portalUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.PortalDocumentService = PortalDocumentService;
exports.PortalDocumentService = PortalDocumentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalDocumentService);
//# sourceMappingURL=portal-document.service.js.map