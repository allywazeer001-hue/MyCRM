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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(orgId) {
        return this.prisma.user.findMany({
            where: { organizationId: orgId },
            select: {
                id: true, email: true, firstName: true, lastName: true,
                role: true, isActive: true, createdAt: true, avatar: true,
                phone: true, jobTitle: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, orgId) {
        const user = await this.prisma.user.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async update(id, orgId, data) {
        await this.findOne(id, orgId);
        if (data.password)
            data.password = await bcrypt.hash(data.password, 12);
        return this.prisma.user.update({ where: { id }, data });
    }
    async remove(id, orgId) {
        await this.findOne(id, orgId);
        return this.prisma.user.update({ where: { id }, data: { isActive: false } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map