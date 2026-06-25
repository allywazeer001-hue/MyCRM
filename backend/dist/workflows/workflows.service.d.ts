import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../websocket/app.gateway';
export declare class WorkflowsService {
    private prisma;
    private gateway;
    private readonly logger;
    constructor(prisma: PrismaService, gateway: AppGateway);
    create(orgId: string, data: any): Promise<{
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
    findAll(orgId: string): Promise<{
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
    findOne(id: string, orgId: string): Promise<{
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
    update(id: string, orgId: string, data: any): Promise<{
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
        tags: import("@prisma/client/runtime/library").JsonValue;
    }>;
    toggle(id: string, orgId: string): Promise<{
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
    executeForRecord(trigger: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED' | 'FIELD_CHANGED' | 'FORM_SUBMITTED' | 'MANUAL', moduleId: string, orgId: string, record: any, previousData?: any): Promise<void>;
    private evaluateConditions;
    private evaluateCondition;
    executeWorkflow(wf: any, record: any, orgId: string): Promise<void>;
    private executeAction;
    private resolveTemplate;
    private resolveNotifTemplate;
    private sendEmail;
    getExecutions(workflowId: string, orgId: string): Promise<{
        error: string | null;
        id: string;
        status: string;
        startedAt: Date;
        workflowId: string;
        input: import("@prisma/client/runtime/library").JsonValue;
        output: import("@prisma/client/runtime/library").JsonValue;
        finishedAt: Date | null;
    }[]>;
}
