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
var ModulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ModulesService = ModulesService_1 = class ModulesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ModulesService_1.name);
    }
    async create(orgId, dto) {
        return this.prisma.dynamicModule.create({
            data: { ...dto, organizationId: orgId },
            include: { fields: { orderBy: { order: 'asc' } } },
        });
    }
    async findAllPlatform() {
        try {
            return await this.prisma.dynamicModule.findMany({
                where: { isActive: true },
                include: {
                    fields: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                        include: { options: { orderBy: { order: 'asc' } } },
                    },
                    _count: { select: { fields: true, forms: true, records: true } },
                },
                orderBy: { order: 'asc' },
            });
        }
        catch (err) {
            this.logger.error('findAllPlatform modules error:', err);
            return [];
        }
    }
    async findAll(orgId) {
        try {
            return await this.prisma.dynamicModule.findMany({
                where: { organizationId: orgId, isActive: true },
                include: {
                    fields: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                        include: { options: { orderBy: { order: 'asc' } } },
                    },
                    _count: { select: { fields: true, forms: true, records: true } },
                },
                orderBy: { order: 'asc' },
            });
        }
        catch (err) {
            this.logger.error('findAll modules error:', err);
            return [];
        }
    }
    async findOne(id, orgId) {
        try {
            const where = orgId ? { id, organizationId: orgId } : { id };
            const mod = await this.prisma.dynamicModule.findFirst({
                where,
                include: {
                    fields: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                        include: { options: { orderBy: { order: 'asc' } } },
                    },
                },
            });
            if (!mod)
                throw new common_1.NotFoundException('Module not found');
            return mod;
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            this.logger.error(`findOne module ${id} error:`, err);
            throw new common_1.InternalServerErrorException('Failed to load module. Please try again or contact your administrator.');
        }
    }
    async findBySlug(slug, orgId) {
        try {
            const where = orgId ? { slug, organizationId: orgId, isActive: true } : { slug, isActive: true };
            const mod = await this.prisma.dynamicModule.findFirst({
                where,
                include: {
                    fields: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                        include: { options: { orderBy: { order: 'asc' } } },
                    },
                },
            });
            if (!mod)
                throw new common_1.NotFoundException('Module not found');
            return mod;
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException)
                throw err;
            this.logger.error(`findBySlug module ${slug} error:`, err);
            throw new common_1.InternalServerErrorException('Failed to load module');
        }
    }
    async update(id, orgId, dto) {
        try {
            await this.findOne(id, orgId);
            return await this.prisma.dynamicModule.update({
                where: { id },
                data: dto,
                include: {
                    fields: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                        include: { options: { orderBy: { order: 'asc' } } },
                    },
                },
            });
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException || err instanceof common_1.InternalServerErrorException)
                throw err;
            this.logger.error(`update module ${id} error:`, err);
            throw new common_1.InternalServerErrorException('Failed to update module');
        }
    }
    async remove(id, orgId) {
        await this.findOne(id, orgId);
        return this.prisma.dynamicModule.update({ where: { id }, data: { isActive: false } });
    }
};
exports.ModulesService = ModulesService;
exports.ModulesService = ModulesService = ModulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ModulesService);
//# sourceMappingURL=modules.service.js.map