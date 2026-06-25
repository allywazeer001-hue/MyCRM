import { Response } from 'express';
import { CalendarSyncService } from './calendar-sync.service';
import { GoogleSheetsService } from './google-sheets.service';
export declare class CalendarSyncController {
    private readonly svc;
    private readonly sheets;
    private readonly logger;
    constructor(svc: CalendarSyncService, sheets: GoogleSheetsService);
    getAuthUrl(user: any, returnTo?: string): {
        url: string;
    };
    handleCallback(code: string, state: string, res: Response): Promise<void>;
    disconnect(user: any): Promise<void>;
    getStatus(user: any): Promise<{
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
    listCalendars(user: any): Promise<import("./calendar-provider.interface").CalendarInfo[]>;
    createCloudBoxCalendar(user: any): Promise<import("./calendar-provider.interface").CalendarInfo>;
    saveSettings(user: any, body: any): Promise<{
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
    bulkSyncTasks(user: any): Promise<{
        synced: number;
        failed: number;
    }>;
    syncSingleTask(): {
        message: string;
    };
    removeSyncForTask(id: string, user: any): Promise<void>;
    getSyncStatusForTasks(user: any, taskIds: string[]): Promise<Record<string, string>>;
    listSheets(user: any): Promise<import("./google-sheets.service").SheetFile[]>;
    createSheet(user: any, title: string): Promise<{
        id: string;
        name: string;
    }>;
    getSheetTabs(user: any, spreadsheetId: string): Promise<string[]>;
}
