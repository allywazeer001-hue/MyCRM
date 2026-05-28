import { PrismaService } from '../prisma/prisma.service';
import { PortalAuthService } from './portal-auth.service';
export declare class PortalModuleService {
    private prisma;
    private authService;
    constructor(prisma: PrismaService, authService: PortalAuthService);
    listModuleConfigs(organizationId: string): Promise<{
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
    getModuleConfig(organizationId: string, moduleId: string): Promise<{
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
                moduleId: string;
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
    upsertModuleConfig(organizationId: string, moduleId: string, dto: {
        isEnabled?: boolean;
        portalLabel?: string;
        portalType?: string;
        menuItems?: any[];
        dashboardLayout?: any;
        theme?: any;
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
    saveFieldMappings(organizationId: string, moduleId: string, mappings: Array<{
        crmFieldName: string;
        portalFieldName: string;
        displayLabel: string;
        isIdentity?: boolean;
        isEditable?: boolean;
        isVisible?: boolean;
        order?: number;
    }>): Promise<{
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
    createPortalUserFromRecord(organizationId: string, recordId: string): Promise<{
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
    getRecordPortalStatus(organizationId: string, recordId: string): Promise<{
        portalEnabled: boolean;
        portalLabel: string;
        portalUser: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            lastLoginAt: Date;
            accountStatus: string;
        };
    }>;
    syncRecordToPortal(organizationId: string, recordId: string): Promise<{
        synced: boolean;
        message: string;
        updated?: undefined;
    } | {
        synced: boolean;
        updated: string[];
        message?: undefined;
    }>;
    getVisibleMappings(moduleId: string): Promise<{
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
    getEditableMappings(moduleId: string): Promise<{
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
    }[]>;
    private assertModuleOwnership;
    private inferUserType;
}
