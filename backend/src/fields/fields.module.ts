import { Module } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';
import { FieldUsageService } from './field-usage.service';

@Module({
  controllers: [FieldsController],
  providers: [FieldsService, FieldUsageService],
  exports: [FieldsService, FieldUsageService],
})
export class FieldsModule {}
