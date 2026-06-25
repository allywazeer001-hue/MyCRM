import { google, calendar_v3 } from 'googleapis';
import type { ICalendarProvider, CalendarEvent, CreateEventResult, CalendarInfo } from './calendar-provider.interface';

export class GoogleCalendarProvider implements ICalendarProvider {
  private calendar: calendar_v3.Calendar;

  constructor(
    private readonly accessToken: string,
    private readonly refreshToken: string | null,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly onTokenRefresh?: (accessToken: string, expiresAt: Date) => Promise<void>,
  ) {
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken ?? undefined,
    });
    // Persist refreshed tokens automatically
    auth.on('tokens', async (tokens) => {
      if (tokens.access_token && onTokenRefresh) {
        const expiresAt = tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3_600_000);
        await onTokenRefresh(tokens.access_token, expiresAt);
      }
    });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const res = await this.calendar.calendarList.list({ minAccessRole: 'writer' });
    return (res.data.items ?? []).map(c => ({
      id: c.id ?? '',
      name: c.summary ?? 'Unnamed',
      isPrimary: c.primary ?? false,
    }));
  }

  async createCalendar(name: string): Promise<CalendarInfo> {
    const res = await this.calendar.calendars.insert({ requestBody: { summary: name } });
    return { id: res.data.id ?? '', name: res.data.summary ?? name };
  }

  async createEvent(calendarId: string, event: CalendarEvent): Promise<CreateEventResult> {
    const res = await this.calendar.events.insert({
      calendarId,
      requestBody: this.buildBody(event),
    });
    return { eventId: res.data.id ?? '', calendarId, htmlLink: res.data.htmlLink ?? undefined };
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    await this.calendar.events.patch({
      calendarId,
      eventId,
      requestBody: this.buildBody(event as CalendarEvent),
    });
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({ calendarId, eventId });
    } catch (err: any) {
      // 410 Gone = already deleted; ignore
      if (err?.code !== 410 && err?.status !== 404) throw err;
    }
  }

  private buildBody(event: Partial<CalendarEvent>): calendar_v3.Schema$Event {
    const body: calendar_v3.Schema$Event = {
      summary: event.title,
      location: event.location,
    };

    let desc = event.description ?? '';
    if (event.link) desc += `\n\nView in CloudBox: ${event.link}`;
    body.description = desc || undefined;

    if (event.startAt) {
      if (event.allDay) {
        const d = event.startAt.toISOString().split('T')[0];
        const eD = (event.endAt ?? event.startAt).toISOString().split('T')[0];
        body.start = { date: d };
        body.end   = { date: eD };
      } else {
        body.start = { dateTime: event.startAt.toISOString() };
        body.end   = { dateTime: (event.endAt ?? new Date(event.startAt.getTime() + 3_600_000)).toISOString() };
      }
    }

    if (event.reminders?.length) {
      body.reminders = {
        useDefault: false,
        overrides: event.reminders.map(m => ({ method: 'popup', minutes: m })),
      };
    } else {
      body.reminders = { useDefault: true };
    }

    return body;
  }

  static getAuthUrl(clientId: string, clientSecret: string, redirectUri: string, state: string): string {
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ],
      state,
    });
  }

  static async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date }> {
    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await auth.getToken(code);
    return {
      accessToken: tokens.access_token ?? '',
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3_600_000),
    };
  }
}
