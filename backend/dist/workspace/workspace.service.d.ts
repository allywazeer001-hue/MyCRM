import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CalendarSyncService } from '../calendar-sync/calendar-sync.service';
export declare class WorkspaceService {
    private prisma;
    private notifications;
    private calendarSync;
    constructor(prisma: PrismaService, notifications: NotificationsService, calendarSync: CalendarSyncService);
    getSummary(userId: string, orgId: string): Promise<{
        todayTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        assignedToMe: number;
        notes: number;
    }>;
    getCalendarDots(userId: string, orgId: string, year: number, month: number): Promise<Record<string, string[]>>;
    getTasks(userId: string, orgId: string, filter?: string, date?: string): Promise<{
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
    createTask(userId: string, orgId: string, body: any): Promise<{
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
    updateTask(id: string, userId: string, orgId: string, body: any): Promise<{
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
    deleteTask(id: string, userId: string, orgId: string): Promise<void>;
    getNotes(userId: string, orgId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
        createdById: string;
        content: string;
        pinned: boolean;
    }[]>;
    createNote(userId: string, orgId: string, body: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
        createdById: string;
        content: string;
        pinned: boolean;
    }>;
    updateNote(id: string, userId: string, orgId: string, body: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
        createdById: string;
        content: string;
        pinned: boolean;
    }>;
    deleteNote(id: string, userId: string, orgId: string): Promise<void>;
}
