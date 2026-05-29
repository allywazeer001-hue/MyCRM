import { DashboardsService } from './dashboards.service';
export declare class DashboardsController {
    private svc;
    constructor(svc: DashboardsService);
    create(body: any, user: any): Promise<{
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
    findAll(user: any): Promise<({
        widgets: {
            id: string;
            createdAt: Date;
            order: number;
            moduleId: string | null;
            type: import(".prisma/client").$Enums.WidgetType;
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
    findOne(id: string, user: any): Promise<{
        widgets: {
            id: string;
            createdAt: Date;
            order: number;
            moduleId: string | null;
            type: import(".prisma/client").$Enums.WidgetType;
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
    addWidget(id: string, body: any, user: any): Promise<{
        id: string;
        createdAt: Date;
        order: number;
        moduleId: string | null;
        type: import(".prisma/client").$Enums.WidgetType;
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
        moduleId: string | null;
        type: import(".prisma/client").$Enums.WidgetType;
        config: import("@prisma/client/runtime/library").JsonValue;
        title: string;
        dashboardId: string;
        filters: import("@prisma/client/runtime/library").JsonValue;
        position: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getAnalytics(moduleId: string, query: any, user: any): Promise<{
        name: string;
        value: number;
    }[] | {
        total: number;
    }>;
}
