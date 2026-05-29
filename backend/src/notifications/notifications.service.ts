import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async create(userId: string, orgId: string, data: { title: string; message: string; type?: string; link?: string }) {
    const notif = await this.prisma.notification.create({ data: { userId, organizationId: orgId, ...data } });
    const unreadCount = await this.prisma.notification.count({ where: { userId, isRead: false } });
    this.gateway.emitToUser(userId, 'notification:new', { ...notif, unreadCount });
    return notif;
  }

  async findAll(userId: string, orgId: string) {
    return this.prisma.notification.findMany({
      where: { userId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, _userId: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
