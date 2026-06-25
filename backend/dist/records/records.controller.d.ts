import { Response } from 'express';
import { RecordsService } from './records.service';
import { PermissionCheckService } from '../permissions/permission-check.service';
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
    private permCheck;
    constructor(recordsService: RecordsService, permCheck: PermissionCheckService);
    create(moduleId: string, body: any, user: any): Promise<{
        id: string;
        lockedAt: Date | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        isArchived: boolean;
        archivedAt: Date | null;
        isLocked: boolean;
        createdById: string;
        updatedById: string | null;
    }>;
    findAll(moduleId: string, query: any, user: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string, user: any): Promise<any>;
    update(moduleId: string, id: string, body: any, user: any): Promise<{
        id: string;
        lockedAt: Date | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        isArchived: boolean;
        archivedAt: Date | null;
        isLocked: boolean;
        createdById: string;
        updatedById: string | null;
    }>;
    remove(moduleId: string, id: string, user: any): Promise<{
        success: boolean;
    }>;
    bulkDelete(moduleId: string, ids: string[], user: any): Promise<{
        success: boolean;
        count: number;
    }>;
    bulkUpdate(moduleId: string, body: any, user: any): Promise<{
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
    getActivity(id: string, user: any): Promise<({
        id: any;
        type: "audit";
        action: any;
        user: any;
        metadata: any;
        createdAt: any;
    } | {
        id: any;
        type: "comment";
        action: string;
        user: any;
        metadata: {
            content: any;
        };
        createdAt: any;
    })[]>;
    duplicate(moduleId: string, id: string, user: any): Promise<{
        id: string;
        lockedAt: Date | null;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue;
        moduleId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        isArchived: boolean;
        archivedAt: Date | null;
        isLocked: boolean;
        createdById: string;
        updatedById: string | null;
    }>;
    archive(id: string, archived: boolean, user: any): Promise<{
        success: boolean;
        isArchived: boolean;
    }>;
    lock(id: string, locked: boolean, user: any): Promise<{
        success: boolean;
        isLocked: boolean;
    }>;
}
