import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private service: MessagesService) {}

  @Get('contacts')
  getContacts(@CurrentUser() user: any) {
    return this.service.getContacts(user.id, user.organizationId);
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: any) {
    return this.service.getConversations(user.id, user.organizationId);
  }

  @Post('conversations/direct')
  getOrCreateDirect(@CurrentUser() user: any, @Body() body: { targetUserId: string }) {
    return this.service.getOrCreateDirect(user.id, body.targetUserId, user.organizationId);
  }

  @Post('conversations/group')
  createGroup(@CurrentUser() user: any, @Body() body: { name: string; participantIds: string[] }) {
    return this.service.createGroup(user.id, user.organizationId, body.name, body.participantIds);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.getMessages(id, user.id, cursor);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return this.service.sendMessage(id, user.id, user.organizationId, body.content);
  }

  @Patch('conversations/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.markRead(id, user.id);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deleteMessage(id, user.id);
  }
}
