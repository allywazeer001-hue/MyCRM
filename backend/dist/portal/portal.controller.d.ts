import { PortalService } from './portal.service';
import { PortalBuilderService } from './portal-builder.service';
import { PortalFieldService } from './portal-field.service';
import { PortalDocumentService } from './portal-document.service';
export declare class PortalController {
    private portalService;
    private builderService;
    private fieldService;
    private documentService;
    constructor(portalService: PortalService, builderService: PortalBuilderService, fieldService: PortalFieldService, documentService: PortalDocumentService);
    getProfile(user: any): Promise<{
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
    updateProfile(user: any, body: any): Promise<{
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
    getDashboard(user: any): Promise<{
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
    getRecord(user: any): Promise<{
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
    updateRecord(user: any, body: Record<string, any>): Promise<import("@prisma/client/runtime/library").JsonValue>;
    getPageData(user: any, slug: string): Promise<Record<string, any>>;
    savePageData(user: any, slug: string, body: {
        updates: Array<{
            fieldKey: string;
            value: any;
        }>;
    }): Promise<{
        success: boolean;
        crmUpdated: number;
        portalUpdated: number;
    }>;
    getNotifications(user: any, page: number, limit: number): Promise<{
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
    markAllRead(user: any): Promise<{
        message: string;
    }>;
    markRead(user: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        link: string | null;
        type: string;
        title: string;
        isRead: boolean;
        body: string;
        portalUserId: string;
    }>;
    getAnnouncements(user: any): Promise<{
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
    getMenu(user: any): Promise<any[]>;
    getPage(user: any, slug: string): Promise<{
        sections: ({
            fields: {
                id: string;
                status: string;
                organizationId: string;
                createdAt: Date;
                updatedAt: Date;
                order: number;
                label: string;
                isRequired: boolean;
                placeholder: string | null;
                helpText: string | null;
                defaultValue: string | null;
                options: import("@prisma/client/runtime/library").JsonValue;
                content: string | null;
                sectionId: string | null;
                portalModuleConfigId: string | null;
                isEditable: boolean;
                isVisible: boolean;
                fieldKey: string;
                fieldType: string;
                isReadOnly: boolean;
                isAdminOnly: boolean;
                mappedCrmFieldName: string | null;
                mappedCrmModuleSlug: string | null;
                formula: string | null;
                colSpan: number;
                portalPageId: string | null;
            }[];
        } & {
            id: string;
            status: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            icon: string | null;
            order: number;
            type: string;
            label: string;
            portalModuleConfigId: string | null;
            isVisible: boolean;
            columnIndex: number;
            isAdminOnly: boolean;
            portalPageId: string | null;
            isCollapsible: boolean;
            fieldColumns: number;
            crmModuleSlug: string | null;
            crmRelationField: string | null;
            crmSectionType: string | null;
        })[];
    } & {
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        icon: string | null;
        title: string;
        publishedAt: Date | null;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
    }>;
    getFields(user: any): Promise<{
        sections: any[];
        orphanFields: any[];
        record: any;
        portalLabel?: undefined;
    } | {
        sections: {
            fields: any[];
            id: string;
            status: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            icon: string | null;
            order: number;
            type: string;
            label: string;
            portalModuleConfigId: string | null;
            isVisible: boolean;
            columnIndex: number;
            isAdminOnly: boolean;
            portalPageId: string | null;
            isCollapsible: boolean;
            fieldColumns: number;
            crmModuleSlug: string | null;
            crmRelationField: string | null;
            crmSectionType: string | null;
        }[];
        orphanFields: any[];
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
        portalLabel: string;
    }>;
    updateFields(user: any, body: {
        updates: Array<{
            fieldKey: string;
            value: any;
        }>;
    }): Promise<{
        updated: {
            fieldKey: string;
            value: any;
        }[];
    }>;
    listDocuments(user: any): Promise<{
        id: string;
        createdAt: Date;
        originalName: string;
        mimeType: string;
        filePath: string;
        fieldKey: string;
        fileName: string;
        fileSize: number;
    }[]>;
    uploadDocument(user: any, file: any, dto: any): Promise<{
        id: string;
        status: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string | null;
        recordId: string | null;
        originalName: string;
        mimeType: string;
        filePath: string;
        portalUserId: string;
        fieldKey: string | null;
        fileName: string;
        fileSize: number;
    }>;
    deleteDocument(user: any, id: string): Promise<{
        success: boolean;
    }>;
}
