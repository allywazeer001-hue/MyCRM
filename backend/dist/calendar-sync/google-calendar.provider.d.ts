import type { ICalendarProvider, CalendarEvent, CreateEventResult, CalendarInfo } from './calendar-provider.interface';
export declare class GoogleCalendarProvider implements ICalendarProvider {
    private readonly accessToken;
    private readonly refreshToken;
    private readonly clientId;
    private readonly clientSecret;
    private readonly redirectUri;
    private readonly onTokenRefresh?;
    private calendar;
    constructor(accessToken: string, refreshToken: string | null, clientId: string, clientSecret: string, redirectUri: string, onTokenRefresh?: (accessToken: string, expiresAt: Date) => Promise<void>);
    listCalendars(): Promise<CalendarInfo[]>;
    createCalendar(name: string): Promise<CalendarInfo>;
    createEvent(calendarId: string, event: CalendarEvent): Promise<CreateEventResult>;
    updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<void>;
    deleteEvent(calendarId: string, eventId: string): Promise<void>;
    private buildBody;
    static getAuthUrl(clientId: string, clientSecret: string, redirectUri: string, state: string): string;
    static exchangeCode(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<{
        accessToken: string;
        refreshToken: string | null;
        expiresAt: Date;
    }>;
}
