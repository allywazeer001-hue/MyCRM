import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestsService } from './requests.service';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly svc: RequestsService) {}

  @Get()           list(@Query() q: any, @CurrentUser() u: any)                              { return this.svc.list(u.organizationId, u.id, q); }
  @Get('queue')    queue(@CurrentUser() u: any)                                              { return this.svc.getMyQueue(u.organizationId, u.id); }
  @Get(':id')      get(@Param('id') id: string, @CurrentUser() u: any)                      { return this.svc.get(id, u.organizationId); }
  @Post()          create(@Body() b: any, @CurrentUser() u: any)                            { return this.svc.create(u.organizationId, u.id, b); }
  @Patch(':id')    update(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any)  { return this.svc.update(id, u.organizationId, u.id, b); }
  @Delete(':id')   remove(@Param('id') id: string, @CurrentUser() u: any)                  { return this.svc.remove(id, u.organizationId); }

  @Post(':id/actions')  executeAction(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.executeAction(id, u.organizationId, u.id, b); }
  @Post(':id/comments') addComment(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any)   { return this.svc.addComment(id, u.organizationId, u.id, b.content); }
}
