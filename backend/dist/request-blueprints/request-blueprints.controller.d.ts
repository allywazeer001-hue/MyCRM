import { RequestBlueprintsService } from './request-blueprints.service';
export declare class RequestBlueprintsController {
    private readonly svc;
    constructor(svc: RequestBlueprintsService);
    list(u: any): import(".prisma/client").Prisma.PrismaPromise<({
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
    get(id: string, u: any): import(".prisma/client").Prisma.Prisma__RequestBlueprintClient<{
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
    create(b: any, u: any): import(".prisma/client").Prisma.Prisma__RequestBlueprintClient<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, b: any, u: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, u: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    addStage(id: string, b: any, u: any): Promise<{
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
    updateStage(sid: string, b: any, u: any): Promise<{
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
    removeStage(sid: string, u: any): Promise<{
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
    addAction(sid: string, b: any, u: any): Promise<{
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
    updateAction(aid: string, b: any, u: any): Promise<{
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
    removeAction(aid: string, u: any): Promise<{
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
