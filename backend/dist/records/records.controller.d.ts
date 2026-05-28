import { Response } from 'express';
import { RecordsService } from './records.service';
export declare class LookupController {
    private recordsService;
    constructor(recordsService: RecordsService);
    lookup(moduleId: string, displayField: string, search: string, user: any): Promise<{
        id: string;
        label: any;
        data: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
}
export declare class RecordsController {
    private recordsService;
    constructor(recordsService: RecordsService);
    create(moduleId: string, body: any, user: any): Promise<{
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
    findAll(moduleId: string, query: any, user: any): Promise<{
        data: ({
            createdBy: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
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
    findOne(id: string, user: any): Promise<{
        comments: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
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
            id: string;
            email: string;
            firstName: string;
            lastName: string;
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
    update(id: string, body: any, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
        success: boolean;
    }>;
    bulkDelete(ids: string[], user: any): Promise<{
        success: boolean;
        count: number;
    }>;
    bulkUpdate(body: any, user: any): Promise<{
        updated: number;
        errors: string[];
        total: number;
    }>;
    getImportTemplate(moduleId: string, user: any, res: Response): Promise<void>;
    importPreview(csvText: string): Promise<{
        headers: string[];
        preview: Record<string, string>[];
        total: number;
    }>;
    importRun(moduleId: string, csvText: string, mapping: Record<string, string>, user: any): Promise<{
        imported: number;
        errors: string[];
        total: number;
    }>;
    exportCsv(moduleId: string, filterGroup: string, user: any, res: Response): Promise<void>;
    addComment(id: string, content: string, user: any): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        recordId: string;
        content: string;
    }>;
}
