import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<{
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        id: string;
        avatar: string | null;
        phone: string | null;
        jobTitle: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        status: string;
        mustChangePassword: boolean;
        suspendedAt: Date | null;
        lockedAt: Date | null;
        usertype: string;
        refreshToken: string | null;
        lastLoginAt: Date | null;
        organizationId: string;
        departmentId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
