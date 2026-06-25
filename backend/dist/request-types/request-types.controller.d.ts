import { RequestTypesService } from './request-types.service';
export declare class RequestTypesController {
    private readonly svc;
    constructor(svc: RequestTypesService);
    list(u: any): import(".prisma/client").Prisma.PrismaPromise<({
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
    get(id: string, u: any): import(".prisma/client").Prisma.Prisma__RequestTypeClient<{
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
    create(body: any, u: any): import(".prisma/client").Prisma.Prisma__RequestTypeClient<{
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
    update(id: string, body: any, u: any): Promise<{
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
    remove(id: string, u: any): Promise<{
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
