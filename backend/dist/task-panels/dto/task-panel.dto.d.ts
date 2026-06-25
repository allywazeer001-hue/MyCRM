export declare class CreateTaskPanelDto {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    moduleId: string;
    filterGroup?: any;
    assigneeRoles?: string[];
    sortField?: string;
    sortDir?: string;
    displayLimit?: number;
    highlightNew?: boolean;
    newThresholdHours?: number;
    isActive?: boolean;
    order?: number;
}
declare const UpdateTaskPanelDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateTaskPanelDto>>;
export declare class UpdateTaskPanelDto extends UpdateTaskPanelDto_base {
}
export {};
