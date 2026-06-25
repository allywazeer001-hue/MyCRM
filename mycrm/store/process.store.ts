import { create } from "zustand";
import { api } from "@/lib/api";

export interface ProcessTask {
  id: string;
  instanceId: string;
  stageId: string;
  assignedTo: string;
  status: string;
  action?: string;
  comment?: string;
  dueAt?: string;
  createdAt: string;
  instance: {
    id: string;
    recordId: string;
    recordModule: string;
    blueprint: {
      id: string;
      name: string;
    };
  };
  stage: {
    id: string;
    name: string;
    actions: string[];
  };
}

export interface TaskStats {
  overdue: number;
  dueToday: number;
  upcoming: number;
  total: number;
}

interface ProcessState {
  tasks: ProcessTask[];
  stats: TaskStats;
  isLoading: boolean;
  fetchMyTasks: () => Promise<void>;
  executeAction: (taskId: string, action: string, comment?: string) => Promise<void>;
  markSeen: (taskId: string) => Promise<void>;
}

function computeStats(tasks: ProcessTask[]): TaskStats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  let overdue = 0;
  let dueToday = 0;
  let upcoming = 0;

  for (const task of tasks) {
    if (!task.dueAt) {
      upcoming++;
      continue;
    }
    const due = new Date(task.dueAt);
    if (due < todayStart) {
      overdue++;
    } else if (due >= todayStart && due < todayEnd) {
      dueToday++;
    } else {
      upcoming++;
    }
  }

  return {
    overdue,
    dueToday,
    upcoming,
    total: tasks.length,
  };
}

export const useProcessStore = create<ProcessState>((set, get) => ({
  tasks: [],
  stats: { overdue: 0, dueToday: 0, upcoming: 0, total: 0 },
  isLoading: false,

  fetchMyTasks: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/process/my-tasks");
      const tasks: ProcessTask[] = response.data.tasks;
      const stats = computeStats(tasks);
      set({ tasks, stats, isLoading: false });
    } catch {
      set({
        tasks: [],
        stats: { overdue: 0, dueToday: 0, upcoming: 0, total: 0 },
        isLoading: false,
      });
    }
  },

  executeAction: async (taskId: string, action: string, comment?: string) => {
    await api.post(`/process/tasks/${taskId}/action`, { action, comment });
    await get().fetchMyTasks();
  },

  markSeen: async (taskId: string) => {
    await api.patch(`/process/tasks/${taskId}/seen`);
  },
}));
