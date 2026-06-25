import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { EmailsService, SendEmailDto } from './emails.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('emails')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emails')
export class EmailsController {
  constructor(private svc: EmailsService) {}

  @Post('send')
  send(@Body() dto: SendEmailDto, @CurrentUser() user: any) {
    return this.svc.send(user.organizationId, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId);
  }

  @Get('mine')
  findMine(@CurrentUser() user: any) {
    return this.svc.findAll(user.organizationId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }
}
