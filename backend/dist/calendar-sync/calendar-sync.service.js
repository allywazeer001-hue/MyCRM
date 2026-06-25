"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CalendarSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarSyncService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const google_calendar_provider_1 = require("./google-calendar.provider");
let CalendarSyncService = CalendarSyncService_1 = class CalendarSyncService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(CalendarSyncService_1.name);
    }
    get clientId() { return this.config.get('GOOGLE_CLIENT_ID') ?? ''; }
    get clientSecret() { return this.config.get('GOOGLE_CLIENT_SECRET') ?? ''; }
    get redirectUri() { return this.config.get('GOOGLE_REDIRECT_URI') ?? ''; }
    get frontendUrl() { return (this.config.get('FRONTEND_URL') ?? 'http://localhost:3000').split(',')[0]; }
    isConfigured() {
        return Boolean(this.clientId && this.clientSecret && this.redirectUri);
    }
    buildProvider(connection) {
        return new google_calendar_provider_1.GoogleCalendarProvider(connection.accessToken, connection.refreshToken, this.clientId, this.clientSecret, this.redirectUri, async (newToken, expiresAt) => {
            await this.prisma.userCalendarConnection.update({
                where: { id: connection.id },
                data: { accessToken: newToken, tokenExpiresAt: expiresAt },
            });
        });
    }
    getAuthUrl(userId, orgId, returnTo) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Google is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env');
        }
        const state = Buffer.from(JSON.stringify({ userId, orgId, returnTo, ts: Date.now() })).toString('base64url');
        return google_calendar_provider_1.GoogleCalendarProvider.getAuthUrl(this.clientId, this.clientSecret, this.redirectUri, state);
    }
    async handleOAuthCallback(code, state) {
        let userId, orgId, returnTo;
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
            userId = decoded.userId;
            orgId = decoded.orgId;
            returnTo = decoded.returnTo;
        }
        catch {
            throw new common_1.BadRequestException('Invalid OAuth state');
        }
        const tokens = await google_calendar_provider_1.GoogleCalendarProvider.exchangeCode(code, this.clientId, this.clientSecret, this.redirectUri);
        await this.prisma.userCalendarConnection.upsert({
            where: { userId_provider: { userId, provider: 'google' } },
            create: {
                userId,
                provider: 'google',
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                tokenExpiresAt: tokens.expiresAt,
                isActive: true,
                syncMode: 'manual',
                syncTasks: false,
                taskSyncMode: 'all',
                organizationId: orgId,
            },
            update: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken ?? undefined,
                tokenExpiresAt: tokens.expiresAt,
                isActive: true,
            },
        });
        const destination = returnTo ?? '/settings/calendar-sync';
        const sep = destination.includes('?') ? '&' : '?';
        return `${this.frontendUrl}${destination}${sep}google_connected=true`;
    }
    async disconnect(userId) {
        await this.prisma.userCalendarConnection.deleteMany({
            where: { userId, provider: 'google' },
        });
    }
    async getStatus(userId) {
        const conn = await this.prisma.userCalendarConnection.findFirst({
            where: { userId, provider: 'google', isActive: true },
            select: {
                id: true, selectedCalendarId: true, calendarName: true,
                syncMode: true, syncTasks: true, taskSyncMode: true, defaultReminders: true,
                createdAt: true,
            },
        });
        return {
            connected: !!conn,
            configured: this.isConfigured(),
            selectedCalendarId: conn?.selectedCalendarId ?? null,
            calendarName: conn?.calendarName ?? null,
            syncMode: conn?.syncMode ?? 'manual',
            syncTasks: conn?.syncTasks ?? false,
            taskSyncMode: conn?.taskSyncMode ?? 'all',
            defaultReminders: conn?.defaultReminders ?? [15],
            connectedSince: conn?.createdAt ?? null,
        };
    }
    async listCalendars(userId) {
        const conn = await this.requireConnection(userId);
        const provider = this.buildProvider(conn);
        return provider.listCalendars();
    }
    async createCloudBoxCalendar(userId) {
        const conn = await this.requireConnection(userId);
        const provider = this.buildProvider(conn);
        const cal = await provider.createCalendar('CloudBox');
        await this.prisma.userCalendarConnection.update({
            where: { id: conn.id },
            data: { selectedCalendarId: cal.id, calendarName: cal.name },
        });
        return cal;
    }
    async saveSettings(userId, dto) {
        const conn = await this.requireConnection(userId);
        await this.prisma.userCalendarConnection.update({
            where: { id: conn.id },
            data: {
                selectedCalendarId: dto.selectedCalendarId,
                calendarName: dto.calendarName,
                syncMode: dto.syncMode,
                syncTasks: dto.syncTasks,
                taskSyncMode: dto.taskSyncMode,
                defaultReminders: dto.defaultReminders ? JSON.stringify(dto.defaultReminders) : undefined,
            },
        });
        return this.getStatus(userId);
    }
    async syncTaskRecord(task, userId, action) {
        try {
            const conn = await this.prisma.userCalendarConnection.findFirst({
                where: { userId, provider: 'google', isActive: true },
            });
            if (!conn || !conn.selectedCalendarId)
                return;
            if (!conn.syncTasks)
                return;
            if (conn.taskSyncMode === 'with_due_date' && !task.dueDate)
                return;
            if (conn.taskSyncMode === 'assigned' && task.assignedToId !== userId)
                return;
            const provider = this.buildProvider(conn);
            const calId = conn.selectedCalendarId;
            const reminders = conn.defaultReminders ?? [15];
            if (action === 'delete') {
                const mapping = await this.prisma.calendarEventMapping.findFirst({
                    where: { connectionId: conn.id, recordType: 'task', recordId: task.id },
                });
                if (mapping) {
                    await provider.deleteEvent(calId, mapping.googleEventId);
                    await this.prisma.calendarEventMapping.delete({ where: { id: mapping.id } });
                }
                return;
            }
            const event = this.taskToEvent(task, userId, reminders);
            const existing = await this.prisma.calendarEventMapping.findFirst({
                where: { connectionId: conn.id, recordType: 'task', recordId: task.id },
            });
            if (existing) {
                await provider.updateEvent(calId, existing.googleEventId, event);
                await this.prisma.calendarEventMapping.update({
                    where: { id: existing.id },
                    data: { syncStatus: 'synced', lastSyncedAt: new Date(), syncError: null },
                });
            }
            else {
                if (!task.dueDate && !event.startAt)
                    return;
                const result = await provider.createEvent(calId, event);
                await this.prisma.calendarEventMapping.create({
                    data: {
                        connectionId: conn.id,
                        recordType: 'task',
                        recordId: task.id,
                        googleEventId: result.eventId,
                        calendarId: calId,
                        syncStatus: 'synced',
                        lastSyncedAt: new Date(),
                        organizationId: conn.organizationId,
                    },
                });
            }
        }
        catch (err) {
            this.logger.error(`Calendar sync failed for task ${task?.id}: ${err?.message}`);
            try {
                const conn = await this.prisma.userCalendarConnection.findFirst({ where: { userId } });
                if (conn) {
                    await this.prisma.calendarEventMapping.updateMany({
                        where: { connectionId: conn.id, recordType: 'task', recordId: task?.id },
                        data: { syncStatus: 'failed', syncError: err?.message?.slice(0, 500) },
                    });
                }
            }
            catch { }
        }
    }
    async bulkSyncTasks(userId, orgId) {
        const conn = await this.requireConnection(userId);
        if (!conn.selectedCalendarId)
            throw new common_1.BadRequestException('No calendar selected');
        const tasks = await this.prisma.$queryRawUnsafe(`SELECT id, title, description, status, dueDate, reminderAt, priority, assignedToId
       FROM workspace_tasks WHERE organizationId = ? AND status != 'done' AND dueDate IS NOT NULL
       ORDER BY dueDate ASC LIMIT 200`, orgId);
        let synced = 0, failed = 0;
        for (const task of tasks) {
            try {
                await this.syncTaskRecord(task, userId, 'create');
                synced++;
            }
            catch {
                failed++;
            }
        }
        return { synced, failed };
    }
    async getSyncStatusForTasks(taskIds, userId) {
        if (!taskIds.length)
            return {};
        const conn = await this.prisma.userCalendarConnection.findFirst({
            where: { userId, provider: 'google', isActive: true },
            select: { id: true },
        });
        if (!conn)
            return {};
        const mappings = await this.prisma.calendarEventMapping.findMany({
            where: { connectionId: conn.id, recordType: 'task', recordId: { in: taskIds } },
            select: { recordId: true, syncStatus: true },
        });
        return Object.fromEntries(mappings.map(m => [m.recordId, m.syncStatus]));
    }
    async removeSyncForTask(taskId, userId) {
        const conn = await this.prisma.userCalendarConnection.findFirst({
            where: { userId, provider: 'google', isActive: true },
        });
        if (!conn)
            return;
        const mapping = await this.prisma.calendarEventMapping.findFirst({
            where: { connectionId: conn.id, recordType: 'task', recordId: taskId },
        });
        if (!mapping)
            return;
        try {
            const provider = this.buildProvider(conn);
            await provider.deleteEvent(mapping.calendarId, mapping.googleEventId);
        }
        catch { }
        await this.prisma.calendarEventMapping.delete({ where: { id: mapping.id } });
    }
    async requireConnection(userId) {
        const conn = await this.prisma.userCalendarConnection.findFirst({
            where: { userId, provider: 'google', isActive: true },
        });
        if (!conn)
            throw new common_1.NotFoundException('Google Calendar not connected');
        return conn;
    }
    taskToEvent(task, userId, reminders) {
        const startAt = task.dueDate ? new Date(task.dueDate) : new Date();
        const allDay = task.dueDate ? !this.hasTime(new Date(task.dueDate)) : true;
        const endAt = new Date(startAt.getTime() + (allDay ? 0 : 3_600_000));
        const link = `${this.frontendUrl}/workspace`;
        let description = task.description ?? '';
        if (description)
            description += '\n\n';
        description += `Priority: ${task.priority ?? 'medium'}\nStatus: ${task.status ?? 'todo'}`;
        return {
            title: task.title,
            description,
            startAt,
            endAt,
            allDay,
            reminders: task.reminderAt ? [] : reminders,
            link,
        };
    }
    hasTime(d) {
        return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
    }
};
exports.CalendarSyncService = CalendarSyncService;
exports.CalendarSyncService = CalendarSyncService = CalendarSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], CalendarSyncService);
//# sourceMappingURL=calendar-sync.service.js.map