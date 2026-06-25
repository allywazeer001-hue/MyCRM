/**
 * Blueprint Runtime Store
 * Manages the live blueprint state for record pages and Kanban:
 * - Current stage, available transitions, locked fields
 * - Phase groups (for visual process flow)
 * - Stage history (visited stages)
 * - Pending approval tasks
 */
import { create } from "zustand";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlueprintPhase {
  id: string;
  name: string;
  color: string;
  order: number;
  x?: number;
  y?: number;
  groupId?: string;
}

export interface BlueprintPhaseGroup {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface BlueprintTransition {
  id: string;
  name: string;
  fromPhaseId: string;
  toPhaseId: string;
  description?: string;
  buttonColor?: string;
  requiredFields: string[];
  allowedRoles: string[];
  allowedUsers: string[];
  conditions: any[];
  conditionsLogic: "AND" | "OR";
  requiresApproval: boolean;
  approvalRoles: string[];
  notifyRoles: string[];
  notifyUsers: string[];
  confirmMessage?: string;
}

export interface BlueprintInfo {
  id: string;
  name: string;
  statusFieldName: string;
  moduleId: string;
  phases: BlueprintPhase[];
  transitions: BlueprintTransition[];
  version: number;
  treeData?: { phaseGroups?: BlueprintPhaseGroup[]; [k: string]: any } | null;
}

export interface StageHistoryEntry {
  fromStage: string | null;
  toStage: string;
  transitionName: string | null;
  timestamp: string;
  user: { id: string; firstName: string; lastName: string } | null;
}

export interface BlueprintRuntimeState {
  blueprint: BlueprintInfo | null;
  currentStage: BlueprintPhase | null;
  availableTransitions: BlueprintTransition[];
  lockedFields: string[];
  phases: BlueprintPhase[];
  phaseGroups: BlueprintPhaseGroup[];
  canInitialize: boolean;
  stageHistory: StageHistoryEntry[];
  historyLoaded: boolean;
}

export interface BlueprintTask {
  id: string;
  blueprintId: string;
  recordId: string;
  moduleId: string;
  transitionId: string;
  transitionName: string;
  fromStage: string;
  toStage: string;
  assignedToId?: string;
  assignedRole?: string;
  status: string;
  comment?: string;
  createdAt: string;
  blueprint?: {
    id: string;
    name: string;
    statusFieldName: string;
    module?: { id: string; name: string; slug: string; icon?: string };
  };
}

interface BlueprintRuntimeStore {
  recordStates: Record<string, BlueprintRuntimeState>;
  loadingRecords: Set<string>;
  pendingTasks: BlueprintTask[];
  tasksLoading: boolean;

  loadForRecord: (recordId: string) => Promise<void>;
  refreshForRecord: (recordId: string) => Promise<void>;
  executeTransition: (
    recordId: string,
    transitionId: string,
    formData?: Record<string, any>
  ) => Promise<{ status: string; newStage?: string; message: string }>;
  initializeRecord: (recordId: string, stageId: string) => Promise<void>;
  loadPendingTasks: () => Promise<void>;
  completeTask: (taskId: string, action: "approve" | "reject", comment?: string) => Promise<void>;
  validateKanbanMove: (
    moduleId: string,
    fromStage: string,
    toStage: string
  ) => Promise<{ allowed: boolean; reason?: string }>;
}

export const useBlueprintRuntimeStore = create<BlueprintRuntimeStore>((set, get) => ({
  recordStates: {},
  loadingRecords: new Set<string>(),
  pendingTasks: [],
  tasksLoading: false,

  async loadForRecord(recordId: string) {
    const { loadingRecords } = get();
    if (loadingRecords.has(recordId)) return;

    set(s => ({ loadingRecords: new Set([...s.loadingRecords, recordId]) }));
    try {
      const [stateRes, historyRes] = await Promise.allSettled([
        api.get(`/blueprints/for-record/${recordId}`),
        api.get(`/blueprints/for-record/${recordId}/history`),
      ]);

      const data = stateRes.status === "fulfilled" ? stateRes.value.data : null;
      const history = historyRes.status === "fulfilled" ? (historyRes.value.data ?? []) : [];

      const phaseGroups: BlueprintPhaseGroup[] =
        (data?.blueprint as BlueprintInfo)?.treeData?.phaseGroups ?? [];

      set(s => ({
        recordStates: {
          ...s.recordStates,
          [recordId]: {
            blueprint:            data?.blueprint ?? null,
            currentStage:         data?.currentStage ?? null,
            availableTransitions: data?.availableTransitions ?? [],
            lockedFields:         data?.lockedFields ?? [],
            phases:               data?.phases ?? [],
            phaseGroups,
            canInitialize:        data?.canInitialize ?? false,
            stageHistory:         history,
            historyLoaded:        true,
          },
        },
        loadingRecords: (() => {
          const next = new Set(s.loadingRecords);
          next.delete(recordId);
          return next;
        })(),
      }));
    } catch {
      set(s => ({
        loadingRecords: (() => {
          const next = new Set(s.loadingRecords);
          next.delete(recordId);
          return next;
        })(),
      }));
    }
  },

  async refreshForRecord(recordId: string) {
    set(s => {
      const next = { ...s.recordStates };
      delete next[recordId];
      return { recordStates: next };
    });
    await get().loadForRecord(recordId);
  },

  async executeTransition(recordId, transitionId, formData = {}) {
    const { data } = await api.post("/blueprints/execute-transition", {
      recordId,
      transitionId,
      formData,
    });
    await get().refreshForRecord(recordId);
    return data;
  },

  async initializeRecord(recordId, stageId) {
    await api.post("/blueprints/initialize-record", { recordId, stageId });
    await get().refreshForRecord(recordId);
  },

  async loadPendingTasks() {
    set({ tasksLoading: true });
    try {
      const { data } = await api.get("/blueprints/my-pending-tasks");
      set({ pendingTasks: data ?? [], tasksLoading: false });
    } catch {
      set({ tasksLoading: false });
    }
  },

  async completeTask(taskId, action, comment) {
    await api.post(`/blueprints/pending-tasks/${taskId}/action`, { action, comment });
    await get().loadPendingTasks();
  },

  async validateKanbanMove(moduleId, fromStage, toStage) {
    try {
      const { data } = await api.post("/blueprints/validate-transition", {
        moduleId,
        fromStage,
        toStage,
      });
      return data;
    } catch {
      return { allowed: true };
    }
  },
}));
