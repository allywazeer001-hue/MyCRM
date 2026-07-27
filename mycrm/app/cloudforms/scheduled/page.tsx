"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Clock, Repeat, CheckCircle2, XCircle, AlertTriangle, Loader2, Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface ScheduledConfig {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  isRecurring: boolean;
  recurrencePattern?: string | null;
  nextRunAt: string;
  lastRunAt?: string | null;
  actions: { id: string; type: string }[];
  executionLogs: { status: string; ranAt: string }[];
}

function Toast({ msg, type }: { msg: string; type?: "error" }) {
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white",
      type === "error" ? "bg-red-600" : "bg-gray-900"
    )}>
      {msg}
    </div>
  );
}

export default function ScheduledConfigsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<ScheduledConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type?: "error" } | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const showToast = (msg: string, type?: "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/scheduled-configurations");
      setConfigs(data ?? []);
    } catch {
      showToast("Failed to load scheduled configurations", "error");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (cfg: ScheduledConfig) => {
    setConfigs(prev => prev.map(c => c.id === cfg.id ? { ...c, isActive: !c.isActive } : c));
    try {
      await api.patch(`/scheduled-configurations/${cfg.id}/active`, { isActive: !cfg.isActive });
    } catch {
      setConfigs(prev => prev.map(c => c.id === cfg.id ? { ...c, isActive: cfg.isActive } : c));
      showToast("Failed to update", "error");
    }
  };

  const runNow = async (cfg: ScheduledConfig) => {
    setRunningId(cfg.id);
    try {
      await api.post(`/scheduled-configurations/${cfg.id}/run-now`);
      showToast(`"${cfg.name}" ran now`);
      await load();
    } catch {
      showToast("Failed to run", "error");
    }
    setRunningId(null);
  };

  const remove = async (cfg: ScheduledConfig) => {
    if (!confirm(`Delete "${cfg.name}"? This also deletes its run history.`)) return;
    try {
      await api.delete(`/scheduled-configurations/${cfg.id}`);
      setConfigs(prev => prev.filter(c => c.id !== cfg.id));
      showToast("Deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Scheduled Configurations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule a future change to a field default, dropdown options, a saved filter, or a workflow's on/off state.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => router.push("/cloudforms/scheduled/new")}>
          <Plus className="w-4 h-4" /> New Schedule
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 gap-3">
          <Clock className="w-8 h-8 opacity-30" />
          <p className="text-sm">No scheduled configurations yet.</p>
          <Button size="sm" onClick={() => router.push("/cloudforms/scheduled/new")} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create your first schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map(cfg => {
            const lastLog = cfg.executionLogs?.[0];
            return (
              <div key={cfg.id} className={cn(
                "flex items-center gap-3 p-3.5 bg-white border rounded-xl shadow-sm",
                !cfg.isActive && "opacity-60"
              )}>
                <button
                  onClick={() => toggleActive(cfg)}
                  title={cfg.isActive ? "Pause" : "Resume"}
                  className={cn("shrink-0 p-1.5 rounded-lg border", cfg.isActive ? "text-green-600 border-green-200 bg-green-50" : "text-gray-400 border-gray-200 bg-gray-50")}
                >
                  {cfg.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                <div className="min-w-0 flex-1">
                  <Link href={`/cloudforms/scheduled/${cfg.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate block">
                    {cfg.name}
                  </Link>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                    {cfg.isRecurring ? <Repeat className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {cfg.isRecurring ? `${cfg.recurrencePattern}` : "One-time"}
                    <span>·</span>
                    Next: {new Date(cfg.nextRunAt).toLocaleString()}
                    <span>·</span>
                    {cfg.actions.length} action{cfg.actions.length === 1 ? "" : "s"}
                  </p>
                </div>

                {lastLog && (
                  <div className="shrink-0 flex items-center gap-1 text-xs" title={`Last run: ${new Date(lastLog.ranAt).toLocaleString()}`}>
                    {lastLog.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      : lastLog.status === "partial" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className="text-gray-400">{lastLog.status}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => runNow(cfg)} disabled={runningId === cfg.id}>
                    {runningId === cfg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run Now
                  </Button>
                  <Link href={`/cloudforms/scheduled/${cfg.id}`}>
                    <Button size="sm" variant="ghost" className="h-8 text-xs">Edit</Button>
                  </Link>
                  <button onClick={() => remove(cfg)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
