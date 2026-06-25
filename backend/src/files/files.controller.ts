import {
  Controller, Get, Post, Param, UseGuards,
  UseInterceptors, UploadedFile, Res, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as mime from 'mime-types';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('files')
export class FilesController {
  constructor(private svc: FilesService) {}

  // ── Upload a file (auth required) ─────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: any,
    @CurrentUser() user: any,
  ) {
    return this.svc.uploadFile(user.organizationId, user.id, file);
  }

  // ── Serve an uploaded file (no auth — URL is unguessable by design) ───────
  @Get('serve/:orgId/:filename')
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
      'Cache-Control': 'private, max-age=86400',
    });
    return new StreamableFile(fs.createReadStream(filePath));
  }

  // ── List files for a record (auth required) ───────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('record/:recordId')
  findByRecord(@Param('recordId') recordId: string) {
    return this.svc.findByRecord(recordId);
  }
}
