import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: any) { return this.svc.findAll(user.id, user.organizationId); }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) { return this.svc.getUnreadCount(user.id); }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.markRead(id, user.id); }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) { return this.svc.markAllRead(user.id); }
}
