import { PrismaService } from '../prisma/prisma.service';
export declare class RelationshipsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(orgId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.RelationType;
        fromFieldId: string | null;
        toFieldId: string | null;
        fromModuleId: string;
        toModuleId: string;
    }>;
    findAll(orgId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.RelationType;
        fromFieldId: string | null;
        toFieldId: string | null;
        fromModuleId: string;
        toModuleId: string;
    }[]>;
    findByModule(moduleId: string, orgId: string): Promise<({
        fromModule: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            icon: string | null;
            color: string | null;
            order: number;
        };
        toModule: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            icon: string | null;
            color: string | null;
            order: number;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        type: import(".prisma/client").$Enums.RelationType;
        fromFieldId: string | null;
        toFieldId: string | null;
        fromModuleId: string;
        toModuleId: string;
    })[]>;
}
