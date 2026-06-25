import { ProcessService } from './process.service';
import { CreateBlueprintDto, UpdateBlueprintDto } from './dto/create-blueprint.dto';
import { TaskActionDto } from './dto/task-action.dto';
export declare class ProcessController {
    private readonly processService;
    constructor(processService: ProcessService);
    getBlueprints(user: any): Promise<({
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
        moduleId: string | null;
        triggerField: string | null;
        triggerValue: string | null;
    })[]>;
    createBlueprint(dto: CreateBlueprintDto, user: any): Promise<{
        stages: {
            id: string;
            name: string;
            order: number;
            blueprintId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditions: import("@prisma/client/runtime/library").JsonValue | null;
            assigneeField: string | null;
            assigneeType: string;
            assigneeRole: string | null;
            assigneeUserId: string | null;
            dueDays: number | null;
            onApprove: string | null;
            onReject: string | null;
            onRequestInfo: string | null;
            notifySubmitter: boolean;
            notifyAssignee: boolean;
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
        triggerField: string | null;
        triggerValue: string | null;
    }>;
    getBlueprintById(id: string, user: any): Promise<{
        stages: {
            id: string;
            name: string;
            order: number;
            blueprintId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditions: import("@prisma/client/runtime/library").JsonValue | null;
            assigneeField: string | null;
            assigneeType: string;
            assigneeRole: string | null;
            assigneeUserId: string | null;
            dueDays: number | null;
            onApprove: string | null;
            onReject: string | null;
            onRequestInfo: string | null;
            notifySubmitter: boolean;
            notifyAssignee: boolean;
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
        triggerField: string | null;
        triggerValue: string | null;
    }>;
    updateBlueprint(id: string, dto: UpdateBlueprintDto, user: any): Promise<{
        stages: {
            id: string;
            name: string;
            order: number;
            blueprintId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            conditions: import("@prisma/client/runtime/library").JsonValue | null;
            assigneeField: string | null;
            assigneeType: string;
            assigneeRole: string | null;
            assigneeUserId: string | null;
            dueDays: number | null;
            onApprove: string | null;
            onReject: string | null;
            onRequestInfo: string | null;
            notifySubmitter: boolean;
            notifyAssignee: boolean;
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
        triggerField: string | null;
        triggerValue: string | null;
    }>;
    deleteBlueprint(id: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string | null;
        triggerField: string | null;
        triggerValue: string | null;
    }>;
    startInstance(body: {
        blueprintId: string;
        recordId: string;
        recordModule: string;
    }, user: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        recordId: string;
        blueprintId: string;
        recordModule: string;
        currentStageId: string | null;
        startedBy: string;
        startedAt: Date;
        completedAt: Date | null;
    }>;
    getMyTasks(user: any): Promise<{
        tasks: ({
            instance: {
                blueprint: {
                    id: string;
                    name: string;
                };
            } & {
                id: string;
                status: string;
                organizationId: string;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                recordId: string;
                blueprintId: string;
                recordModule: string;
                currentStageId: string | null;
                startedBy: string;
                startedAt: Date;
                completedAt: Date | null;
            };
            stage: {
                id: string;
                name: string;
                order: number;
                blueprintId: string;
                actions: import("@prisma/client/runtime/library").JsonValue;
                conditions: import("@prisma/client/runtime/library").JsonValue | null;
                assigneeField: string | null;
                assigneeType: string;
                assigneeRole: string | null;
                assigneeUserId: string | null;
                dueDays: number | null;
                onApprove: string | null;
                onReject: string | null;
                onRequestInfo: string | null;
                notifySubmitter: boolean;
                notifyAssignee: boolean;
            };
        } & {
            comment: string | null;
            id: string;
            status: string;
            createdAt: Date;
            action: string | null;
            completedAt: Date | null;
            instanceId: string;
            assignedTo: string;
            assignedRole: string | null;
            dueAt: Date | null;
            seenAt: Date | null;
            stageId: string;
        })[];
        stats: {
            total: number;
            overdue: number;
            dueToday: number;
            upcoming: number;
        };
    }>;
    executeTaskAction(id: string, dto: TaskActionDto, user: any): Promise<void>;
    markTaskSeen(id: string, user: any): Promise<{
        comment: string | null;
        id: string;
        status: string;
        createdAt: Date;
        action: string | null;
        completedAt: Date | null;
        instanceId: string;
        assignedTo: string;
        assignedRole: string | null;
        dueAt: Date | null;
        seenAt: Date | null;
        stageId: string;
    }>;
    getInstanceTimeline(id: string, user: any): Promise<{
        event: string;
        comment: string | null;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        actorId: string | null;
        actorRole: string | null;
        instanceId: string;
    }[]>;
    getMonitoringStats(user: any): Promise<{
        activeInstances: number;
        overdueTasks: number;
        recentlyCompleted: number;
        totalPending: number;
    }>;
}
