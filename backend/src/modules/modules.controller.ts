import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Header } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('modules')
export class ModulesController {
  constructor(private modulesService: ModulesService) {}

  @Post()
  create(@Body() dto: CreateModuleDto, @CurrentUser() user: any) {
    return this.modulesService.create(user.organizationId, dto);
  }

  @Get()
  // Module list changes rarely (only when someone edits schema in Studio) —
  // a short private cache avoids refetching on every page/tab the Sidebar
  // mounts on, without risking noticeably stale data after a real edit.
  @Header('Cache-Control', 'private, max-age=30')
  findAll(@CurrentUser() user: any) {
    // Every user — including SUPER_ADMIN — sees only their own org's modules.
    // Platform-wide module listing lives in the /platform admin routes only.
    return this.modulesService.findAll(user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.modulesService.findOne(id, user.organizationId);
  }

  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string, @CurrentUser() user: any) {
    return this.modulesService.findBySlug(slug, user.organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateModuleDto, @CurrentUser() user: any) {
    return this.modulesService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.modulesService.remove(id, user.organizationId);
  }
}
