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
exports.ViewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ViewsService = class ViewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(moduleId, orgId, userId, data) {
        return this.prisma.view.create({ data: { ...data, moduleId, organizationId: orgId, createdById: userId } });
    }
    async findByModule(moduleId, orgId) {
        const views = await this.prisma.view.findMany({
            where: { moduleId, organizationId: orgId },
            orderBy: { updatedAt: 'desc' },
        });
        return [...views.filter(v => v.isPinned), ...views.filter(v => !v.isPinned)];
    }
    async findOne(id, orgId) {
        const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        return view;
    }
    async update(id, orgId, data) {
        const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        return this.prisma.view.update({ where: { id }, data });
    }
    async togglePin(id, orgId) {
        const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        return this.prisma.view.update({ where: { id }, data: { isPinned: !view.isPinned } });
    }
    async remove(id, orgId) {
        const view = await this.prisma.view.findFirst({ where: { id, organizationId: orgId } });
        if (!view)
            throw new common_1.NotFoundException('View not found');
        return this.prisma.view.delete({ where: { id } });
    }
};
exports.ViewsService = ViewsService;
exports.ViewsService = ViewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ViewsService);
//# sourceMappingURL=views.service.js.map