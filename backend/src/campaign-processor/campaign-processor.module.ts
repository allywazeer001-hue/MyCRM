import { Module } from '@nestjs/common';
import { CampaignProcessorService } from './campaign-processor.service';
import { CampaignProcessorScheduler } from './campaign-processor.scheduler';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { CommunicationProvidersModule } from '../communication-providers/communication-providers.module';
import { EmailsModule } from '../emails/emails.module';
import { EmailChannelAdapter } from '../providers/email/email-channel.adapter';

@Module({
  imports: [CampaignsModule, CommunicationProvidersModule, EmailsModule],
  providers: [CampaignProcessorService, CampaignProcessorScheduler, EmailChannelAdapter],
})
export class CampaignProcessorModule {}
