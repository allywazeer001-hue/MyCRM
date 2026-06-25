import { PrismaService } from '../prisma/prisma.service';
import { PermissionCheckService } from '../permissions/permission-check.service';
export declare class DashboardsService {
    private prisma;
    private perm;
    constructor(prisma: PrismaService, perm: PermissionCheckService);
    private pickWritable;
    findAll(userId: string, orgId: string): Promise<any[]>;
    findOne(id: string, userId: string, orgId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isPublic: boolean;
        isDefault: boolean;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedDepartments: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
    }>;
    create(userId: string, orgId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isPublic: boolean;
        isDefault: boolean;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedDepartments: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(id: string, userId: string, orgId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isPublic: boolean;
        isDefault: boolean;
        sharedRoles: import("@prisma/client/runtime/library").JsonValue;
        sharedDepartments: import("@prisma/client/runtime/library").JsonValue;
        sharedUsers: import("@prisma/client/runtime/library").JsonValue;
    }>;
    remove(id: string, userId: string, orgId: string): Promise<{
        ok: boolean;
    }>;
}
