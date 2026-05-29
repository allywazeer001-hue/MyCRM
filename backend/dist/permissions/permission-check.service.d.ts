import { PrismaService } from '../prisma/prisma.service';
export declare class PermissionCheckService {
    private prisma;
    constructor(prisma: PrismaService);
    isSuperAdmin(userId: string): Promise<boolean>;
    resolveUserPermissions(userId: string, orgId: string): Promise<{
        isAdmin: boolean;
        isSuperAdmin: boolean;
        system: {
            canDashboard: boolean;
            canAnalytics: boolean;
            canWorkflow: boolean;
            canForms: boolean;
            canStudio: boolean;
        };
        modules: Record<string, any>;
    } | {
        isAdmin: boolean;
        system: Record<string, boolean>;
        modules: Record<string, Record<string, boolean>>;
        isSuperAdmin?: undefined;
    }>;
    checkModulePermById(userId: string, orgId: string, moduleId: string, action: string): Promise<boolean>;
    enforceModulePerm(userId: string, orgId: string, moduleId: string, action: string): Promise<void>;
}
