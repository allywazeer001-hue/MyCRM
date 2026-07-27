import {
  Controller, Get, Post, Param, UseGuards,
  UseInterceptors, UploadedFile, Res, StreamableFile, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Readable } from 'stream';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('media')
export class MediaController {
  constructor(private svc: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: any) {
    return this.svc.upload(file);
  }
}

// ── Public — no auth. The bucket itself is private; this route is what makes
// a file reachable by anyone (email clients included), using the backend's
// own stored credentials to fetch it server-side. ────────────────────────────
@Controller('public/media')
export class PublicMediaController {
  constructor(private svc: MediaService) {}

  @Get(':key')
  async serve(@Param('key') key: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    let obj;
    try {
      obj = await this.svc.get(key);
    } catch {
      throw new NotFoundException('File not found');
    }
    res.set({
      'Content-Type': obj.ContentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return new StreamableFile(obj.Body as Readable);
  }
}
