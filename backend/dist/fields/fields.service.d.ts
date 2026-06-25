import { PrismaService } from '../prisma/prisma.service';
export declare class FieldsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(moduleId: string, orgId: string, data: any): Promise<{
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
    }>;
    findByModule(moduleId: string, orgId: string): Promise<({
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
    update(id: string, orgId: string, data: any): Promise<{
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
    }>;
    reorder(moduleId: string, orgId: string, fieldIds: string[]): Promise<{
        success: boolean;
    }>;
    remove(id: string, orgId: string): Promise<{
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
    }>;
}
