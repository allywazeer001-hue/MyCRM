import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppGateway } from '../websocket/app.gateway';
import { CreateBlueprintDto, UpdateBlueprintDto } from './dto/create-blueprint.dto';
import { TaskActionDto } from './dto/task-action.dto';
export declare class ProcessService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, gateway: AppGateway);
    getBlueprints(organizationId: string): Promise<({
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
    getBlueprintById(id: string, organizationId: string): Promise<{
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
    createBlueprint(dto: CreateBlueprintDto, organizationId: string): Promise<{
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
    updateBlueprint(id: string, dto: UpdateBlueprintDto, organizationId: string): Promise<{
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
    deleteBlueprint(id: string, organizationId: string): Promise<{
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
    startInstance(blueprintId: string, recordId: string, recordModule: string, startedBy: string, organizationId: string): Promise<{
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
    private assignTasksForStage;
    executeTaskAction(taskId: string, actorId: string, dto: TaskActionDto): Promise<void>;
    private advanceInstance;
    getMyTasks(userId: string, organizationId: string): Promise<{
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
    markTaskSeen(taskId: string, userId: string): Promise<{
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
    getInstanceTimeline(instanceId: string, organizationId: string): Promise<{
        event: string;
        comment: string | null;
        id: string;
        createdAt: Date;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        actorId: string | null;
        actorRole: string | null;
        instanceId: string;
    }[]>;
    getMonitoringStats(organizationId: string): Promise<{
        activeInstances: number;
        overdueTasks: number;
        recentlyCompleted: number;
        totalPending: number;
    }>;
    triggerForRecord(recordId: string, moduleId: string, fieldName: string, fieldValue: string, startedBy: string, organizationId: string): Promise<void>;
}
