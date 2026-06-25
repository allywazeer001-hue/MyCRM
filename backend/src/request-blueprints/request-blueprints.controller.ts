import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestBlueprintsService } from './request-blueprints.service';

@Controller('request-blueprints')
@UseGuards(JwtAuthGuard)
export class RequestBlueprintsController {
  constructor(private readonly svc: RequestBlueprintsService) {}

  @Get()        list(@CurrentUser() u: any)                        { return this.svc.list(u.organizationId); }
  @Get(':id')   get(@Param('id') id: string, @CurrentUser() u: any){ return this.svc.get(id, u.organizationId); }
  @Post()       create(@Body() b: any, @CurrentUser() u: any)      { return this.svc.create(u.organizationId, b); }
  @Patch(':id') update(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.update(id, u.organizationId, b); }
  @Delete(':id')remove(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.remove(id, u.organizationId); }

  @Post(':id/stages')           addStage   (@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.addStage(id, u.organizationId, b); }
  @Patch('stages/:sid')         updateStage(@Param('sid') sid: string, @Body() b: any, @CurrentUser() u: any){ return this.svc.updateStage(sid, u.organizationId, b); }
  @Delete('stages/:sid')        removeStage(@Param('sid') sid: string, @CurrentUser() u: any)               { return this.svc.removeStage(sid, u.organizationId); }
  @Post('stages/:sid/actions')  addAction  (@Param('sid') sid: string, @Body() b: any, @CurrentUser() u: any){ return this.svc.addAction(sid, u.organizationId, b); }
  @Patch('actions/:aid')        updateAction(@Param('aid') aid: string, @Body() b: any, @CurrentUser() u: any){ return this.svc.updateAction(aid, u.organizationId, b); }
  @Delete('actions/:aid')       removeAction(@Param('aid') aid: string, @CurrentUser() u: any)              { return this.svc.removeAction(aid, u.organizationId); }
}
