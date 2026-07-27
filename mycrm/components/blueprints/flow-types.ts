// Shared types for the Blueprint Flow Designer.
// Keep in sync with blueprints.service.ts BlueprintTransition interface.

export interface FlowPhase {
  id: string;
  name: string;
  color: string;
  order: number;
  x: number;
  y: number;
}

export interface ModuleField {
  id: string;
  name: string;
  label: string;
  type: string;
  options?: { id?: string; value: string; label: string; color?: string }[];
}

export interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  jobTitle?: string;
}

export interface OrgDepartment {
  id: string;
  name: string;
}

// ── Unified Action System ─────────────────────────────────────────────────────

export type ActionType =
  | "update_field"       // set field → value
  | "add_tags"           // add tags to record
  | "remove_tags"        // remove tags from record
  | "assign_user"        // assign to specific user
  | "assign_role"        // assign to role
  | "assign_department"  // assign to department
  | "assign_dynamic"     // assign via dynamic user field on record
  | "lock_record"        // lock entire record
  | "lock_fields"        // lock specific fields
  | "unlock_fields"      // unlock specific fields
  | "enable_fields"      // enable specific fields for editing
  | "disable_fields"     // disable specific fields from editing
  | "write_timeline"     // write audit/timeline entry
  | "notify"             // send notification
  | "create_activity"    // create an activity record
  | "schedule_reminder"  // schedule a future reminder
  | "refresh_queue"      // update queue visibility
  | "run_automation";    // trigger external automation/workflow

export interface TransitionAction {
  id: string;
  type: ActionType;
  config: Record<string, any>;
}

// ── Transition Type ───────────────────────────────────────────────────────────
// Defaults to "manual" when absent — every transition saved before this field
// existed keeps behaving exactly as it does today.

export type TransitionType =
  | "manual"
  | "approval"
  | "condition"
  | "workflow"
  | "schedule"
  | "webhook"
  | "system_event";

export type WorkflowTriggerType =
  | "always"
  | "on_create"
  | "on_edit"
  | "on_status_change"
  | "on_form_submit";

// ── FlowTransition ────────────────────────────────────────────────────────────

export interface FlowTransition {
  id: string;
  name: string;          // button label
  fromPhaseId: string;
  toPhaseId: string;

  // ── Transition type ──
  transitionType?: TransitionType;

  // ── Workflow-type config ──
  workflowTriggerType?: WorkflowTriggerType;
  workflowId?: string; // links this transition to a centrally-managed Workflow entity

  // ── Schedule-type config ──
  scheduleMode?: "offset" | "datetime" | "cron";
  scheduleOffsetValue?: number;
  scheduleOffsetUnit?: "minutes" | "hours" | "days" | "weeks" | "months";
  scheduleDateTime?: string;
  scheduleCron?: string;

  // ── Button appearance ──
  transitionName?: string;   // internal name (e.g. "Approve Payment")
  description?: string;
  buttonColor: string;
  buttonIcon?: string;       // emoji
  displayOrder?: number;

  // ── Availability ──
  isCommon?: boolean;        // available from any stage

  // ── Visibility: who can SEE the button ──
  visibilityRoles?: string[];
  visibilityDepartments?: string[];
  visibilityUsers?: string[];
  visibilityRecordOwner?: boolean;
  visibilityRecordCreator?: boolean;
  visibilityCurrentStageOwner?: boolean;

  // ── Click permission: who can EXECUTE the button ──
  allowedRoles: string[];
  allowedUsers: string[];
  allowedDepartments?: string[];
  allowRecordOwner?: boolean;
  allowSupervisors?: boolean;
  allowAdminOverride?: boolean;

  // ── Approval gate ──
  requiresApproval: boolean;
  approvalRoles: string[];

  // ── Pre-conditions (must pass before button can run) ──
  requiredFields: string[];
  conditions: any;
  conditionsLogic: "AND" | "OR";
  conditionalRules?: { field: string; operator: string; value: string }[];
  conditionalLogic?: "AND" | "OR";
  conditionalFailMessage?: string;

  // ── Confirmation dialog ──
  confirmMessage?: string;

  // ── Comment requirement ──
  commentMode?: "required" | "optional" | "disabled";
  commentPlaceholder?: string;
  commentTemplate?: string;

  // ── Attachment requirement ──
  attachmentMode?: "required" | "optional" | "disabled";

  // ── Unified action list (what happens when button is clicked) ──
  actions?: TransitionAction[];

  // ── Queue behaviour ──
  queueAddTo?: string[];
  queueRemoveFrom?: string[];

  // ── Process banner ──
  processBanner?: string;

  // ── Timeline entry ──
  timelineTemplate?: string;

  // ── Previous user experience ──
  prevUserVisibility?: "read_only" | "hidden" | "progress_only" | "show_banner" | "allow_comments";
  prevUserMessage?: string;
  prevUserCanReceiveNotifications?: boolean;

  // ── Rollback (when this record is returned) ──
  rollbackTarget?: "previous_stage" | "record_creator" | "selected_stage" | "previous_approver";
  rollbackStageId?: string;
  rollbackRestoreStatus?: boolean;
  rollbackRestoreTags?: boolean;
  rollbackUnlockFields?: boolean;
  rollbackRestoreAssignment?: boolean;
  rollbackReturnToQueue?: boolean;

  // ── Notifications ──
  notifyRoles: string[];
  notifyUsers: string[];
  notifyAssignedUser?: boolean;
  notifyPreviousOwner?: boolean;
  notifyRecordCreator?: boolean;
  notifyDepartments?: string[];
  notifyChannels?: ("in_app" | "email" | "sms")[];
  notifyTemplate?: string;

  // ── Generate Request ──
  generateRequest?: boolean;
  requestTitle?: string;
  requestPriority?: "low" | "medium" | "high" | "critical";
  requestDueDays?: number;
  requestAssignModes?: ("role" | "department" | "user")[];
  requestRoles?: string[];
  requestDepts?: string[];
  requestUsers?: string[];
  requestNote?: string;
  requestBlocksTransition?: boolean;

  // ── SLA ──
  slaDueIn?: number;
  slaDueUnit?: "hours" | "days" | "business_days";
  slaEscalate?: boolean;

  // ── Legacy flat fields (kept for backward compat; prefer actions[]) ──
  fieldUpdates?: { id: string; field: string; value: string }[];
  tagUpdates?: { action: "add" | "remove" | "replace"; tags: string[] }[];
  assignmentMethod?: string;
  assignmentUserId?: string;
  assignmentRole?: string;
  assignmentDepartment?: string;
  lockMode?: string;
  lockedFields?: string[];
  postAutomation?: any[];
}
