import { PrismaService } from '../prisma/prisma.service';
export declare class PermissionsService {
    private prisma;
    constructor(prisma: PrismaService);
    setPermission(orgId: string, data: any): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        canAnalytics: boolean;
        canDashboard: boolean;
        canCreate: boolean;
        canDelete: boolean;
        canExport: boolean;
        canPrint: boolean;
        moduleId: string;
        canRead: boolean;
        canUpdate: boolean;
        canApprove: boolean;
        canManage: boolean;
        canFormBuilder: boolean;
        canSettings: boolean;
    }>;
    getPermissions(orgId: string, role?: string, moduleId?: string): Promise<({
        module: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        };
    } & {
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        canAnalytics: boolean;
        canDashboard: boolean;
        canCreate: boolean;
        canDelete: boolean;
        canExport: boolean;
        canPrint: boolean;
        moduleId: string;
        canRead: boolean;
        canUpdate: boolean;
        canApprove: boolean;
        canManage: boolean;
        canFormBuilder: boolean;
        canSettings: boolean;
    })[]>;
    getMatrix(orgId: string): Promise<{
        modules: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        }[];
        roles: string[];
        matrix: Record<string, Record<string, any>>;
    }>;
    setBulkPermissions(orgId: string, role: string, permissions: Array<{
        moduleId: string;
        [key: string]: any;
    }>): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        canAnalytics: boolean;
        canDashboard: boolean;
        canCreate: boolean;
        canDelete: boolean;
        canExport: boolean;
        canPrint: boolean;
        moduleId: string;
        canRead: boolean;
        canUpdate: boolean;
        canApprove: boolean;
        canManage: boolean;
        canFormBuilder: boolean;
        canSettings: boolean;
    }[]>;
    seedModulePermissions(orgId: string, moduleId: string): Promise<void>;
}
