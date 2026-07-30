import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConnectedAppsService } from './connected-apps.service';
import { CreateConnectionRequestDto } from './dto/create-connection-request.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

@ApiTags('connected-apps')
@Controller('connected-apps/requests')
export class ConnectionRequestsController {
  constructor(private service: ConnectedAppsService) {}

  // Public — called by external developer tooling, not a logged-in CRM user.
  // Hard per-IP limit prevents this from becoming a spam/abuse vector.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post()
  submit(@Body() dto: CreateConnectionRequestDto) {
    return this.service.submitRequest(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.service.listRequests(user.organizationId, user.role, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getRequest(user.organizationId, user.role, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveRequestDto, @CurrentUser() user: any) {
    return this.service.approveRequest(user.organizationId, user.id, user.role, id, dto.scopes);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectRequestDto, @CurrentUser() user: any) {
    return this.service.rejectRequest(user.organizationId, user.id, user.role, id, dto.reason);
  }
}
