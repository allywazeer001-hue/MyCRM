import { IndustrySetupService } from './industry-setup.service';
export declare class IndustrySetupController {
    private readonly service;
    constructor(service: IndustrySetupService);
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
    getStatus(user: any): Promise<{
        setupCompleted: boolean;
        industry: any;
        mode: any;
    }>;
    install(user: any, body: {
        industryKey: string;
        mode: 'blueprint' | 'scratch';
    }): Promise<{
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
    syncFields(user: any): Promise<{
        success: boolean;
        industry: any;
        fieldsAdded: number;
        relationshipsAdded: number;
        log: string[];
    }>;
}
