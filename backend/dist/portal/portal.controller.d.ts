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
            type: string;
            createdAt: Date;
            portalUserId: string;
            title: string;
            body: string;
            isRead: boolean;
            link: string | null;
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
    getRecord(user: any): Promise<{
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
            type: string;
            createdAt: Date;
            portalUserId: string;
            title: string;
            body: string;
            isRead: boolean;
            link: string | null;
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
        type: string;
        createdAt: Date;
        portalUserId: string;
        title: string;
        body: string;
        isRead: boolean;
        link: string | null;
    }>;
    getAnnouncements(user: any): Promise<{
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
    getMenu(user: any): Promise<any[]>;
    getPage(user: any, slug: string): Promise<{
        sections: ({
            fields: {
                id: string;
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
                portalModuleConfigId: string | null;
                isEditable: boolean;
                isVisible: boolean;
                status: string;
                sectionId: string | null;
                fieldKey: string;
                fieldType: string;
                isReadOnly: boolean;
                isAdminOnly: boolean;
                mappedCrmFieldName: string | null;
                mappedCrmModuleSlug: string | null;
                formula: string | null;
                portalPageId: string | null;
            }[];
        } & {
            id: string;
            type: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            icon: string | null;
            order: number;
            label: string;
            portalModuleConfigId: string | null;
            isVisible: boolean;
            status: string;
            columnIndex: number;
            isAdminOnly: boolean;
            portalPageId: string | null;
            isCollapsible: boolean;
            crmModuleSlug: string | null;
            crmRelationField: string | null;
            crmSectionType: string | null;
        })[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        publishedAt: Date | null;
        slug: string;
        description: string | null;
        icon: string | null;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        layoutTemplate: string;
        status: string;
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
            type: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            icon: string | null;
            order: number;
            label: string;
            portalModuleConfigId: string | null;
            isVisible: boolean;
            status: string;
            columnIndex: number;
            isAdminOnly: boolean;
            portalPageId: string | null;
            isCollapsible: boolean;
            crmModuleSlug: string | null;
            crmRelationField: string | null;
            crmSectionType: string | null;
        }[];
        orphanFields: any[];
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
        fieldKey: string;
        fileName: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
        filePath: string;
    }[]>;
    uploadDocument(user: any, file: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        moduleId: string | null;
        recordId: string | null;
        createdAt: Date;
        updatedAt: Date;
        portalUserId: string;
        status: string;
        fieldKey: string | null;
        fileName: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
        filePath: string;
    }>;
    deleteDocument(user: any, id: string): Promise<{
        success: boolean;
    }>;
}
