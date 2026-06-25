import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../websocket/app.gateway';
export interface BlueprintPhase {
    id: string;
    name: string;
    color: string;
    order: number;
    x?: number;
    y?: number;
}
export interface BlueprintTransition {
    id: string;
    name: string;
    fromPhaseId: string;
    toPhaseId: string;
    isCommon?: boolean;
    description?: string;
    buttonColor?: string;
    requiredFields: string[];
    allowedRoles: string[];
    allowedUsers: string[];
    conditions: any[];
    conditionsLogic: 'AND' | 'OR';
    requiresApproval: boolean;
    approvalRoles: string[];
    notifyRoles: string[];
    notifyUsers: string[];
    confirmMessage?: string;
}
export declare class BlueprintsService {
    private prisma;
    private notifications;
    private gateway;
    constructor(prisma: PrismaService, notifications: NotificationsService, gateway: AppGateway);
    findAll(orgId: string): Promise<({
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        version: number;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    findOne(id: string, orgId: string): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
            fields: ({
                options: {
                    id: string;
                    createdAt: Date;
                    color: string | null;
                    order: number;
                    label: string;
                    value: string;
                    fieldId: string;
                }[];
            } & {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                settings: import("@prisma/client/runtime/library").JsonValue;
                order: number;
                moduleId: string;
                type: import(".prisma/client").$Enums.FieldType;
                label: string;
                isRequired: boolean;
                isUnique: boolean;
                isReadonly: boolean;
                isHidden: boolean;
                placeholder: string | null;
                helpText: string | null;
                defaultValue: string | null;
                validation: import("@prisma/client/runtime/library").JsonValue | null;
                conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
                lookupModuleId: string | null;
                lookupFieldId: string | null;
                formulaExpression: string | null;
            })[];
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        version: number;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findForModule(moduleId: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        version: number;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    create(orgId: string, data: any): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        version: number;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(id: string, orgId: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        version: number;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    remove(id: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        version: number;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getAvailableTransitions(recordId: string, userId: string, orgId: string): Promise<{
        blueprint: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            moduleId: string;
            version: number;
            statusFieldName: string;
            phases: import("@prisma/client/runtime/library").JsonValue;
            transitions: import("@prisma/client/runtime/library").JsonValue;
            fieldLocks: import("@prisma/client/runtime/library").JsonValue;
            rules: import("@prisma/client/runtime/library").JsonValue;
            treeData: import("@prisma/client/runtime/library").JsonValue | null;
        };
        currentStage: BlueprintPhase;
        availableTransitions: BlueprintTransition[];
        lockedFields: string[];
        phases: BlueprintPhase[];
        canInitialize: boolean;
    }>;
    initializeRecord(recordId: string, stageId: string, userId: string, orgId: string): Promise<{
        status: string;
        stageId: string;
        stageName: string;
    }>;
    executeTransition(recordId: string, transitionId: string, userId: string, orgId: string, formData?: Record<string, any>): Promise<{
        status: string;
        message: string;
        newStage?: undefined;
    } | {
        status: string;
        newStage: string;
        message: string;
    }>;
    getMyBlueprintTasks(userId: string, orgId: string): Promise<({
        blueprint: {
            id: string;
            name: string;
            moduleId: string;
            module: {
                id: string;
                name: string;
                slug: string;
                icon: string;
            };
            statusFieldName: string;
        };
    } & {
        comment: string | null;
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string;
        recordId: string;
        blueprintId: string;
        assignedRole: string | null;
        transitionId: string;
        transitionName: string;
        fromStage: string;
        toStage: string;
        assignedToId: string | null;
    })[]>;
    getBlueprintTasksForRecord(recordId: string, orgId: string): Promise<{
        comment: string | null;
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string;
        recordId: string;
        blueprintId: string;
        assignedRole: string | null;
        transitionId: string;
        transitionName: string;
        fromStage: string;
        toStage: string;
        assignedToId: string | null;
    }[]>;
    completeBlueprintTask(taskId: string, action: 'approve' | 'reject', comment: string | undefined, userId: string, orgId: string): Promise<{
        status: string;
    }>;
    validateTransition(moduleId: string, fromStage: string, toStage: string, userId: string, orgId: string): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    evaluateTree(treeData: any, recordData: any): {
        actions: any[];
    };
    private walkNode;
    private processChildren;
    private evalCondGroup;
    evaluateForRecord(recordId: string, orgId: string): Promise<{
        blueprint: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            moduleId: string;
            version: number;
            statusFieldName: string;
            phases: import("@prisma/client/runtime/library").JsonValue;
            transitions: import("@prisma/client/runtime/library").JsonValue;
            fieldLocks: import("@prisma/client/runtime/library").JsonValue;
            rules: import("@prisma/client/runtime/library").JsonValue;
            treeData: import("@prisma/client/runtime/library").JsonValue | null;
        };
        currentPhase: any;
        lockedFields: string[];
        availableTransitions: any[];
        treeActions: any[];
    }>;
    private evalCondition;
    getStageHistory(recordId: string, orgId: string): Promise<{
        fromStage: string | null;
        toStage: string;
        transitionName: string | null;
        timestamp: string;
        user: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    }[]>;
    private notifyByRoles;
}
