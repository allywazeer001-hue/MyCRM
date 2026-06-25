import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private svc;
    constructor(svc: AnalyticsService);
    getData(moduleId: string, body: any, user: any): Promise<{
        total: number;
        value: number;
        data: {
            name: string;
            value: number;
        }[];
        secondaryKeys?: undefined;
        isMultiLevel?: undefined;
    } | {
        total: number;
        value: number;
        data: Record<string, any>[];
        secondaryKeys: string[];
        isMultiLevel: boolean;
    }>;
    getDataGet(moduleId: string, groupByField: string, user: any): Promise<{
        total: number;
        value: number;
        data: {
            name: string;
            value: number;
        }[];
        secondaryKeys?: undefined;
        isMultiLevel?: undefined;
    } | {
        total: number;
        value: number;
        data: Record<string, any>[];
        secondaryKeys: string[];
        isMultiLevel: boolean;
    }>;
    getKanban(moduleId: string, body: {
        statusField: string;
        filterGroup?: any;
    }, user: any): Promise<{
        field: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            order: number;
            moduleId: string;
            type: import(".prisma/client").$Enums.FieldType;
            label: string;
            isRequired: boolean;
            isUnique: boolean;
            isReadonly: boolean;
            isHidden: boolean;
            placeholder: string | null;
            helpText: string | null;
            defaultValue: string | null;
            validation: import("@prisma/client/runtime/library").JsonValue | null;
            conditionalLogic: import("@prisma/client/runtime/library").JsonValue | null;
            lookupModuleId: string | null;
            lookupFieldId: string | null;
            formulaExpression: string | null;
        };
        columns: {
            key: string;
            label: string;
            color: string;
            records: any[];
        }[];
    }>;
    getViews(user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isDefault: boolean;
        isPinned: boolean;
    }[]>;
    getView(id: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isDefault: boolean;
        isPinned: boolean;
    }>;
    createView(body: any, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isDefault: boolean;
        isPinned: boolean;
    }>;
    updateView(id: string, body: any, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isDefault: boolean;
        isPinned: boolean;
    }>;
    deleteView(id: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isDefault: boolean;
        isPinned: boolean;
    }>;
    togglePinView(id: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        config: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        isDefault: boolean;
        isPinned: boolean;
    }>;
    getSavedFilters(context: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string | null;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        logic: string;
        context: string;
    }[]>;
    createSavedFilter(body: any, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string | null;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        logic: string;
        context: string;
    }>;
    updateSavedFilter(id: string, body: any, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string | null;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        logic: string;
        context: string;
    }>;
    deleteSavedFilter(id: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string | null;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        createdById: string;
        logic: string;
        context: string;
    }>;
    getTargets(user: any): Promise<({
        module: {
            id: string;
            name: string;
            icon: string;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        targetValue: number;
        fieldName: string | null;
        aggregation: string;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    })[]>;
    createTarget(body: any, user: any): Promise<{
        module: {
            id: string;
            name: string;
            icon: string;
        };
    } & {
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        targetValue: number;
        fieldName: string | null;
        aggregation: string;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
    updateTarget(id: string, body: any, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        targetValue: number;
        fieldName: string | null;
        aggregation: string;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
    deleteTarget(id: string, user: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        targetValue: number;
        fieldName: string | null;
        aggregation: string;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
    computeTarget(id: string, user: any): Promise<{
        currentValue: number;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        targetValue: number;
        fieldName: string | null;
        aggregation: string;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
}
