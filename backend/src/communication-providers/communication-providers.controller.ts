import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunicationProvidersService, UpsertCommunicationProviderDto } from './communication-providers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('communication-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communication-providers')
export class CommunicationProvidersController {
  constructor(private svc: CommunicationProvidersService) {}

  private assertAdmin(user: any) {
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get()
  list(@Query('channel') channel: string, @CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.svc.list(user.organizationId, channel);
  }

  @Post()
  create(@Body() dto: UpsertCommunicationProviderDto, @CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.svc.create(user.organizationId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertCommunicationProviderDto>, @CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.svc.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.svc.remove(id, user.organizationId);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.svc.testConnection(id, user.organizationId);
  }

  @Post(':id/send-test')
  sendTest(@Param('id') id: string, @Body() body: { destination: string; message?: string }, @CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.svc.sendTest(id, user.organizationId, body.destination, body.message);
  }
}
