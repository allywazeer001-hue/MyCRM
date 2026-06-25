import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
export declare class ModulesController {
    private modulesService;
    constructor(modulesService: ModulesService);
    create(dto: CreateModuleDto, user: any): Promise<{
        fields: {
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
        icon: string | null;
        color: string | null;
        order: number;
    }>;
    findAll(user: any): Promise<({
        _count: {
            records: number;
            forms: number;
            fields: number;
        };
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
        })[];
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
        icon: string | null;
        color: string | null;
        order: number;
    })[]>;
    findOne(id: string, user: any): Promise<{
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
        })[];
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
        icon: string | null;
        color: string | null;
        order: number;
    }>;
    findBySlug(slug: string, user: any): Promise<{
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
        })[];
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
        icon: string | null;
        color: string | null;
        order: number;
    }>;
    update(id: string, dto: UpdateModuleDto, user: any): Promise<{
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
        })[];
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
        icon: string | null;
        color: string | null;
        order: number;
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
        icon: string | null;
        color: string | null;
        order: number;
    }>;
}
