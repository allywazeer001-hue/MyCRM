import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ConnectedAppsService } from './connected-apps.service';
import { PairRequestDto } from './dto/pair-request.dto';

// Public — called by the EXTERNAL app itself (or its admin, typing the code
// in), not a CRM user session, and the caller doesn't hold any client
// credentials yet — that's exactly what this endpoint hands out. Brute-forcing
// a 6-digit code is the one real risk here, so this is throttled hard on top
// of the per-code attempt lockout in ConnectedAppsService.redeemPairingCode.
@ApiTags('connected-apps')
@UseGuards(ThrottlerGuard)
@Controller('connected-apps')
export class PairingController {
  constructor(private service: ConnectedAppsService) {}

  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @Post('pair')
  pair(@Body() dto: PairRequestDto) {
    return this.service.redeemPairingCode(dto.pairingCode);
  }
}
