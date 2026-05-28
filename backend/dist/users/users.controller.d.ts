import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(user: any): Promise<{
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
    findOne(id: string, user: any): Promise<{
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
    update(id: string, body: any, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
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
