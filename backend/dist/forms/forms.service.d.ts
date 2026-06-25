import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { GoogleSheetsService } from '../calendar-sync/google-sheets.service';
export declare class FormsService {
    private prisma;
    private workflows;
    private googleSheets;
    constructor(prisma: PrismaService, workflows: WorkflowsService, googleSheets: GoogleSheetsService);
    findAll(orgId: string, userId: string, userRole: string): Promise<({
        _count: {
            fields: number;
            sections: number;
        };
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
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
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    findOne(id: string, orgId: string): Promise<{
        permissions: {
            id: string;
            role: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            canView: boolean;
            canEdit: boolean;
            canDelete: boolean;
            formId: string;
            canSubmit: boolean;
            canShare: boolean;
            canManageBuilder: boolean;
        }[];
        fields: ({
            section: {
                id: string;
                createdAt: Date;
                description: string | null;
                order: number;
                label: string;
                formId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            order: number;
            isRequired: boolean | null;
            isReadonly: boolean;
            isHidden: boolean;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            fieldId: string;
            formId: string;
            sectionId: string | null;
            conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
            urlParamKey: string | null;
            customLabel: string | null;
            customPlaceholder: string | null;
        })[];
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
        sections: {
            id: string;
            createdAt: Date;
            description: string | null;
            order: number;
            label: string;
            formId: string;
        }[];
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
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    create(orgId: string, userId: string, data: any): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
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
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(id: string, orgId: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    remove(id: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    addSection(formId: string, orgId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        order: number;
        label: string;
        formId: string;
    }>;
    updateSection(formId: string, orgId: string, sectionId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        order: number;
        label: string;
        formId: string;
    }>;
    removeSection(formId: string, orgId: string, sectionId: string): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        order: number;
        label: string;
        formId: string;
    }>;
    addField(formId: string, orgId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        order: number;
        isRequired: boolean | null;
        isReadonly: boolean;
        isHidden: boolean;
        conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
        fieldId: string;
        formId: string;
        sectionId: string | null;
        conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
        urlParamKey: string | null;
        customLabel: string | null;
        customPlaceholder: string | null;
    }>;
    updateField(formId: string, orgId: string, formFieldId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        order: number;
        isRequired: boolean | null;
        isReadonly: boolean;
        isHidden: boolean;
        conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
        fieldId: string;
        formId: string;
        sectionId: string | null;
        conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
        urlParamKey: string | null;
        customLabel: string | null;
        customPlaceholder: string | null;
    }>;
    removeField(formId: string, orgId: string, formFieldId: string): Promise<{
        id: string;
        createdAt: Date;
        order: number;
        isRequired: boolean | null;
        isReadonly: boolean;
        isHidden: boolean;
        conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
        fieldId: string;
        formId: string;
        sectionId: string | null;
        conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
        urlParamKey: string | null;
        customLabel: string | null;
        customPlaceholder: string | null;
    }>;
    reorderFields(formId: string, orgId: string, formFieldIds: string[]): Promise<{
        success: boolean;
    }>;
    getPermissions(formId: string, orgId: string): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        formId: string;
        canSubmit: boolean;
        canShare: boolean;
        canManageBuilder: boolean;
    }[]>;
    setPermission(formId: string, orgId: string, data: any): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        formId: string;
        canSubmit: boolean;
        canShare: boolean;
        canManageBuilder: boolean;
    }>;
    getModuleFields(formId: string, orgId: string): Promise<({
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
    })[]>;
    generateToken(formId: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    revokeToken(formId: string, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getPublicForm(token: string): Promise<({
        fields: ({
            section: {
                id: string;
                createdAt: Date;
                description: string | null;
                order: number;
                label: string;
                formId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            order: number;
            isRequired: boolean | null;
            isReadonly: boolean;
            isHidden: boolean;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            fieldId: string;
            formId: string;
            sectionId: string | null;
            conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
            urlParamKey: string | null;
            customLabel: string | null;
            customPlaceholder: string | null;
        })[];
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
        sections: {
            id: string;
            createdAt: Date;
            description: string | null;
            order: number;
            label: string;
            formId: string;
        }[];
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
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }) | {
        resolvedFields: {
            moduleField: {
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
            };
            section: {
                id: string;
                createdAt: Date;
                description: string | null;
                order: number;
                label: string;
                formId: string;
            };
            id: string;
            createdAt: Date;
            order: number;
            isRequired: boolean | null;
            isReadonly: boolean;
            isHidden: boolean;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            fieldId: string;
            formId: string;
            sectionId: string | null;
            conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
            urlParamKey: string | null;
            customLabel: string | null;
            customPlaceholder: string | null;
        }[];
        fields: ({
            section: {
                id: string;
                createdAt: Date;
                description: string | null;
                order: number;
                label: string;
                formId: string;
            };
        } & {
            id: string;
            createdAt: Date;
            order: number;
            isRequired: boolean | null;
            isReadonly: boolean;
            isHidden: boolean;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            fieldId: string;
            formId: string;
            sectionId: string | null;
            conditionalRequired: import("@prisma/client/runtime/library").JsonValue | null;
            urlParamKey: string | null;
            customLabel: string | null;
            customPlaceholder: string | null;
        })[];
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
        sections: {
            id: string;
            createdAt: Date;
            description: string | null;
            order: number;
            label: string;
            formId: string;
        }[];
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    submitPublicForm(token: string, data: any, ipAddress?: string, userAgent?: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }>;
    private syncToGoogleSheets;
    getSubmissions(formId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }[]>;
    getFolders(orgId: string, userId: string, userRole: string, deptId: string | null): Promise<({
        _count: {
            forms: number;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    createFolder(orgId: string, userId: string, data: any): Promise<{
        _count: {
            forms: number;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    updateFolder(id: string, orgId: string, userId: string, userRole: string, data: any): Promise<{
        _count: {
            forms: number;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    deleteFolder(id: string, orgId: string, userId: string, userRole: string): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getFolderForms(folderId: string, orgId: string): Promise<({
        _count: {
            submissions: number;
        };
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
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
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    getSharedForms(orgId: string, userId: string, userRole: string, deptId: string | null): Promise<({
        _count: {
            submissions: number;
        };
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
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
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    getSharedFolders(orgId: string, userId: string, userRole: string, deptId: string | null): Promise<({
        _count: {
            forms: number;
        };
        createdBy: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        color: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    })[]>;
    updateFormSharing(formId: string, orgId: string, userId: string, userRole: string, data: {
        sharedUsers?: string[];
        sharedDepts?: string[];
        sharedRoles?: string[];
        editableByUsers?: string[];
        editableByDepts?: string[];
        editableByRoles?: string[];
    }): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string | null;
        type: string;
        createdById: string;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
        token: string | null;
        folderId: string | null;
        sharedDepts: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getFormSharing(formId: string, orgId: string): Promise<{
        sharedUsers: any;
        sharedDepts: any;
        sharedRoles: any;
        editableByUsers: any;
        editableByDepts: any;
        editableByRoles: any;
    }>;
    private generateAutoNumber;
}
