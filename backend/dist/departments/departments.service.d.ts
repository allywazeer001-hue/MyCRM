import { PrismaService } from '../prisma/prisma.service';
export declare class DepartmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<({
        _count: {
            users: number;
        };
        head: {
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
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    })[]>;
    findOne(id: string, orgId: string): Promise<{
        users: {
            email: string;
            firstName: string;
            lastName: string;
            id: string;
            avatar: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
        }[];
        _count: {
            users: number;
        };
        head: {
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
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    }>;
    create(orgId: string, data: {
        name: string;
        description?: string;
        color?: string;
    }): Promise<{
        _count: {
            users: number;
        };
        head: {
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
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    }>;
    update(id: string, orgId: string, data: Partial<{
        name: string;
        description: string;
        color: string;
        permissions: any;
    }>): Promise<{
        _count: {
            users: number;
        };
        head: {
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
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    }>;
    setHead(id: string, _orgId: string, headUserId: string | null): Promise<{
        _count: {
            users: number;
        };
        head: {
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
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    }>;
    remove(id: string, orgId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    }>;
    getMembers(id: string, orgId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        avatar: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }[]>;
    addMember(deptId: string, orgId: string, userId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    removeMember(deptId: string, orgId: string, userId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    getPermissions(id: string, orgId: string): Promise<{
        systemPermission: {
            id: any;
            moduleId: any;
            departmentId: string;
            canDashboard: any;
            canAnalytics: any;
            canWorkflow: any;
            canForms: any;
            canStudio: any;
            canView: boolean;
            canCreate: boolean;
            canEdit: boolean;
            canDelete: boolean;
            canExport: boolean;
            canImport: boolean;
            canPrint: boolean;
        };
        modulePermissions: {
            module: {
                id: string;
                name: string;
                slug: string;
                icon: string;
                color: string;
            };
            permission: {
                id: any;
                moduleId: string;
                departmentId: string;
                canView: any;
                canCreate: any;
                canEdit: any;
                canDelete: any;
                canExport: any;
                canImport: any;
                canPrint: any;
                canStudio: boolean;
                canAnalytics: boolean;
                canWorkflow: boolean;
                canForms: boolean;
                canDashboard: boolean;
            };
        }[];
    }>;
    updatePermissions(id: string, orgId: string, body: any): Promise<{
        _count: {
            users: number;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        color: string;
        headUserId: string | null;
    }>;
}
