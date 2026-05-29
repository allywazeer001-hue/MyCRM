import { BlueprintsService } from './blueprints.service';
export declare class BlueprintsController {
    private readonly blueprintsService;
    constructor(blueprintsService: BlueprintsService);
    findAll(user: any): Promise<({
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    findForModule(moduleId: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    evaluate(recordId: string, user: any): Promise<{
        blueprint: {
            id: string;
            isActive: boolean;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            moduleId: string;
            statusFieldName: string;
            phases: import("@prisma/client/runtime/library").JsonValue;
            transitions: import("@prisma/client/runtime/library").JsonValue;
            fieldLocks: import("@prisma/client/runtime/library").JsonValue;
            rules: import("@prisma/client/runtime/library").JsonValue;
            treeData: import("@prisma/client/runtime/library").JsonValue | null;
        };
        currentPhase: any;
        lockedFields: string[];
        availableTransitions: any[];
        treeActions: any[];
    }>;
    findOne(id: string, user: any): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
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
                lookupModuleId: string | null;
                lookupFieldId: string | null;
            })[];
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    create(body: any, user: any): Promise<{
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
    } & {
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    update(id: string, body: any, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    remove(id: string, user: any): Promise<{
        id: string;
        isActive: boolean;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        moduleId: string;
        statusFieldName: string;
        phases: import("@prisma/client/runtime/library").JsonValue;
        transitions: import("@prisma/client/runtime/library").JsonValue;
        fieldLocks: import("@prisma/client/runtime/library").JsonValue;
        rules: import("@prisma/client/runtime/library").JsonValue;
        treeData: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
}
