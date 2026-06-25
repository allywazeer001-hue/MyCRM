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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.ConflictException('Email already in use');
        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const baseSlug = dto.organizationSlug
            || (dto.organizationName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `org-${Date.now()}`);
        let slug = baseSlug;
        let suffix = 1;
        while (await this.prisma.organization.findFirst({ where: { slug } })) {
            slug = `${baseSlug}-${suffix++}`;
        }
        const packages = dto.packages?.length ? [...dto.packages] : ['CRM'];
        if (!packages.includes('CRM'))
            packages.unshift('CRM');
        const org = await this.prisma.organization.create({
            data: {
                name: dto.organizationName || 'My Organization',
                slug,
                code: dto.organizationCode || null,
                description: dto.organizationDescription || null,
                address: dto.organizationAddress || null,
                email: dto.organizationEmail || null,
                website: dto.organizationWebsite || null,
                industry: dto.organizationIndustry || null,
                logo: dto.organizationLogo || null,
                settings: { packages },
                status: 'ACTIVE',
                isActive: true,
            },
        });
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                organizationId: org.id,
                role: 'ADMIN',
            },
            include: { organization: true },
        });
        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async checkEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });
        if (!user)
            return { exists: false };
        return {
            exists: true,
            firstName: user.firstName,
            organizationName: user.organization?.name,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { organization: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('No account found with this email address');
        }
        if (!await bcrypt.compare(dto.password, user.password)) {
            throw new common_1.UnauthorizedException('Incorrect password. Please try again.');
        }
        if (!user.isActive || user.status === 'DISABLED')
            throw new common_1.UnauthorizedException('Account is deactivated');
        if (user.status === 'SUSPENDED')
            throw new common_1.UnauthorizedException('Account is suspended. Contact your administrator.');
        if (user.status === 'LOCKED')
            throw new common_1.UnauthorizedException('Account is locked. Contact your administrator.');
        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                organizationId: user.organizationId,
                action: 'USER_LOGIN',
                entityType: 'User',
                entityId: user.id,
                metadata: {},
            },
        });
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        if (currentPassword && !await bcrypt.compare(currentPassword, user.password)) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashed, mustChangePassword: false, status: user.status === 'PASSWORD_RESET_REQUIRED' ? 'ACTIVE' : user.status },
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                organizationId: user.organizationId,
                action: 'PASSWORD_CHANGED',
                entityType: 'User',
                entityId: userId,
                metadata: {},
            },
        });
        return { success: true };
    }
    async refreshToken(userId, refreshToken) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.refreshToken)
            throw new common_1.UnauthorizedException('Invalid session');
        const matches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!matches)
            throw new common_1.UnauthorizedException('Invalid session');
        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }
    async refreshByToken(refreshToken) {
        if (!refreshToken)
            throw new common_1.UnauthorizedException('No refresh token');
        try {
            const payload = this.jwtService.decode(refreshToken);
            if (!payload?.sub)
                throw new common_1.UnauthorizedException('Invalid token');
            return this.refreshToken(payload.sub, refreshToken);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async logout(userId) {
        await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(password, user.password))
            return user;
        return null;
    }
    async generateTokens(user) {
        const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.organizationId };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, { expiresIn: '24h' }),
            this.jwtService.signAsync(payload, { expiresIn: '7d' }),
        ]);
        return { accessToken, refreshToken };
    }
    async updateRefreshToken(userId, refreshToken) {
        const hashed = await bcrypt.hash(refreshToken, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hashed } });
    }
    sanitizeUser(user) {
        const { password, refreshToken, ...rest } = user;
        return rest;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true },
        });
        if (!user)
            throw new common_1.UnauthorizedException();
        return this.sanitizeUser(user);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map