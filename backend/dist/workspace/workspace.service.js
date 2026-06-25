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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const calendar_sync_service_1 = require("../calendar-sync/calendar-sync.service");
const crypto_1 = require("crypto");
function newId() {
    return (0, crypto_1.randomUUID)();
}
function mapTask(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        status: row.status,
        priority: row.priority,
        pinned: Boolean(row.pinned),
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : undefined,
        reminderAt: row.reminderAt ? new Date(row.reminderAt).toISOString() : undefined,
        createdAt: new Date(row.createdAt).toISOString(),
        assignedBy: {
            id: row.ab_id,
            firstName: row.ab_first,
            lastName: row.ab_last,
            avatar: row.ab_avatar || undefined,
            jobTitle: row.ab_job || undefined,
        },
        assignedTo: row.at_id ? {
            id: row.at_id,
            firstName: row.at_first,
            lastName: row.at_last,
            avatar: row.at_avatar || undefined,
            jobTitle: row.at_job || undefined,
        } : undefined,
        department: row.d_id ? {
            id: row.d_id,
            name: row.d_name,
            color: row.d_color,
        } : undefined,
    };
}
const TASK_SQL = `
  SELECT
    t.id, t.title, t.description, t.status, t.priority,
    t.pinned, t.dueDate, t.reminderAt, t.createdAt,
    t.assignedById, t.assignedToId, t.departmentId,
    ab.id       AS ab_id,  ab.firstName AS ab_first, ab.lastName AS ab_last,
    ab.avatar   AS ab_avatar, ab.jobTitle  AS ab_job,
    asgn.id     AS at_id,  asgn.firstName AS at_first, asgn.lastName AS at_last,
    asgn.avatar AS at_avatar, asgn.jobTitle AS at_job,
    d.id AS d_id, d.name AS d_name, d.color AS d_color
  FROM workspace_tasks t
  JOIN  users ab   ON ab.id   = t.assignedById
  LEFT JOIN users asgn ON asgn.id = t.assignedToId
  LEFT JOIN departments d ON d.id = t.departmentId
`;
let WorkspaceService = class WorkspaceService {
    constructor(prisma, notifications, calendarSync) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.calendarSync = calendarSync;
    }
    async getSummary(userId, orgId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }, select: { departmentId: true },
        });
        const deptId = user?.departmentId;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86_400_000);
        const visOr = deptId
            ? `(t.assignedById = ? OR t.assignedToId = ? OR t.departmentId = ?)`
            : `(t.assignedById = ? OR t.assignedToId = ?)`;
        const visArgs = (extra) => deptId ? [userId, userId, deptId, ...extra] : [userId, userId, ...extra];
        const assnOr = deptId ? `(t.assignedToId = ? OR t.departmentId = ?)` : `t.assignedToId = ?`;
        const assnArgs = deptId ? [userId, deptId] : [userId];
        const [today, pending, overdue, assigned] = await Promise.all([
            this.prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM workspace_tasks t WHERE t.organizationId = ? AND ${visOr} AND t.dueDate >= ? AND t.dueDate < ?`, orgId, ...visArgs([todayStart, todayEnd])),
            this.prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM workspace_tasks t WHERE t.organizationId = ? AND ${visOr} AND t.status IN ('todo','in_progress')`, orgId, ...visArgs([])),
            this.prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM workspace_tasks t WHERE t.organizationId = ? AND ${visOr} AND t.dueDate < ? AND t.status != 'done'`, orgId, ...visArgs([todayStart])),
            this.prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM workspace_tasks t WHERE t.organizationId = ? AND ${assnOr} AND t.status != 'done'`, orgId, ...assnArgs),
        ]);
        const notes = await this.prisma.workspaceNote.count({
            where: { organizationId: orgId, createdById: userId },
        });
        const n = (rows) => Number(rows[0]?.cnt ?? 0);
        return {
            todayTasks: n(today),
            pendingTasks: n(pending),
            overdueTasks: n(overdue),
            assignedToMe: n(assigned),
            notes,
        };
    }
    async getCalendarDots(userId, orgId, year, month) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }, select: { departmentId: true },
        });
        const deptId = user?.departmentId;
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const orClause = deptId
            ? `(t.assignedById = ? OR t.assignedToId = ? OR t.departmentId = ?)`
            : `(t.assignedById = ? OR t.assignedToId = ?)`;
        const orArgs = deptId ? [userId, userId, deptId] : [userId, userId];
        const rows = await this.prisma.$queryRawUnsafe(`SELECT t.dueDate, t.priority FROM workspace_tasks t
       WHERE t.organizationId = ? AND t.dueDate >= ? AND t.dueDate < ? AND t.status != 'done' AND ${orClause}`, orgId, start, end, ...orArgs);
        const dots = {};
        for (const t of rows) {
            if (!t.dueDate)
                continue;
            const key = new Date(t.dueDate).toISOString().split('T')[0];
            if (!dots[key])
                dots[key] = [];
            dots[key].push(t.priority);
        }
        return dots;
    }
    async getTasks(userId, orgId, filter, date) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }, select: { departmentId: true },
        });
        const deptId = user?.departmentId;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86_400_000);
        const visOr = deptId
            ? `(t.assignedById = ? OR t.assignedToId = ? OR t.departmentId = ?)`
            : `(t.assignedById = ? OR t.assignedToId = ?)`;
        const visArgs = deptId ? [userId, userId, deptId] : [userId, userId];
        let where = '';
        let params = [];
        if (date) {
            const d = new Date(date);
            const dEnd = new Date(d.getTime() + 86_400_000);
            where = `t.organizationId = ? AND ${visOr} AND t.dueDate >= ? AND t.dueDate < ?`;
            params = [orgId, ...visArgs, d, dEnd];
        }
        else {
            switch (filter) {
                case 'pending':
                    where = `t.organizationId = ? AND ${visOr} AND t.status IN ('todo','in_progress')`;
                    params = [orgId, ...visArgs];
                    break;
                case 'today':
                    where = `t.organizationId = ? AND ${visOr} AND t.dueDate >= ? AND t.dueDate < ? AND t.status != 'done'`;
                    params = [orgId, ...visArgs, todayStart, todayEnd];
                    break;
                case 'scheduled':
                case 'upcoming':
                    where = `t.organizationId = ? AND ${visOr} AND t.dueDate >= ? AND t.status != 'done'`;
                    params = [orgId, ...visArgs, todayEnd];
                    break;
                case 'overdue':
                    where = `t.organizationId = ? AND ${visOr} AND t.dueDate < ? AND t.status != 'done'`;
                    params = [orgId, ...visArgs, todayStart];
                    break;
                case 'assigned_to_me': {
                    const assnOr = deptId ? `(t.assignedToId = ? OR t.departmentId = ?)` : `t.assignedToId = ?`;
                    const assnArgs = deptId ? [userId, deptId] : [userId];
                    where = `t.organizationId = ? AND ${assnOr} AND t.status != 'done'`;
                    params = [orgId, ...assnArgs];
                    break;
                }
                default:
                    where = `t.organizationId = ? AND ${visOr}`;
                    params = [orgId, ...visArgs];
            }
        }
        const sql = `${TASK_SQL} WHERE ${where} ORDER BY t.pinned DESC, t.status ASC, t.dueDate ASC, t.createdAt DESC`;
        const rows = await this.prisma.$queryRawUnsafe(sql, ...params);
        return rows.map(mapTask);
    }
    async createTask(userId, orgId, body) {
        const creator = await this.prisma.user.findUnique({
            where: { id: userId }, select: { firstName: true, lastName: true },
        });
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Someone';
        const id = newId();
        const assignedToId = body.assignedToId ?? null;
        const departmentId = body.departmentId ?? null;
        const taskTitle = body.title;
        await this.prisma.$executeRaw `
      INSERT INTO workspace_tasks
        (id, title, description, status, priority, pinned, dueDate, reminderAt,
         assignedToId, assignedById, departmentId, organizationId, createdAt, updatedAt)
      VALUES (
        ${id},
        ${taskTitle},
        ${body.description ?? null},
        ${body.status ?? 'todo'},
        ${body.priority ?? 'medium'},
        ${body.pinned ? 1 : 0},
        ${body.dueDate ? new Date(body.dueDate) : null},
        ${body.reminderAt ? new Date(body.reminderAt) : null},
        ${assignedToId},
        ${userId},
        ${departmentId},
        ${orgId},
        NOW(), NOW()
      )
    `;
        const rows = await this.prisma.$queryRawUnsafe(`${TASK_SQL} WHERE t.id = ?`, id);
        const task = rows[0] ? mapTask(rows[0]) : null;
        if (assignedToId && assignedToId !== userId) {
            await this.notifications.create(assignedToId, orgId, {
                title: 'New task assigned to you',
                message: `"${taskTitle}" was assigned to you by ${creatorName}`,
                type: 'INFO',
                link: '/workspace',
            });
        }
        if (departmentId) {
            const dept = await this.prisma.department.findUnique({
                where: { id: departmentId }, select: { name: true },
            });
            const deptName = dept?.name ?? 'your department';
            const members = await this.prisma.user.findMany({
                where: { departmentId, organizationId: orgId, isActive: true, id: { not: userId } },
                select: { id: true },
            });
            await Promise.all(members.map(m => this.notifications.create(m.id, orgId, {
                title: 'New task for your department',
                message: `"${taskTitle}" was assigned to ${deptName} by ${creatorName}`,
                type: 'INFO',
                link: '/workspace',
            })));
        }
        if (this.calendarSync && task) {
            this.calendarSync.syncTaskRecord(task, userId, 'create').catch(() => null);
        }
        return task;
    }
    async updateTask(id, userId, orgId, body) {
        const existing = await this.prisma.$queryRawUnsafe(`SELECT id, assignedById, assignedToId, departmentId, title
       FROM workspace_tasks WHERE id = ? AND organizationId = ?`, id, orgId);
        if (!existing.length)
            throw new common_1.NotFoundException('Task not found');
        const task = existing[0];
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { departmentId: true, firstName: true, lastName: true },
        });
        const canEdit = task.assignedById === userId ||
            task.assignedToId === userId ||
            (task.departmentId && task.departmentId === user?.departmentId);
        if (!canEdit)
            throw new common_1.ForbiddenException('Not authorized');
        const setClauses = [];
        const setParams = [];
        if (body.title !== undefined) {
            setClauses.push('title = ?');
            setParams.push(body.title);
        }
        if (body.description !== undefined) {
            setClauses.push('description = ?');
            setParams.push(body.description);
        }
        if (body.status !== undefined) {
            setClauses.push('status = ?');
            setParams.push(body.status);
        }
        if (body.priority !== undefined) {
            setClauses.push('priority = ?');
            setParams.push(body.priority);
        }
        if (body.pinned !== undefined) {
            setClauses.push('pinned = ?');
            setParams.push(body.pinned ? 1 : 0);
        }
        if (body.dueDate !== undefined) {
            setClauses.push('dueDate = ?');
            setParams.push(body.dueDate ? new Date(body.dueDate) : null);
        }
        if (body.reminderAt !== undefined) {
            setClauses.push('reminderAt = ?');
            setParams.push(body.reminderAt ? new Date(body.reminderAt) : null);
        }
        if (body.assignedToId !== undefined) {
            setClauses.push('assignedToId = ?');
            setParams.push(body.assignedToId ?? null);
        }
        if (body.departmentId !== undefined) {
            setClauses.push('departmentId = ?');
            setParams.push(body.departmentId ?? null);
        }
        if (setClauses.length > 0) {
            setClauses.push('updatedAt = NOW()');
            await this.prisma.$executeRawUnsafe(`UPDATE workspace_tasks SET ${setClauses.join(', ')} WHERE id = ?`, ...setParams, id);
        }
        if (body.assignedToId && body.assignedToId !== task.assignedToId && body.assignedToId !== userId) {
            const creatorName = user ? `${user.firstName} ${user.lastName}` : 'Someone';
            await this.notifications.create(body.assignedToId, orgId, {
                title: 'Task assigned to you',
                message: `"${task.title}" was assigned to you by ${creatorName}`,
                type: 'INFO',
                link: '/workspace',
            });
        }
        const rows = await this.prisma.$queryRawUnsafe(`${TASK_SQL} WHERE t.id = ?`, id);
        const updated = rows[0] ? mapTask(rows[0]) : null;
        if (this.calendarSync && updated) {
            this.calendarSync.syncTaskRecord(updated, userId, 'update').catch(() => null);
        }
        return updated;
    }
    async deleteTask(id, userId, orgId) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT id, assignedById FROM workspace_tasks WHERE id = ? AND organizationId = ?`, id, orgId);
        if (!rows.length)
            throw new common_1.NotFoundException('Task not found');
        if (rows[0].assignedById !== userId)
            throw new common_1.ForbiddenException('Only the creator can delete this task');
        if (this.calendarSync) {
            this.calendarSync.syncTaskRecord({ id }, userId, 'delete').catch(() => null);
        }
        await this.prisma.$executeRawUnsafe(`DELETE FROM workspace_tasks WHERE id = ?`, id);
    }
    async getNotes(userId, orgId) {
        return this.prisma.workspaceNote.findMany({
            where: { organizationId: orgId, createdById: userId },
            orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
        });
    }
    async createNote(userId, orgId, body) {
        return this.prisma.workspaceNote.create({
            data: {
                content: body.content,
                color: body.color ?? 'yellow',
                pinned: body.pinned ?? false,
                createdById: userId,
                organizationId: orgId,
            },
        });
    }
    async updateNote(id, userId, orgId, body) {
        const note = await this.prisma.workspaceNote.findFirst({
            where: { id, organizationId: orgId, createdById: userId },
        });
        if (!note)
            throw new common_1.NotFoundException('Note not found');
        return this.prisma.workspaceNote.update({
            where: { id },
            data: {
                ...(body.content !== undefined && { content: body.content }),
                ...(body.color !== undefined && { color: body.color }),
                ...(body.pinned !== undefined && { pinned: body.pinned }),
            },
        });
    }
    async deleteNote(id, userId, orgId) {
        const note = await this.prisma.workspaceNote.findFirst({
            where: { id, organizationId: orgId, createdById: userId },
        });
        if (!note)
            throw new common_1.NotFoundException('Note not found');
        await this.prisma.workspaceNote.delete({ where: { id } });
    }
};
exports.WorkspaceService = WorkspaceService;
exports.WorkspaceService = WorkspaceService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        calendar_sync_service_1.CalendarSyncService])
], WorkspaceService);
//# sourceMappingURL=workspace.service.js.map