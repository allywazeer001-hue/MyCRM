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
exports.PortalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcryptjs");
let PortalService = class PortalService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(portalUserId) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        return this.sanitize(user);
    }
    async updateProfile(portalUserId, dto) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        const update = {};
        if (dto.firstName)
            update.firstName = dto.firstName.trim();
        if (dto.lastName)
            update.lastName = dto.lastName.trim();
        if (dto.phone !== undefined)
            update.phone = dto.phone || null;
        if (dto.profilePicture !== undefined)
            update.profilePicture = dto.profilePicture || null;
        if (dto.newPassword) {
            if (!dto.currentPassword)
                throw new common_1.BadRequestException('Current password required');
            const valid = await bcrypt.compare(dto.currentPassword, user.password);
            if (!valid)
                throw new common_1.BadRequestException('Current password is incorrect');
            update.password = await bcrypt.hash(dto.newPassword, 12);
        }
        const updated = await this.prisma.portalUser.update({
            where: { id: portalUserId },
            data: update,
        });
        return this.sanitize(updated);
    }
    async getRecordData(portalUserId) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user || !user.recordId || !user.moduleId)
            return { record: null, module: null, fields: [], mappings: [], portalConfig: null };
        const [record, mod, portalConfig] = await Promise.all([
            this.prisma.record.findFirst({
                where: { id: user.recordId, organizationId: user.organizationId, isDeleted: false },
            }),
            this.prisma.dynamicModule.findFirst({
                where: { id: user.moduleId, organizationId: user.organizationId },
                include: { fields: { where: { isActive: true }, orderBy: { order: 'asc' }, include: { options: true } } },
            }),
            this.prisma.portalModuleConfig.findUnique({
                where: { moduleId: user.moduleId },
                include: { fieldMappings: { where: { isVisible: true }, orderBy: { order: 'asc' } } },
            }),
        ]);
        const mappings = portalConfig?.fieldMappings ?? [];
        let displayFields = mod?.fields ?? [];
        if (mappings.length > 0) {
            const mappedNames = new Set(mappings.map(m => m.crmFieldName));
            displayFields = displayFields.filter(f => mappedNames.has(f.name));
        }
        return {
            record,
            module: mod,
            fields: displayFields,
            mappings,
            portalConfig: portalConfig ? {
                portalLabel: portalConfig.portalLabel,
                portalType: portalConfig.portalType,
                dashboardLayout: portalConfig.dashboardLayout,
                theme: portalConfig.theme,
                menuItems: portalConfig.menuItems,
            } : null,
        };
    }
    async updateRecordField(portalUserId, updates) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user || !user.recordId || !user.moduleId)
            throw new common_1.NotFoundException('No linked record');
        const config = await this.prisma.portalModuleConfig.findUnique({
            where: { moduleId: user.moduleId },
            include: { fieldMappings: { where: { isEditable: true } } },
        });
        if (!config)
            throw new common_1.BadRequestException('Portal not configured for this module');
        const editableNames = new Set(config.fieldMappings.map(m => m.crmFieldName));
        const safeUpdates = {};
        for (const [key, val] of Object.entries(updates)) {
            if (editableNames.has(key))
                safeUpdates[key] = val;
        }
        if (Object.keys(safeUpdates).length === 0) {
            throw new common_1.BadRequestException('No editable fields in update');
        }
        const record = await this.prisma.record.findFirst({
            where: { id: user.recordId, organizationId: user.organizationId, isDeleted: false },
        });
        if (!record)
            throw new common_1.NotFoundException('Linked record not found');
        const updated = await this.prisma.record.update({
            where: { id: user.recordId },
            data: { data: { ...record.data, ...safeUpdates }, updatedAt: new Date() },
        });
        return updated.data;
    }
    async getPageData(portalUserId, slug) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        const page = await this.prisma.portalPage.findFirst({
            where: { slug, organizationId: user.organizationId, status: 'PUBLISHED' },
            include: {
                sections: {
                    where: { status: 'PUBLISHED' },
                    include: { fields: { where: { status: 'ACTIVE' }, orderBy: { order: 'asc' } } },
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!page)
            throw new common_1.NotFoundException('Page not found or unavailable');
        const allFields = (page.sections ?? []).flatMap((s) => s.fields ?? []);
        let crmData = {};
        if (user.recordId) {
            const record = await this.prisma.record.findFirst({
                where: { id: user.recordId, organizationId: user.organizationId, isDeleted: false },
            });
            crmData = record?.data ?? {};
        }
        const customData = user.customData ?? {};
        const values = {};
        for (const field of allFields) {
            if (field.mappedCrmFieldName && crmData[field.mappedCrmFieldName] !== undefined) {
                values[field.fieldKey] = crmData[field.mappedCrmFieldName];
            }
            else if (customData[field.fieldKey] !== undefined) {
                values[field.fieldKey] = customData[field.fieldKey];
            }
        }
        return values;
    }
    async savePageData(portalUserId, slug, updates) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        const page = await this.prisma.portalPage.findFirst({
            where: { slug, organizationId: user.organizationId, status: 'PUBLISHED' },
            include: {
                sections: { include: { fields: { where: { status: 'ACTIVE' } } } },
            },
        });
        if (!page)
            throw new common_1.NotFoundException('Page not found');
        const allFields = (page.sections ?? []).flatMap((s) => s.fields ?? []);
        const crmUpdates = {};
        const customUpdates = {};
        for (const { fieldKey, value } of updates) {
            const field = allFields.find((f) => f.fieldKey === fieldKey);
            if (!field || !field.isEditable || field.isReadOnly)
                continue;
            if (field.mappedCrmFieldName) {
                crmUpdates[field.mappedCrmFieldName] = value;
            }
            else {
                customUpdates[fieldKey] = value;
            }
        }
        const ops = [];
        if (Object.keys(crmUpdates).length > 0 && user.recordId) {
            const record = await this.prisma.record.findFirst({
                where: { id: user.recordId, organizationId: user.organizationId, isDeleted: false },
            });
            if (record) {
                ops.push(this.prisma.record.update({
                    where: { id: user.recordId },
                    data: { data: { ...record.data, ...crmUpdates }, updatedAt: new Date() },
                }));
            }
        }
        if (Object.keys(customUpdates).length > 0) {
            ops.push(this.prisma.portalUser.update({
                where: { id: portalUserId },
                data: { customData: { ...(user.customData ?? {}), ...customUpdates } },
            }));
        }
        await Promise.all(ops);
        return {
            success: true,
            crmUpdated: Object.keys(crmUpdates).length,
            portalUpdated: Object.keys(customUpdates).length,
        };
    }
    async getNotifications(portalUserId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.portalNotification.findMany({
                where: { portalUserId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.portalNotification.count({ where: { portalUserId } }),
            this.prisma.portalNotification.count({ where: { portalUserId, isRead: false } }),
        ]);
        return { notifications, total, unreadCount, page, limit };
    }
    async markNotificationRead(portalUserId, notificationId) {
        const n = await this.prisma.portalNotification.findFirst({
            where: { id: notificationId, portalUserId },
        });
        if (!n)
            throw new common_1.NotFoundException('Notification not found');
        return this.prisma.portalNotification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
    async markAllNotificationsRead(portalUserId) {
        await this.prisma.portalNotification.updateMany({
            where: { portalUserId, isRead: false },
            data: { isRead: true },
        });
        return { message: 'All notifications marked as read' };
    }
    async getAnnouncements(organizationId) {
        return this.prisma.portalAnnouncement.findMany({
            where: {
                organizationId,
                isPublished: true,
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
            orderBy: { publishedAt: 'desc' },
            take: 20,
        });
    }
    async getDashboardSummary(portalUserId) {
        const user = await this.prisma.portalUser.findUnique({ where: { id: portalUserId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        const [unreadCount, latestNotifications, announcements] = await Promise.all([
            this.prisma.portalNotification.count({ where: { portalUserId, isRead: false } }),
            this.prisma.portalNotification.findMany({
                where: { portalUserId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            this.prisma.portalAnnouncement.findMany({
                where: {
                    organizationId: user.organizationId,
                    isPublished: true,
                    OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
                },
                orderBy: { publishedAt: 'desc' },
                take: 3,
            }),
        ]);
        let recordSummary = null;
        if (user.recordId && user.moduleId) {
            const record = await this.prisma.record.findFirst({
                where: { id: user.recordId, organizationId: user.organizationId, isDeleted: false },
            });
            recordSummary = record?.data ?? null;
        }
        return {
            user: this.sanitize(user),
            unreadCount,
            latestNotifications,
            announcements,
            recordSummary,
        };
    }
    async listUsers(organizationId, page = 1, limit = 50, search, status) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.portalUser.findMany({
                where: {
                    organizationId,
                    ...(status ? { accountStatus: status } : {}),
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
                select: {
                    id: true, email: true, firstName: true, lastName: true, type: true,
                    accountStatus: true, isFirstLogin: true, isEmailVerified: true,
                    lastLoginAt: true, createdAt: true, moduleId: true, recordId: true, isPortalAdmin: true, portalRole: true,
                },
            }),
            this.prisma.portalUser.count({ where: { organizationId, ...(status ? { accountStatus: status } : {}) } }),
        ]);
        return { users, total, page, limit };
    }
    async getUserStatusCounts(orgId) {
        const [active, suspended, deleted] = await Promise.all([
            this.prisma.portalUser.count({ where: { organizationId: orgId, accountStatus: 'ACTIVE' } }),
            this.prisma.portalUser.count({ where: { organizationId: orgId, accountStatus: 'SUSPENDED' } }),
            this.prisma.portalUser.count({ where: { organizationId: orgId, accountStatus: 'DELETED' } }),
        ]);
        return { active, suspended, deleted, total: active + suspended + deleted };
    }
    async updateAccountStatus(organizationId, userId, status) {
        const validStatuses = ['PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'DISABLED'];
        if (!validStatuses.includes(status)) {
            throw new common_1.BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        const user = await this.prisma.portalUser.findFirst({
            where: { id: userId, organizationId },
        });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        return this.prisma.portalUser.update({
            where: { id: userId },
            data: { accountStatus: status },
            select: { id: true, email: true, accountStatus: true },
        });
    }
    async resetToFirstLogin(organizationId, userId) {
        const user = await this.prisma.portalUser.findFirst({
            where: { id: userId, organizationId },
        });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        const defaultPassword = user.lastName.trim();
        const hashed = await bcrypt.hash(defaultPassword, 12);
        await this.prisma.portalUser.update({
            where: { id: userId },
            data: {
                password: hashed,
                isFirstLogin: true,
                accountStatus: 'PENDING_ACTIVATION',
            },
        });
        await this.prisma.portalNotification.create({
            data: {
                portalUserId: userId,
                title: 'Password Reset by Administrator',
                body: 'Your portal password has been reset. Please sign in with your last name as your temporary password and update it immediately.',
                type: 'warning',
            },
        });
        return { message: 'User reset to first-login state. Default password is their last name.' };
    }
    async getAdminUserDetail(organizationId, userId) {
        const user = await this.prisma.portalUser.findFirst({
            where: { id: userId, organizationId },
            select: {
                id: true, email: true, firstName: true, lastName: true, type: true, phone: true,
                accountStatus: true, isFirstLogin: true, isEmailVerified: true,
                lastLoginAt: true, createdAt: true, moduleId: true, recordId: true,
                notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        return user;
    }
    async setPortalAdminFlag(organizationId, userId, isPortalAdmin) {
        const user = await this.prisma.portalUser.findFirst({ where: { id: userId, organizationId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        return this.prisma.portalUser.update({
            where: { id: userId },
            data: { isPortalAdmin },
            select: { id: true, email: true, isPortalAdmin: true },
        });
    }
    async softDelete(userId, orgId) {
        const user = await this.prisma.portalUser.findFirst({ where: { id: userId, organizationId: orgId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        if (user.accountStatus === 'DELETED')
            throw new common_1.BadRequestException('User is already deleted');
        return this.prisma.portalUser.update({
            where: { id: userId },
            data: { accountStatus: 'DELETED', isActive: false },
        });
    }
    async restore(userId, orgId) {
        const user = await this.prisma.portalUser.findFirst({ where: { id: userId, organizationId: orgId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        if (user.accountStatus !== 'DELETED')
            throw new common_1.BadRequestException('User is not deleted');
        return this.prisma.portalUser.update({
            where: { id: userId },
            data: { accountStatus: 'ACTIVE', isActive: true },
        });
    }
    async permanentDelete(userId, orgId) {
        const user = await this.prisma.portalUser.findFirst({ where: { id: userId, organizationId: orgId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        if (user.accountStatus !== 'DELETED')
            throw new common_1.BadRequestException('Only soft-deleted users can be permanently deleted');
        await this.prisma.portalNotification.deleteMany({ where: { portalUserId: userId } });
        await this.prisma.portalUser.delete({ where: { id: userId } });
        return { success: true, message: 'Portal user permanently deleted' };
    }
    async setPortalRole(organizationId, userId, portalRole) {
        const valid = ['user', 'admin', 'super_admin'];
        if (!valid.includes(portalRole))
            throw new common_1.BadRequestException(`Invalid role. Must be one of: ${valid.join(', ')}`);
        const user = await this.prisma.portalUser.findFirst({ where: { id: userId, organizationId } });
        if (!user)
            throw new common_1.NotFoundException('Portal user not found');
        const isAdmin = ['admin', 'super_admin'].includes(portalRole);
        return this.prisma.portalUser.update({
            where: { id: userId },
            data: { portalRole, isPortalAdmin: isAdmin },
            select: { id: true, email: true, portalRole: true, isPortalAdmin: true },
        });
    }
    sanitize(u) {
        return {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            phone: u.phone,
            type: u.type,
            accountStatus: u.accountStatus,
            profilePicture: u.profilePicture,
            organizationId: u.organizationId,
            moduleId: u.moduleId,
            recordId: u.recordId,
            isEmailVerified: u.isEmailVerified,
            lastLoginAt: u.lastLoginAt,
            isPortalAdmin: u.isPortalAdmin ?? false,
            portalRole: u.portalRole ?? 'user',
        };
    }
};
exports.PortalService = PortalService;
exports.PortalService = PortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalService);
//# sourceMappingURL=portal.service.js.map