export interface SendSmsInput {
  to: string; // E.164, e.g. +255700000000
  message: string;
  senderId?: string;
}

export interface SendSmsResult {
  success: boolean;
  providerMessageId?: string;
  cost?: number;
  currency?: string;
  segments?: number;
  error?: string;
}

export interface DeliveryStatus {
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  raw?: unknown;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  raw?: unknown;
}

/**
 * Every SMS provider (Beem, Africa's Talking, Twilio, ...) implements this —
 * the campaign engine only ever talks to this interface, never a concrete
 * provider class, so a provider can be swapped without touching campaign
 * logic (Section 24/5's provider-abstraction requirement).
 */
export interface SmsProvider {
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  testConnection(): Promise<TestConnectionResult>;
  getDeliveryStatus?(providerMessageId: string): Promise<DeliveryStatus>;
}

/** Non-secret config stored on CommunicationProvider.config for channel=SMS, provider=BEEM. */
export interface BeemProviderConfig {
  senderId: string;
  country?: string;
}

/** Decrypted secret shape stored (encrypted) on CommunicationProvider.secretEnc for BEEM. */
export interface BeemProviderSecret {
  apiKey: string;
  secretKey: string;
}
