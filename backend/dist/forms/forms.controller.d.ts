import { Request } from 'express';
import { FormsService } from './forms.service';
export declare class FormsController {
    private svc;
    constructor(svc: FormsService);
    findAll(user: any): Promise<({
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
    getFolders(user: any): Promise<({
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
    createFolder(body: any, user: any): Promise<{
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
    updateFolder(folderId: string, body: any, user: any): Promise<{
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
    deleteFolder(folderId: string, user: any): Promise<{
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
    getFolderForms(folderId: string, user: any): Promise<({
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
    getSharedForms(user: any): Promise<({
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
    getSharedFolders(user: any): Promise<({
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
    findOne(id: string, user: any): Promise<{
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
    create(body: any, user: any): Promise<{
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
    update(id: string, body: any, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
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
    addSection(id: string, body: any, user: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        order: number;
        label: string;
        formId: string;
    }>;
    updateSection(id: string, sectionId: string, body: any, user: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        order: number;
        label: string;
        formId: string;
    }>;
    removeSection(id: string, sectionId: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        order: number;
        label: string;
        formId: string;
    }>;
    getModuleFields(id: string, user: any): Promise<({
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
    addField(id: string, body: any, user: any): Promise<{
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
    updateField(id: string, formFieldId: string, body: any, user: any): Promise<{
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
    removeField(id: string, formFieldId: string, user: any): Promise<{
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
    reorderFields(id: string, formFieldIds: string[], user: any): Promise<{
        success: boolean;
    }>;
    getPermissions(id: string, user: any): Promise<{
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
    setPermission(id: string, body: any, user: any): Promise<{
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
    generateToken(id: string, user: any): Promise<{
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
    revokeToken(id: string, user: any): Promise<{
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
    getSubmissions(id: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }[]>;
    getFormSharing(id: string, user: any): Promise<{
        sharedUsers: any;
        sharedDepts: any;
        sharedRoles: any;
        editableByUsers: any;
        editableByDepts: any;
        editableByRoles: any;
    }>;
    updateFormSharing(id: string, body: any, user: any): Promise<{
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
}
export declare class PublicFormsController {
    private svc;
    constructor(svc: FormsService);
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
    submitForm(token: string, body: any, req: Request): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }>;
}
