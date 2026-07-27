"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Loader2, Inbox, RefreshCw, CheckCircle2, AlertCircle,
  ChevronRight, ArrowUpRight, Search, X, ChevronDown,
  Square, CheckSquare, Send, Eye, EyeOff, Clock, CheckCheck,
  ArrowRight, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useModulesStore } from "@/store/modules.store";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueRecord {
  id: string;
  data: Record<string, any>;
  moduleId: string;
  createdAt: string;
  updatedAt: string;
}

interface QueueGroup {
  configId: string;
  configName: string;
  moduleId: string;
  displayFields: string[];
  actions: Array<{ id: string; name: string; label: string; color: string; bulk: boolean; fieldUpdates: any[] }>;
  records: QueueRecord[];
  total: number;
}

interface BlueprintTask {
  id: string;
  blueprintId: string;
  recordId: string;
  moduleId: string;
  transitionId: string;
  transitionName: string;
  fromStage: string;
  toStage: string;
  assignedToId: string | null;
  assignedRole: string | null;
  status: string;
  comment: string | null;
  requestType: string;
  sentNote: string | null;
  seenAt: string | null;
  processedAt: string | null;
  createdAt: string;
  recordData: Record<string, any>;
  blueprint: {
    id: string;
    name: string;
    statusFieldName: string;
    moduleId: string;
    module: { id: string; name: string; slug: string; icon: string | null };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getPrimaryValue(record: QueueRecord, displayFields: string[]): string {
  for (const f of displayFields) {
    const v = record.data[f];
    if (v !== null && v !== undefined && v !== "") return String(v);
  }
  const d = record.data;
  return d.name ?? d.Name ?? d.title ?? d.Title ?? d.patientName ?? d.paymentNumber ?? `#${record.id.slice(-6)}`;
}

function getRecordLabel(data: Record<string, any>, recordId: string): string {
  return data.name ?? data.Name ?? data.title ?? data.Title ?? data.studentName
    ?? data.patientName ?? data.paymentNumber ?? `#${recordId.slice(-6)}`;
}

// ── Action confirmation modal ─────────────────────────────────────────────────

function ActionModal({
  action, count, onConfirm, onCancel, loading,
}: {
  action: { label: string; color: string };
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">{action.label}</h3>
        <p className="text-sm text-gray-500 mb-6">
          This will execute <span className="font-semibold text-gray-800">{action.label}</span> on{" "}
          <span className="font-semibold text-gray-800">{count}</span> record{count !== 1 ? "s" : ""}.
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={onConfirm} disabled={loading}
            style={{ backgroundColor: action.color }} className="text-white hover:opacity-90 border-0">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Confirm {action.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Request detail modal ──────────────────────────────────────────────────────

function RequestModal({
  task, modules, onClose, onProcess, processing,
}: {
  task: BlueprintTask;
  modules: any[];
  onClose: () => void;
  onProcess: (action: "approve" | "reject", comment: string) => void;
  processing: boolean;
}) {
  const [comment, setComment] = useState("");
  const mod = modules.find(m => m.id === task.moduleId);
  const label = getRecordLabel(task.recordData, task.recordId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
              <ModuleIcon icon={mod?.icon} slug={mod?.slug} className="w-4 h-4" /> {label}
            </p>
            <p className="text-[11px] text-gray-400">{task.blueprint.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Stage transition */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-xs text-gray-500">Stage move:</span>
            <span className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1">{task.fromStage}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">{task.toStage}</span>
          </div>

          {/* Transition name + sent time */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Action: <span className="text-blue-700">{task.transitionName}</span></span>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Clock className="w-3 h-3" />
              Sent {timeAgo(task.createdAt)}
            </div>
          </div>

          {/* Seen status */}
          <div className="flex items-center gap-2 text-xs">
            {task.seenAt ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCheck className="w-3.5 h-3.5" />
                Seen {timeAgo(task.seenAt)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <EyeOff className="w-3.5 h-3.5" />
                Not yet viewed
              </span>
            )}
          </div>

          {/* Sent note */}
          {task.sentNote && (
            <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">Note from sender</p>
              <p className="text-xs text-blue-900 leading-relaxed">{task.sentNote}</p>
            </div>
          )}

          {/* Link to record */}
          <div>
            <Link href={`/m/${mod?.slug ?? task.moduleId}/${task.recordId}`}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
              target="_blank">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Open record in full
            </Link>
          </div>

          {/* Comment input */}
          {task.status === "pending" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-gray-500">Your note (optional)</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Add a note to this request…"
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {task.status === "pending" && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2">
            <button
              onClick={() => onProcess("reject", comment)}
              disabled={processing}
              className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => onProcess("approve", comment)}
              disabled={processing}
              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Process / Approve
            </button>
          </div>
        )}
        {task.status !== "pending" && (
          <div className="px-5 py-4 border-t border-gray-100">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold",
              task.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            )}>
              <CheckCircle2 className="w-4 h-4" />
              {task.status === "approved" ? "Approved" : "Rejected"}
              {task.processedAt && (
                <span className="ml-auto text-[11px] font-normal opacity-70">{timeAgo(task.processedAt)}</span>
              )}
            </div>
            {task.comment && (
              <p className="mt-2 text-xs text-gray-500 italic">{task.comment}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Queue group ───────────────────────────────────────────────────────────────

function QueueGroupSection({
  group, modules, selected, onSelect, onAction, executing, search,
}: {
  group: QueueGroup;
  modules: any[];
  selected: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onAction: (configId: string, actionId: string, recordIds: string[]) => void;
  executing: { configId: string; actionId: string } | null;
  search: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const mod = modules.find(m => m.id === group.moduleId);

  const filtered = search.trim()
    ? group.records.filter(r => {
        const haystack = Object.values(r.data).join(" ").toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : group.records;

  const groupIds    = filtered.map(r => r.id);
  const allSelected = groupIds.length > 0 && groupIds.every(id => selected.has(id));
  const someSelected = !allSelected && groupIds.some(id => selected.has(id));

  const toggleAll = () => {
    if (allSelected) groupIds.forEach(id => onSelect(id, false));
    else groupIds.forEach(id => onSelect(id, true));
  };

  const selectedInGroup = groupIds.filter(id => selected.has(id));
  const bulkActions = group.actions.filter(a => a.bulk);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/60 border-b border-gray-100">
        <button onClick={() => setCollapsed(c => !c)} className="p-0.5">
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", collapsed && "-rotate-90")} />
        </button>
        <div className="shrink-0"><ModuleIcon icon={mod?.icon} slug={mod?.slug} className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900">{group.configName}</span>
          <span className="text-xs text-gray-400 ml-2">{mod?.name ?? group.moduleId}</span>
        </div>
        <span className={cn(
          "text-xs font-bold px-2.5 py-1 rounded-full",
          filtered.length === 0 ? "bg-gray-100 text-gray-400" : "bg-violet-100 text-violet-700",
        )}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
        {selectedInGroup.length > 0 && bulkActions.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-gray-500">{selectedInGroup.length} selected:</span>
            {bulkActions.map(action => (
              <button
                key={action.id}
                onClick={() => onAction(group.configId, action.id, selectedInGroup)}
                disabled={!!(executing?.configId === group.configId && executing?.actionId === action.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: action.color ?? "#3b82f6" }}
              >
                {executing?.configId === group.configId && executing?.actionId === action.id
                  ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No records match the current filter</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50/30">
                <button onClick={toggleAll} className="shrink-0">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-violet-600" />
                    : someSelected
                      ? <div className="w-4 h-4 border-2 border-violet-400 rounded bg-violet-100" />
                      : <Square className="w-4 h-4 text-gray-300" />
                  }
                </button>
                {group.displayFields.slice(0, 4).map(f => (
                  <span key={f} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex-1 min-w-0 truncate">
                    {f}
                  </span>
                ))}
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-20 shrink-0 text-right">Date</span>
                <span className="w-28 shrink-0" />
              </div>

              {filtered.map(record => {
                const isSelected = selected.has(record.id);
                return (
                  <div
                    key={record.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 group hover:bg-gray-50/40 transition-colors",
                      isSelected && "bg-violet-50/30",
                    )}
                  >
                    <button onClick={() => onSelect(record.id, !isSelected)} className="shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-violet-600" />
                        : <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                      }
                    </button>
                    {group.displayFields.slice(0, 4).map((f, i) => {
                      const val = record.data[f];
                      const display = val !== null && val !== undefined && val !== "" ? String(val) : "—";
                      return (
                        <span key={f} className={cn(
                          "flex-1 min-w-0 truncate text-sm",
                          i === 0 ? "font-medium text-gray-900" : "text-gray-500",
                        )}>
                          {display}
                        </span>
                      );
                    })}
                    {group.displayFields.length === 0 && (
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {getPrimaryValue(record, group.displayFields)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 w-20 shrink-0 text-right">
                      {timeAgo(record.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5 w-28 shrink-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {group.actions.filter(a => !a.bulk).slice(0, 2).map(action => (
                        <button
                          key={action.id}
                          onClick={() => onAction(group.configId, action.id, [record.id])}
                          disabled={!!(executing?.configId === group.configId && executing?.actionId === action.id)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                          style={{ backgroundColor: action.color ?? "#3b82f6" }}
                        >
                          {action.label || action.name}
                        </button>
                      ))}
                      <Link href={`/m/${mod?.slug ?? group.moduleId}/${record.id}`}>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Requests tab ──────────────────────────────────────────────────────────────

function RequestsTab({
  tasks, modules, onRefresh,
}: {
  tasks: BlueprintTask[];
  modules: any[];
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<BlueprintTask | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const openTask = async (task: BlueprintTask) => {
    setSelected(task);
    if (!task.seenAt) {
      try {
        await api.patch(`/blueprints/tasks/${task.id}/seen`);
        onRefresh();
      } catch {}
    }
  };

  const handleProcess = async (action: "approve" | "reject", comment: string) => {
    if (!selected) return;
    setProcessing(true);
    try {
      await api.post(`/blueprints/pending-tasks/${selected.id}/action`, { action, comment });
      showToast(action === "approve" ? "Request approved — stage advanced" : "Request rejected");
      setSelected(null);
      onRefresh();
    } catch {
      showToast("Failed to process request", "error");
    } finally {
      setProcessing(false);
    }
  };

  const pending = tasks.filter(t => t.status === "pending");
  const done    = tasks.filter(t => t.status !== "pending");

  return (
    <div className="space-y-4">
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border",
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800",
        )}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {selected && (
        <RequestModal
          task={selected}
          modules={modules}
          onClose={() => setSelected(null)}
          onProcess={handleProcess}
          processing={processing}
        />
      )}

      {tasks.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Send className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No requests</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Requests sent to you via blueprint transitions will appear here.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-800">Pending</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1">{pending.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {pending.map(task => (
                  <RequestRow key={task.id} task={task} modules={modules} onOpen={() => openTask(task)} />
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">Processed</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ml-1">{done.length}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {done.map(task => (
                  <RequestRow key={task.id} task={task} modules={modules} onOpen={() => openTask(task)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequestRow({
  task, modules, onOpen,
}: {
  task: BlueprintTask;
  modules: any[];
  onOpen: () => void;
}) {
  const mod   = modules.find(m => m.id === task.moduleId);
  const label = getRecordLabel(task.recordData, task.recordId);

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors text-left group"
    >
      {/* Unread dot */}
      <div className={cn(
        "w-2 h-2 rounded-full shrink-0",
        task.seenAt ? "bg-gray-200" : "bg-blue-500",
      )} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1.5">
            <ModuleIcon icon={mod?.icon} slug={mod?.slug} className="w-4 h-4" /> {label}
          </span>
          {task.status !== "pending" && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
              task.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
            )}>
              {task.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="text-gray-600 font-medium">{task.transitionName}</span>
          <span>·</span>
          <span className="bg-gray-100 rounded px-1.5 py-0.5 text-gray-500">{task.fromStage}</span>
          <ArrowRight className="w-3 h-3 shrink-0" />
          <span className="bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">{task.toStage}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-gray-400">{timeAgo(task.createdAt)}</span>
        {task.seenAt ? (
          <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 font-medium">
            <Eye className="w-2.5 h-2.5" /> Seen
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
            <EyeOff className="w-2.5 h-2.5" /> Unseen
          </span>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const { modules, fetchModules } = useModulesStore();
  const [activeTab, setActiveTab]   = useState<"queue" | "requests">("queue");
  const [groups, setGroups]         = useState<QueueGroup[]>([]);
  const [tasks, setTasks]           = useState<BlueprintTask[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [executing, setExecuting]   = useState<{ configId: string; actionId: string } | null>(null);
  const [pending, setPending]       = useState<{ configId: string; actionId: string; recordIds: string[]; action: any } | null>(null);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadQueue = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [qRes, tRes] = await Promise.all([
        api.get("/record-routing/my-queue").catch(() => ({ data: [] })),
        api.get("/blueprints/my-pending-tasks").catch(() => ({ data: [] })),
      ]);
      setGroups(qRes.data ?? []);
      setTasks(tRes.data ?? []);
    } catch {
      showToast("Failed to load queue", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchModules(); loadQueue(); }, [loadQueue, fetchModules]);

  const handleSelect = (recordId: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(recordId) : next.delete(recordId);
      return next;
    });
  };

  const handleAction = (configId: string, actionId: string, recordIds: string[]) => {
    const group  = groups.find(g => g.configId === configId);
    const action = group?.actions.find(a => a.id === actionId);
    if (!action) return;
    setPending({ configId, actionId, recordIds, action });
  };

  const confirmAction = async () => {
    if (!pending) return;
    const { configId, actionId, recordIds } = pending;
    const isBulk = recordIds.length > 1;
    setExecuting({ configId, actionId });
    setPending(null);
    try {
      if (isBulk) {
        await api.post("/record-routing/bulk-action", { configId, actionId, recordIds });
        showToast(`Updated ${recordIds.length} records`);
      } else {
        await api.post("/record-routing/action", { configId, actionId, recordId: recordIds[0] });
        showToast("Action completed");
      }
      setSelected(new Set());
      await loadQueue(true);
    } catch {
      showToast("Action failed", "error");
    } finally {
      setExecuting(null);
    }
  };

  const totalQueueRecords = groups.reduce((s, g) => s + g.total, 0);
  const pendingRequests   = tasks.filter(t => t.status === "pending").length;
  const unseenRequests    = tasks.filter(t => t.status === "pending" && !t.seenAt).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border",
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800",
        )}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {pending && (
        <ActionModal
          action={pending.action}
          count={pending.recordIds.length}
          onConfirm={confirmAction}
          onCancel={() => setPending(null)}
          loading={!!executing}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Queue & Requests</h1>
            <p className="text-sm text-gray-500">
              {totalQueueRecords > 0 && `${totalQueueRecords} in queue`}
              {totalQueueRecords > 0 && pendingRequests > 0 && " · "}
              {pendingRequests > 0 && `${pendingRequests} pending request${pendingRequests !== 1 ? "s" : ""}`}
              {totalQueueRecords === 0 && pendingRequests === 0 && "All clear"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadQueue(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit">
        <button
          onClick={() => setActiveTab("queue")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "queue"
              ? "bg-white text-violet-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          <Inbox className="w-4 h-4" />
          Queue
          {totalQueueRecords > 0 && (
            <span className="text-[11px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
              {totalQueueRecords}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "requests"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          <Send className="w-4 h-4" />
          Requests
          {unseenRequests > 0 && (
            <span className="text-[11px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
              {unseenRequests}
            </span>
          )}
          {unseenRequests === 0 && pendingRequests > 0 && (
            <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {pendingRequests}
            </span>
          )}
        </button>
      </div>

      {/* Queue tab */}
      {activeTab === "queue" && (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search records…"
              className="pl-9 h-10 text-sm bg-white"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Queue is empty</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                No request configurations are assigned to your role, or no records currently match the configured filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <QueueGroupSection
                  key={group.configId}
                  group={group}
                  modules={modules}
                  selected={selected}
                  onSelect={handleSelect}
                  onAction={handleAction}
                  executing={executing}
                  search={search}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Requests tab */}
      {activeTab === "requests" && (
        <RequestsTab
          tasks={tasks}
          modules={modules}
          onRefresh={() => loadQueue(true)}
        />
      )}
    </div>
  );
}
