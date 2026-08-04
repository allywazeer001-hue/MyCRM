import { Logger } from '@nestjs/common';
import {
  SmsProvider, SendSmsInput, SendSmsResult, TestConnectionResult,
  BeemProviderConfig, BeemProviderSecret,
} from './sms-provider.interface';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Beem Africa SMS API (https://beem.africa) — HTTPS REST, Basic Auth over
 * API key + secret key. Endpoint paths/response shapes below follow Beem's
 * commonly documented v1 API as of this writing; verify against Beem's
 * current API reference once real credentials are available — this was
 * built without live access to fetch their docs or a real account to test
 * against, per the plan agreed with the user.
 */
export class BeemSmsProvider implements SmsProvider {
  private readonly logger = new Logger(BeemSmsProvider.name);
  private static readonly BASE_URL = 'https://apisms.beem.africa';

  constructor(
    private readonly config: BeemProviderConfig,
    private readonly secret: BeemProviderSecret,
  ) {}

  private authHeader(): string {
    const token = Buffer.from(`${this.secret.apiKey}:${this.secret.secretKey}`).toString('base64');
    return `Basic ${token}`;
  }

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    const senderId = input.senderId || this.config.senderId;
    const dest = input.to.replace(/^\+/, ''); // Beem expects digits only, no leading +

    try {
      const res = await fetch(`${BeemSmsProvider.BASE_URL}/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader(),
        },
        body: JSON.stringify({
          source_addr: senderId,
          schedule_time: '',
          encoding: 0,
          message: input.message,
          recipients: [{ recipient_id: 1, dest_addr: dest }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body: any = await res.json().catch(() => ({}));

      if (!res.ok || body.successful === false || (body.code && body.code !== 100)) {
        const error = body.message || `Beem API returned HTTP ${res.status}`;
        this.logger.warn(`Beem send failed for ${dest}: ${error}`);
        return { success: false, error };
      }

      return {
        success: true,
        providerMessageId: body.request_id ? String(body.request_id) : undefined,
      };
    } catch (err: any) {
      const error = err?.name === 'TimeoutError' ? 'Beem API request timed out' : (err?.message ?? 'Unknown error contacting Beem');
      this.logger.error(`Beem send error for ${dest}: ${error}`);
      return { success: false, error };
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const res = await fetch(`${BeemSmsProvider.BASE_URL}/public/v1/vendors/balance`, {
        method: 'GET',
        headers: { Authorization: this.authHeader() },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const body: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, message: body?.message || `Beem returned HTTP ${res.status}`, raw: body };
      }

      const balance = body?.data?.credit_balance;
      return {
        success: true,
        message: balance !== undefined ? `Connected — credit balance: ${balance}` : 'Connected to Beem',
        raw: body,
      };
    } catch (err: any) {
      const message = err?.name === 'TimeoutError' ? 'Beem API request timed out' : (err?.message ?? 'Unknown error contacting Beem');
      return { success: false, message };
    }
  }
}
