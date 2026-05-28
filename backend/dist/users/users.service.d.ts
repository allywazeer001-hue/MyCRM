import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatar: string;
        phone: string;
        jobTitle: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    findOne(id: string, orgId: string): Promise<{
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
    update(id: string, orgId: string, data: any): Promise<{
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
    remove(id: string, orgId: string): Promise<{
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
}
