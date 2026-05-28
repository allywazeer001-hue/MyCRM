import { RelationshipsService } from './relationships.service';
export declare class RelationshipsController {
    private svc;
    constructor(svc: RelationshipsService);
    create(body: any, user: any): Promise<{
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
    findAll(user: any): Promise<{
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
    findByModule(moduleId: string, user: any): Promise<({
        fromModule: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            description: string | null;
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
            settings: import("@prisma/client/runtime/library").JsonValue;
            description: string | null;
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
