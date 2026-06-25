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

  // userId → socketId (last known socket for that user)
  private userSockets = new Map<string, string>();

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    for (const [uid, sid] of this.userSockets.entries()) {
      if (sid === client.id) { this.userSockets.delete(uid); break; }
    }
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

  @SubscribeMessage('join-user')
  handleJoinUser(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    client.join(`user:${userId}`);
    this.userSockets.set(userId, client.id);
    return { event: 'joined', data: `user:${userId}` };
  }

  @SubscribeMessage('chat:join')
  handleChatJoin(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.join(`chat:${conversationId}`);
    return { event: 'chat:joined', data: conversationId };
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; isTyping: boolean },
  ) {
    // Relay to everyone else in the room (not the sender)
    client.to(`chat:${data.conversationId}`).emit('chat:typing', data);
  }

  @SubscribeMessage('chat:read')
  handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; lastReadAt: string },
  ) {
    // Relay read receipt to everyone else in the conversation
    client.to(`chat:${data.conversationId}`).emit('chat:read', data);
  }

  emitToOrg(orgId: string, event: string, data: any) {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  emitToModule(moduleId: string, event: string, data: any) {
    this.server.to(`module:${moduleId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /** Emit to conversation room — excluding the sender's socket so they don't get their own message. */
  emitToConversation(conversationId: string, event: string, data: any, excludeSenderId?: string) {
    const room = `chat:${conversationId}`;
    const senderSocketId = excludeSenderId ? this.userSockets.get(excludeSenderId) : undefined;
    if (senderSocketId) {
      // Socket.IO v4: .except() filters out the sender without needing the Socket object
      this.server.to(room).except(senderSocketId).emit(event, data);
    } else {
      this.server.to(room).emit(event, data);
    }
  }
}
