import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';
export declare class MessagesService {
    private prisma;
    private gateway;
    constructor(prisma: PrismaService, gateway: AppGateway);
    getContacts(userId: string, orgId: string): Promise<{
        firstName: string;
        lastName: string;
        id: string;
        avatar: string;
        jobTitle: string;
        status: string;
    }[]>;
    getConversations(userId: string, orgId: string): Promise<{
        lastMessage: {
            id: string;
            createdAt: Date;
            deletedAt: Date;
            content: string;
            conversationId: string;
            senderId: string;
            sender: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        };
        myLastReadAt: Date;
        participants: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
                jobTitle: string;
            };
        } & {
            id: string;
            userId: string;
            conversationId: string;
            lastReadAt: Date | null;
            joinedAt: Date;
        })[];
        messages: {
            id: string;
            createdAt: Date;
            deletedAt: Date;
            content: string;
            conversationId: string;
            senderId: string;
            sender: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        }[];
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        createdById: string;
        isGroup: boolean;
    }[]>;
    getOrCreateDirect(userId: string, targetUserId: string, orgId: string): Promise<{
        participants: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
                jobTitle: string;
            };
        } & {
            id: string;
            userId: string;
            conversationId: string;
            lastReadAt: Date | null;
            joinedAt: Date;
        })[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        createdById: string;
        isGroup: boolean;
    }>;
    createGroup(userId: string, orgId: string, name: string, participantIds: string[]): Promise<{
        participants: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
                jobTitle: string;
            };
        } & {
            id: string;
            userId: string;
            conversationId: string;
            lastReadAt: Date | null;
            joinedAt: Date;
        })[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string | null;
        createdById: string;
        isGroup: boolean;
    }>;
    getMessages(conversationId: string, userId: string, cursor?: string): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            deletedAt: Date;
            content: string;
            conversationId: string;
            senderId: string;
            sender: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        }[];
        hasMore: boolean;
    }>;
    sendMessage(conversationId: string, senderId: string, orgId: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date;
        content: string;
        conversationId: string;
        senderId: string;
        sender: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
    }>;
    markRead(conversationId: string, userId: string): Promise<{
        ok: boolean;
    }>;
    deleteMessage(messageId: string, userId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        content: string;
        conversationId: string;
        senderId: string;
    }>;
    private assertParticipant;
}
