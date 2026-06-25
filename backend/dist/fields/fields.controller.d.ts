import { FieldsService } from './fields.service';
export declare class FieldsController {
    private fieldsService;
    constructor(fieldsService: FieldsService);
    create(moduleId: string, body: any, user: any): Promise<{
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
    findByModule(moduleId: string, user: any): Promise<({
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
    update(id: string, body: any, user: any): Promise<{
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
    reorder(moduleId: string, fieldIds: string[], user: any): Promise<{
        success: boolean;
    }>;
    remove(id: string, user: any): Promise<{
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
