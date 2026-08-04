import { Module } from '@nestjs/common';
import { CommunicationProvidersService } from './communication-providers.service';
import { CommunicationProvidersController } from './communication-providers.controller';
import { SmsProviderFactory } from '../providers/sms/sms-provider.factory';
import { WhatsAppProviderFactory } from '../providers/whatsapp/whatsapp-provider.factory';

@Module({
  controllers: [CommunicationProvidersController],
  providers: [CommunicationProvidersService, SmsProviderFactory, WhatsAppProviderFactory],
  exports: [SmsProviderFactory, WhatsAppProviderFactory],
})
export class CommunicationProvidersModule {}
