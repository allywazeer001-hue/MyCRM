export declare class CreateStageDto {
    name: string;
    order: number;
    assigneeType: string;
    assigneeRole?: string;
    assigneeUserId?: string;
    assigneeField?: string;
    actions: string[];
    dueDays?: number;
    conditions?: any;
    onApprove?: string;
    onReject?: string;
    onRequestInfo?: string;
    notifySubmitter?: boolean;
    notifyAssignee?: boolean;
}
export declare class CreateBlueprintDto {
    name: string;
    description?: string;
    moduleId?: string;
    triggerField?: string;
    triggerValue?: string;
    isActive?: boolean;
    stages: CreateStageDto[];
}
declare const UpdateBlueprintDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateBlueprintDto>>;
export declare class UpdateBlueprintDto extends UpdateBlueprintDto_base {
}
export {};
