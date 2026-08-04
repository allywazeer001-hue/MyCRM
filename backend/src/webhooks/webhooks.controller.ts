import { Body, Controller, Get, Headers, HttpCode, Logger, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// ── Delivery-report webhooks — no JWT guard, these are called by the SMS/
// WhatsApp providers themselves, not by logged-in users. Verify what can be
// verified (Meta signs with X-Hub-Signature-256); never trust an unverified
// payload to mutate anything beyond flipping one CampaignRecipient's status.
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private prisma: PrismaService) {}

  // Beem's delivery-report callback shape below follows their commonly
  // documented format — verify against Beem's current API docs once you
  // have a real account and can see actual DLR payloads; this could not be
  // tested against a live callback while building it.
  @Post('sms/beem')
  @HttpCode(200)
  async beemDeliveryReport(@Body() body: any) {
    const providerMessageId = String(body?.request_id ?? body?.message_id ?? '');
    if (!providerMessageId) {
      this.logger.warn(`Beem DLR with no recognizable message id: ${JSON.stringify(body)}`);
      return { received: true };
    }

    const rawStatus = String(body?.status ?? '').toUpperCase();
    const delivered = ['DELIVRD', 'DELIVERED'].includes(rawStatus);
    const failed = ['UNDELIV', 'FAILED', 'REJECTD', 'EXPIRED'].includes(rawStatus);

    if (!delivered && !failed) {
      this.logger.log(`Beem DLR for ${providerMessageId}: unrecognized status "${rawStatus}" — ignored`);
      return { received: true };
    }

    const result = await this.prisma.campaignRecipient.updateMany({
      where: { providerMessageId, channel: 'SMS' },
      data: delivered
        ? { status: 'DELIVERED', deliveredAt: new Date() }
        : { status: 'FAILED', failedAt: new Date(), failureReason: rawStatus },
    });
    if (result.count === 0) this.logger.warn(`Beem DLR for unknown message id ${providerMessageId}`);
    return { received: true };
  }

  // Meta's webhook subscription verification handshake — Meta calls this
  // GET once when you set the webhook URL, expecting the challenge echoed
  // back only if hub.verify_token matches what you configured with Meta.
  @Get('whatsapp/meta')
  verifyMetaWebhook(@Query() query: any, @Res() res: Response) {
    const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;
    if (verifyToken && query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken) {
      res.status(200).send(query['hub.challenge']);
    } else {
      res.status(403).send('Verification failed');
    }
  }

  @Post('whatsapp/meta')
  @HttpCode(200)
  async metaWebhook(@Req() req: Request, @Headers('x-hub-signature-256') signature: string, @Body() body: any) {
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const raw = (req as any).rawBody ?? JSON.stringify(body);
      const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
      if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        this.logger.warn('Meta webhook signature mismatch — ignoring payload');
        return { received: true };
      }
    } else {
      this.logger.warn('META_APP_SECRET not set — Meta webhook signature not verified');
    }

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const statuses = change?.value?.statuses ?? [];
        for (const s of statuses) {
          const providerMessageId = s?.id;
          const status = String(s?.status ?? '').toLowerCase(); // sent | delivered | read | failed
          if (!providerMessageId) continue;

          const mapped = status === 'delivered' ? 'DELIVERED' : status === 'read' ? 'OPENED' : status === 'failed' ? 'FAILED' : null;
          if (!mapped) continue;

          await this.prisma.campaignRecipient.updateMany({
            where: { providerMessageId, channel: 'WHATSAPP' },
            data: {
              status: mapped,
              ...(mapped === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
              ...(mapped === 'OPENED' ? { openedAt: new Date() } : {}),
              ...(mapped === 'FAILED' ? { failedAt: new Date() } : {}),
            },
          });
        }
      }
    }
    return { received: true };
  }
}
