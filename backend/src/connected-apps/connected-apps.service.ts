import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScopeAccess } from '@prisma/client';
import { encrypt, generateClientId, generateOpaqueToken } from './crypto/connected-app-crypto.util';
import { CreateConnectionRequestDto } from './dto/create-connection-request.dto';
import { ScopeGrantDto } from './dto/scope-grant.dto';

const ADMIN_ROLES: string[] = ['SUPER_ADMIN', 'ADMIN'];
const FIXED_SCOPES = [
  { key: 'reports:read', label: 'Read Reports' },
  { key: 'files:read', label: 'Read Files' },
  { key: 'forms:read', label: 'Read Forms' },
];
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL = '1h';
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class ConnectedAppsService {
  private readonly logger = new Logger(ConnectedAppsService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifications: NotificationsService,
  ) {}

  private assertAdmin(role: string) {
    if (!ADMIN_ROLES.includes(role)) throw new ForbiddenException('Only administrators can manage connected applications');
  }

  // ── Scope options ──────────────────────────────────────────────────────────
  async listScopeOptions(orgId: string) {
    const modules = await this.prisma.dynamicModule.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { order: 'asc' },
    });
    return [
      ...modules.map(m => ({ key: `module:${m.id}`, label: m.name })),
      ...FIXED_SCOPES,
    ];
  }

  // ── Connection requests (public submission) ────────────────────────────────
  async submitRequest(dto: CreateConnectionRequestDto) {
    const org = await this.prisma.organization.findUnique({ where: { slug: dto.organizationSlug } });
    if (!org || !org.isActive) throw new NotFoundException('Unknown organization');

    const { organizationSlug, ...rest } = dto;
    const request = await this.prisma.connectionRequest.create({
      data: { ...rest, organizationId: org.id },
    });

    const admins = await this.prisma.user.findMany({
      where: { organizationId: org.id, role: { in: ADMIN_ROLES as any }, isActive: true },
      select: { id: true },
    });
    await Promise.all(admins.map(admin =>
      this.notifications.create(admin.id, org.id, {
        title: 'New connection request',
        message: `${dto.appName} is requesting access to your CRM data.`,
        type: 'CONNECTION_REQUEST',
        link: '/settings/connected-apps?tab=pending',
      }),
    ));

    return { id: request.id, status: request.status };
  }

  async listRequests(orgId: string, role: string, status?: string) {
    this.assertAdmin(role);
    return this.prisma.connectionRequest.findMany({
      where: { organizationId: orgId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequest(orgId: string, role: string, id: string) {
    this.assertAdmin(role);
    const request = await this.prisma.connectionRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!request) throw new NotFoundException('Connection request not found');
    return request;
  }

  async approveRequest(orgId: string, adminUserId: string, role: string, requestId: string, scopes: ScopeGrantDto[]) {
    this.assertAdmin(role);
    const request = await this.prisma.connectionRequest.findFirst({ where: { id: requestId, organizationId: orgId } });
    if (!request) throw new NotFoundException('Connection request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been reviewed');

    const clientId = generateClientId();
    const clientSecret = generateOpaqueToken();
    const webhookSecret = generateOpaqueToken();
    const authCode = generateOpaqueToken();

    const connectedApp = await this.prisma.$transaction(async tx => {
      const app = await tx.connectedApp.create({
        data: {
          organizationId: orgId,
          name: request.appName,
          logoUrl: request.appLogoUrl,
          developerName: request.developerName,
          redirectUrl: request.redirectUrl,
          publicKey: request.publicKey,
          clientId,
          clientSecretHash: await bcrypt.hash(clientSecret.token, 10),
          webhookSecretEnc: encrypt(webhookSecret.token),
          createdByUserId: adminUserId,
          scopes: {
            create: scopes.map(s => ({ scopeKey: s.scopeKey, access: s.access })),
          },
        },
      });
      await tx.connectedAppAuthCode.create({
        data: {
          connectedAppId: app.id,
          codeHash: await bcrypt.hash(authCode.token, 10),
          codePrefix: authCode.prefix,
          expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
        },
      });
      await tx.connectionRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedByUserId: adminUserId, reviewedAt: new Date(), connectedAppId: app.id },
      });
      return app;
    });

    // Best-effort handoff to the app's own redirect URL — never blocks the
    // admin's response, since the admin-facing "save these now" modal is the
    // guaranteed delivery path.
    this.notifyAppOfApproval(request.redirectUrl, {
      connectionId: connectedApp.id,
      clientId,
      authorizationCode: authCode.token,
    }).catch(err => this.logger.warn(`Redirect handoff to ${request.redirectUrl} failed: ${err?.message}`));

    return {
      connectionId: connectedApp.id,
      clientId,
      clientSecret: clientSecret.token,
      authorizationCode: authCode.token,
    };
  }

  private async notifyAppOfApproval(redirectUrl: string, payload: Record<string, string>) {
    await fetch(redirectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  }

  async rejectRequest(orgId: string, adminUserId: string, role: string, requestId: string, reason?: string) {
    this.assertAdmin(role);
    const request = await this.prisma.connectionRequest.findFirst({ where: { id: requestId, organizationId: orgId } });
    if (!request) throw new NotFoundException('Connection request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('This request has already been reviewed');

    return this.prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', reviewedByUserId: adminUserId, reviewedAt: new Date(), rejectionReason: reason },
    });
  }

  // ── Connected apps ──────────────────────────────────────────────────────────
  async listApps(orgId: string, role: string) {
    this.assertAdmin(role);
    const apps = await this.prisma.connectedApp.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { scopes: true, tokens: true } } },
      orderBy: { connectedAt: 'desc' },
    });
    return apps.map(({ clientSecretHash, webhookSecretEnc, ...safe }) => safe);
  }

  async getApp(orgId: string, role: string, id: string) {
    this.assertAdmin(role);
    const app = await this.prisma.connectedApp.findFirst({
      where: { id, organizationId: orgId },
      include: { scopes: true },
    });
    if (!app) throw new NotFoundException('Connected app not found');
    const { clientSecretHash, webhookSecretEnc, ...safe } = app;
    return safe;
  }

  async updateScopes(orgId: string, role: string, id: string, scopes: ScopeGrantDto[]) {
    this.assertAdmin(role);
    const app = await this.prisma.connectedApp.findFirst({ where: { id, organizationId: orgId } });
    if (!app) throw new NotFoundException('Connected app not found');

    await this.prisma.$transaction([
      this.prisma.connectedAppScope.deleteMany({ where: { connectedAppId: id } }),
      this.prisma.connectedAppScope.createMany({
        data: scopes.map(s => ({ connectedAppId: id, scopeKey: s.scopeKey, access: s.access })),
      }),
    ]);
    return this.getApp(orgId, role, id);
  }

  async setStatus(orgId: string, role: string, id: string, status: 'SUSPENDED' | 'ACTIVE' | 'REVOKED') {
    this.assertAdmin(role);
    const app = await this.prisma.connectedApp.findFirst({ where: { id, organizationId: orgId } });
    if (!app) throw new NotFoundException('Connected app not found');

    if (status === 'REVOKED') {
      await this.prisma.connectedAppToken.updateMany({
        where: { connectedAppId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return this.prisma.connectedApp.update({ where: { id }, data: { status } });
  }

  async listTokens(orgId: string, role: string, appId: string) {
    this.assertAdmin(role);
    const app = await this.prisma.connectedApp.findFirst({ where: { id: appId, organizationId: orgId } });
    if (!app) throw new NotFoundException('Connected app not found');
    return this.prisma.connectedAppToken.findMany({
      where: { connectedAppId: appId },
      select: {
        id: true, accessExpiresAt: true, refreshExpiresAt: true, revokedAt: true,
        rotatedFromId: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeToken(orgId: string, role: string, appId: string, tokenId: string) {
    this.assertAdmin(role);
    const app = await this.prisma.connectedApp.findFirst({ where: { id: appId, organizationId: orgId } });
    if (!app) throw new NotFoundException('Connected app not found');
    return this.prisma.connectedAppToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  // ── OAuth token endpoint (public, client-credential authenticated) ─────────
  private async authenticateClient(clientId: string, clientSecret: string) {
    const app = await this.prisma.connectedApp.findUnique({ where: { clientId } });
    if (!app) throw new UnauthorizedException('Invalid client credentials');
    if (app.status !== 'ACTIVE') throw new UnauthorizedException('This connection is not active');
    const matches = await bcrypt.compare(clientSecret, app.clientSecretHash);
    if (!matches) throw new UnauthorizedException('Invalid client credentials');
    return app;
  }

  private async grantedScopeKeys(appId: string): Promise<string[]> {
    const scopes = await this.prisma.connectedAppScope.findMany({
      where: { connectedAppId: appId, access: { not: ScopeAccess.DENY } },
      select: { scopeKey: true },
    });
    return scopes.map(s => s.scopeKey);
  }

  private async issueTokenPair(connectedAppId: string, rotatedFromId?: string) {
    const jti = randomUUID();
    const scopes = await this.grantedScopeKeys(connectedAppId);
    const accessToken = await this.jwtService.signAsync(
      { sub: connectedAppId, scopes, jti },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refresh = generateOpaqueToken();

    await this.prisma.connectedAppToken.create({
      data: {
        connectedAppId,
        accessTokenJti: jti,
        refreshTokenHash: await bcrypt.hash(refresh.token, 10),
        refreshTokenPrefix: refresh.prefix,
        accessExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
        refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        rotatedFromId,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refresh.token,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_MS / 1000,
    };
  }

  async exchangeAuthorizationCode(clientId: string, clientSecret: string, code: string) {
    const app = await this.authenticateClient(clientId, clientSecret);
    const codePrefix = code.slice(0, 8);
    const candidates = await this.prisma.connectedAppAuthCode.findMany({
      where: { connectedAppId: app.id, codePrefix, usedAt: null, expiresAt: { gt: new Date() } },
    });
    const match = await this.findBcryptMatch(candidates, c => c.codeHash, code);
    if (!match) throw new UnauthorizedException('Invalid or expired authorization code');

    await this.prisma.connectedAppAuthCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
    return { connection_id: app.id, ...(await this.issueTokenPair(app.id)) };
  }

  async refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
    const app = await this.authenticateClient(clientId, clientSecret);
    const prefix = refreshToken.slice(0, 8);
    const candidates = await this.prisma.connectedAppToken.findMany({
      where: { connectedAppId: app.id, refreshTokenPrefix: prefix },
    });
    const match = await this.findBcryptMatch(candidates, c => c.refreshTokenHash, refreshToken);
    if (!match) throw new UnauthorizedException('Invalid refresh token');

    if (match.revokedAt) {
      // This refresh token was already rotated out once before — presenting it
      // again means it leaked. Revoke every token for this app as a compromise signal.
      await this.prisma.connectedAppToken.updateMany({
        where: { connectedAppId: app.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected — all sessions revoked');
    }
    if (match.refreshExpiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    await this.prisma.connectedAppToken.update({ where: { id: match.id }, data: { revokedAt: new Date() } });
    await this.prisma.connectedApp.update({ where: { id: app.id }, data: { lastTokenRefreshAt: new Date() } });
    return { connection_id: app.id, ...(await this.issueTokenPair(app.id, match.id)) };
  }

  async revoke(clientId: string, clientSecret: string, token: string) {
    const app = await this.authenticateClient(clientId, clientSecret);
    const prefix = token.slice(0, 8);
    const candidates = await this.prisma.connectedAppToken.findMany({
      where: { connectedAppId: app.id, refreshTokenPrefix: prefix, revokedAt: null },
    });
    const match = await this.findBcryptMatch(candidates, c => c.refreshTokenHash, token);
    if (match) await this.prisma.connectedAppToken.update({ where: { id: match.id }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  /** bcrypt hashes aren't indexable, so candidates are pre-narrowed by prefix; this does the actual compare. */
  private async findBcryptMatch<T>(candidates: T[], getHash: (c: T) => string, plain: string): Promise<T | undefined> {
    for (const candidate of candidates) {
      if (await bcrypt.compare(plain, getHash(candidate))) return candidate;
    }
    return undefined;
  }
}
