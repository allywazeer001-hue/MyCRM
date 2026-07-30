import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Validates access tokens issued to Connected Apps (external integrations like the
 * Inventory system) — a separate identity space from the CRM's own end-user login.
 * Registered under the explicit name 'connected-app-jwt' so it never collides with
 * the unnamed 'jwt' strategy that authenticates logged-in CRM staff.
 */
@Injectable()
export class ConnectedAppJwtStrategy extends PassportStrategy(Strategy, 'connected-app-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.CONNECTED_APPS_JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; scopes: string[]; jti: string }) {
    const token = await this.prisma.connectedAppToken.findUnique({ where: { accessTokenJti: payload.jti } });
    if (!token || token.revokedAt || token.accessExpiresAt < new Date()) {
      throw new UnauthorizedException('This access token is no longer valid');
    }

    const app = await this.prisma.connectedApp.findUnique({ where: { id: payload.sub } });
    if (!app || app.status !== 'ACTIVE') {
      throw new UnauthorizedException('This connection is not active');
    }

    return { connectedAppId: app.id, organizationId: app.organizationId, scopes: payload.scopes, jti: payload.jti };
  }
}
