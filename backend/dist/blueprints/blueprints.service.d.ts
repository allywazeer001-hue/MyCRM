import { PrismaService } from '../prisma/prisma.service';
export declare class BlueprintsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<({
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
    findOne(id: string, orgId: string): Promise<{
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
    findForModule(moduleId: string, orgId: string): Promise<{
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
    create(orgId: string, data: any): Promise<{
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
    update(id: string, orgId: string, data: any): Promise<{
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
    remove(id: string, orgId: string): Promise<{
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
    evaluateTree(treeData: any, recordData: any): {
        actions: any[];
    };
    private walkNode;
    private processChildren;
    private evalCondGroup;
    evaluateForRecord(recordId: string, orgId: string): Promise<{
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
    private evalCondition;
}
