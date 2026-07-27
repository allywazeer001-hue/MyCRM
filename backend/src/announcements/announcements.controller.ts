import { Body, Controller, ForbiddenException, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnnouncementsService, UpdateAnnouncementDto } from './announcements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── Admin — Super Admin only, used by /land-admin ─────────────────────────────
@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcements: AnnouncementsService) {}

  private assertSuperAdmin(user: any) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super Admin access required');
  }

  @Get()
  get(@CurrentUser() user: any) {
    this.assertSuperAdmin(user);
    return this.announcements.getForAdmin();
  }

  @Patch()
  update(@CurrentUser() user: any, @Body() body: UpdateAnnouncementDto) {
    this.assertSuperAdmin(user);
    return this.announcements.upsert(body);
  }

  @Post('unpublish')
  unpublish(@CurrentUser() user: any) {
    this.assertSuperAdmin(user);
    return this.announcements.unpublish();
  }
}

// ── Public — no auth, read by every page (marketing site, CRM, portal) ───────
@ApiTags('announcements')
@Controller('public/announcements')
export class PublicAnnouncementsController {
  constructor(private announcements: AnnouncementsService) {}

  @Get('active')
  getActive() {
    return this.announcements.getActive();
  }
}
