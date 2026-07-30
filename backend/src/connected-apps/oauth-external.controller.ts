import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConnectedAppsService } from './connected-apps.service';
import { TokenExchangeDto, RevokeTokenDto } from './dto/token-exchange.dto';

// Public — authenticated by client_id/client_secret in the body, not a CRM
// user session. This is the standard OAuth 2.1 authorization-code token
// endpoint for connected apps (distinct from /auth/*, which is end-user login).
@ApiTags('connected-apps')
@UseGuards(ThrottlerGuard)
@Controller('oauth/external')
export class OauthExternalController {
  constructor(private service: ConnectedAppsService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('token')
  async token(@Body() dto: TokenExchangeDto) {
    if (dto.grant_type === 'authorization_code') {
      if (!dto.code) throw new BadRequestException('code is required for authorization_code grant');
      return this.service.exchangeAuthorizationCode(dto.client_id, dto.client_secret, dto.code);
    }
    if (!dto.refresh_token) throw new BadRequestException('refresh_token is required for refresh_token grant');
    return this.service.refreshAccessToken(dto.client_id, dto.client_secret, dto.refresh_token);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('revoke')
  async revoke(@Body() dto: RevokeTokenDto) {
    return this.service.revoke(dto.client_id, dto.client_secret, dto.token);
  }
}
