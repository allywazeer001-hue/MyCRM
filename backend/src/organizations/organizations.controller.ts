import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('me')
  getMyOrg(@CurrentUser() user: any) {
    return this.organizationsService.findOne(user.organizationId);
  }

  @Patch('me')
  updateMyOrg(@CurrentUser() user: any, @Body() body: any) {
    return this.organizationsService.update(user.organizationId, body);
  }
}
