import {
  Injectable, Logger, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleCalendarProvider } from './google-calendar.provider';
import type { CalendarEvent } from './calendar-provider.interface';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Credentials helpers ─────────────────────────────────────────────────────

  private get clientId()     { return this.config.get<string>('GOOGLE_CLIENT_ID')     ?? ''; }
  private get clientSecret() { return this.config.get<string>('GOOGLE_CLIENT_SECRET') ?? ''; }
  private get redirectUri()  { return this.config.get<string>('GOOGLE_REDIRECT_URI')  ?? ''; }
  private get frontendUrl()  { return (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').split(',')[0]; }

  private isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }

  // ── Provider factory ────────────────────────────────────────────────────────

  private buildProvider(connection: any): GoogleCalendarProvider {
    return new GoogleCalendarProvider(
      connection.accessToken,
      connection.refreshToken,
      this.clientId,
      this.clientSecret,
      this.redirectUri,
      async (newToken, expiresAt) => {
        await this.prisma.userCalendarConnection.update({
          where: { id: connection.id },
          data: { accessToken: newToken, tokenExpiresAt: expiresAt },
        });
      },
    );
  }

  // ── OAuth ───────────────────────────────────────────────────────────────────

  getAuthUrl(userId: string, orgId: string, returnTo?: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Google is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env');
    }
    const state = Buffer.from(JSON.stringify({ userId, orgId, returnTo, ts: Date.now() })).toString('base64url');
    return GoogleCalendarProvider.getAuthUrl(this.clientId, this.clientSecret, this.redirectUri, state);
  }

  async handleOAuthCallback(code: string, state: string): Promise<string> {
    let userId: string, orgId: string, returnTo: string | undefined;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      userId   = decoded.userId;
      orgId    = decoded.orgId;
      returnTo = decoded.returnTo;
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    const tokens = await GoogleCalendarProvider.exchangeCode(code, this.clientId, this.clientSecret, this.redirectUri);

    await this.prisma.userCalendarConnection.upsert({
      where: { userId_provider: { userId, provider: 'google' } },
      create: {
        userId,
        provider:      'google',
        accessToken:   tokens.accessToken,
        refreshToken:  tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        isActive:      true,
        syncMode:      'manual',
        syncTasks:     false,
        taskSyncMode:  'all',
        organizationId: orgId,
      },
      update: {
        accessToken:   tokens.accessToken,
        refreshToken:  tokens.refreshToken ?? undefined,
        tokenExpiresAt: tokens.expiresAt,
        isActive:      true,
      },
    });

    // Redirect back to caller page if provided, otherwise Calendar Sync settings
    const destination = returnTo ?? '/settings/calendar-sync';
    const sep = destination.includes('?') ? '&' : '?';
    return `${this.frontendUrl}${destination}${sep}google_connected=true`;
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.userCalendarConnection.deleteMany({
      where: { userId, provider: 'google' },
    });
  }

  // ── Connection status ────────────────────────────────────────────────────────

  async getStatus(userId: string) {
    const conn = await this.prisma.userCalendarConnection.findFirst({
      where: { userId, provider: 'google', isActive: true },
      select: {
        id: true, selectedCalendarId: true, calendarName: true,
        syncMode: true, syncTasks: true, taskSyncMode: true, defaultReminders: true,
        createdAt: true,
      },
    });
    return {
      connected:         !!conn,
      configured:        this.isConfigured(),
      selectedCalendarId: conn?.selectedCalendarId ?? null,
      calendarName:       conn?.calendarName ?? null,
      syncMode:           conn?.syncMode ?? 'manual',
      syncTasks:          conn?.syncTasks ?? false,
      taskSyncMode:       conn?.taskSyncMode ?? 'all',
      defaultReminders:   (conn?.defaultReminders as number[]) ?? [15],
      connectedSince:     conn?.createdAt ?? null,
    };
  }

  // ── Calendar management ──────────────────────────────────────────────────────

  async listCalendars(userId: string) {
    const conn = await this.requireConnection(userId);
    const provider = this.buildProvider(conn);
    return provider.listCalendars();
  }

  async createCloudBoxCalendar(userId: string) {
    const conn = await this.requireConnection(userId);
    const provider = this.buildProvider(conn);
    const cal = await provider.createCalendar('CloudBox');
    await this.prisma.userCalendarConnection.update({
      where: { id: conn.id },
      data: { selectedCalendarId: cal.id, calendarName: cal.name },
    });
    return cal;
  }

  async saveSettings(userId: string, dto: {
    selectedCalendarId?: string;
    calendarName?: string;
    syncMode?: string;
    syncTasks?: boolean;
    taskSyncMode?: string;
    defaultReminders?: number[];
  }) {
    const conn = await this.requireConnection(userId);
    await this.prisma.userCalendarConnection.update({
      where: { id: conn.id },
      data: {
        selectedCalendarId: dto.selectedCalendarId,
        calendarName:       dto.calendarName,
        syncMode:           dto.syncMode,
        syncTasks:          dto.syncTasks,
        taskSyncMode:       dto.taskSyncMode,
        defaultReminders:   dto.defaultReminders ? JSON.stringify(dto.defaultReminders) : undefined,
      },
    });
    return this.getStatus(userId);
  }

  // ── Sync logic ───────────────────────────────────────────────────────────────

  async syncTaskRecord(
    task: any,
    userId: string,
    action: 'create' | 'update' | 'delete',
  ): Promise<void> {
    try {
      const conn = await this.prisma.userCalendarConnection.findFirst({
        where: { userId, provider: 'google', isActive: true },
      });
      if (!conn || !conn.selectedCalendarId) return;
      if (!conn.syncTasks) return;

      // Respect taskSyncMode filter
      if (conn.taskSyncMode === 'with_due_date' && !task.dueDate) return;
      if (conn.taskSyncMode === 'assigned' && task.assignedToId !== userId) return;

      const provider = this.buildProvider(conn);
      const calId    = conn.selectedCalendarId;
      const reminders = (conn.defaultReminders as number[] | null) ?? [15];

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
      } else {
        if (!task.dueDate && !event.startAt) return; // no date — nothing to put on calendar
        const result = await provider.createEvent(calId, event);
        await this.prisma.calendarEventMapping.create({
          data: {
            connectionId:   conn.id,
            recordType:     'task',
            recordId:       task.id,
            googleEventId:  result.eventId,
            calendarId:     calId,
            syncStatus:     'synced',
            lastSyncedAt:   new Date(),
            organizationId: conn.organizationId,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Calendar sync failed for task ${task?.id}: ${err?.message}`);
      // Mark as failed in mapping if it exists
      try {
        const conn = await this.prisma.userCalendarConnection.findFirst({ where: { userId } });
        if (conn) {
          await this.prisma.calendarEventMapping.updateMany({
            where: { connectionId: conn.id, recordType: 'task', recordId: task?.id },
            data: { syncStatus: 'failed', syncError: err?.message?.slice(0, 500) },
          });
        }
      } catch { /* ignore */ }
    }
  }

  async bulkSyncTasks(userId: string, orgId: string): Promise<{ synced: number; failed: number }> {
    const conn = await this.requireConnection(userId);
    if (!conn.selectedCalendarId) throw new BadRequestException('No calendar selected');

    const tasks: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id, title, description, status, dueDate, reminderAt, priority, assignedToId
       FROM workspace_tasks WHERE organizationId = ? AND status != 'done' AND dueDate IS NOT NULL
       ORDER BY dueDate ASC LIMIT 200`,
      orgId,
    );

    let synced = 0, failed = 0;
    for (const task of tasks) {
      try {
        await this.syncTaskRecord(task, userId, 'create');
        synced++;
      } catch { failed++; }
    }
    return { synced, failed };
  }

  async getSyncStatusForTasks(taskIds: string[], userId: string): Promise<Record<string, string>> {
    if (!taskIds.length) return {};
    const conn = await this.prisma.userCalendarConnection.findFirst({
      where: { userId, provider: 'google', isActive: true },
      select: { id: true },
    });
    if (!conn) return {};

    const mappings = await this.prisma.calendarEventMapping.findMany({
      where: { connectionId: conn.id, recordType: 'task', recordId: { in: taskIds } },
      select: { recordId: true, syncStatus: true },
    });
    return Object.fromEntries(mappings.map(m => [m.recordId, m.syncStatus]));
  }

  async removeSyncForTask(taskId: string, userId: string): Promise<void> {
    const conn = await this.prisma.userCalendarConnection.findFirst({
      where: { userId, provider: 'google', isActive: true },
    });
    if (!conn) return;
    const mapping = await this.prisma.calendarEventMapping.findFirst({
      where: { connectionId: conn.id, recordType: 'task', recordId: taskId },
    });
    if (!mapping) return;
    try {
      const provider = this.buildProvider(conn);
      await provider.deleteEvent(mapping.calendarId, mapping.googleEventId);
    } catch { /* already deleted */ }
    await this.prisma.calendarEventMapping.delete({ where: { id: mapping.id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async requireConnection(userId: string) {
    const conn = await this.prisma.userCalendarConnection.findFirst({
      where: { userId, provider: 'google', isActive: true },
    });
    if (!conn) throw new NotFoundException('Google Calendar not connected');
    return conn;
  }

  private taskToEvent(task: any, userId: string, reminders: number[]): CalendarEvent {
    const startAt = task.dueDate ? new Date(task.dueDate) : new Date();
    const allDay  = task.dueDate ? !this.hasTime(new Date(task.dueDate)) : true;
    const endAt   = new Date(startAt.getTime() + (allDay ? 0 : 3_600_000));

    const link = `${this.frontendUrl}/workspace`;
    let description = task.description ?? '';
    if (description) description += '\n\n';
    description += `Priority: ${task.priority ?? 'medium'}\nStatus: ${task.status ?? 'todo'}`;

    return {
      title: task.title,
      description,
      startAt,
      endAt,
      allDay,
      reminders: task.reminderAt ? [] : reminders, // if reminder is set on task, skip default
      link,
    };
  }

  private hasTime(d: Date): boolean {
    return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  }
}
