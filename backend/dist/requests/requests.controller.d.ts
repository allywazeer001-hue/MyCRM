import { RequestsService } from './requests.service';
export declare class RequestsController {
    private readonly svc;
    constructor(svc: RequestsService);
    list(q: any, u: any): Promise<({
        _count: {
            comments: number;
            attachments: number;
        };
        type: {
            id: string;
            name: string;
            icon: string;
            color: string;
        };
        requester: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedUser: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedDept: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        data: import("@prisma/client/runtime/library").JsonValue;
        currentStageId: string | null;
        completedAt: Date | null;
        title: string;
        dueDate: Date | null;
        priority: string;
        requestNumber: string;
        typeId: string;
        currentStage: string | null;
        requesterId: string;
        assignedUserId: string | null;
        assignedDeptId: string | null;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
    })[]>;
    queue(u: any): Promise<{
        myRequests: ({
            type: {
                id: string;
                name: string;
                icon: string;
                color: string;
            };
            assignedUser: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            status: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            data: import("@prisma/client/runtime/library").JsonValue;
            currentStageId: string | null;
            completedAt: Date | null;
            title: string;
            dueDate: Date | null;
            priority: string;
            requestNumber: string;
            typeId: string;
            currentStage: string | null;
            requesterId: string;
            assignedUserId: string | null;
            assignedDeptId: string | null;
            relatedEntityType: string | null;
            relatedEntityId: string | null;
        })[];
        assignedToMe: ({
            type: {
                id: string;
                name: string;
                icon: string;
                color: string;
            };
            requester: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            status: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            data: import("@prisma/client/runtime/library").JsonValue;
            currentStageId: string | null;
            completedAt: Date | null;
            title: string;
            dueDate: Date | null;
            priority: string;
            requestNumber: string;
            typeId: string;
            currentStage: string | null;
            requesterId: string;
            assignedUserId: string | null;
            assignedDeptId: string | null;
            relatedEntityType: string | null;
            relatedEntityId: string | null;
        })[];
        teamQueue: any[] | ({
            type: {
                id: string;
                name: string;
                icon: string;
                color: string;
            };
            requester: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            status: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            data: import("@prisma/client/runtime/library").JsonValue;
            currentStageId: string | null;
            completedAt: Date | null;
            title: string;
            dueDate: Date | null;
            priority: string;
            requestNumber: string;
            typeId: string;
            currentStage: string | null;
            requesterId: string;
            assignedUserId: string | null;
            assignedDeptId: string | null;
            relatedEntityType: string | null;
            relatedEntityId: string | null;
        })[];
    }>;
    get(id: string, u: any): Promise<{
        comments: ({
            author: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            authorId: string;
            requestId: string;
        })[];
        type: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            icon: string;
            color: string;
            fields: import("@prisma/client/runtime/library").JsonValue;
            blueprintId: string | null;
            prefix: string;
        };
        instance: {
            blueprint: {
                stages: {
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
                }[];
            } & {
                id: string;
                isActive: boolean;
                organizationId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
            steps: ({
                stage: {
                    id: string;
                    name: string;
                };
                actor: {
                    firstName: string;
                    lastName: string;
                    id: string;
                };
            } & {
                id: string;
                completedAt: Date | null;
                actorId: string | null;
                instanceId: string;
                stageId: string | null;
                stageName: string;
                note: string | null;
                enteredAt: Date;
                actionName: string | null;
                actionLabel: string | null;
                stepStatus: string;
            })[];
        } & {
            id: string;
            organizationId: string;
            blueprintId: string;
            currentStageId: string | null;
            startedAt: Date;
            completedAt: Date | null;
            requestId: string;
        };
        attachments: ({
            uploader: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            name: string;
            url: string;
            mimeType: string | null;
            size: number | null;
            requestId: string;
            uploaderId: string;
        })[];
        requester: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedUser: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedDept: {
            id: string;
            name: string;
        };
        currentStageRef: {
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
        };
        events: ({
            actor: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            title: string;
            actorId: string | null;
            requestId: string;
            eventType: string;
        })[];
    } & {
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        data: import("@prisma/client/runtime/library").JsonValue;
        currentStageId: string | null;
        completedAt: Date | null;
        title: string;
        dueDate: Date | null;
        priority: string;
        requestNumber: string;
        typeId: string;
        currentStage: string | null;
        requesterId: string;
        assignedUserId: string | null;
        assignedDeptId: string | null;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
    }>;
    create(b: any, u: any): Promise<{
        comments: ({
            author: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            authorId: string;
            requestId: string;
        })[];
        type: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            icon: string;
            color: string;
            fields: import("@prisma/client/runtime/library").JsonValue;
            blueprintId: string | null;
            prefix: string;
        };
        instance: {
            blueprint: {
                stages: {
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
                }[];
            } & {
                id: string;
                isActive: boolean;
                organizationId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
            steps: ({
                stage: {
                    id: string;
                    name: string;
                };
                actor: {
                    firstName: string;
                    lastName: string;
                    id: string;
                };
            } & {
                id: string;
                completedAt: Date | null;
                actorId: string | null;
                instanceId: string;
                stageId: string | null;
                stageName: string;
                note: string | null;
                enteredAt: Date;
                actionName: string | null;
                actionLabel: string | null;
                stepStatus: string;
            })[];
        } & {
            id: string;
            organizationId: string;
            blueprintId: string;
            currentStageId: string | null;
            startedAt: Date;
            completedAt: Date | null;
            requestId: string;
        };
        attachments: ({
            uploader: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            name: string;
            url: string;
            mimeType: string | null;
            size: number | null;
            requestId: string;
            uploaderId: string;
        })[];
        requester: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedUser: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedDept: {
            id: string;
            name: string;
        };
        currentStageRef: {
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
        };
        events: ({
            actor: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            title: string;
            actorId: string | null;
            requestId: string;
            eventType: string;
        })[];
    } & {
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        data: import("@prisma/client/runtime/library").JsonValue;
        currentStageId: string | null;
        completedAt: Date | null;
        title: string;
        dueDate: Date | null;
        priority: string;
        requestNumber: string;
        typeId: string;
        currentStage: string | null;
        requesterId: string;
        assignedUserId: string | null;
        assignedDeptId: string | null;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
    }>;
    update(id: string, b: any, u: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        data: import("@prisma/client/runtime/library").JsonValue;
        currentStageId: string | null;
        completedAt: Date | null;
        title: string;
        dueDate: Date | null;
        priority: string;
        requestNumber: string;
        typeId: string;
        currentStage: string | null;
        requesterId: string;
        assignedUserId: string | null;
        assignedDeptId: string | null;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
    }>;
    remove(id: string, u: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        data: import("@prisma/client/runtime/library").JsonValue;
        currentStageId: string | null;
        completedAt: Date | null;
        title: string;
        dueDate: Date | null;
        priority: string;
        requestNumber: string;
        typeId: string;
        currentStage: string | null;
        requesterId: string;
        assignedUserId: string | null;
        assignedDeptId: string | null;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
    }>;
    executeAction(id: string, b: any, u: any): Promise<{
        comments: ({
            author: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            authorId: string;
            requestId: string;
        })[];
        type: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            icon: string;
            color: string;
            fields: import("@prisma/client/runtime/library").JsonValue;
            blueprintId: string | null;
            prefix: string;
        };
        instance: {
            blueprint: {
                stages: {
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
                }[];
            } & {
                id: string;
                isActive: boolean;
                organizationId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
            };
            steps: ({
                stage: {
                    id: string;
                    name: string;
                };
                actor: {
                    firstName: string;
                    lastName: string;
                    id: string;
                };
            } & {
                id: string;
                completedAt: Date | null;
                actorId: string | null;
                instanceId: string;
                stageId: string | null;
                stageName: string;
                note: string | null;
                enteredAt: Date;
                actionName: string | null;
                actionLabel: string | null;
                stepStatus: string;
            })[];
        } & {
            id: string;
            organizationId: string;
            blueprintId: string;
            currentStageId: string | null;
            startedAt: Date;
            completedAt: Date | null;
            requestId: string;
        };
        attachments: ({
            uploader: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            name: string;
            url: string;
            mimeType: string | null;
            size: number | null;
            requestId: string;
            uploaderId: string;
        })[];
        requester: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedUser: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
        assignedDept: {
            id: string;
            name: string;
        };
        currentStageRef: {
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
        };
        events: ({
            actor: {
                firstName: string;
                lastName: string;
                id: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue | null;
            title: string;
            actorId: string | null;
            requestId: string;
            eventType: string;
        })[];
    } & {
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        data: import("@prisma/client/runtime/library").JsonValue;
        currentStageId: string | null;
        completedAt: Date | null;
        title: string;
        dueDate: Date | null;
        priority: string;
        requestNumber: string;
        typeId: string;
        currentStage: string | null;
        requesterId: string;
        assignedUserId: string | null;
        assignedDeptId: string | null;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
    }>;
    addComment(id: string, b: any, u: any): Promise<{
        author: {
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        authorId: string;
        requestId: string;
    }>;
}
