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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
const permission_check_service_1 = require("../permissions/permission-check.service");
const USER_SELECT = {
    id: true, email: true, firstName: true, lastName: true,
    role: true, usertype: true, isActive: true, status: true, mustChangePassword: true,
    jobTitle: true, phone: true, departmentId: true, organizationId: true, createdAt: true,
    avatar: true, lastLoginAt: true, suspendedAt: true, lockedAt: true,
    department: { select: { id: true, name: true, color: true } },
};
let UsersService = class UsersService {
    constructor(prisma, permCheck) {
        this.prisma = prisma;
        this.permCheck = permCheck;
    }
    async create(orgId, data) {
        if (!data.email || !data.firstName || !data.lastName) {
            throw new common_1.BadRequestException('Email, first name, and last name are required');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            throw new common_1.BadRequestException('Invalid email address');
        }
        const existing = await this.prisma.user.findFirst({
            where: { email: data.email.toLowerCase().trim(), organizationId: orgId },
        });
        if (existing) {
            throw new common_1.ConflictException(`A user with email "${data.email}" already exists in this organisation`);
        }
        const defaultPassword = data.lastName;
        const hashed = await bcrypt.hash(defaultPassword, 12);
        const user = await this.prisma.user.create({
            data: {
                email: data.email.toLowerCase().trim(),
                firstName: data.firstName,
                lastName: data.lastName,
                password: hashed,
                role: data.role || 'USER',
                organizationId: orgId,
                departmentId: data.departmentId || null,
                jobTitle: data.jobTitle || null,
                phone: data.phone || null,
                isActive: true,
                status: 'ACTIVE',
                mustChangePassword: true,
            },
            select: USER_SELECT,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                organizationId: orgId,
                action: 'USER_CREATED',
                entityType: 'User',
                entityId: user.id,
                metadata: { createdByAdmin: true },
            },
        });
        return { ...user, tempPassword: defaultPassword };
    }
    async findAll(orgId) {
        const where = { organizationId: orgId };
        return this.prisma.user.findMany({
            where,
            select: USER_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, orgId) {
        const user = await this.prisma.user.findFirst({
            where: orgId ? { id, organizationId: orgId } : { id },
            select: USER_SELECT,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async getMyProfile(userId, orgId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, organizationId: orgId },
            select: {
                id: true, email: true, firstName: true, lastName: true,
                role: true, usertype: true, isActive: true, status: true,
                jobTitle: true, phone: true, avatar: true,
                createdAt: true, updatedAt: true, lastLoginAt: true,
                departmentId: true,
                department: { select: { id: true, name: true, color: true } },
                organization: { select: { id: true, name: true, slug: true, logo: true, website: true, description: true } },
                _count: { select: { createdRecords: true, comments: true } },
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 15,
                    select: { id: true, action: true, entityType: true, createdAt: true },
                },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const departmentPermissions = await this.getMyPermissions(userId, orgId);
        return {
            ...user,
            recentActivity: user.auditLogs,
            departmentPermissions,
        };
    }
    async update(id, orgId, data) {
        const existing = await this.findOne(id, orgId);
        const { tempPassword: _, ...patch } = data;
        if (patch.password)
            patch.password = await bcrypt.hash(patch.password, 12);
        const updated = await this.prisma.user.update({ where: { id }, data: patch, select: USER_SELECT });
        this.syncToPortalUser(existing.email, {
            firstName: patch.firstName,
            lastName: patch.lastName,
            phone: patch.phone,
        }).catch(() => { });
        return updated;
    }
    async syncToPortalUser(email, fields) {
        const portal = await this.prisma.portalUser.findFirst({ where: { email } });
        if (!portal)
            return;
        const patch = {};
        if (fields.firstName !== undefined)
            patch.firstName = fields.firstName;
        if (fields.lastName !== undefined)
            patch.lastName = fields.lastName;
        if (fields.phone !== undefined)
            patch.phone = fields.phone;
        if (Object.keys(patch).length === 0)
            return;
        await this.prisma.portalUser.update({ where: { id: portal.id }, data: patch });
    }
    async remove(id, orgId) {
        await this.findOne(id, orgId);
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false, status: 'DISABLED' },
        });
    }
    async hardDelete(id, orgId) {
        await this.findOne(id, orgId);
        const [recordCount, formCount] = await Promise.all([
            this.prisma.record.count({ where: { createdById: id } }),
            this.prisma.form.count({ where: { createdById: id } }),
        ]);
        if (recordCount > 0 || formCount > 0) {
            throw new common_1.BadRequestException(`Cannot permanently delete this user — they have created ${recordCount} record(s) and ${formCount} form(s). ` +
                `Deactivate the account instead.`);
        }
        await this.prisma.$transaction([
            this.prisma.auditLog.deleteMany({ where: { userId: id } }),
            this.prisma.notification.deleteMany({ where: { userId: id } }),
            this.prisma.comment.deleteMany({ where: { userId: id } }),
            this.prisma.view.deleteMany({ where: { createdById: id } }),
            this.prisma.dashboard.deleteMany({ where: { createdById: id } }),
            this.prisma.analyticsView.deleteMany({ where: { createdById: id } }),
            this.prisma.savedFilter.deleteMany({ where: { createdById: id } }),
            this.prisma.file.deleteMany({ where: { uploadedById: id } }),
        ]);
        return this.prisma.user.delete({ where: { id } });
    }
    async reactivate(id, orgId) {
        await this.findOne(id, orgId);
        return this.prisma.user.update({
            where: { id },
            data: { isActive: true, status: 'ACTIVE' },
        });
    }
    async suspend(id, orgId, adminId) {
        const target = await this.findOne(id, orgId);
        const auditOrgId = orgId ?? target.organizationId;
        await this.prisma.auditLog.create({
            data: { userId: adminId, organizationId: auditOrgId, action: 'USER_SUSPENDED', entityType: 'User', entityId: id, metadata: {} },
        });
        return this.prisma.user.update({
            where: { id },
            data: { status: 'SUSPENDED', suspendedAt: new Date() },
            select: USER_SELECT,
        });
    }
    async unsuspend(id, orgId, adminId) {
        const target = await this.findOne(id, orgId);
        const auditOrgId = orgId ?? target.organizationId;
        await this.prisma.auditLog.create({
            data: { userId: adminId, organizationId: auditOrgId, action: 'USER_UNSUSPENDED', entityType: 'User', entityId: id, metadata: {} },
        });
        return this.prisma.user.update({
            where: { id },
            data: { status: 'ACTIVE', suspendedAt: null },
            select: USER_SELECT,
        });
    }
    async lock(id, orgId, adminId) {
        const target = await this.findOne(id, orgId);
        const auditOrgId = orgId ?? target.organizationId;
        await this.prisma.auditLog.create({
            data: { userId: adminId, organizationId: auditOrgId, action: 'USER_LOCKED', entityType: 'User', entityId: id, metadata: {} },
        });
        return this.prisma.user.update({
            where: { id },
            data: { status: 'LOCKED', lockedAt: new Date() },
            select: USER_SELECT,
        });
    }
    async unlock(id, orgId, adminId) {
        const target = await this.findOne(id, orgId);
        const auditOrgId = orgId ?? target.organizationId;
        await this.prisma.auditLog.create({
            data: { userId: adminId, organizationId: auditOrgId, action: 'USER_UNLOCKED', entityType: 'User', entityId: id, metadata: {} },
        });
        return this.prisma.user.update({
            where: { id },
            data: { status: 'ACTIVE', lockedAt: null },
            select: USER_SELECT,
        });
    }
    async resetPassword(id, orgId, adminId) {
        const user = await this.findOne(id, orgId);
        const auditOrgId = orgId ?? user.organizationId;
        const newPassword = user.lastName;
        const hashed = await bcrypt.hash(newPassword, 12);
        await this.prisma.auditLog.create({
            data: { userId: adminId, organizationId: auditOrgId, action: 'PASSWORD_RESET', entityType: 'User', entityId: id, metadata: {} },
        });
        await this.prisma.user.update({
            where: { id },
            data: { password: hashed, mustChangePassword: true, status: 'ACTIVE' },
        });
        return { tempPassword: newPassword };
    }
    async forcePasswordReset(id, orgId, adminId) {
        const target = await this.findOne(id, orgId);
        const auditOrgId = orgId ?? target.organizationId;
        await this.prisma.auditLog.create({
            data: { userId: adminId, organizationId: auditOrgId, action: 'FORCE_PASSWORD_RESET', entityType: 'User', entityId: id, metadata: {} },
        });
        return this.prisma.user.update({
            where: { id },
            data: { mustChangePassword: true, status: 'PASSWORD_RESET_REQUIRED' },
            select: USER_SELECT,
        });
    }
    async getPermissionOverrides(userId, orgId) {
        const where = { userId, isActive: true };
        if (orgId)
            where.organizationId = orgId;
        return this.prisma.userPermissionOverride.findMany({
            where,
            include: { module: { select: { id: true, name: true, slug: true } } },
        });
    }
    async setPermissionOverride(userId, orgId, grantedById, body) {
        const target = await this.findOne(userId, orgId);
        const auditOrgId = orgId ?? target.organizationId;
        const existing = await this.prisma.userPermissionOverride.findFirst({
            where: {
                userId,
                organizationId: auditOrgId,
                moduleSlug: body.moduleSlug || null,
                isActive: true,
            },
        });
        const payload = {
            userId,
            organizationId: auditOrgId,
            moduleId: body.moduleId || null,
            moduleSlug: body.moduleSlug || null,
            canView: body.canView ?? null,
            canCreate: body.canCreate ?? null,
            canEdit: body.canEdit ?? null,
            canDelete: body.canDelete ?? null,
            canExport: body.canExport ?? null,
            canImport: body.canImport ?? null,
            canPrint: body.canPrint ?? null,
            canDashboard: body.canDashboard ?? null,
            canAnalytics: body.canAnalytics ?? null,
            canWorkflow: body.canWorkflow ?? null,
            canForms: body.canForms ?? null,
            canStudio: body.canStudio ?? null,
            reason: body.reason || null,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
            grantedById,
            isActive: true,
        };
        const override = existing
            ? await this.prisma.userPermissionOverride.update({ where: { id: existing.id }, data: payload })
            : await this.prisma.userPermissionOverride.create({ data: payload });
        await this.prisma.auditLog.create({
            data: {
                userId: grantedById, organizationId: auditOrgId,
                action: 'PERMISSION_OVERRIDE_SET', entityType: 'User', entityId: userId,
                metadata: { moduleSlug: body.moduleSlug, overrideId: override.id },
            },
        });
        return override;
    }
    async removePermissionOverride(overrideId, orgId, adminId) {
        const override = await this.prisma.userPermissionOverride.findFirst({
            where: { id: overrideId, organizationId: orgId },
        });
        if (!override)
            throw new common_1.NotFoundException('Override not found');
        await this.prisma.auditLog.create({
            data: {
                userId: adminId, organizationId: orgId,
                action: 'PERMISSION_OVERRIDE_REMOVED', entityType: 'User', entityId: override.userId,
                metadata: { overrideId },
            },
        });
        return this.prisma.userPermissionOverride.update({
            where: { id: overrideId },
            data: { isActive: false },
        });
    }
    async clearMyActivity(userId, orgId) {
        await this.prisma.auditLog.deleteMany({
            where: { userId, organizationId: orgId },
        });
        return { cleared: true };
    }
    async getMyPermissions(userId, orgId) {
        return this.permCheck.resolveUserPermissions(userId, orgId);
    }
    async getPermissionSummary(userId, orgId) {
        const [effective, overrides] = await Promise.all([
            this.permCheck.resolveUserPermissions(userId, orgId),
            this.getPermissionOverrides(userId, orgId),
        ]);
        return { effective, overrides };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        permission_check_service_1.PermissionCheckService])
], UsersService);
//# sourceMappingURL=users.service.js.map