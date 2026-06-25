import { WorkflowsService } from './workflows.service';
export declare class WorkflowsController {
    private workflowsService;
    constructor(workflowsService: WorkflowsService);
    create(body: any, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
            recipientUsers: import("@prisma/client/runtime/library").JsonValue;
            recipientDepts: import("@prisma/client/runtime/library").JsonValue;
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
        tags: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAll(user: any): Promise<{
        lastExecution: {
            error: string;
            status: string;
            startedAt: Date;
            finishedAt: Date;
        };
        actions: {
            id: string;
            order: number;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
            recipientUsers: import("@prisma/client/runtime/library").JsonValue;
            recipientDepts: import("@prisma/client/runtime/library").JsonValue;
            workflowId: string;
        }[];
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
        tags: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    findOne(id: string, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
            recipientUsers: import("@prisma/client/runtime/library").JsonValue;
            recipientDepts: import("@prisma/client/runtime/library").JsonValue;
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
        tags: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(id: string, body: any, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
            recipientUsers: import("@prisma/client/runtime/library").JsonValue;
            recipientDepts: import("@prisma/client/runtime/library").JsonValue;
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
        tags: import("@prisma/client/runtime/library").JsonValue;
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
        tags: import("@prisma/client/runtime/library").JsonValue;
    }>;
    toggle(id: string, user: any): Promise<{
        actions: {
            id: string;
            order: number;
            type: string;
            config: import("@prisma/client/runtime/library").JsonValue;
            recipientUsers: import("@prisma/client/runtime/library").JsonValue;
            recipientDepts: import("@prisma/client/runtime/library").JsonValue;
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
        tags: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getExecutions(id: string, user: any): Promise<{
        error: string | null;
        id: string;
        status: string;
        startedAt: Date;
        workflowId: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue;
        finishedAt: Date | null;
    }[]>;
    executeOnRecord(id: string, body: {
        recordId: string;
        trigger: string;
        data: Record<string, any>;
        previousData?: Record<string, any>;
    }, user: any): Promise<{
        executed: boolean;
        actionsExecuted: any;
    }>;
}
