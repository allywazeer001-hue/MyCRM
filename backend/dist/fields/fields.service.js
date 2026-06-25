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
exports.FieldsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FieldsService = class FieldsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(moduleId, orgId, data) {
        const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        const maxOrder = await this.prisma.field.aggregate({ where: { moduleId }, _max: { order: true } });
        const order = (maxOrder._max.order ?? -1) + 1;
        const { options, ...fieldData } = data;
        const JSON_FIELDS = ['settings', 'validation', 'conditionalLogic'];
        for (const key of JSON_FIELDS) {
            if (key in fieldData && typeof fieldData[key] === 'object' && fieldData[key] !== null) {
                fieldData[key] = JSON.stringify(fieldData[key]);
            }
        }
        const field = await this.prisma.field.create({
            data: { ...fieldData, moduleId, order },
        });
        if (options?.length) {
            await this.prisma.fieldOption.createMany({
                data: options.map((opt, i) => ({ ...opt, fieldId: field.id, order: i })),
            });
        }
        return this.prisma.field.findUnique({ where: { id: field.id }, include: { options: true } });
    }
    async findByModule(moduleId, orgId) {
        const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        return this.prisma.field.findMany({
            where: { moduleId, isActive: true },
            include: { options: true },
            orderBy: { order: 'asc' },
        });
    }
    async update(id, orgId, data) {
        const field = await this.prisma.field.findFirst({
            where: { id },
            include: { module: true },
        });
        if (!field || field.module.organizationId !== orgId)
            throw new common_1.NotFoundException('Field not found');
        const { options, replaceExisting, ...fieldData } = data;
        const JSON_FIELDS = ['settings', 'validation', 'conditionalLogic'];
        for (const key of JSON_FIELDS) {
            if (key in fieldData && typeof fieldData[key] === 'object' && fieldData[key] !== null) {
                fieldData[key] = JSON.stringify(fieldData[key]);
            }
        }
        if (options !== undefined) {
            if (replaceExisting !== false) {
                await this.prisma.fieldOption.deleteMany({ where: { fieldId: id } });
                if (options?.length) {
                    await this.prisma.fieldOption.createMany({
                        data: options.map((opt, i) => ({ ...opt, fieldId: id, order: i })),
                    });
                }
            }
            else {
                const maxOrder = await this.prisma.fieldOption.aggregate({ where: { fieldId: id }, _max: { order: true } });
                const startOrder = (maxOrder._max.order ?? -1) + 1;
                if (options?.length) {
                    await this.prisma.fieldOption.createMany({
                        data: options.map((opt, i) => ({ ...opt, fieldId: id, order: startOrder + i })),
                    });
                }
            }
        }
        return this.prisma.field.update({ where: { id }, data: fieldData, include: { options: true } });
    }
    async reorder(moduleId, orgId, fieldIds) {
        const mod = await this.prisma.dynamicModule.findFirst({ where: { id: moduleId, organizationId: orgId } });
        if (!mod)
            throw new common_1.NotFoundException('Module not found');
        await Promise.all(fieldIds.map((fId, index) => this.prisma.field.update({ where: { id: fId }, data: { order: index } })));
        return { success: true };
    }
    async remove(id, orgId) {
        const field = await this.prisma.field.findFirst({ where: { id }, include: { module: true } });
        if (!field || field.module.organizationId !== orgId)
            throw new common_1.NotFoundException('Field not found');
        return this.prisma.field.update({ where: { id }, data: { isActive: false } });
    }
};
exports.FieldsService = FieldsService;
exports.FieldsService = FieldsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FieldsService);
//# sourceMappingURL=fields.service.js.map