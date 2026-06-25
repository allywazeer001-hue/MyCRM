import { PrismaService } from '../prisma/prisma.service';
export declare class RequestTypesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(orgId: string): import(".prisma/client").Prisma.PrismaPromise<({
        blueprint: {
            id: string;
            name: string;
        };
        _count: {
            requests: number;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string;
        color: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        blueprintId: string | null;
        prefix: string;
    })[]>;
    get(id: string, orgId: string): import(".prisma/client").Prisma.Prisma__RequestTypeClient<{
        blueprint: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string;
        color: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        blueprintId: string | null;
        prefix: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    create(orgId: string, body: any): import(".prisma/client").Prisma.Prisma__RequestTypeClient<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string;
        color: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        blueprintId: string | null;
        prefix: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, orgId: string, body: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string;
        color: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        blueprintId: string | null;
        prefix: string;
    }>;
    remove(id: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        icon: string;
        color: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        blueprintId: string | null;
        prefix: string;
    }>;
}
