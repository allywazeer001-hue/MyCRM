import { MessagesService } from './messages.service';
export declare class MessagesController {
    private service;
    constructor(service: MessagesService);
    getContacts(user: any): Promise<{
        firstName: string;
        lastName: string;
        id: string;
        avatar: string;
        jobTitle: string;
        status: string;
    }[]>;
    getConversations(user: any): Promise<{
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
    getOrCreateDirect(user: any, body: {
        targetUserId: string;
    }): Promise<{
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
    createGroup(user: any, body: {
        name: string;
        participantIds: string[];
    }): Promise<{
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
    getMessages(id: string, user: any, cursor?: string): Promise<{
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
    sendMessage(id: string, user: any, body: {
        content: string;
    }): Promise<{
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
    markRead(id: string, user: any): Promise<{
        ok: boolean;
    }>;
    deleteMessage(id: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        content: string;
        conversationId: string;
        senderId: string;
    }>;
}
