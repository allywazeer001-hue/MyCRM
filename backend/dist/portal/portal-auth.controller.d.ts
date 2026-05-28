import { PortalAuthService } from './portal-auth.service';
export declare class PortalAuthController {
    private authService;
    constructor(authService: PortalAuthService);
    register(body: {
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
    login(body: {
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
    activateAccount(body: {
        changeToken: string;
        newPassword: string;
    }): Promise<{
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
    refresh(body: {
        refreshToken: string;
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
    forgotPassword(body: {
        email: string;
        orgSlug?: string;
    }): Promise<{
        message: string;
        _devToken?: undefined;
    } | {
        message: string;
        _devToken: string;
    }>;
    resetPassword(body: {
        token: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    getPasswordPolicy(orgSlug?: string): Promise<import("./portal-password.utils").PasswordPolicy>;
    logout(): {
        message: string;
    };
}
