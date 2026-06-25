"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarProvider = void 0;
const googleapis_1 = require("googleapis");
class GoogleCalendarProvider {
    constructor(accessToken, refreshToken, clientId, clientSecret, redirectUri, onTokenRefresh) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.onTokenRefresh = onTokenRefresh;
        const auth = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        auth.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken ?? undefined,
        });
        auth.on('tokens', async (tokens) => {
            if (tokens.access_token && onTokenRefresh) {
                const expiresAt = tokens.expiry_date
                    ? new Date(tokens.expiry_date)
                    : new Date(Date.now() + 3_600_000);
                await onTokenRefresh(tokens.access_token, expiresAt);
            }
        });
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth });
    }
    async listCalendars() {
        const res = await this.calendar.calendarList.list({ minAccessRole: 'writer' });
        return (res.data.items ?? []).map(c => ({
            id: c.id ?? '',
            name: c.summary ?? 'Unnamed',
            isPrimary: c.primary ?? false,
        }));
    }
    async createCalendar(name) {
        const res = await this.calendar.calendars.insert({ requestBody: { summary: name } });
        return { id: res.data.id ?? '', name: res.data.summary ?? name };
    }
    async createEvent(calendarId, event) {
        const res = await this.calendar.events.insert({
            calendarId,
            requestBody: this.buildBody(event),
        });
        return { eventId: res.data.id ?? '', calendarId, htmlLink: res.data.htmlLink ?? undefined };
    }
    async updateEvent(calendarId, eventId, event) {
        await this.calendar.events.patch({
            calendarId,
            eventId,
            requestBody: this.buildBody(event),
        });
    }
    async deleteEvent(calendarId, eventId) {
        try {
            await this.calendar.events.delete({ calendarId, eventId });
        }
        catch (err) {
            if (err?.code !== 410 && err?.status !== 404)
                throw err;
        }
    }
    buildBody(event) {
        const body = {
            summary: event.title,
            location: event.location,
        };
        let desc = event.description ?? '';
        if (event.link)
            desc += `\n\nView in CloudBox: ${event.link}`;
        body.description = desc || undefined;
        if (event.startAt) {
            if (event.allDay) {
                const d = event.startAt.toISOString().split('T')[0];
                const eD = (event.endAt ?? event.startAt).toISOString().split('T')[0];
                body.start = { date: d };
                body.end = { date: eD };
            }
            else {
                body.start = { dateTime: event.startAt.toISOString() };
                body.end = { dateTime: (event.endAt ?? new Date(event.startAt.getTime() + 3_600_000)).toISOString() };
            }
        }
        if (event.reminders?.length) {
            body.reminders = {
                useDefault: false,
                overrides: event.reminders.map(m => ({ method: 'popup', minutes: m })),
            };
        }
        else {
            body.reminders = { useDefault: true };
        }
        return body;
    }
    static getAuthUrl(clientId, clientSecret, redirectUri, state) {
        const auth = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
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
    static async exchangeCode(code, clientId, clientSecret, redirectUri) {
        const auth = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await auth.getToken(code);
        return {
            accessToken: tokens.access_token ?? '',
            refreshToken: tokens.refresh_token ?? null,
            expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3_600_000),
        };
    }
}
exports.GoogleCalendarProvider = GoogleCalendarProvider;
//# sourceMappingURL=google-calendar.provider.js.map