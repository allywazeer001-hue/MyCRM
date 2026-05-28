import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('relationships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relationships')
export class RelationshipsController {
  constructor(private svc: RelationshipsService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, body);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId);
  }

  @Get('module/:moduleId')
  findByModule(@Param('moduleId') moduleId: string, @CurrentUser() user: any) {
    return this.svc.findByModule(moduleId, user.organizationId);
  }
}
