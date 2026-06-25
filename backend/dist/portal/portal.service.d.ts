import { PrismaService } from '../prisma/prisma.service';
export declare class PortalService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(portalUserId: string): Promise<{
        id: any;
        email: any;
        firstName: any;
        lastName: any;
        phone: any;
        type: any;
        accountStatus: any;
        profilePicture: any;
        organizationId: any;
        moduleId: any;
        recordId: any;
        isEmailVerified: any;
        lastLoginAt: any;
        isPortalAdmin: any;
        portalRole: any;
    }>;
    updateProfile(portalUserId: string, dto: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        profilePicture?: string;
        currentPassword?: string;
        newPassword?: string;
    }): Promise<{
        id: any;
        email: any;
        firstName: any;
        lastName: any;
        phone: any;
        type: any;
        accountStatus: any;
        profilePicture: any;
        organizationId: any;
        moduleId: any;
        recordId: any;
        isEmailVerified: any;
        lastLoginAt: any;
        isPortalAdmin: any;
        portalRole: any;
    }>;
    getRecordData(portalUserId: string): Promise<{
        record: {
            id: string;
            lockedAt: Date | null;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            moduleId: string;
            isDeleted: boolean;
            deletedAt: Date | null;
            isArchived: boolean;
            archivedAt: Date | null;
            isLocked: boolean;
            createdById: string;
            updatedById: string | null;
        };
        module: {
            fields: ({
                options: {
                    id: string;
                    createdAt: Date;
                    color: string | null;
                    order: number;
                    label: string;
                    value: string;
                    fieldId: string;
                }[];
            } & {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                settings: import("@prisma/client/runtime/library").JsonValue;
                order: number;
                moduleId: string;
                type: import(".prisma/client").$Enums.FieldType;
                label: string;
                isRequired: boolean;
                isUnique: boolean;
                isReadonly: boolean;
                isHidden: boolean;
                placeholder: string | null;
                helpText: string | null;
                defaultValue: string | null;
                validation: import("@prisma/client/runtime/library").JsonValue | null;
                conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
                lookupModuleId: string | null;
                lookupFieldId: string | null;
                formulaExpression: string | null;
            })[];
        } & {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            settings: import("@prisma/client/runtime/library").JsonValue;
            icon: string | null;
            color: string | null;
            order: number;
        };
        fields: ({
            options: {
                id: string;
                createdAt: Date;
                color: string | null;
                order: number;
                label: string;
                value: string;
                fieldId: string;
            }[];
        } & {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            order: number;
            moduleId: string;
            type: import(".prisma/client").$Enums.FieldType;
            label: string;
            isRequired: boolean;
            isUnique: boolean;
            isReadonly: boolean;
            isHidden: boolean;
            placeholder: string | null;
            helpText: string | null;
            defaultValue: string | null;
            validation: import("@prisma/client/runtime/library").JsonValue | null;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            lookupModuleId: string | null;
            lookupFieldId: string | null;
            formulaExpression: string | null;
        })[];
        mappings: {
            id: string;
            createdAt: Date;
            order: number;
            portalModuleConfigId: string;
            crmFieldName: string;
            portalFieldName: string;
            displayLabel: string;
            isIdentity: boolean;
            isEditable: boolean;
            isVisible: boolean;
        }[];
        portalConfig: {
            portalLabel: string;
            portalType: string;
            dashboardLayout: import("@prisma/client/runtime/library").JsonValue;
            theme: import("@prisma/client/runtime/library").JsonValue;
            menuItems: import("@prisma/client/runtime/library").JsonValue;
        };
    }>;
    updateRecordField(portalUserId: string, updates: Record<string, any>): Promise<import("@prisma/client/runtime/library").JsonValue>;
    getPageData(portalUserId: string, slug: string): Promise<Record<string, any>>;
    savePageData(portalUserId: string, slug: string, updates: Array<{
        fieldKey: string;
        value: any;
    }>): Promise<{
        success: boolean;
        crmUpdated: number;
        portalUpdated: number;
    }>;
    getNotifications(portalUserId: string, page?: number, limit?: number): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            link: string | null;
            type: string;
            title: string;
            isRead: boolean;
            body: string;
            portalUserId: string;
        }[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
    }>;
    markNotificationRead(portalUserId: string, notificationId: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        type: string;
        title: string;
        isRead: boolean;
        body: string;
        portalUserId: string;
    }>;
    markAllNotificationsRead(portalUserId: string): Promise<{
        message: string;
    }>;
    getAnnouncements(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        type: string;
        title: string;
        body: string;
        isPublished: boolean;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        publishedAt: Date;
        scheduledAt: Date | null;
    }[]>;
    getDashboardSummary(portalUserId: string): Promise<{
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
            type: any;
            accountStatus: any;
            profilePicture: any;
            organizationId: any;
            moduleId: any;
            recordId: any;
            isEmailVerified: any;
            lastLoginAt: any;
            isPortalAdmin: any;
            portalRole: any;
        };
        unreadCount: number;
        latestNotifications: {
            id: string;
            createdAt: Date;
            link: string | null;
            type: string;
            title: string;
            isRead: boolean;
            body: string;
            portalUserId: string;
        }[];
        announcements: {
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
            type: string;
            title: string;
            body: string;
            isPublished: boolean;
            targetTypes: import("@prisma/client/runtime/library").JsonValue;
            publishedAt: Date;
            scheduledAt: Date | null;
        }[];
        recordSummary: any;
    }>;
    listUsers(organizationId: string, page?: number, limit?: number, search?: string, status?: string): Promise<{
        users: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            lastLoginAt: Date;
            createdAt: Date;
            moduleId: string;
            type: string;
            accountStatus: string;
            recordId: string;
            isFirstLogin: boolean;
            isEmailVerified: boolean;
            isPortalAdmin: boolean;
            portalRole: string;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserStatusCounts(orgId: string): Promise<{
        active: number;
        suspended: number;
        deleted: number;
        total: number;
    }>;
    updateAccountStatus(organizationId: string, userId: string, status: string): Promise<{
        email: string;
        id: string;
        accountStatus: string;
    }>;
    resetToFirstLogin(organizationId: string, userId: string): Promise<{
        message: string;
    }>;
    getAdminUserDetail(organizationId: string, userId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        phone: string;
        lastLoginAt: Date;
        createdAt: Date;
        notifications: {
            id: string;
            createdAt: Date;
            link: string | null;
            type: string;
            title: string;
            isRead: boolean;
            body: string;
            portalUserId: string;
        }[];
        moduleId: string;
        type: string;
        accountStatus: string;
        recordId: string;
        isFirstLogin: boolean;
        isEmailVerified: boolean;
    }>;
    setPortalAdminFlag(organizationId: string, userId: string, isPortalAdmin: boolean): Promise<{
        email: string;
        id: string;
        isPortalAdmin: boolean;
    }>;
    softDelete(userId: string, orgId: string): Promise<{
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        id: string;
        phone: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string | null;
        profilePicture: string | null;
        type: string;
        accountStatus: string;
        recordId: string | null;
        isFirstLogin: boolean;
        isEmailVerified: boolean;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
        isPortalAdmin: boolean;
        customData: import("@prisma/client/runtime/library").JsonValue;
        portalRole: string;
    }>;
    restore(userId: string, orgId: string): Promise<{
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        id: string;
        phone: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string | null;
        profilePicture: string | null;
        type: string;
        accountStatus: string;
        recordId: string | null;
        isFirstLogin: boolean;
        isEmailVerified: boolean;
        resetToken: string | null;
        resetTokenExpiry: Date | null;
        isPortalAdmin: boolean;
        customData: import("@prisma/client/runtime/library").JsonValue;
        portalRole: string;
    }>;
    permanentDelete(userId: string, orgId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setPortalRole(organizationId: string, userId: string, portalRole: string): Promise<{
        email: string;
        id: string;
        isPortalAdmin: boolean;
        portalRole: string;
    }>;
    private sanitize;
}
