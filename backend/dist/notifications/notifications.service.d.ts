import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
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
    markRead(id: string, userId: string): Promise<{
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
