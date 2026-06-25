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
exports.RequestTypesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RequestTypesService = class RequestTypesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(orgId) {
        return this.prisma.requestType.findMany({
            where: { organizationId: orgId },
            include: { blueprint: { select: { id: true, name: true } }, _count: { select: { requests: true } } },
            orderBy: { name: 'asc' },
        });
    }
    get(id, orgId) {
        return this.prisma.requestType.findFirstOrThrow({ where: { id, organizationId: orgId }, include: { blueprint: true } });
    }
    create(orgId, body) {
        return this.prisma.requestType.create({
            data: { name: body.name, description: body.description, icon: body.icon ?? 'FileText', color: body.color ?? '#3b82f6', prefix: (body.prefix ?? 'REQ').toUpperCase(), blueprintId: body.blueprintId ?? null, organizationId: orgId, fields: body.fields ?? [] },
        });
    }
    async update(id, orgId, body) {
        await this.prisma.requestType.findFirstOrThrow({ where: { id, organizationId: orgId } });
        return this.prisma.requestType.update({ where: { id }, data: { name: body.name, description: body.description, icon: body.icon, color: body.color, prefix: body.prefix ? body.prefix.toUpperCase() : undefined, blueprintId: body.blueprintId !== undefined ? body.blueprintId : undefined, fields: body.fields, isActive: body.isActive } });
    }
    async remove(id, orgId) {
        await this.prisma.requestType.findFirstOrThrow({ where: { id, organizationId: orgId } });
        return this.prisma.requestType.delete({ where: { id } });
    }
};
exports.RequestTypesService = RequestTypesService;
exports.RequestTypesService = RequestTypesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RequestTypesService);
//# sourceMappingURL=request-types.service.js.map