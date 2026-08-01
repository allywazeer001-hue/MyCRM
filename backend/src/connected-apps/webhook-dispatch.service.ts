import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeAccess } from '@prisma/client';
import { decrypt } from './crypto/connected-app-crypto.util';

const DELIVERY_TIMEOUT_MS = 10000;

/**
 * Real-time sync (outbound side): tells every Connected App with a
 * `module:<id>` scope and a configured webhookUrl that a record in that
 * module just changed, so it doesn't have to wait for its next poll.
 *
 * The payload deliberately carries only moduleId/recordId, never field data
 * — the receiver re-fetches the record itself via
 * GET /external/modules/:moduleId/records/:id using its own access token,
 * so a forged or stale payload can't inject data. Signed the same way
 * Stripe/GitHub sign webhooks: HMAC-SHA256 over the exact raw JSON bytes
 * sent, hex-encoded, in X-Webhook-Signature.
 *
 * Callers (RecordsService) must never await this inline in a way that can
 * fail the save — always `.catch(() => {})` at the call site, same as the
 * existing workflow/process/blueprint side-effects fired after a record
 * commit.
 */
@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(private prisma: PrismaService) {}

  async dispatchRecordChange(moduleId: string, orgId: string, recordId: string) {
    const apps = await this.prisma.connectedApp.findMany({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        webhookUrl: { not: null },
        webhookSecretEnc: { not: null },
        scopes: { some: { scopeKey: `module:${moduleId}`, access: { not: ScopeAccess.DENY } } },
      },
      select: { id: true, webhookUrl: true, webhookSecretEnc: true },
    });

    await Promise.all(apps.map(app => this.deliver(app, moduleId, recordId)));
  }

  private async deliver(
    app: { id: string; webhookUrl: string | null; webhookSecretEnc: string | null },
    moduleId: string,
    recordId: string,
  ) {
    if (!app.webhookUrl || !app.webhookSecretEnc) return;

    let secret: string;
    try {
      secret = decrypt(app.webhookSecretEnc);
    } catch (err: any) {
      this.logger.warn(`Connected app ${app.id}: could not decrypt webhook secret — ${err?.message}`);
      return;
    }

    const body = JSON.stringify({ moduleId, recordId });
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    try {
      const response = await fetch(app.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Connected app ${app.id}: webhook delivery to ${app.webhookUrl} returned ${response.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`Connected app ${app.id}: webhook delivery to ${app.webhookUrl} failed — ${err?.message}`);
    }
  }
}
