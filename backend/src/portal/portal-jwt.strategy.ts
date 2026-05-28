import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.PORTAL_JWT_SECRET ||
        process.env.JWT_SECRET ||
        'enterprise-crm-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    if (payload.portalType !== 'portal') throw new UnauthorizedException('Invalid token type');
    const user = await this.prisma.portalUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Portal user not found or inactive');
    const portalRole = (user as any).portalRole ?? 'user';
    return {
      portalUserId: user.id,
      organizationId: user.organizationId,
      isPortalAdmin: user.isPortalAdmin || ['admin', 'super_admin'].includes(portalRole),
      portalRole,
      type: 'portal',
    };
  }
}
