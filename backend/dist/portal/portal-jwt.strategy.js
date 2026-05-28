"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../prisma/prisma.service");
let PortalJwtStrategy = class PortalJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'portal-jwt') {
    constructor(prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.PORTAL_JWT_SECRET ||
                process.env.JWT_SECRET ||
                'enterprise-crm-secret-key-change-in-production',
        });
        this.prisma = prisma;
    }
    async validate(payload) {
        if (payload.portalType !== 'portal')
            throw new common_1.UnauthorizedException('Invalid token type');
        const user = await this.prisma.portalUser.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException('Portal user not found or inactive');
        const portalRole = user.portalRole ?? 'user';
        return {
            portalUserId: user.id,
            organizationId: user.organizationId,
            isPortalAdmin: user.isPortalAdmin || ['admin', 'super_admin'].includes(portalRole),
            portalRole,
            type: 'portal',
        };
    }
};
exports.PortalJwtStrategy = PortalJwtStrategy;
exports.PortalJwtStrategy = PortalJwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalJwtStrategy);
//# sourceMappingURL=portal-jwt.strategy.js.map