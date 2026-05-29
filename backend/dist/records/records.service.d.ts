import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
export declare class RecordsService {
    private prisma;
    private workflows;
    constructor(prisma: PrismaService, workflows: WorkflowsService);
    create(moduleId: string, orgId: string, userId: string, data: Record<string, any>): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        createdById: string;
        updatedById: string | null;
    }>;
    private generateAutoNumber;
    findAll(moduleId: string, orgId: string, query: any): Promise<{
        data: ({
            createdBy: {
                email: string;
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            data: import("@prisma/client/runtime/library").JsonValue;
            moduleId: string;
            isDeleted: boolean;
            deletedAt: Date | null;
            createdById: string;
            updatedById: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    private applyFilterGroup;
    private applyCondition;
    findOne(id: string, orgId: string): Promise<{
        comments: ({
            user: {
                firstName: string;
                lastName: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            recordId: string;
            content: string;
        })[];
        files: {
            id: string;
            organizationId: string;
            createdAt: Date;
            name: string;
            recordId: string | null;
            originalName: string;
            mimeType: string;
            size: number;
            url: string;
            path: string | null;
            uploadedById: string;
        }[];
        module: {
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
            icon: string | null;
            color: string | null;
            order: number;
        };
        createdBy: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        createdById: string;
        updatedById: string | null;
    }>;
    update(id: string, orgId: string, userId: string, data: Record<string, any>): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        createdById: string;
        updatedById: string | null;
    }>;
    softDelete(id: string, orgId: string, userId: string): Promise<{
        success: boolean;
    }>;
    bulkDelete(ids: string[], orgId: string, userId: string): Promise<{
        success: boolean;
        count: number;
    }>;
    bulkUpdateField(ids: string[], fieldName: string, value: any, orgId: string): Promise<{
        updated: number;
        errors: string[];
        total: number;
    }>;
    addComment(recordId: string, orgId: string, userId: string, content: string): Promise<{
        user: {
            firstName: string;
            lastName: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        recordId: string;
        content: string;
    }>;
    exportCsv(moduleId: string, orgId: string, filterGroup?: string): Promise<string>;
    private parseCsv;
    importPreview(csvText: string): Promise<{
        headers: string[];
        preview: Record<string, string>[];
        total: number;
    }>;
    importCsv(moduleId: string, orgId: string, userId: string, csvText: string, mapping: Record<string, string>): Promise<{
        imported: number;
        errors: string[];
        total: number;
    }>;
    getImportTemplate(moduleId: string, orgId: string): Promise<string>;
    lookupSearch(orgId: string, targetModuleId: string, displayField: string, search: string): Promise<{
        id: string;
        label: any;
        data: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
}
