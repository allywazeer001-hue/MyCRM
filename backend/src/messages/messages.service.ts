import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';

const USER_MINI = { id: true, firstName: true, lastName: true, avatar: true, jobTitle: true };

const MSG_SELECT = {
  id: true, conversationId: true, senderId: true, content: true, createdAt: true, deletedAt: true,
  sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
};

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async getContacts(userId: string, orgId: string) {
    return this.prisma.user.findMany({
      where: { organizationId: orgId, id: { not: userId } },
      select: { ...USER_MINI, status: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getConversations(userId: string, orgId: string) {
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

  async getOrCreateDirect(userId: string, targetUserId: string, orgId: string) {
    // Find an existing non-group conversation where BOTH users are participants
    const existing = await this.prisma.conversation.findFirst({
      where: {
        organizationId: orgId,
        isGroup: false,
        participants: { some: { userId } },
        AND: [{ participants: { some: { userId: targetUserId } } }],
      },
      include: { participants: { include: { user: { select: USER_MINI } } } },
    });
    if (existing) return existing;

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

  async createGroup(userId: string, orgId: string, name: string, participantIds: string[]) {
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

  async getMessages(conversationId: string, userId: string, cursor?: string) {
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

  async sendMessage(conversationId: string, senderId: string, orgId: string, content: string) {
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
      } catch (socketErr) {
        console.error('[sendMessage] socket emit failed (non-fatal):', socketErr?.message);
      }
      return msg;
    } catch (err) {
      console.error('[sendMessage] error:', err?.message, '| convId:', conversationId, '| senderId:', senderId);
      throw err;
    }
  }

  async markRead(conversationId: string, userId: string) {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.directMessage.findFirst({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Not your message');
    return this.prisma.directMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p) throw new ForbiddenException('Not a participant of this conversation');
  }
}
