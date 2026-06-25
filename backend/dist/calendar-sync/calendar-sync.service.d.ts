import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class CalendarSyncService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService);
    private get clientId();
    private get clientSecret();
    private get redirectUri();
    private get frontendUrl();
    private isConfigured;
    private buildProvider;
    getAuthUrl(userId: string, orgId: string, returnTo?: string): string;
    handleOAuthCallback(code: string, state: string): Promise<string>;
    disconnect(userId: string): Promise<void>;
    getStatus(userId: string): Promise<{
        connected: boolean;
        configured: boolean;
        selectedCalendarId: string;
        calendarName: string;
        syncMode: string;
        syncTasks: boolean;
        taskSyncMode: string;
        defaultReminders: number[];
        connectedSince: Date;
    }>;
    listCalendars(userId: string): Promise<import("./calendar-provider.interface").CalendarInfo[]>;
    createCloudBoxCalendar(userId: string): Promise<import("./calendar-provider.interface").CalendarInfo>;
    saveSettings(userId: string, dto: {
        selectedCalendarId?: string;
        calendarName?: string;
        syncMode?: string;
        syncTasks?: boolean;
        taskSyncMode?: string;
        defaultReminders?: number[];
    }): Promise<{
        connected: boolean;
        configured: boolean;
        selectedCalendarId: string;
        calendarName: string;
        syncMode: string;
        syncTasks: boolean;
        taskSyncMode: string;
        defaultReminders: number[];
        connectedSince: Date;
    }>;
    syncTaskRecord(task: any, userId: string, action: 'create' | 'update' | 'delete'): Promise<void>;
    bulkSyncTasks(userId: string, orgId: string): Promise<{
        synced: number;
        failed: number;
    }>;
    getSyncStatusForTasks(taskIds: string[], userId: string): Promise<Record<string, string>>;
    removeSyncForTask(taskId: string, userId: string): Promise<void>;
    private requireConnection;
    private taskToEvent;
    private hasTime;
}
