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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_gateway_1 = require("../websocket/app.gateway");
let NotificationsService = class NotificationsService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
    }
    async create(userId, orgId, data) {
        const notif = await this.prisma.notification.create({ data: { userId, organizationId: orgId, ...data } });
        const unreadCount = await this.prisma.notification.count({ where: { userId, isRead: false } });
        this.gateway.emitToUser(userId, 'notification:new', { ...notif, unreadCount });
        return notif;
    }
    async findAll(userId, orgId) {
        return this.prisma.notification.findMany({
            where: { userId, organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async markRead(id, _userId) {
        return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
    }
    async markAllRead(userId) {
        return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({ where: { userId, isRead: false } });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_gateway_1.AppGateway])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map