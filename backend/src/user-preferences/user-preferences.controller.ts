import { Controller, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('user-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-preferences')
export class UserPreferencesController {
  constructor(private svc: UserPreferencesService) {}

  @Get(':key')
  get(@Param('key') key: string, @CurrentUser() user: any) {
    return this.svc.get(user.id, key);
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() body: { value: any }, @CurrentUser() user: any) {
    return this.svc.set(user.id, key, body.value ?? body);
  }

  @Delete(':key')
  remove(@Param('key') key: string, @CurrentUser() user: any) {
    return this.svc.remove(user.id, key);
  }
}
