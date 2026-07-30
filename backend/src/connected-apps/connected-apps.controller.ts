import { Body, Controller, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConnectedAppsService } from './connected-apps.service';
import { UpdateScopesDto } from './dto/update-scopes.dto';

@ApiTags('connected-apps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connected-apps')
export class ConnectedAppsController {
  constructor(private service: ConnectedAppsService) {}

  @Get('scope-options')
  scopeOptions(@CurrentUser() user: any) {
    return this.service.listScopeOptions(user.organizationId);
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.listApps(user.organizationId, user.role);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getApp(user.organizationId, user.role, id);
  }

  @Patch(':id/scopes')
  updateScopes(@Param('id') id: string, @Body() dto: UpdateScopesDto, @CurrentUser() user: any) {
    return this.service.updateScopes(user.organizationId, user.role, id, dto.scopes);
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.setStatus(user.organizationId, user.role, id, 'SUSPENDED');
  }

  @Post(':id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.setStatus(user.organizationId, user.role, id, 'ACTIVE');
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.setStatus(user.organizationId, user.role, id, 'REVOKED');
  }

  @Get(':id/tokens')
  tokens(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.listTokens(user.organizationId, user.role, id);
  }

  @Post(':id/tokens/:tokenId/revoke')
  revokeToken(@Param('id') id: string, @Param('tokenId') tokenId: string, @CurrentUser() user: any) {
    return this.service.revokeToken(user.organizationId, user.role, id, tokenId);
  }
}
