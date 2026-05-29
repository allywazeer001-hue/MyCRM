import { PrismaService } from '../prisma/prisma.service';
export declare const FIELD_TYPES: readonly ["text", "textarea", "number", "boolean", "date", "datetime", "dropdown", "multiselect", "lookup", "upload", "formula", "global-list", "table"];
export declare class PortalFieldService {
    private prisma;
    constructor(prisma: PrismaService);
    listFields(orgId: string, moduleConfigId?: string, pageId?: string): Promise<({
        section: {
            id: string;
            label: string;
        };
    } & {
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
        portalPageId: string | null;
    })[]>;
    createField(orgId: string, dto: {
        portalModuleConfigId?: string;
        portalPageId?: string;
        sectionId?: string;
        label: string;
        fieldKey: string;
        fieldType: string;
        placeholder?: string;
        defaultValue?: string;
        helpText?: string;
        options?: any[];
        isRequired?: boolean;
        isVisible?: boolean;
        isEditable?: boolean;
        isReadOnly?: boolean;
        isAdminOnly?: boolean;
        mappedCrmFieldName?: string;
        mappedCrmModuleSlug?: string;
        formula?: string;
        order?: number;
    }): Promise<{
        section: {
            id: string;
            label: string;
        };
    } & {
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
        portalPageId: string | null;
    }>;
    updateField(orgId: string, fieldId: string, dto: Partial<{
        label: string;
        placeholder: string;
        defaultValue: string;
        helpText: string;
        options: any[];
        isRequired: boolean;
        isVisible: boolean;
        isEditable: boolean;
        isReadOnly: boolean;
        isAdminOnly: boolean;
        sectionId: string | null;
        mappedCrmFieldName: string | null;
        mappedCrmModuleSlug: string | null;
        formula: string | null;
        order: number;
    }>): Promise<{
        section: {
            id: string;
            label: string;
        };
    } & {
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
        portalPageId: string | null;
    }>;
    deleteField(orgId: string, fieldId: string): Promise<{
        success: boolean;
    }>;
    reorderFields(orgId: string, orderedIds: string[]): Promise<{
        success: boolean;
    }>;
    getFieldsWithValues(portalUserId: string): Promise<{
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
            label: string;
            type: string;
            portalModuleConfigId: string | null;
            isVisible: boolean;
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
            createdAt: Date;
            updatedAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            moduleId: string;
            isDeleted: boolean;
            deletedAt: Date | null;
            createdById: string;
            updatedById: string | null;
        };
        portalLabel: string;
    }>;
    updateFieldValues(portalUserId: string, updates: Record<string, any>): Promise<{
        updated: {
            fieldKey: string;
            value: any;
        }[];
    }>;
    getCrmFieldsForModule(orgId: string, moduleId: string): Promise<{
        name: string;
        label: string;
        type: import(".prisma/client").$Enums.FieldType;
    }[]>;
}
