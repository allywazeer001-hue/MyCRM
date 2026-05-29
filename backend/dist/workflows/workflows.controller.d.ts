import { WorkflowsService } from './workflows.service';
export declare class WorkflowsController {
    private svc;
    constructor(svc: WorkflowsService);
    create(body: any, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.WorkflowActionType;
            config: import("@prisma/client/runtime/library").JsonValue;
            workflowId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        trigger: import(".prisma/client").$Enums.WorkflowTrigger;
        triggerConfig: import("@prisma/client/runtime/library").JsonValue;
        conditions: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAll(user: any): Promise<({
        actions: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.WorkflowActionType;
            config: import("@prisma/client/runtime/library").JsonValue;
            workflowId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        trigger: import(".prisma/client").$Enums.WorkflowTrigger;
        triggerConfig: import("@prisma/client/runtime/library").JsonValue;
        conditions: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    findOne(id: string, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.WorkflowActionType;
            config: import("@prisma/client/runtime/library").JsonValue;
            workflowId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        trigger: import(".prisma/client").$Enums.WorkflowTrigger;
        triggerConfig: import("@prisma/client/runtime/library").JsonValue;
        conditions: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(id: string, body: any, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.WorkflowActionType;
            config: import("@prisma/client/runtime/library").JsonValue;
            workflowId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        trigger: import(".prisma/client").$Enums.WorkflowTrigger;
        triggerConfig: import("@prisma/client/runtime/library").JsonValue;
        conditions: import("@prisma/client/runtime/library").JsonValue;
    }>;
    remove(id: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        trigger: import(".prisma/client").$Enums.WorkflowTrigger;
        triggerConfig: import("@prisma/client/runtime/library").JsonValue;
        conditions: import("@prisma/client/runtime/library").JsonValue;
    }>;
    toggle(id: string, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: import(".prisma/client").$Enums.WorkflowActionType;
            config: import("@prisma/client/runtime/library").JsonValue;
            workflowId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        trigger: import(".prisma/client").$Enums.WorkflowTrigger;
        triggerConfig: import("@prisma/client/runtime/library").JsonValue;
        conditions: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getExecutions(id: string, user: any): Promise<{
        error: string | null;
        id: string;
        status: string;
        workflowId: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue;
        startedAt: Date;
        finishedAt: Date | null;
    }[]>;
}
