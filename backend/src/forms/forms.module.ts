import { Module } from '@nestjs/common';
import { FormsService } from './forms.service';
import { FormsController, PublicFormsController } from './forms.controller';

@Module({
  controllers: [FormsController, PublicFormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
