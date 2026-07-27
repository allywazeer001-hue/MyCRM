export interface BlueprintFieldOption {
  label: string;
  value: string;
  color?: string;
}

export interface BlueprintField {
  name: string;           // slug key
  label: string;          // display label
  type: string;           // FieldType enum value
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
  type: string;           // WorkflowActionType
  order: number;
  config: Record<string, any>;
}

export interface BlueprintWorkflow {
  name: string;
  description?: string;
  trigger: string;        // WorkflowTrigger
  // Required when trigger is 'FIELD_CHANGED' — the field name this workflow watches
  // (e.g. { fieldName: 'status' }). Without it the workflow is created but can never
  // fire, since FIELD_CHANGED intentionally requires a specific field to be named.
  triggerConfig?: Record<string, any>;
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
