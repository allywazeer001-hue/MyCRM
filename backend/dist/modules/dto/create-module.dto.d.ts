export declare class CreateModuleDto {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    order?: number;
    settings?: Record<string, any>;
}
