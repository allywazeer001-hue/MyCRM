import { Body, Controller, ForbiddenException, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LandingConfigService } from './landing-config.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ── Admin — Super Admin only, used by /land-admin ─────────────────────────────
@ApiTags('landing-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('landing-config')
export class LandingConfigController {
  constructor(private landingConfig: LandingConfigService) {}

  private assertSuperAdmin(user: any) {
    if (user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super Admin access required');
  }

  @Get()
  get(@CurrentUser() user: any) {
    this.assertSuperAdmin(user);
    return this.landingConfig.getForAdmin();
  }

  @Patch()
  update(@CurrentUser() user: any, @Body() body: Record<string, unknown>) {
    this.assertSuperAdmin(user);
    return this.landingConfig.upsert(body);
  }
}

// ── Public — no auth, read by the marketing landing page itself ──────────────
@ApiTags('landing-config')
@Controller('public/landing-config')
export class PublicLandingConfigController {
  constructor(private landingConfig: LandingConfigService) {}

  @Get()
  get() {
    return this.landingConfig.getPublic();
  }
}
