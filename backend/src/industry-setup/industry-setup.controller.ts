import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IndustrySetupService } from './industry-setup.service';

@Controller('industry-setup')
@UseGuards(JwtAuthGuard)
export class IndustrySetupController {
  constructor(private readonly service: IndustrySetupService) {}

  @Get('blueprints')
  getBlueprintList() {
    return this.service.getBlueprintList();
  }

  @Get('blueprints/:key')
  getBlueprintPreview(@Param('key') key: string) {
    return this.service.getBlueprintPreview(key);
  }

  @Get('status')
  getStatus(@CurrentUser() user: any) {
    return this.service.getSetupStatus(user.organizationId);
  }

  @Post('install')
  install(
    @CurrentUser() user: any,
    @Body() body: { industryKey: string; mode: 'blueprint' | 'scratch' },
  ) {
    return this.service.install(user.organizationId, body.industryKey, body.mode);
  }

  @Post('sync')
  syncFields(@CurrentUser() user: any) {
    return this.service.syncBlueprintFields(user.organizationId);
  }
}
