import { Injectable, BadRequestException } from '@nestjs/common';
import { decrypt } from '../../connected-apps/crypto/connected-app-crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsProvider, BeemProviderConfig, BeemProviderSecret } from './sms-provider.interface';
import { BeemSmsProvider } from './beem-sms.provider';

@Injectable()
export class SmsProviderFactory {
  constructor(private prisma: PrismaService) {}

  /** Builds a live SmsProvider from a CommunicationProvider row (organizationId-scoped default if id is omitted). */
  async resolve(organizationId: string, providerId?: string | null): Promise<{ provider: SmsProvider; providerId: string }> {
    const row = await this.prisma.communicationProvider.findFirst({
      where: providerId
        ? { id: providerId, organizationId, channel: 'SMS' }
        : { organizationId, channel: 'SMS', isDefault: true, isActive: true },
    });
    if (!row) throw new BadRequestException('No SMS provider is configured. Set one up in Settings → Communications → SMS.');
    if (!row.isActive) throw new BadRequestException(`SMS provider "${row.label}" is disabled.`);
    if (!row.secretEnc) throw new BadRequestException(`SMS provider "${row.label}" has no credentials configured yet.`);

    const secret = JSON.parse(decrypt(row.secretEnc));

    switch (row.provider) {
      case 'BEEM':
        return {
          provider: new BeemSmsProvider(row.config as unknown as BeemProviderConfig, secret as BeemProviderSecret),
          providerId: row.id,
        };
      default:
        throw new BadRequestException(`SMS provider "${row.provider}" is not implemented yet.`);
    }
  }
}
