import { DashboardsService } from './dashboards.service';
export declare class DashboardsController {
    private svc;
    constructor(svc: DashboardsService);
    findAll(user: any): Promise<any[]>;
    findOne(id: string, user: any): Promise<{
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
    create(body: any, user: any): Promise<{
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
    update(id: string, body: any, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
        ok: boolean;
    }>;
}
