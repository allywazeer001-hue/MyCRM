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
exports.PortalSectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PortalSectionService = class PortalSectionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listSections(orgId, moduleConfigId, pageId) {
        const where = { organizationId: orgId };
        if (moduleConfigId)
            where.portalModuleConfigId = moduleConfigId;
        if (pageId)
            where.portalPageId = pageId;
        return this.prisma.portalSection.findMany({
            where,
            include: {
                fields: {
                    where: { status: 'ACTIVE' },
                    orderBy: { order: 'asc' },
                    select: { id: true, label: true, fieldKey: true, fieldType: true, isVisible: true },
                },
            },
            orderBy: { order: 'asc' },
        });
    }
    async createSection(orgId, dto) {
        return this.prisma.portalSection.create({
            data: {
                organizationId: orgId,
                portalModuleConfigId: dto.portalModuleConfigId ?? null,
                portalPageId: dto.portalPageId ?? null,
                label: dto.label,
                type: dto.type ?? 'section',
                icon: dto.icon ?? null,
                order: dto.order ?? 0,
                columnIndex: dto.columnIndex ?? 0,
                isCollapsible: dto.isCollapsible ?? false,
                isVisible: dto.isVisible ?? true,
                isAdminOnly: dto.isAdminOnly ?? false,
                status: 'DRAFT',
            },
        });
    }
    async updateSection(orgId, sectionId, dto) {
        const section = await this.prisma.portalSection.findFirst({ where: { id: sectionId, organizationId: orgId } });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        return this.prisma.portalSection.update({ where: { id: sectionId }, data: dto });
    }
    async deleteSection(orgId, sectionId) {
        const section = await this.prisma.portalSection.findFirst({ where: { id: sectionId, organizationId: orgId } });
        if (!section)
            throw new common_1.NotFoundException('Section not found');
        await this.prisma.portalField.updateMany({
            where: { sectionId, organizationId: orgId },
            data: { sectionId: null },
        });
        await this.prisma.portalSection.delete({ where: { id: sectionId } });
        return { success: true };
    }
    async reorderSections(orgId, orderedIds) {
        await Promise.all(orderedIds.map((id, index) => this.prisma.portalSection.updateMany({ where: { id, organizationId: orgId }, data: { order: index } })));
        return { success: true };
    }
};
exports.PortalSectionService = PortalSectionService;
exports.PortalSectionService = PortalSectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalSectionService);
//# sourceMappingURL=portal-section.service.js.map