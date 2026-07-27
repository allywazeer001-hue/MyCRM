import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PivotService } from './pivot.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('pivot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pivot')
export class PivotController {
  constructor(private svc: PivotService) {}

  @Get(':moduleId/data')
  getData(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.svc.getData(moduleId, user.organizationId);
  }
}
