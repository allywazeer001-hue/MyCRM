import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Build unique slug
    const baseSlug = dto.organizationSlug
      || (dto.organizationName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `org-${Date.now()}`);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.organization.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const packages = dto.packages?.length ? [...dto.packages] : ['CRM'];
    if (!packages.includes('CRM')) packages.unshift('CRM');

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
      } as any,
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

  async checkEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
    if (!user) return { exists: false };
    return {
      exists: true,
      firstName: user.firstName,
      organizationName: (user as any).organization?.name,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true },
    });
    if (!user) {
      throw new UnauthorizedException('No account found with this email address');
    }
    if (!await bcrypt.compare(dto.password, user.password)) {
      throw new UnauthorizedException('Incorrect password. Please try again.');
    }
    if (!user.isActive || user.status === 'DISABLED') throw new UnauthorizedException('Account is deactivated');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account is suspended. Contact your administrator.');
    if (user.status === 'LOCKED') throw new UnauthorizedException('Account is locked. Contact your administrator.');

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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    if (currentPassword && !await bcrypt.compare(currentPassword, user.password)) {
      throw new UnauthorizedException('Current password is incorrect');
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

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshToken) throw new UnauthorizedException('Invalid session');
    const matches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!matches) throw new UnauthorizedException('Invalid session');
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async refreshByToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');
    try {
      const payload = this.jwtService.decode(refreshToken) as any;
      if (!payload?.sub) throw new UnauthorizedException('Invalid token');
      return this.refreshToken(payload.sub, refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) return user;
    return null;
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.organizationId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '24h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hashed } });
  }

  private sanitizeUser(user: any) {
    const { password, refreshToken, ...rest } = user;
    return rest;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }
}
