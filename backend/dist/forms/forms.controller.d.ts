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
            id: string;
            firstName: string;
            lastName: string;
        };
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
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
    })[]>;
    findOne(id: string, user: any): Promise<{
        permissions: {
            id: string;
            role: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            canDelete: boolean;
            formId: string;
            canView: boolean;
            canSubmit: boolean;
            canEdit: boolean;
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
            id: string;
            firstName: string;
            lastName: string;
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
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
    }>;
    create(body: any, user: any): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
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
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
    }>;
    update(id: string, body: any, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
    }>;
    remove(id: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
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
        canDelete: boolean;
        formId: string;
        canView: boolean;
        canSubmit: boolean;
        canEdit: boolean;
        canShare: boolean;
        canManageBuilder: boolean;
    }[]>;
    setPermission(id: string, body: any, user: any): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        canDelete: boolean;
        formId: string;
        canView: boolean;
        canSubmit: boolean;
        canEdit: boolean;
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
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
    }>;
    revokeToken(id: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
    }>;
    getSubmissions(id: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }[]>;
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
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
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
        settings: import("@prisma/client/runtime/library").JsonValue;
        description: string | null;
        type: string;
        moduleId: string | null;
        createdById: string;
        token: string | null;
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
