import { PermissionsService } from './permissions.service';
export declare class PermissionsController {
    private svc;
    constructor(svc: PermissionsService);
    set(body: any, user: any): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string;
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canExport: boolean;
        canPrint: boolean;
        canApprove: boolean;
        canManage: boolean;
        canFormBuilder: boolean;
        canDashboard: boolean;
        canAnalytics: boolean;
        canSettings: boolean;
    }>;
    get(role: string, moduleId: string, user: any): Promise<({
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
        moduleId: string;
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canExport: boolean;
        canPrint: boolean;
        canApprove: boolean;
        canManage: boolean;
        canFormBuilder: boolean;
        canDashboard: boolean;
        canAnalytics: boolean;
        canSettings: boolean;
    })[]>;
    matrix(user: any): Promise<{
        modules: {
            id: string;
            name: string;
            slug: string;
            icon: string;
        }[];
        roles: string[];
        matrix: Record<string, Record<string, any>>;
    }>;
    bulk(role: string, permissions: any[], user: any): Promise<{
        id: string;
        role: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        moduleId: string;
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canExport: boolean;
        canPrint: boolean;
        canApprove: boolean;
        canManage: boolean;
        canFormBuilder: boolean;
        canDashboard: boolean;
        canAnalytics: boolean;
        canSettings: boolean;
    }[]>;
    seed(moduleId: string, user: any): Promise<void>;
}
