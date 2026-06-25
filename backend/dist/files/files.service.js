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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = require("fs");
const path = require("path");
const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'records');
const MAX_SIZE = 25 * 1024 * 1024;
let FilesService = class FilesService {
    constructor(prisma) {
        this.prisma = prisma;
        fs.mkdirSync(UPLOAD_BASE, { recursive: true });
    }
    async uploadFile(orgId, userId, file) {
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
        const url = `/api/v1/files/serve/${orgId}/${encodeURIComponent(fileName)}`;
        return { url, filename: fileName, originalName: file.originalname, size: file.size, mimeType: file.mimetype };
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
    async create(orgId, userId, data) {
        return this.prisma.file.create({ data: { ...data, organizationId: orgId, uploadedById: userId } });
    }
    async findByRecord(recordId) {
        return this.prisma.file.findMany({ where: { recordId } });
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FilesService);
//# sourceMappingURL=files.service.js.map