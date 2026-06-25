import { PrismaService } from '../prisma/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { ProcessService } from '../process/process.service';
import { RelationResolverService } from './relation-resolver.service';
export declare class RecordsService {
    private prisma;
    private workflows;
    private readonly processService;
    private readonly resolver;
    constructor(prisma: PrismaService, workflows: WorkflowsService, processService: ProcessService, resolver: RelationResolverService);
    create(moduleId: string, orgId: string, userId: string, data: Record<string, any>): Promise<{
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
    private generateAutoNumber;
    findAll(moduleId: string, orgId: string, query: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    private applyFilterGroup;
    private applyCondition;
    findOne(id: string, orgId: string): Promise<any>;
    update(id: string, orgId: string | null, userId: string, data: Record<string, any>): Promise<{
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
    softDelete(id: string, orgId: string | null, userId: string): Promise<{
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
    getActivity(recordId: string, orgId: string): Promise<({
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
    duplicate(id: string, orgId: string, userId: string): Promise<{
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
    setArchived(id: string, orgId: string, userId: string, archived: boolean): Promise<{
        success: boolean;
        isArchived: boolean;
    }>;
    setLocked(id: string, orgId: string, userId: string, locked: boolean): Promise<{
        success: boolean;
        isLocked: boolean;
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
