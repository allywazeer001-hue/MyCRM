import { PrismaService } from '../prisma/prisma.service';
export declare class UserPreferencesService {
    private prisma;
    constructor(prisma: PrismaService);
    get(userId: string, key: string): Promise<{
        key: string;
        value: import("@prisma/client/runtime/library").JsonValue;
    }>;
    set(userId: string, key: string, value: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        value: import("@prisma/client/runtime/library").JsonValue;
        key: string;
    }>;
    remove(userId: string, key: string): Promise<{
        success: boolean;
    }>;
}
