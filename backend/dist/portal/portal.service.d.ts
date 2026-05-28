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
            organizationId: string;
            moduleId: string;
            createdAt: Date;
            updatedAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            isDeleted: boolean;
            deletedAt: Date | null;
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
                type: import(".prisma/client").$Enums.FieldType;
                moduleId: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                order: number;
                settings: import("@prisma/client/runtime/library").JsonValue;
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
            })[];
        } & {
            id: string;
            organizationId: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            description: string | null;
            icon: string | null;
            color: string | null;
            order: number;
            settings: import("@prisma/client/runtime/library").JsonValue;
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
            type: import(".prisma/client").$Enums.FieldType;
            moduleId: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            order: number;
            settings: import("@prisma/client/runtime/library").JsonValue;
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
            type: string;
            createdAt: Date;
            link: string | null;
            portalUserId: string;
            title: string;
            body: string;
            isRead: boolean;
        }[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
    }>;
    markNotificationRead(portalUserId: string, notificationId: string): Promise<{
        id: string;
        type: string;
        createdAt: Date;
        link: string | null;
        portalUserId: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
    markAllNotificationsRead(portalUserId: string): Promise<{
        message: string;
    }>;
    getAnnouncements(organizationId: string): Promise<{
        id: string;
        type: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        body: string;
        targetTypes: import("@prisma/client/runtime/library").JsonValue;
        isPublished: boolean;
        publishedAt: Date;
        scheduledAt: Date | null;
        expiresAt: Date | null;
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
            type: string;
            createdAt: Date;
            link: string | null;
            portalUserId: string;
            title: string;
            body: string;
            isRead: boolean;
        }[];
        announcements: {
            id: string;
            type: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            body: string;
            targetTypes: import("@prisma/client/runtime/library").JsonValue;
            isPublished: boolean;
            publishedAt: Date;
            scheduledAt: Date | null;
            expiresAt: Date | null;
        }[];
        recordSummary: any;
    }>;
    listUsers(organizationId: string, page?: number, limit?: number): Promise<{
        users: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            type: string;
            accountStatus: string;
            moduleId: string;
            recordId: string;
            isFirstLogin: boolean;
            isEmailVerified: boolean;
            lastLoginAt: Date;
            createdAt: Date;
            isPortalAdmin: boolean;
            portalRole: string;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateAccountStatus(organizationId: string, userId: string, status: string): Promise<{
        id: string;
        email: string;
        accountStatus: string;
    }>;
    resetToFirstLogin(organizationId: string, userId: string): Promise<{
        message: string;
    }>;
    getAdminUserDetail(organizationId: string, userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        type: string;
        accountStatus: string;
        moduleId: string;
        recordId: string;
        isFirstLogin: boolean;
        isEmailVerified: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        notifications: {
            id: string;
            type: string;
            createdAt: Date;
            link: string | null;
            portalUserId: string;
            title: string;
            body: string;
            isRead: boolean;
        }[];
    }>;
    setPortalAdminFlag(organizationId: string, userId: string, isPortalAdmin: boolean): Promise<{
        id: string;
        email: string;
        isPortalAdmin: boolean;
    }>;
    setPortalRole(organizationId: string, userId: string, portalRole: string): Promise<{
        id: string;
        email: string;
        isPortalAdmin: boolean;
        portalRole: string;
    }>;
    private sanitize;
}
