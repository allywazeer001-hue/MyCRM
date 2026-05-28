import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private connectedUsers;
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
    emitToOrg(orgId: string, event: string, data: any): void;
    emitToModule(moduleId: string, event: string, data: any): void;
    emitToUser(userId: string, event: string, data: any): void;
}
