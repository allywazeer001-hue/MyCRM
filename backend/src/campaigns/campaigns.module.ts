import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController, CommunicationOptOutsController } from './campaigns.controller';
import { CommunicationProvidersModule } from '../communication-providers/communication-providers.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [CommunicationProvidersModule, EmailsModule],
  controllers: [CampaignsController, CommunicationOptOutsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
