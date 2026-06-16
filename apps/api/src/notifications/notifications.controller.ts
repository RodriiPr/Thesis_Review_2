import { Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notifications: NotificationService) {}

  @Get()
  list(@Request() req: { user: { id: string } }) {
    return this.notifications.listByUser(req.user.id);
  }

  @Get('unread-count')
  unreadCount(@Request() req: { user: { id: string } }) {
    return this.notifications.unreadCount(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.notifications.markAsRead(id, req.user.id);
  }

  @Post('read-all')
  markAllRead(@Request() req: { user: { id: string } }) {
    return this.notifications.markAllAsRead(req.user.id);
  }
}
