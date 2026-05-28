import { PortalFieldService } from './portal-field.service';
import { PortalSectionService } from './portal-section.service';
import { PortalDocumentService } from './portal-document.service';
import { PortalService } from './portal.service';
import { PortalBuilderService } from './portal-builder.service';
export declare class PortalPadminController {
    private fieldService;
    private sectionService;
    private documentService;
    private portalService;
    private builderService;
    constructor(fieldService: PortalFieldService, sectionService: PortalSectionService, documentService: PortalDocumentService, portalService: PortalService, builderService: PortalBuilderService);
    listSections(user: any, moduleConfigId?: string, pageId?: string): Promise<({
        fields: {
            id: string;
            label: string;
            isVisible: boolean;
            fieldKey: string;
            fieldType: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        type: string;
        icon: string | null;
        columnIndex: number;
        order: number;
        isCollapsible: boolean;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
    })[]>;
    createSection(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        type: string;
        icon: string | null;
        columnIndex: number;
        order: number;
        isCollapsible: boolean;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
    }>;
    updateSection(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        type: string;
        icon: string | null;
        columnIndex: number;
        order: number;
        isCollapsible: boolean;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
    }>;
    deleteSection(user: any, id: string): Promise<{
        success: boolean;
    }>;
    reorderSections(user: any, dto: {
        ids: string[];
    }): Promise<{
        success: boolean;
    }>;
    listFields(user: any, moduleConfigId?: string, pageId?: string): Promise<({
        section: {
            id: string;
            label: string;
        };
    } & {
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        order: number;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
        sectionId: string | null;
        fieldKey: string;
        fieldType: string;
        placeholder: string | null;
        defaultValue: string | null;
        helpText: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        isRequired: boolean;
        isEditable: boolean;
        isReadOnly: boolean;
        mappedCrmFieldName: string | null;
        mappedCrmModuleSlug: string | null;
        formula: string | null;
    })[]>;
    createField(user: any, dto: any): Promise<{
        section: {
            id: string;
            label: string;
        };
    } & {
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        order: number;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
        sectionId: string | null;
        fieldKey: string;
        fieldType: string;
        placeholder: string | null;
        defaultValue: string | null;
        helpText: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        isRequired: boolean;
        isEditable: boolean;
        isReadOnly: boolean;
        mappedCrmFieldName: string | null;
        mappedCrmModuleSlug: string | null;
        formula: string | null;
    }>;
    updateField(user: any, id: string, dto: any): Promise<{
        section: {
            id: string;
            label: string;
        };
    } & {
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        order: number;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
        sectionId: string | null;
        fieldKey: string;
        fieldType: string;
        placeholder: string | null;
        defaultValue: string | null;
        helpText: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        isRequired: boolean;
        isEditable: boolean;
        isReadOnly: boolean;
        mappedCrmFieldName: string | null;
        mappedCrmModuleSlug: string | null;
        formula: string | null;
    }>;
    deleteField(user: any, id: string): Promise<{
        success: boolean;
    }>;
    reorderFields(user: any, dto: {
        ids: string[];
    }): Promise<{
        success: boolean;
    }>;
    getCrmFields(user: any, moduleId: string): Promise<{
        name: string;
        label: string;
        type: import(".prisma/client").$Enums.FieldType;
    }[]>;
    listCrmModules(user: any): Promise<{
        id: string;
        icon: string;
        name: string;
        slug: string;
        color: string;
    }[]>;
    getCrmModuleFields(user: any, moduleId: string): Promise<{
        id: string;
        name: string;
        label: string;
        type: import(".prisma/client").$Enums.FieldType;
    }[]>;
    detectRelatedModules(user: any, moduleId: string): Promise<{
        primary: {
            id: string;
            name: string;
            slug: string;
        };
        related: {
            relationField: string;
            relationLabel: string;
            direction: string;
            id: string;
            icon: string;
            name: string;
            slug: string;
            color: string;
        }[];
    }>;
    suggestSections(user: any, moduleId: string): Promise<any[]>;
    createSectionFromModule(user: any, pageId: string, dto: any): Promise<{
        fields: {
            id: string;
            organizationId: string;
            portalModuleConfigId: string | null;
            label: string;
            order: number;
            isVisible: boolean;
            isAdminOnly: boolean;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            portalPageId: string | null;
            sectionId: string | null;
            fieldKey: string;
            fieldType: string;
            placeholder: string | null;
            defaultValue: string | null;
            helpText: string | null;
            options: import("@prisma/client/runtime/library").JsonValue;
            isRequired: boolean;
            isEditable: boolean;
            isReadOnly: boolean;
            mappedCrmFieldName: string | null;
            mappedCrmModuleSlug: string | null;
            formula: string | null;
        }[];
    } & {
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        type: string;
        icon: string | null;
        columnIndex: number;
        order: number;
        isCollapsible: boolean;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        crmModuleSlug: string | null;
        crmRelationField: string | null;
        crmSectionType: string | null;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
    }>;
    setPagePrimaryModule(user: any, pageId: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }>;
    mapFieldToCrm(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        order: number;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
        sectionId: string | null;
        fieldKey: string;
        fieldType: string;
        placeholder: string | null;
        defaultValue: string | null;
        helpText: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        isRequired: boolean;
        isEditable: boolean;
        isReadOnly: boolean;
        mappedCrmFieldName: string | null;
        mappedCrmModuleSlug: string | null;
        formula: string | null;
    }>;
    unmapField(user: any, id: string): Promise<{
        id: string;
        organizationId: string;
        portalModuleConfigId: string | null;
        label: string;
        order: number;
        isVisible: boolean;
        isAdminOnly: boolean;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        portalPageId: string | null;
        sectionId: string | null;
        fieldKey: string;
        fieldType: string;
        placeholder: string | null;
        defaultValue: string | null;
        helpText: string | null;
        options: import("@prisma/client/runtime/library").JsonValue;
        isRequired: boolean;
        isEditable: boolean;
        isReadOnly: boolean;
        mappedCrmFieldName: string | null;
        mappedCrmModuleSlug: string | null;
        formula: string | null;
    }>;
    createCrmField(user: any, id: string, dto: any): Promise<{
        portalField: {
            id: string;
            organizationId: string;
            portalModuleConfigId: string | null;
            label: string;
            order: number;
            isVisible: boolean;
            isAdminOnly: boolean;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            portalPageId: string | null;
            sectionId: string | null;
            fieldKey: string;
            fieldType: string;
            placeholder: string | null;
            defaultValue: string | null;
            helpText: string | null;
            options: import("@prisma/client/runtime/library").JsonValue;
            isRequired: boolean;
            isEditable: boolean;
            isReadOnly: boolean;
            mappedCrmFieldName: string | null;
            mappedCrmModuleSlug: string | null;
            formula: string | null;
        };
        crmField: {
            id: string;
            label: string;
            type: import(".prisma/client").$Enums.FieldType;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            placeholder: string | null;
            defaultValue: string | null;
            helpText: string | null;
            isRequired: boolean;
            name: string;
            isActive: boolean;
            settings: import("@prisma/client/runtime/library").JsonValue;
            isUnique: boolean;
            isReadonly: boolean;
            isHidden: boolean;
            validation: import("@prisma/client/runtime/library").JsonValue | null;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            moduleId: string;
            lookupModuleId: string | null;
            lookupFieldId: string | null;
        };
    }>;
    listMenu(user: any): Promise<any[]>;
    addMenuItem(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        label: string;
        type: string;
        icon: string | null;
        order: number;
        isVisible: boolean;
        createdAt: Date;
        updatedAt: Date;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        target: string | null;
        parentId: string | null;
    }>;
    reorderMenu(user: any, dto: {
        ids: string[];
    }): Promise<any[]>;
    updateMenuItem(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        label: string;
        type: string;
        icon: string | null;
        order: number;
        isVisible: boolean;
        createdAt: Date;
        updatedAt: Date;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        target: string | null;
        parentId: string | null;
    }>;
    deleteMenuItem(user: any, id: string): Promise<{
        success: boolean;
    }>;
    listPages(user: any): Promise<{
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }[]>;
    createPage(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }>;
    getPage(user: any, id: string): Promise<{
        sections: ({
            fields: {
                id: string;
                organizationId: string;
                portalModuleConfigId: string | null;
                label: string;
                order: number;
                isVisible: boolean;
                isAdminOnly: boolean;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                portalPageId: string | null;
                sectionId: string | null;
                fieldKey: string;
                fieldType: string;
                placeholder: string | null;
                defaultValue: string | null;
                helpText: string | null;
                options: import("@prisma/client/runtime/library").JsonValue;
                isRequired: boolean;
                isEditable: boolean;
                isReadOnly: boolean;
                mappedCrmFieldName: string | null;
                mappedCrmModuleSlug: string | null;
                formula: string | null;
            }[];
        } & {
            id: string;
            organizationId: string;
            portalModuleConfigId: string | null;
            label: string;
            type: string;
            icon: string | null;
            columnIndex: number;
            order: number;
            isCollapsible: boolean;
            isVisible: boolean;
            isAdminOnly: boolean;
            status: string;
            crmModuleSlug: string | null;
            crmRelationField: string | null;
            crmSectionType: string | null;
            createdAt: Date;
            updatedAt: Date;
            portalPageId: string | null;
        })[];
    } & {
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }>;
    updatePage(user: any, id: string, dto: any): Promise<{
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }>;
    deletePage(user: any, id: string): Promise<{
        success: boolean;
    }>;
    duplicatePage(user: any, id: string): Promise<{
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }>;
    publishPage(user: any, id: string, dto: {
        status: string;
    }): Promise<{
        id: string;
        organizationId: string;
        icon: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        description: string | null;
        title: string;
        layoutTemplate: string;
        accessTypes: import("@prisma/client/runtime/library").JsonValue;
        blocks: import("@prisma/client/runtime/library").JsonValue;
        primaryModuleId: string | null;
        primaryModuleSlug: string | null;
        publishedAt: Date | null;
    }>;
    listTemplates(user: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string;
        category: string;
        thumbnail: string;
        isBuiltIn: boolean;
    }[]>;
    saveTemplate(user: any, dto: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        category: string;
        thumbnail: string | null;
        snapshot: import("@prisma/client/runtime/library").JsonValue;
        isBuiltIn: boolean;
    }>;
    applyTemplate(user: any, id: string): Promise<{
        applied: number;
        pages: any[];
    }>;
    deleteTemplate(user: any, id: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        category: string;
        thumbnail: string | null;
        snapshot: import("@prisma/client/runtime/library").JsonValue;
        isBuiltIn: boolean;
    }>;
    listDocuments(user: any, userId?: string): Promise<({
        portalUser: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        organizationId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        fieldKey: string | null;
        moduleId: string | null;
        portalUserId: string;
        recordId: string | null;
        fileName: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
        filePath: string;
    })[]>;
    listUsers(user: any): Promise<{
        users: {
            id: string;
            type: string;
            createdAt: Date;
            moduleId: string;
            recordId: string;
            email: string;
            firstName: string;
            lastName: string;
            accountStatus: string;
            isFirstLogin: boolean;
            isEmailVerified: boolean;
            lastLoginAt: Date;
            isPortalAdmin: boolean;
            portalRole: string;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    toggleAdmin(user: any, id: string, dto: {
        isPortalAdmin: boolean;
    }): Promise<{
        id: string;
        email: string;
        isPortalAdmin: boolean;
    }>;
    updateRole(user: any, id: string, dto: {
        portalRole: string;
    }): Promise<{
        id: string;
        email: string;
        isPortalAdmin: boolean;
        portalRole: string;
    }>;
    updateStatus(user: any, id: string, dto: {
        status: string;
    }): Promise<{
        id: string;
        email: string;
        accountStatus: string;
    }>;
    getStats(user: any): Promise<{
        totalUsers: any;
        totalSections: number;
        totalFields: number;
        totalDocuments: number;
        totalPages: number;
        totalMenuItems: number;
    }>;
}
