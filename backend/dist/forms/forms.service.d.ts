import { PrismaService } from '../prisma/prisma.service';
export declare class FormsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<({
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
    findOne(id: string, orgId: string): Promise<{
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
    create(orgId: string, userId: string, data: any): Promise<{
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
    update(id: string, orgId: string, data: any): Promise<{
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
    remove(id: string, orgId: string): Promise<{
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
        canDelete: boolean;
        formId: string;
        canView: boolean;
        canSubmit: boolean;
        canEdit: boolean;
        canShare: boolean;
        canManageBuilder: boolean;
    }[]>;
    setPermission(formId: string, orgId: string, data: any): Promise<{
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
    generateToken(formId: string, orgId: string): Promise<{
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
    revokeToken(formId: string, orgId: string): Promise<{
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
    submitPublicForm(token: string, data: any, ipAddress?: string, userAgent?: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }>;
    getSubmissions(formId: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        userAgent: string | null;
        formId: string;
    }[]>;
    private generateAutoNumber;
}
