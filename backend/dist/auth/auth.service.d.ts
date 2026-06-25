import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    checkEmail(email: string): Promise<{
        exists: boolean;
        firstName?: undefined;
        organizationName?: undefined;
    } | {
        exists: boolean;
        firstName: string;
        organizationName: any;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    refreshToken(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    refreshByToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<void>;
    validateUser(email: string, password: string): Promise<{
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
    private generateTokens;
    private updateRefreshToken;
    private sanitizeUser;
    getProfile(userId: string): Promise<any>;
}
