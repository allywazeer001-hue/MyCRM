import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, Res, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as mime from 'mime-types';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('gallery')
export class GalleryController {
  constructor(private svc: GalleryService) {}

  @Get('categories')
  getCategories() {
    return this.svc.getCategories();
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.svc.getStats(user.organizationId);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query() query: { category?: string; search?: string; archived?: string },
  ) {
    return this.svc.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.findOne(user.organizationId, id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.svc.uploadFile(user.organizationId, user.id, file, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(user.organizationId, id, body);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.archive(user.organizationId, id);
  }

  @Post(':id/unarchive')
  unarchive(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.unarchive(user.organizationId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.delete(user.organizationId, id);
  }

  @Post(':id/download')
  trackDownload(@Param('id') id: string) {
    return this.svc.trackDownload(id);
  }
}

// Separate controller — no JwtAuthGuard — so browsers can load gallery images directly.
@Controller('gallery/serve')
export class GalleryServeController {
  constructor(private svc: GalleryService) {}

  @Get(':orgId/:filename')
  serveFile(
    @Param('orgId') orgId: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    const { filePath, filename: name } = this.svc.serveFile(orgId, filename);
    const mimeType = (mime.lookup(name) as string | false) || 'application/octet-stream';
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${name}"`,
      'Cache-Control': 'public, max-age=86400',
    });
    return new StreamableFile(fs.createReadStream(filePath));
  }
}
