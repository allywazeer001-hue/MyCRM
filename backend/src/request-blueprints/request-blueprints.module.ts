import { Module } from '@nestjs/common';
import { RequestBlueprintsService } from './request-blueprints.service';
import { RequestBlueprintsController } from './request-blueprints.controller';

@Module({ controllers: [RequestBlueprintsController], providers: [RequestBlueprintsService], exports: [RequestBlueprintsService] })
export class RequestBlueprintsModule {}
