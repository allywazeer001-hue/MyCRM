import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';
export declare class NotificationsService {
    private prisma;
    private gateway;
    constructor(prisma: PrismaService, gateway: AppGateway);
    create(userId: string, orgId: string, data: {
        title: string;
        message: string;
        type?: string;
        link?: string;
    }): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        userId: string;
        link: string | null;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
    findAll(userId: string, orgId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        userId: string;
        link: string | null;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
    }[]>;
    markRead(id: string, _userId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        userId: string;
        link: string | null;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
    }>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
}
