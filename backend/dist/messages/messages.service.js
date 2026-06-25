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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_gateway_1 = require("../websocket/app.gateway");
const USER_MINI = { id: true, firstName: true, lastName: true, avatar: true, jobTitle: true };
const MSG_SELECT = {
    id: true, conversationId: true, senderId: true, content: true, createdAt: true, deletedAt: true,
    sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
};
let MessagesService = class MessagesService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
    }
    async getContacts(userId, orgId) {
        return this.prisma.user.findMany({
            where: { organizationId: orgId, id: { not: userId } },
            select: { ...USER_MINI, status: true },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        });
    }
    async getConversations(userId, orgId) {
        const parts = await this.prisma.conversationParticipant.findMany({
            where: { userId, conversation: { organizationId: orgId } },
            include: {
                conversation: {
                    include: {
                        participants: { include: { user: { select: USER_MINI } } },
                        messages: {
                            where: { deletedAt: null },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: MSG_SELECT,
                        },
                    },
                },
            },
            orderBy: { conversation: { updatedAt: 'desc' } },
        });
        return parts.map(p => {
            const conv = p.conversation;
            return {
                ...conv,
                lastMessage: conv.messages[0] ?? null,
                myLastReadAt: p.lastReadAt,
            };
        });
    }
    async getOrCreateDirect(userId, targetUserId, orgId) {
        const existing = await this.prisma.conversation.findFirst({
            where: {
                organizationId: orgId,
                isGroup: false,
                participants: { some: { userId } },
                AND: [{ participants: { some: { userId: targetUserId } } }],
            },
            include: { participants: { include: { user: { select: USER_MINI } } } },
        });
        if (existing)
            return existing;
        return this.prisma.conversation.create({
            data: {
                organizationId: orgId,
                isGroup: false,
                createdById: userId,
                participants: { create: [{ userId }, { userId: targetUserId }] },
            },
            include: { participants: { include: { user: { select: USER_MINI } } } },
        });
    }
    async createGroup(userId, orgId, name, participantIds) {
        const allIds = Array.from(new Set([userId, ...participantIds]));
        return this.prisma.conversation.create({
            data: {
                organizationId: orgId,
                isGroup: true,
                name,
                createdById: userId,
                participants: { create: allIds.map(id => ({ userId: id })) },
            },
            include: { participants: { include: { user: { select: USER_MINI } } } },
        });
    }
    async getMessages(conversationId, userId, cursor) {
        await this.assertParticipant(conversationId, userId);
        const take = 40;
        const msgs = await this.prisma.directMessage.findMany({
            where: {
                conversationId,
                deletedAt: null,
                ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            select: MSG_SELECT,
        });
        const hasMore = msgs.length > take;
        return { messages: msgs.slice(0, take).reverse(), hasMore };
    }
    async sendMessage(conversationId, senderId, orgId, content) {
        try {
            await this.assertParticipant(conversationId, senderId);
            const msg = await this.prisma.directMessage.create({
                data: { conversationId, senderId, organizationId: orgId, content },
                select: MSG_SELECT,
            });
            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            });
            try {
                this.gateway.emitToConversation(conversationId, 'chat:message', msg, senderId);
            }
            catch (socketErr) {
                console.error('[sendMessage] socket emit failed (non-fatal):', socketErr?.message);
            }
            return msg;
        }
        catch (err) {
            console.error('[sendMessage] error:', err?.message, '| convId:', conversationId, '| senderId:', senderId);
            throw err;
        }
    }
    async markRead(conversationId, userId) {
        await this.prisma.conversationParticipant.updateMany({
            where: { conversationId, userId },
            data: { lastReadAt: new Date() },
        });
        return { ok: true };
    }
    async deleteMessage(messageId, userId) {
        const msg = await this.prisma.directMessage.findFirst({ where: { id: messageId } });
        if (!msg)
            throw new common_1.NotFoundException('Message not found');
        if (msg.senderId !== userId)
            throw new common_1.ForbiddenException('Not your message');
        return this.prisma.directMessage.update({
            where: { id: messageId },
            data: { deletedAt: new Date() },
        });
    }
    async assertParticipant(conversationId, userId) {
        const p = await this.prisma.conversationParticipant.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
        });
        if (!p)
            throw new common_1.ForbiddenException('Not a participant of this conversation');
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        app_gateway_1.AppGateway])
], MessagesService);
//# sourceMappingURL=messages.service.js.map