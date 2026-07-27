import { Module } from '@nestjs/common';
import { EmailsController, PublicEmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { EmailsScheduler } from './emails.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';

@Module({
  imports: [PrismaModule, EmailTemplatesModule],
  controllers: [EmailsController, PublicEmailsController],
  providers: [EmailsService, EmailsScheduler],
  exports: [EmailsService],
})
export class EmailsModule {}
