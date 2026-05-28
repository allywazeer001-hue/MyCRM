import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(orgId: string, userId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        createdById: string;
        isDefault: boolean;
        isPublic: boolean;
    }>;
    findAll(orgId: string): Promise<({
        widgets: {
            id: string;
            createdAt: Date;
            order: number;
            type: import(".prisma/client").$Enums.WidgetType;
            moduleId: string | null;
            config: import("@prisma/client/runtime/library").JsonValue;
            title: string;
            dashboardId: string;
            filters: import("@prisma/client/runtime/library").JsonValue;
            position: import("@prisma/client/runtime/library").JsonValue;
        }[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        createdById: string;
        isDefault: boolean;
        isPublic: boolean;
    })[]>;
    findOne(id: string, orgId: string): Promise<{
        widgets: {
            id: string;
            createdAt: Date;
            order: number;
            type: import(".prisma/client").$Enums.WidgetType;
            moduleId: string | null;
            config: import("@prisma/client/runtime/library").JsonValue;
            title: string;
            dashboardId: string;
            filters: import("@prisma/client/runtime/library").JsonValue;
            position: import("@prisma/client/runtime/library").JsonValue;
        }[];
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        createdById: string;
        isDefault: boolean;
        isPublic: boolean;
    }>;
    addWidget(dashboardId: string, orgId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        order: number;
        type: import(".prisma/client").$Enums.WidgetType;
        moduleId: string | null;
        config: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        dashboardId: string;
        filters: import("@prisma/client/runtime/library").JsonValue;
        position: import("@prisma/client/runtime/library").JsonValue;
    }>;
    removeWidget(widgetId: string): Promise<{
        id: string;
        createdAt: Date;
        order: number;
        type: import(".prisma/client").$Enums.WidgetType;
        moduleId: string | null;
        config: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        dashboardId: string;
        filters: import("@prisma/client/runtime/library").JsonValue;
        position: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getAnalytics(moduleId: string, orgId: string, query: any): Promise<{
        name: string;
        value: number;
    }[] | {
        total: number;
    }>;
}
