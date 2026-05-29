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
    seed(moduleId: string, user: any): Promise<void>;
}
