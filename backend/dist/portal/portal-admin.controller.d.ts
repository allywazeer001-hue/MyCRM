import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';
import { PortalModuleService } from './portal-module.service';
export declare class PortalAdminController {
    private authService;
    private portalService;
    private moduleService;
    constructor(authService: PortalAuthService, portalService: PortalService, moduleService: PortalModuleService);
    getSettings(user: any): Promise<{
        passwordExpiryDays: number;
        forceResetOnFirstLogin: boolean;
        defaultPasswordStrategy: string;
        minPasswordLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumber: boolean;
        requireSpecial: boolean;
        organizationId: string;
    }>;
    updateSettings(user: any, body: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        minPasswordLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumber: boolean;
        requireSpecial: boolean;
        passwordExpiryDays: number;
        forceResetOnFirstLogin: boolean;
        defaultPasswordStrategy: string;
    }>;
    listUsers(user: any, page: number, limit: number): Promise<{
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
    getUserDetail(user: any, id: string): Promise<{
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
    createUser(user: any, body: {
        email: string;
        firstName: string;
        lastName: string;
        type?: string;
        moduleId?: string;
        recordId?: string;
        phone?: string;
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
    updateStatus(user: any, id: string, body: {
        status: string;
    }): Promise<{
        id: string;
        email: string;
        accountStatus: string;
    }>;
    resetUser(user: any, id: string): Promise<{
        message: string;
    }>;
    setPortalRole(user: any, id: string, body: {
        portalRole: string;
    }): Promise<{
        id: string;
        email: string;
        isPortalAdmin: boolean;
        portalRole: string;
    }>;
    setPortalAdmin(user: any, id: string, body: {
        isPortalAdmin: boolean;
    }): Promise<{
        id: string;
        email: string;
        isPortalAdmin: boolean;
    }>;
    listModuleConfigs(user: any): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
            color: string;
        };
        config: {
            fieldMappings: {
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
        } & {
            id: string;
            organizationId: string;
            moduleId: string;
            createdAt: Date;
            updatedAt: Date;
            isEnabled: boolean;
            portalLabel: string;
            portalType: string;
            menuItems: import("@prisma/client/runtime/library").JsonValue;
            dashboardLayout: import("@prisma/client/runtime/library").JsonValue;
            theme: import("@prisma/client/runtime/library").JsonValue;
        };
        isEnabled: boolean;
        mappingCount: number;
    }[]>;
    getModuleConfig(user: any, moduleId: string): Promise<{
        config: {
            fieldMappings: {
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
        } & {
            id: string;
            organizationId: string;
            moduleId: string;
            createdAt: Date;
            updatedAt: Date;
            isEnabled: boolean;
            portalLabel: string;
            portalType: string;
            menuItems: import("@prisma/client/runtime/library").JsonValue;
            dashboardLayout: import("@prisma/client/runtime/library").JsonValue;
            theme: import("@prisma/client/runtime/library").JsonValue;
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
    }>;
    upsertModuleConfig(user: any, moduleId: string, body: any): Promise<{
        fieldMappings: {
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
    } & {
        id: string;
        organizationId: string;
        moduleId: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
        portalLabel: string;
        portalType: string;
        menuItems: import("@prisma/client/runtime/library").JsonValue;
        dashboardLayout: import("@prisma/client/runtime/library").JsonValue;
        theme: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getFieldMappings(user: any, moduleId: string): Promise<{
        config: {
            fieldMappings: {
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
        } & {
            id: string;
            organizationId: string;
            moduleId: string;
            createdAt: Date;
            updatedAt: Date;
            isEnabled: boolean;
            portalLabel: string;
            portalType: string;
            menuItems: import("@prisma/client/runtime/library").JsonValue;
            dashboardLayout: import("@prisma/client/runtime/library").JsonValue;
            theme: import("@prisma/client/runtime/library").JsonValue;
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
    }>;
    saveFieldMappings(user: any, moduleId: string, body: {
        mappings: any[];
    }): Promise<{
        fieldMappings: {
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
    } & {
        id: string;
        organizationId: string;
        moduleId: string;
        createdAt: Date;
        updatedAt: Date;
        isEnabled: boolean;
        portalLabel: string;
        portalType: string;
        menuItems: import("@prisma/client/runtime/library").JsonValue;
        dashboardLayout: import("@prisma/client/runtime/library").JsonValue;
        theme: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getRecordPortalStatus(user: any, recordId: string): Promise<{
        portalEnabled: boolean;
        portalLabel: string;
        portalUser: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            accountStatus: string;
            lastLoginAt: Date;
        };
    }>;
    createPortalUserFromRecord(user: any, recordId: string): Promise<{
        existed: boolean;
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
    }>;
    syncRecord(user: any, recordId: string): Promise<{
        synced: boolean;
        message: string;
        updated?: undefined;
    } | {
        synced: boolean;
        updated: string[];
        message?: undefined;
    }>;
}
