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
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
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
        id: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        phone: string | null;
        jobTitle: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        refreshToken: string | null;
        lastLoginAt: Date | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private generateTokens;
    private updateRefreshToken;
    private sanitizeUser;
}
