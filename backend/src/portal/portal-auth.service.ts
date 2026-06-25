import {
  Injectable, BadRequestException, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import {
  validatePassword, settingsToPolicy, DEFAULT_PASSWORD_POLICY, PasswordPolicy,
} from './portal-password.utils';

export const PORTAL_SECRET =
  process.env.PORTAL_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'enterprise-crm-secret-key-change-in-production';

export const ACCOUNT_STATUS = {
  PENDING_ACTIVATION: 'PENDING_ACTIVATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
  DELETED: 'DELETED',
} as const;

@Injectable()
export class PortalAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ── Self-registration (user chooses their own password) ───────────────────────

  async register(dto: {
    email: string; password: string; firstName: string; lastName: string;
    phone?: string; type?: string; orgSlug?: string;
  }) {
    const org = await this.resolveOrg(dto.orgSlug);
    if (!org) throw new BadRequestException('Organization not found');

    const policy = await this.getPasswordPolicy(org.id);
    const { valid, errors } = validatePassword(dto.password, policy);
    if (!valid) throw new BadRequestException(errors.join('. '));

    const existing = await this.prisma.portalUser.findFirst({
      where: { email: dto.email.toLowerCase(), organizationId: org.id },
    });
    if (existing) throw new BadRequestException('Email already registered in this portal');

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
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        customData: '{}',
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

  // ── CRM-admin-created account (default password = lastName) ──────────────────

  async autoCreateUser(dto: {
    email: string; firstName: string; lastName: string;
    type?: string; organizationId: string;
    moduleId?: string; recordId?: string; phone?: string;
  }) {
    const existing = await this.prisma.portalUser.findFirst({
      where: { email: dto.email.toLowerCase(), organizationId: dto.organizationId },
    });
    if (existing) throw new BadRequestException('Email already registered in this portal');

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
        accountStatus: ACCOUNT_STATUS.PENDING_ACTIVATION,
        customData: '{}',
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

  // ── Login ─────────────────────────────────────────────────────────────────────

  async login(dto: { email: string; password: string; orgSlug?: string }) {
    const where: any = { email: dto.email.toLowerCase() };
    if (dto.orgSlug) {
      const org = await this.resolveOrg(dto.orgSlug);
      if (!org) throw new UnauthorizedException('Invalid credentials');
      where.organizationId = org.id;
    }

    const user = await this.prisma.portalUser.findFirst({ where });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }
    if (user.accountStatus === ACCOUNT_STATUS.DISABLED) {
      throw new UnauthorizedException('Your account has been disabled. Please contact support.');
    }
    if (user.accountStatus === ACCOUNT_STATUS.DELETED) {
      throw new UnauthorizedException('This portal account no longer exists.');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Update last login timestamp
    try {
      await this.prisma.portalUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch { /* non-critical: timestamp update must not block authentication */ }

    // Detect first login — force password change before granting full access
    if (user.isFirstLogin) {
      const changeToken = this.jwt.sign(
        { sub: user.id, organizationId: user.organizationId, purpose: 'activate' },
        { secret: PORTAL_SECRET, expiresIn: '15m' },
      );
      return {
        requiresPasswordChange: true,
        changeToken,
        message: 'For security reasons, you must update your password before continuing.',
        user: this.sanitize(user),
      };
    }

    return this.buildTokenResponse(user);
  }

  // ── First-login forced password activation ────────────────────────────────────

  async activateAccount(changeToken: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(changeToken, { secret: PORTAL_SECRET });
    } catch {
      throw new UnauthorizedException('Activation link expired. Please sign in again to get a new link.');
    }

    if (payload.purpose !== 'activate') {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.portalUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    if (!user.isFirstLogin) {
      throw new BadRequestException('Account is already activated');
    }

    const policy = await this.getPasswordPolicy(user.organizationId);
    const { valid, errors } = validatePassword(newPassword, policy);
    if (!valid) throw new BadRequestException(errors.join('. '));

    const hashed = await bcrypt.hash(newPassword, 12);
    const updated = await this.prisma.portalUser.update({
      where: { id: user.id },
      data: {
        password: hashed,
        isFirstLogin: false,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
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

  // ── Token refresh ─────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, { secret: PORTAL_SECRET });
      if (payload.portalType !== 'portal') throw new UnauthorizedException();
      const user = await this.prisma.portalUser.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED || user.accountStatus === ACCOUNT_STATUS.DISABLED) {
        throw new UnauthorizedException('Account is no longer active');
      }
      if (user.accountStatus === ACCOUNT_STATUS.DELETED) {
        throw new UnauthorizedException('This portal account no longer exists.');
      }
      return this.buildTokenResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Password reset (forgot password flow) ────────────────────────────────────

  async forgotPassword(email: string, orgSlug?: string) {
    const where: any = { email: email.toLowerCase() };
    if (orgSlug) {
      const org = await this.resolveOrg(orgSlug);
      if (org) where.organizationId = org.id;
    }
    const user = await this.prisma.portalUser.findFirst({ where });
    if (!user) return { message: 'If the email exists, a reset link has been sent.' };

    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiry = new Date(Date.now() + 3600 * 1000);
    await this.prisma.portalUser.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    return { message: 'If the email exists, a reset link has been sent.', _devToken: token };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.portalUser.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const policy = await this.getPasswordPolicy(user.organizationId);
    const { valid, errors } = validatePassword(newPassword, policy);
    if (!valid) throw new BadRequestException(errors.join('. '));

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.portalUser.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });
    return { message: 'Password reset successfully' };
  }

  // ── Settings (admin) ─────────────────────────────────────────────────────────

  async getSettings(organizationId: string) {
    const settings = await this.prisma.portalSettings.findUnique({ where: { organizationId } });
    return settings ?? this.defaultSettings(organizationId);
  }

  async updateSettings(organizationId: string, dto: Partial<{
    minPasswordLength: number; requireUppercase: boolean; requireLowercase: boolean;
    requireNumber: boolean; requireSpecial: boolean; passwordExpiryDays: number;
    forceResetOnFirstLogin: boolean; defaultPasswordStrategy: string;
  }>) {
    return this.prisma.portalSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...dto },
      update: dto,
    });
  }

  // ── Password policy for an org ────────────────────────────────────────────────

  async getPasswordPolicy(organizationId: string): Promise<PasswordPolicy> {
    const settings = await this.prisma.portalSettings.findUnique({ where: { organizationId } });
    return settingsToPolicy(settings);
  }

  async getPasswordPolicyPublic(orgSlug?: string) {
    const org = await this.resolveOrg(orgSlug);
    if (!org) return DEFAULT_PASSWORD_POLICY;
    return this.getPasswordPolicy(org.id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async resolveOrg(slug?: string) {
    if (slug) return this.prisma.organization.findFirst({ where: { slug } });
    return this.prisma.organization.findFirst({ where: { isActive: true } });
  }

  private buildTokenResponse(user: any) {
    const payload = {
      sub: user.id,
      organizationId: user.organizationId,
      portalType: 'portal',
    };
    const accessToken = this.jwt.sign(payload, { secret: PORTAL_SECRET, expiresIn: '24h' });
    const refreshToken = this.jwt.sign(payload, { secret: PORTAL_SECRET, expiresIn: '7d' });
    return { accessToken, refreshToken, user: this.sanitize(user) };
  }

  private defaultSettings(organizationId: string) {
    return { organizationId, ...DEFAULT_PASSWORD_POLICY, passwordExpiryDays: 0, forceResetOnFirstLogin: true, defaultPasswordStrategy: 'last_name' };
  }

  sanitize(u: any) {
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
}
