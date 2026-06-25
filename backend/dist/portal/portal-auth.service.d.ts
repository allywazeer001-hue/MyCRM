import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordPolicy } from './portal-password.utils';
export declare const PORTAL_SECRET: string;
export declare const ACCOUNT_STATUS: {
    readonly PENDING_ACTIVATION: "PENDING_ACTIVATION";
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
    readonly DISABLED: "DISABLED";
    readonly DELETED: "DELETED";
};
export declare class PortalAuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    register(dto: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
        type?: string;
        orgSlug?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
            type: any;
            accountStatus: any;
            profilePicture: any;
            organizationId: any;
            moduleId: any;
            recordId: any;
            isEmailVerified: any;
            lastLoginAt: any;
            isPortalAdmin: any;
            portalRole: any;
        };
    }>;
    autoCreateUser(dto: {
        email: string;
        firstName: string;
        lastName: string;
        type?: string;
        organizationId: string;
        moduleId?: string;
        recordId?: string;
        phone?: string;
    }): Promise<{
        id: any;
        email: any;
        firstName: any;
        lastName: any;
        phone: any;
        type: any;
        accountStatus: any;
        profilePicture: any;
        organizationId: any;
        moduleId: any;
        recordId: any;
        isEmailVerified: any;
        lastLoginAt: any;
        isPortalAdmin: any;
        portalRole: any;
    }>;
    login(dto: {
        email: string;
        password: string;
        orgSlug?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
            type: any;
            accountStatus: any;
            profilePicture: any;
            organizationId: any;
            moduleId: any;
            recordId: any;
            isEmailVerified: any;
            lastLoginAt: any;
            isPortalAdmin: any;
            portalRole: any;
        };
    } | {
        requiresPasswordChange: boolean;
        changeToken: string;
        message: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
            type: any;
            accountStatus: any;
            profilePicture: any;
            organizationId: any;
            moduleId: any;
            recordId: any;
            isEmailVerified: any;
            lastLoginAt: any;
            isPortalAdmin: any;
            portalRole: any;
        };
    }>;
    activateAccount(changeToken: string, newPassword: string): Promise<{
        message: string;
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
            type: any;
            accountStatus: any;
            profilePicture: any;
            organizationId: any;
            moduleId: any;
            recordId: any;
            isEmailVerified: any;
            lastLoginAt: any;
            isPortalAdmin: any;
            portalRole: any;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
            type: any;
            accountStatus: any;
            profilePicture: any;
            organizationId: any;
            moduleId: any;
            recordId: any;
            isEmailVerified: any;
            lastLoginAt: any;
            isPortalAdmin: any;
            portalRole: any;
        };
    }>;
    forgotPassword(email: string, orgSlug?: string): Promise<{
        message: string;
        _devToken?: undefined;
    } | {
        message: string;
        _devToken: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    getSettings(organizationId: string): Promise<{
        passwordExpiryDays: number;
        forceResetOnFirstLogin: boolean;
        defaultPasswordStrategy: string;
        minPasswordLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumber: boolean;
        requireSpecial: boolean;
        organizationId: string;
    }>;
    updateSettings(organizationId: string, dto: Partial<{
        minPasswordLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumber: boolean;
        requireSpecial: boolean;
        passwordExpiryDays: number;
        forceResetOnFirstLogin: boolean;
        defaultPasswordStrategy: string;
    }>): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        minPasswordLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumber: boolean;
        requireSpecial: boolean;
        passwordExpiryDays: number;
        forceResetOnFirstLogin: boolean;
        defaultPasswordStrategy: string;
    }>;
    getPasswordPolicy(organizationId: string): Promise<PasswordPolicy>;
    getPasswordPolicyPublic(orgSlug?: string): Promise<PasswordPolicy>;
    private resolveOrg;
    private buildTokenResponse;
    private defaultSettings;
    sanitize(u: any): {
        id: any;
        email: any;
        firstName: any;
        lastName: any;
        phone: any;
        type: any;
        accountStatus: any;
        profilePicture: any;
        organizationId: any;
        moduleId: any;
        recordId: any;
        isEmailVerified: any;
        lastLoginAt: any;
        isPortalAdmin: any;
        portalRole: any;
    };
}
