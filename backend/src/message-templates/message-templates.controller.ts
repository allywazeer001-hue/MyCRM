import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessageTemplatesService, UpsertMessageTemplateDto } from './message-templates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('message-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('message-templates')
export class MessageTemplatesController {
  constructor(private svc: MessageTemplatesService) {}

  @Get()
  list(@Query('channel') channel: string, @CurrentUser() user: any) {
    return this.svc.list(user.organizationId, channel);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.findOne(id, user.organizationId);
  }

  @Post()
  create(@Body() dto: UpsertMessageTemplateDto, @CurrentUser() user: any) {
    return this.svc.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertMessageTemplateDto>, @CurrentUser() user: any) {
    return this.svc.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.organizationId);
  }
}
