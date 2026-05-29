import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    applyFilterGroup(records: any[], group: FilterGroup): any[];
    private matchCondition;
    getAnalytics(moduleId: string, orgId: string, params: AnalyticsParams): Promise<{
        total: number;
        value: number;
        data: {
            name: string;
            value: number;
        }[];
    }>;
    getKanban(moduleId: string, orgId: string, statusField: string, filterGroup?: FilterGroup): Promise<{
        field: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            order: number;
            moduleId: string;
            label: string;
            type: import(".prisma/client").$Enums.FieldType;
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
        };
        columns: {
            key: string;
            label: string;
            color: string;
            records: any[];
        }[];
    }>;
    getViews(orgId: string): Promise<{
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
    createView(orgId: string, userId: string, data: any): Promise<{
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
    updateView(id: string, orgId: string, data: any): Promise<{
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
    deleteView(id: string, orgId: string): Promise<{
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
    togglePinView(id: string, orgId: string): Promise<{
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
    getSavedFilters(orgId: string, context?: string): Promise<{
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
    createSavedFilter(orgId: string, userId: string, data: any): Promise<{
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
    updateSavedFilter(id: string, orgId: string, data: any): Promise<{
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
    deleteSavedFilter(id: string, orgId: string): Promise<{
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
    getTargets(orgId: string): Promise<({
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
        fieldName: string | null;
        aggregation: string;
        targetValue: number;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    })[]>;
    createTarget(orgId: string, data: any): Promise<{
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
        fieldName: string | null;
        aggregation: string;
        targetValue: number;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
    updateTarget(id: string, orgId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        fieldName: string | null;
        aggregation: string;
        targetValue: number;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
    deleteTarget(id: string, orgId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        fieldName: string | null;
        aggregation: string;
        targetValue: number;
        currentValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
    computeTargetCurrent(id: string, orgId: string): Promise<{
        currentValue: number;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        moduleId: string;
        fieldName: string | null;
        aggregation: string;
        targetValue: number;
        period: string;
        periodStart: Date | null;
        periodEnd: Date | null;
    }>;
}
interface FilterCondition {
    field: string;
    operator: string;
    value?: any;
    value2?: any;
}
interface FilterGroup {
    operator: 'AND' | 'OR';
    conditions: FilterCondition[];
    groups: FilterGroup[];
}
interface AnalyticsParams {
    groupByField?: string;
    aggregation?: 'COUNT' | 'SUM' | 'AVG';
    aggregateField?: string;
    filterGroup?: FilterGroup;
}
export {};
