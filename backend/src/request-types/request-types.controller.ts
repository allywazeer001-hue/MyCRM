import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestTypesService } from './request-types.service';

@Controller('request-types')
@UseGuards(JwtAuthGuard)
export class RequestTypesController {
  constructor(private readonly svc: RequestTypesService) {}

  @Get()    list(@CurrentUser() u: any)                         { return this.svc.list(u.organizationId); }
  @Get(':id') get(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.get(id, u.organizationId); }
  @Post()   create(@Body() body: any, @CurrentUser() u: any)   { return this.svc.create(u.organizationId, body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) { return this.svc.update(id, u.organizationId, body); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.remove(id, u.organizationId); }
}
