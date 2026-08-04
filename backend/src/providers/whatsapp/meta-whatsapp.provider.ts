import { Logger } from '@nestjs/common';
import {
  WhatsAppProvider, SendWhatsAppTemplateInput, SendMessageResult, TestConnectionResult,
  MetaWhatsAppProviderConfig, MetaWhatsAppProviderSecret,
} from './whatsapp-provider.interface';

const REQUEST_TIMEOUT_MS = 15_000;
const GRAPH_VERSION = 'v19.0';

/**
 * Meta WhatsApp Business Platform (Cloud API) — real Graph API calls. This
 * has NOT been exercised against a live WhatsApp Business account (no
 * credentials available while building this) — the request/response shapes
 * below match Meta's publicly documented Cloud API, but "Test Connection"
 * and a real send are the only way to confirm it end-to-end once you have a
 * Business Account, Phone Number ID, and access token.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProvider.name);

  constructor(
    private readonly config: MetaWhatsAppProviderConfig,
    private readonly secret: MetaWhatsAppProviderSecret,
  ) {}

  private baseUrl(): string {
    return `https://graph.facebook.com/${GRAPH_VERSION}/${this.config.phoneNumberId}`;
  }

  async sendTemplateMessage(input: SendWhatsAppTemplateInput): Promise<SendMessageResult> {
    const to = input.to.replace(/^\+/, '');
    const sortedVars = [...input.variables].sort((a, b) => a.position - b.position);

    try {
      const res = await fetch(`${this.baseUrl()}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secret.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: input.templateName,
            language: { code: input.languageCode },
            components: sortedVars.length > 0 ? [{
              type: 'body',
              parameters: sortedVars.map(v => ({ type: 'text', text: v.value })),
            }] : [],
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error = body?.error?.message || `Meta API returned HTTP ${res.status}`;
        this.logger.warn(`WhatsApp send failed for ${to}: ${error}`);
        return { success: false, error };
      }

      return { success: true, providerMessageId: body?.messages?.[0]?.id };
    } catch (err: any) {
      const error = err?.name === 'TimeoutError' ? 'Meta API request timed out' : (err?.message ?? 'Unknown error contacting Meta');
      this.logger.error(`WhatsApp send error for ${to}: ${error}`);
      return { success: false, error };
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetch(`${this.baseUrl()}?fields=display_phone_number,verified_name`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.secret.accessToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, message: body?.error?.message || `Meta returned HTTP ${res.status}`, raw: body };
      }

      return {
        success: true,
        message: `Connected — ${body.verified_name ?? 'number'} (${body.display_phone_number ?? this.config.phoneNumberId})`,
        raw: body,
      };
    } catch (err: any) {
      const message = err?.name === 'TimeoutError' ? 'Meta API request timed out' : (err?.message ?? 'Unknown error contacting Meta');
      return { success: false, message };
    }
  }
}
