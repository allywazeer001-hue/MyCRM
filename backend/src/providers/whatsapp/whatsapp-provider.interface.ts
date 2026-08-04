export interface WhatsAppTemplateVariable {
  position: number; // {{1}}, {{2}}, ...
  value: string;
}

export interface SendWhatsAppTemplateInput {
  to: string; // E.164
  templateName: string;
  languageCode: string; // e.g. "en_US"
  variables: WhatsAppTemplateVariable[];
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface DeliveryStatus {
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  raw?: unknown;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  raw?: unknown;
}

/**
 * Every WhatsApp provider implements this — Meta's Cloud API is the only
 * concrete implementation for now (Section 8/24's provider-abstraction
 * requirement still applies: the campaign engine only ever talks to this
 * interface).
 */
export interface WhatsAppProvider {
  sendTemplateMessage(input: SendWhatsAppTemplateInput): Promise<SendMessageResult>;
  testConnection(): Promise<TestConnectionResult>;
  getDeliveryStatus?(providerMessageId: string): Promise<DeliveryStatus>;
}

/** Non-secret config stored on CommunicationProvider.config for channel=WHATSAPP, provider=META_WHATSAPP. */
export interface MetaWhatsAppProviderConfig {
  phoneNumberId: string;
  businessAccountId?: string;
}

/** Decrypted secret shape stored (encrypted) on CommunicationProvider.secretEnc for META_WHATSAPP. */
export interface MetaWhatsAppProviderSecret {
  accessToken: string;
}
