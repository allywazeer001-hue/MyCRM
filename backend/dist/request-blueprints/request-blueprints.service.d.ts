import { PrismaService } from '../prisma/prisma.service';
export declare class RequestBlueprintsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(orgId: string): import(".prisma/client").Prisma.PrismaPromise<({
        _count: {
            stages: number;
            instances: number;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    })[]>;
    get(id: string, orgId: string): import(".prisma/client").Prisma.Prisma__RequestBlueprintClient<{
        stages: ({
            actions: {
                id: string;
                createdAt: Date;
                name: string;
                color: string;
                order: number;
                label: string;
                conditions: import("@prisma/client/runtime/library").JsonValue | null;
                stageId: string;
                actionType: string;
                targetStageId: string | null;
                requiresNote: boolean;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            color: string;
            order: number;
            blueprintId: string;
            stageType: string;
            responsibleRole: string | null;
            requiredFields: import("@prisma/client/runtime/library").JsonValue | null;
            requiredDocs: import("@prisma/client/runtime/library").JsonValue | null;
            slaDuration: number | null;
            notifyOnEnter: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    create(orgId: string, body: any): import(".prisma/client").Prisma.Prisma__RequestBlueprintClient<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, orgId: string, body: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    addStage(blueprintId: string, orgId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        order: number;
        blueprintId: string;
        stageType: string;
        responsibleRole: string | null;
        requiredFields: import("@prisma/client/runtime/library").JsonValue | null;
        requiredDocs: import("@prisma/client/runtime/library").JsonValue | null;
        slaDuration: number | null;
        notifyOnEnter: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    updateStage(stageId: string, orgId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        order: number;
        blueprintId: string;
        stageType: string;
        responsibleRole: string | null;
        requiredFields: import("@prisma/client/runtime/library").JsonValue | null;
        requiredDocs: import("@prisma/client/runtime/library").JsonValue | null;
        slaDuration: number | null;
        notifyOnEnter: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    removeStage(stageId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        order: number;
        blueprintId: string;
        stageType: string;
        responsibleRole: string | null;
        requiredFields: import("@prisma/client/runtime/library").JsonValue | null;
        requiredDocs: import("@prisma/client/runtime/library").JsonValue | null;
        slaDuration: number | null;
        notifyOnEnter: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    addAction(stageId: string, orgId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        color: string;
        order: number;
        label: string;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        stageId: string;
        actionType: string;
        targetStageId: string | null;
        requiresNote: boolean;
    }>;
    updateAction(actionId: string, orgId: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        color: string;
        order: number;
        label: string;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        stageId: string;
        actionType: string;
        targetStageId: string | null;
        requiresNote: boolean;
    }>;
    removeAction(actionId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        color: string;
        order: number;
        label: string;
        conditions: import("@prisma/client/runtime/library").JsonValue | null;
        stageId: string;
        actionType: string;
        targetStageId: string | null;
        requiresNote: boolean;
    }>;
}
