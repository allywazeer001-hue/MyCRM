import { DepartmentsService } from './departments.service';
export declare class DepartmentsController {
    private depts;
    constructor(depts: DepartmentsService);
    findAll(user: any): Promise<({
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
    findOne(id: string, user: any): Promise<{
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
    create(user: any, body: any): Promise<{
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
    update(id: string, user: any, body: any): Promise<{
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
    remove(id: string, user: any): Promise<{
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
    getMembers(id: string, user: any): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        avatar: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }[]>;
    addMember(id: string, userId: string, user: any): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    removeMember(id: string, userId: string, user: any): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
    }>;
    getPermissions(id: string, user: any): Promise<{
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
    updatePermissions(id: string, user: any, body: any): Promise<{
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
    setHead(id: string, user: any, body: {
        headUserId: string | null;
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
}
