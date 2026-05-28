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
exports.PortalAuthService = exports.ACCOUNT_STATUS = exports.PORTAL_SECRET = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
const portal_password_utils_1 = require("./portal-password.utils");
exports.PORTAL_SECRET = process.env.PORTAL_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'enterprise-crm-secret-key-change-in-production';
exports.ACCOUNT_STATUS = {
    PENDING_ACTIVATION: 'PENDING_ACTIVATION',
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DISABLED: 'DISABLED',
};
let PortalAuthService = class PortalAuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async register(dto) {
        const org = await this.resolveOrg(dto.orgSlug);
        if (!org)
            throw new common_1.BadRequestException('Organization not found');
        const policy = await this.getPasswordPolicy(org.id);
        const { valid, errors } = (0, portal_password_utils_1.validatePassword)(dto.password, policy);
        if (!valid)
            throw new common_1.BadRequestException(errors.join('. '));
        const existing = await this.prisma.portalUser.findFirst({
            where: { email: dto.email.toLowerCase(), organizationId: org.id },
        });
        if (existing)
            throw new common_1.BadRequestException('Email already registered in this portal');
        const hashed = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.portalUser.create({
            data: {
                email: dto.email.toLowerCase(),
                password: hashed,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                phone: dto.phone || null,
                type: dto.type || 'member',
                organizationId: org.id,
                isFirstLogin: false,
                accountStatus: exports.ACCOUNT_STATUS.ACTIVE,
            },
        });
        await this.prisma.portalNotification.create({
            data: {
                portalUserId: user.id,
                title: `Welcome, ${user.firstName}!`,
                body: 'Your portal account has been created. Explore your dashboard to get started.',
                type: 'success',
            },
        });
        return this.buildTokenResponse(user);
    }
    async autoCreateUser(dto) {
        const existing = await this.prisma.portalUser.findFirst({
            where: { email: dto.email.toLowerCase(), organizationId: dto.organizationId },
        });
        if (existing)
            throw new common_1.BadRequestException('Email already registered in this portal');
        const defaultPassword = dto.lastName.trim();
        const hashed = await bcrypt.hash(defaultPassword, 12);
        const user = await this.prisma.portalUser.create({
            data: {
                email: dto.email.toLowerCase(),
                password: hashed,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                phone: dto.phone || null,
                type: dto.type || 'member',
                organizationId: dto.organizationId,
                moduleId: dto.moduleId || null,
                recordId: dto.recordId || null,
                isFirstLogin: true,
                accountStatus: exports.ACCOUNT_STATUS.PENDING_ACTIVATION,
            },
        });
        await this.prisma.portalNotification.create({
            data: {
                portalUserId: user.id,
                title: 'Account Created',
                body: `Welcome ${user.firstName}! Sign in with your email address. Your initial password is your last name. You will be asked to set a new password on first login.`,
                type: 'info',
            },
        });
        return this.sanitize(user);
    }
    async login(dto) {
        const where = { email: dto.email.toLowerCase() };
        if (dto.orgSlug) {
            const org = await this.resolveOrg(dto.orgSlug);
            if (!org)
                throw new common_1.UnauthorizedException('Invalid credentials');
            where.organizationId = org.id;
        }
        const user = await this.prisma.portalUser.findFirst({ where });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (user.accountStatus === exports.ACCOUNT_STATUS.SUSPENDED) {
            throw new common_1.UnauthorizedException('Your account has been suspended. Please contact support.');
        }
        if (user.accountStatus === exports.ACCOUNT_STATUS.DISABLED) {
            throw new common_1.UnauthorizedException('Your account has been disabled. Please contact support.');
        }
        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        await this.prisma.portalUser.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        if (user.isFirstLogin) {
            const changeToken = this.jwt.sign({ sub: user.id, organizationId: user.organizationId, purpose: 'activate' }, { secret: exports.PORTAL_SECRET, expiresIn: '15m' });
            return {
                requiresPasswordChange: true,
                changeToken,
                message: 'For security reasons, you must update your password before continuing.',
                user: this.sanitize(user),
            };
        }
        return this.buildTokenResponse(user);
    }
    async activateAccount(changeToken, newPassword) {
        let payload;
        try {
            payload = this.jwt.verify(changeToken, { secret: exports.PORTAL_SECRET });
        }
        catch {
            throw new common_1.UnauthorizedException('Activation link expired. Please sign in again to get a new link.');
        }
        if (payload.purpose !== 'activate') {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        const user = await this.prisma.portalUser.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive)
            throw new common_1.UnauthorizedException('User not found');
        if (!user.isFirstLogin) {
            throw new common_1.BadRequestException('Account is already activated');
        }
        const policy = await this.getPasswordPolicy(user.organizationId);
        const { valid, errors } = (0, portal_password_utils_1.validatePassword)(newPassword, policy);
        if (!valid)
            throw new common_1.BadRequestException(errors.join('. '));
        const hashed = await bcrypt.hash(newPassword, 12);
        const updated = await this.prisma.portalUser.update({
            where: { id: user.id },
            data: {
                password: hashed,
                isFirstLogin: false,
                accountStatus: exports.ACCOUNT_STATUS.ACTIVE,
            },
        });
        await this.prisma.portalNotification.create({
            data: {
                portalUserId: user.id,
                title: 'Account Activated',
                body: 'Your account has been activated and your password updated successfully. Welcome!',
                type: 'success',
            },
        });
        return {
            ...this.buildTokenResponse(updated),
            message: 'Password updated successfully. Welcome to your portal!',
        };
    }
    async refresh(refreshToken) {
        try {
            const payload = this.jwt.verify(refreshToken, { secret: exports.PORTAL_SECRET });
            if (payload.portalType !== 'portal')
                throw new common_1.UnauthorizedException();
            const user = await this.prisma.portalUser.findUnique({ where: { id: payload.sub } });
            if (!user || !user.isActive)
                throw new common_1.UnauthorizedException();
            if (user.accountStatus === exports.ACCOUNT_STATUS.SUSPENDED || user.accountStatus === exports.ACCOUNT_STATUS.DISABLED) {
                throw new common_1.UnauthorizedException('Account is no longer active');
            }
            return this.buildTokenResponse(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async forgotPassword(email, orgSlug) {
        const where = { email: email.toLowerCase() };
        if (orgSlug) {
            const org = await this.resolveOrg(orgSlug);
            if (org)
                where.organizationId = org.id;
        }
        const user = await this.prisma.portalUser.findFirst({ where });
        if (!user)
            return { message: 'If the email exists, a reset link has been sent.' };
        const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const expiry = new Date(Date.now() + 3600 * 1000);
        await this.prisma.portalUser.update({
            where: { id: user.id },
            data: { resetToken: token, resetTokenExpiry: expiry },
        });
        return { message: 'If the email exists, a reset link has been sent.', _devToken: token };
    }
    async resetPassword(token, newPassword) {
        const user = await this.prisma.portalUser.findFirst({
            where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
        });
        if (!user)
            throw new common_1.BadRequestException('Invalid or expired reset token');
        const policy = await this.getPasswordPolicy(user.organizationId);
        const { valid, errors } = (0, portal_password_utils_1.validatePassword)(newPassword, policy);
        if (!valid)
            throw new common_1.BadRequestException(errors.join('. '));
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.portalUser.update({
            where: { id: user.id },
            data: { password: hashed, resetToken: null, resetTokenExpiry: null },
        });
        return { message: 'Password reset successfully' };
    }
    async getSettings(organizationId) {
        const settings = await this.prisma.portalSettings.findUnique({ where: { organizationId } });
        return settings ?? this.defaultSettings(organizationId);
    }
    async updateSettings(organizationId, dto) {
        return this.prisma.portalSettings.upsert({
            where: { organizationId },
            create: { organizationId, ...dto },
            update: dto,
        });
    }
    async getPasswordPolicy(organizationId) {
        const settings = await this.prisma.portalSettings.findUnique({ where: { organizationId } });
        return (0, portal_password_utils_1.settingsToPolicy)(settings);
    }
    async getPasswordPolicyPublic(orgSlug) {
        const org = await this.resolveOrg(orgSlug);
        if (!org)
            return portal_password_utils_1.DEFAULT_PASSWORD_POLICY;
        return this.getPasswordPolicy(org.id);
    }
    async resolveOrg(slug) {
        if (slug)
            return this.prisma.organization.findFirst({ where: { slug } });
        return this.prisma.organization.findFirst({ where: { isActive: true } });
    }
    buildTokenResponse(user) {
        const payload = {
            sub: user.id,
            organizationId: user.organizationId,
            portalType: 'portal',
        };
        const accessToken = this.jwt.sign(payload, { secret: exports.PORTAL_SECRET, expiresIn: '24h' });
        const refreshToken = this.jwt.sign(payload, { secret: exports.PORTAL_SECRET, expiresIn: '7d' });
        return { accessToken, refreshToken, user: this.sanitize(user) };
    }
    defaultSettings(organizationId) {
        return { organizationId, ...portal_password_utils_1.DEFAULT_PASSWORD_POLICY, passwordExpiryDays: 0, forceResetOnFirstLogin: true, defaultPasswordStrategy: 'last_name' };
    }
    sanitize(u) {
        return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            type: u.type,
            accountStatus: u.accountStatus,
            profilePicture: u.profilePicture,
            organizationId: u.organizationId,
            moduleId: u.moduleId,
            recordId: u.recordId,
            isEmailVerified: u.isEmailVerified,
            lastLoginAt: u.lastLoginAt,
            isPortalAdmin: u.isPortalAdmin ?? false,
            portalRole: u.portalRole ?? 'user',
        };
    }
};
exports.PortalAuthService = PortalAuthService;
exports.PortalAuthService = PortalAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], PortalAuthService);
//# sourceMappingURL=portal-auth.service.js.map