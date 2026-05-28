import { PrismaService } from '../prisma/prisma.service';
export declare class OrganizationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(id: string): Promise<{
        id: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        logo: string | null;
        website: string | null;
        address: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        logo: string | null;
        website: string | null;
        address: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
