import { PrismaService } from '../prisma/prisma.service';
export declare class IndustrySetupService {
    private prisma;
    constructor(prisma: PrismaService);
    getBlueprintList(): {
        key: string;
        industry: string;
        description: string;
        icon: string;
        color: string;
        moduleCount: number;
        workflowCount: number;
        departmentCount: number;
        fieldCount: number;
    }[];
    getBlueprintPreview(key: string): {
        key: string;
        industry: string;
        description: string;
        icon: string;
        color: string;
        moduleCount: number;
        fieldCount: number;
        workflowCount: number;
        departmentCount: number;
        modules: {
            name: string;
            icon: string;
            color: string;
            fieldCount: number;
        }[];
        workflows: {
            name: string;
            trigger: string;
        }[];
        departments: {
            name: string;
            color: string;
        }[];
    };
    getSetupStatus(orgId: string): Promise<{
        setupCompleted: boolean;
        industry: any;
        mode: any;
    }>;
    install(orgId: string, industryKey: string, mode: 'blueprint' | 'scratch'): Promise<{
        success: boolean;
        mode: string;
        created: {};
        industry?: undefined;
        log?: undefined;
    } | {
        success: boolean;
        mode: string;
        industry: string;
        created: {
            modules: string[];
            fields: number;
            workflows: string[];
            departments: string[];
        };
        log: string[];
    }>;
    syncBlueprintFields(orgId: string): Promise<{
        success: boolean;
        industry: any;
        fieldsAdded: number;
        relationshipsAdded: number;
        log: string[];
    }>;
    private createFields;
    private markSetupComplete;
}
