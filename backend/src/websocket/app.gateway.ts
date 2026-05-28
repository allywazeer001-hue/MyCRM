import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-org')
  handleJoinOrg(@ConnectedSocket() client: Socket, @MessageBody() orgId: string) {
    client.join(`org:${orgId}`);
    return { event: 'joined', data: `org:${orgId}` };
  }

  @SubscribeMessage('join-module')
  handleJoinModule(@ConnectedSocket() client: Socket, @MessageBody() moduleId: string) {
    client.join(`module:${moduleId}`);
    return { event: 'joined', data: `module:${moduleId}` };
  }

  emitToOrg(orgId: string, event: string, data: any) {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  emitToModule(moduleId: string, event: string, data: any) {
    this.server.to(`module:${moduleId}`).emit(event, data);
  }
}
