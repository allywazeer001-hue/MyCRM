import { Module } from '@nestjs/common';
import { FieldRulesService } from './field-rules.service';
import { FieldRulesController } from './field-rules.controller';

@Module({
  controllers: [FieldRulesController],
  providers: [FieldRulesService],
  exports: [FieldRulesService],
})
export class FieldRulesModule {}
