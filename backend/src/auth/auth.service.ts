import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RecoveryStartDto, RecoveryVerifyDto, RecoveryResetDto } from './dto/recovery.dto';

const RECOVERY_CHALLENGE_TTL_MS = 15 * 60 * 1000;

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

  async recoveryStart(dto: RecoveryStartDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true, department: true },
    });
    if (!user) throw new UnauthorizedException('No account found with this email address');
    if (!user.isActive || user.status === 'DISABLED') throw new UnauthorizedException('Account is deactivated. Contact your administrator.');
    if (user.status === 'LOCKED') throw new UnauthorizedException('Account is locked. Contact your administrator.');

    const selected = this.buildRecoveryQuestionPool(user).slice(0, 3);

    const challenge = await this.prisma.passwordRecoveryChallenge.create({
      data: {
        userId: user.id,
        questionKeys: selected.map((q) => q.key),
        expiresAt: new Date(Date.now() + RECOVERY_CHALLENGE_TTL_MS),
      },
    });

    return {
      challengeId: challenge.id,
      questions: selected.map(({ key, label }) => ({ key, label })),
    };
  }

  async recoveryVerify(dto: RecoveryVerifyDto) {
    const challenge = await this.prisma.passwordRecoveryChallenge.findUnique({ where: { id: dto.challengeId } });
    if (!challenge || challenge.used) {
      throw new UnauthorizedException('This recovery session is no longer valid. Please start over.');
    }
    if (challenge.expiresAt < new Date()) {
      await this.prisma.passwordRecoveryChallenge.update({ where: { id: challenge.id }, data: { used: true } });
      throw new UnauthorizedException('This recovery session has expired. Please start over.');
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException('No attempts remaining. Please contact an administrator.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: challenge.userId },
      include: { organization: true, department: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists.');

    const byKey = new Map(this.buildRecoveryQuestionPool(user).map((q) => [q.key, q.expected]));
    const keys = challenge.questionKeys as string[];
    const allCorrect = keys.every((key) => {
      const expected = byKey.get(key);
      const given = (dto.answers?.[key] ?? '').trim().toLowerCase();
      return expected !== undefined && given === expected;
    });

    if (allCorrect) {
      const resetToken = randomBytes(32).toString('hex');
      await this.prisma.passwordRecoveryChallenge.update({
        where: { id: challenge.id },
        data: { verified: true, resetToken },
      });
      return { success: true, resetToken };
    }

    const attempts = challenge.attempts + 1;
    const attemptsRemaining = Math.max(0, challenge.maxAttempts - attempts);

    if (attemptsRemaining <= 0) {
      await this.prisma.$transaction([
        this.prisma.passwordRecoveryChallenge.update({ where: { id: challenge.id }, data: { attempts, used: true } }),
        this.prisma.user.update({ where: { id: user.id }, data: { status: 'LOCKED', lockedAt: new Date() } }),
        this.prisma.auditLog.create({
          data: {
            userId: user.id,
            organizationId: user.organizationId,
            action: 'ACCOUNT_LOCKED_FAILED_RECOVERY',
            entityType: 'User',
            entityId: user.id,
            metadata: {},
          },
        }),
      ]);
      throw new UnauthorizedException('Too many incorrect answers. Your account has been locked — contact an administrator to reset your password.');
    }

    await this.prisma.passwordRecoveryChallenge.update({ where: { id: challenge.id }, data: { attempts } });
    throw new UnauthorizedException(`One or more answers were incorrect. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`);
  }

  async recoveryReset(dto: RecoveryResetDto) {
    const challenge = await this.prisma.passwordRecoveryChallenge.findUnique({ where: { id: dto.challengeId } });
    if (!challenge || challenge.used || !challenge.verified || challenge.resetToken !== dto.resetToken) {
      throw new UnauthorizedException('Invalid or expired recovery session. Please start over.');
    }
    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('This recovery session has expired. Please start over.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user) throw new UnauthorizedException('Account no longer exists.');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false, refreshToken: null },
      }),
      this.prisma.passwordRecoveryChallenge.update({ where: { id: challenge.id }, data: { used: true } }),
      this.prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'PASSWORD_RESET_SELF_SERVICE',
          entityType: 'User',
          entityId: user.id,
          metadata: {},
        },
      }),
    ]);

    return { success: true };
  }

  private buildRecoveryQuestionPool(user: any) {
    const shuffle = <T,>(arr: T[]) => arr.map((v) => ({ v, r: Math.random() })).sort((a, b) => a.r - b.r).map(({ v }) => v);
    const normalize = (s: string) => s.trim().toLowerCase();
    const last4Digits = (s: string) => s.replace(/\D/g, '').slice(-4);

    const preferred: { key: string; label: string; expected: string }[] = [];
    if (user.phone && last4Digits(user.phone).length === 4) {
      preferred.push({ key: 'phone', label: 'What are the last 4 digits of your phone number on file?', expected: last4Digits(user.phone) });
    }
    if (user.jobTitle) {
      preferred.push({ key: 'jobTitle', label: 'What is your job title?', expected: normalize(user.jobTitle) });
    }
    if (user.department?.name) {
      preferred.push({ key: 'department', label: 'Which department are you in?', expected: normalize(user.department.name) });
    }

    const fallback = shuffle([
      { key: 'lastName', label: 'What is your last name on file?', expected: normalize(user.lastName) },
      { key: 'firstName', label: 'What is your first name on file?', expected: normalize(user.firstName) },
      { key: 'organization', label: "What is your organization's name?", expected: normalize(user.organization.name) },
    ]);

    return [...shuffle(preferred), ...fallback];
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
