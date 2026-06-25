import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private userSockets;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinOrg(client: Socket, orgId: string): {
        event: string;
        data: string;
    };
    handleJoinModule(client: Socket, moduleId: string): {
        event: string;
        data: string;
    };
    handleJoinUser(client: Socket, userId: string): {
        event: string;
        data: string;
    };
    handleChatJoin(client: Socket, conversationId: string): {
        event: string;
        data: string;
    };
    handleTyping(client: Socket, data: {
        conversationId: string;
        userId: string;
        isTyping: boolean;
    }): void;
    handleRead(client: Socket, data: {
        conversationId: string;
        userId: string;
        lastReadAt: string;
    }): void;
    emitToOrg(orgId: string, event: string, data: any): void;
    emitToModule(moduleId: string, event: string, data: any): void;
    emitToUser(userId: string, event: string, data: any): void;
    emitToConversation(conversationId: string, event: string, data: any, excludeSenderId?: string): void;
}
