import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
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
  findAll(@CurrentUser() user: any) {
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
