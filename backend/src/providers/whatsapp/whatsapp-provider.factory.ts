import { Injectable, BadRequestException } from '@nestjs/common';
import { decrypt } from '../../connected-apps/crypto/connected-app-crypto.util';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppProvider, MetaWhatsAppProviderConfig, MetaWhatsAppProviderSecret } from './whatsapp-provider.interface';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';

@Injectable()
export class WhatsAppProviderFactory {
  constructor(private prisma: PrismaService) {}

  async resolve(organizationId: string, providerId?: string | null): Promise<{ provider: WhatsAppProvider; providerId: string }> {
    const row = await this.prisma.communicationProvider.findFirst({
      where: providerId
        ? { id: providerId, organizationId, channel: 'WHATSAPP' }
        : { organizationId, channel: 'WHATSAPP', isDefault: true, isActive: true },
    });
    if (!row) throw new BadRequestException('No WhatsApp provider is configured. Set one up in Settings → Communications → WhatsApp.');
    if (!row.isActive) throw new BadRequestException(`WhatsApp provider "${row.label}" is disabled.`);
    if (!row.secretEnc) throw new BadRequestException(`WhatsApp provider "${row.label}" has no credentials configured yet.`);

    const secret = JSON.parse(decrypt(row.secretEnc));

    switch (row.provider) {
      case 'META_WHATSAPP':
        return {
          provider: new MetaWhatsAppProvider(row.config as unknown as MetaWhatsAppProviderConfig, secret as MetaWhatsAppProviderSecret),
          providerId: row.id,
        };
      default:
        throw new BadRequestException(`WhatsApp provider "${row.provider}" is not implemented yet.`);
    }
  }
}
