export interface BlueprintFieldOption {
    label: string;
    value: string;
    color?: string;
}
export interface BlueprintField {
    name: string;
    label: string;
    type: string;
    isRequired?: boolean;
    isUnique?: boolean;
    placeholder?: string;
    helpText?: string;
    defaultValue?: string;
    settings?: Record<string, any>;
    options?: BlueprintFieldOption[];
}
export interface BlueprintModule {
    name: string;
    slug: string;
    icon: string;
    color: string;
    description?: string;
    fields: BlueprintField[];
}
export interface BlueprintWorkflowAction {
    type: string;
    order: number;
    config: Record<string, any>;
}
export interface BlueprintWorkflow {
    name: string;
    description?: string;
    trigger: string;
    moduleSlug: string;
    isActive?: boolean;
    actions: BlueprintWorkflowAction[];
}
export interface BlueprintDepartment {
    name: string;
    slug: string;
    color: string;
    description?: string;
}
export interface IndustryBlueprint {
    key: string;
    industry: string;
    description: string;
    icon: string;
    color: string;
    modules: BlueprintModule[];
    workflows: BlueprintWorkflow[];
    departments: BlueprintDepartment[];
}
