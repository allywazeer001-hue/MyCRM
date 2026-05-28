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
exports.UserPreferencesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UserPreferencesService = class UserPreferencesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(userId, key) {
        const pref = await this.prisma.userPreference.findUnique({
            where: { userId_key: { userId, key } },
        });
        return pref ? { key: pref.key, value: pref.value } : null;
    }
    async set(userId, key, value) {
        return this.prisma.userPreference.upsert({
            where: { userId_key: { userId, key } },
            create: { userId, key, value },
            update: { value },
        });
    }
    async remove(userId, key) {
        await this.prisma.userPreference.deleteMany({ where: { userId, key } });
        return { success: true };
    }
};
exports.UserPreferencesService = UserPreferencesService;
exports.UserPreferencesService = UserPreferencesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserPreferencesService);
//# sourceMappingURL=user-preferences.service.js.map