import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private svc: FilesService) {}

  @Get('record/:recordId')
  findByRecord(@Param('recordId') recordId: string) { return this.svc.findByRecord(recordId); }
}
