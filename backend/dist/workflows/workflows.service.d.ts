import { PrismaService } from '../prisma/prisma.service';
export declare class WorkflowsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(orgId: string, data: any): Promise<{
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
    findAll(orgId: string): Promise<({
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
    findOne(id: string, orgId: string): Promise<{
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
    update(id: string, orgId: string, data: any): Promise<{
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
    remove(id: string, orgId: string): Promise<{
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
    toggle(id: string, orgId: string): Promise<{
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
    executeForRecord(trigger: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED' | 'FIELD_CHANGED', moduleId: string, orgId: string, record: any, previousData?: any): Promise<void>;
    private evaluateConditions;
    private evaluateCondition;
    private executeWorkflow;
    private executeAction;
    getExecutions(workflowId: string, orgId: string): Promise<{
        error: string | null;
        id: string;
        workflowId: string;
        status: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue;
        startedAt: Date;
        finishedAt: Date | null;
    }[]>;
}
