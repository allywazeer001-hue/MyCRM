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
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            lastLoginAt: Date;
            createdAt: Date;
            moduleId: string;
            type: string;
            recordId: string;
            accountStatus: string;
            isFirstLogin: boolean;
            isEmailVerified: boolean;
            isPortalAdmin: boolean;
            portalRole: string;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserDetail(user: any, id: string): Promise<{
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
        recordId: string;
        accountStatus: string;
        isFirstLogin: boolean;
        isEmailVerified: boolean;
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
        email: string;
        id: string;
        accountStatus: string;
    }>;
    resetUser(user: any, id: string): Promise<{
        message: string;
    }>;
    setPortalRole(user: any, id: string, body: {
        portalRole: string;
    }): Promise<{
        email: string;
        id: string;
        isPortalAdmin: boolean;
        portalRole: string;
    }>;
    setPortalAdmin(user: any, id: string, body: {
        isPortalAdmin: boolean;
    }): Promise<{
        email: string;
        id: string;
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
            createdAt: Date;
            updatedAt: Date;
            moduleId: string;
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
            createdAt: Date;
            updatedAt: Date;
            moduleId: string;
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
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                settings: import("@prisma/client/runtime/library").JsonValue;
                order: number;
                moduleId: string;
                label: string;
                type: import(".prisma/client").$Enums.FieldType;
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
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            description: string | null;
            icon: string | null;
            color: string | null;
            order: number;
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
        createdAt: Date;
        updatedAt: Date;
        moduleId: string;
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
            createdAt: Date;
            updatedAt: Date;
            moduleId: string;
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
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                settings: import("@prisma/client/runtime/library").JsonValue;
                order: number;
                moduleId: string;
                label: string;
                type: import(".prisma/client").$Enums.FieldType;
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
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            description: string | null;
            icon: string | null;
            color: string | null;
            order: number;
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
        createdAt: Date;
        updatedAt: Date;
        moduleId: string;
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
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            lastLoginAt: Date;
            accountStatus: string;
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
