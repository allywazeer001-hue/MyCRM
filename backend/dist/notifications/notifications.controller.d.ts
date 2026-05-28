import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private svc;
    constructor(svc: NotificationsService);
    findAll(user: any): Promise<{
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
    unreadCount(user: any): Promise<number>;
    markRead(id: string, user: any): Promise<{
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
    markAllRead(user: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
