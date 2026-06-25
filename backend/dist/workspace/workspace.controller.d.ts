import { WorkspaceService } from './workspace.service';
export declare class WorkspaceController {
    private svc;
    constructor(svc: WorkspaceService);
    summary(user: any): Promise<{
        todayTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        assignedToMe: number;
        notes: number;
    }>;
    calendar(user: any, year: string, month: string): Promise<Record<string, string[]>>;
    tasks(user: any, filter: string, date: string): Promise<{
        id: any;
        title: any;
        description: any;
        status: any;
        priority: any;
        pinned: boolean;
        dueDate: string;
        reminderAt: string;
        createdAt: string;
        assignedBy: {
            id: any;
            firstName: any;
            lastName: any;
            avatar: any;
            jobTitle: any;
        };
        assignedTo: {
            id: any;
            firstName: any;
            lastName: any;
            avatar: any;
            jobTitle: any;
        };
        department: {
            id: any;
            name: any;
            color: any;
        };
    }[]>;
    createTask(user: any, body: any): Promise<{
        id: any;
        title: any;
        description: any;
        status: any;
        priority: any;
        pinned: boolean;
        dueDate: string;
        reminderAt: string;
        createdAt: string;
        assignedBy: {
            id: any;
            firstName: any;
            lastName: any;
            avatar: any;
            jobTitle: any;
        };
        assignedTo: {
            id: any;
            firstName: any;
            lastName: any;
            avatar: any;
            jobTitle: any;
        };
        department: {
            id: any;
            name: any;
            color: any;
        };
    }>;
    updateTask(id: string, user: any, body: any): Promise<{
        id: any;
        title: any;
        description: any;
        status: any;
        priority: any;
        pinned: boolean;
        dueDate: string;
        reminderAt: string;
        createdAt: string;
        assignedBy: {
            id: any;
            firstName: any;
            lastName: any;
            avatar: any;
            jobTitle: any;
        };
        assignedTo: {
            id: any;
            firstName: any;
            lastName: any;
            avatar: any;
            jobTitle: any;
        };
        department: {
            id: any;
            name: any;
            color: any;
        };
    }>;
    deleteTask(id: string, user: any): Promise<void>;
    notes(user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
        createdById: string;
        content: string;
        pinned: boolean;
    }[]>;
    createNote(user: any, body: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
        createdById: string;
        content: string;
        pinned: boolean;
    }>;
    updateNote(id: string, user: any, body: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
        createdById: string;
        content: string;
        pinned: boolean;
    }>;
    deleteNote(id: string, user: any): Promise<void>;
}
