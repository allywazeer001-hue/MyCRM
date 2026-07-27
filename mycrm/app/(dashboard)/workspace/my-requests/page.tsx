"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BlueprintTask {
  id: string;
  title: string | null;
  transitionName: string;
  fromStage: string;
  toStage: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  seenAt: string | null;
  createdAt: string;
  blueprint: { module: { slug: string; name: string; icon: string | null } };
  recordData: Record<string, any>;
  recordId: string;
}

interface QueueGroup {
  configId: string;
  configName: string;
  moduleSlug: string;
  moduleName: string;
  moduleIcon: string | null;
  displayFields: string[];
  records: { id: string; data: Record<string, any>; createdAt: string }[];
  total: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getLabel(data: Record<string, any>, id: string): string {
  return data?.name || data?.title || data?.subject || data?.label
    || Object.values(data ?? {}).find(v => typeof v === "string" && v.trim())?.toString()
    || `#${id.slice(-6)}`;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-400", medium: "bg-yellow-400", low: "bg-gray-300",
};

// ── Row ────────────────────────────────────────────────────────────────────────

function RequestRow({
  dot, isNew, title, sub, time, onClick,
}: {
  dot: string; isNew?: boolean; title: string; sub: string; time: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn("text-[13px] truncate leading-snug", isNew ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
            {title}
          </p>
          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
        </div>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{sub}</p>
      </div>
      <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{time}</span>
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const router = useRouter();
  const toast  = useToast();

  const [tasks, setTasks]             = useState<BlueprintTask[]>([]);
  const [queueGroups, setQueueGroups] = useState<QueueGroup[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, q] = await Promise.allSettled([
        api.get("/blueprints/my-pending-tasks"),
        api.get("/record-routing/my-queue"),
      ]);
      setTasks(t.status === "fulfilled" && Array.isArray(t.value.data)
        ? t.value.data.filter((x: any) => x.status === "pending") : []);
      setQueueGroups(q.status === "fulfilled" && Array.isArray(q.value.data)
        ? q.value.data.filter((g: any) => g.total > 0) : []);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const queueItems = queueGroups.flatMap(g => g.records.map(r => ({ record: r, group: g })));
  const total = tasks.length + queueItems.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Inbox className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">Requests</span>
          {total > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold rounded-full px-1.5 py-0.5 leading-none">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <Inbox className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-xs font-medium text-gray-400">No requests</p>
            <p className="text-[11px] text-gray-300 mt-0.5">Items assigned to you appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tasks.map(task => (
              <RequestRow
                key={task.id}
                dot={PRIORITY_COLOR[task.priority ?? "medium"] ?? "bg-gray-300"}
                isNew={!task.seenAt}
                title={getLabel(task.recordData, task.recordId)}
                sub={`${task.blueprint.module.name} · ${task.title || task.transitionName}`}
                time={timeAgo(task.createdAt)}
                onClick={() => { const s = task.blueprint?.module?.slug; if (s) router.push(`/m/${s}/${task.recordId}`); }}
              />
            ))}
            {queueItems.map(({ record, group }) => (
              <RequestRow
                key={group.configId + record.id}
                dot="bg-violet-400"
                title={getLabel(record.data, record.id)}
                sub={`${group.moduleName}${group.configName ? ` · ${group.configName}` : ""}`}
                time={timeAgo(record.createdAt)}
                onClick={() => { if (group.moduleSlug) router.push(`/m/${group.moduleSlug}/${record.id}`); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
