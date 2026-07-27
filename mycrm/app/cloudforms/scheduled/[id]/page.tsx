"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, CheckCircle2, XCircle, AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ScheduledConfigForm, type ScheduledConfigFormValue } from "../scheduled-config-form";

interface ExecutionLog {
  id: string;
  status: string;
  ranAt: string;
  errorMessage?: string | null;
  details: { actionId: string; type: string; targetId: string; status: string; error?: string }[];
}

function toFormValue(cfg: any): ScheduledConfigFormValue {
  return {
    name: cfg.name,
    description: cfg.description ?? "",
    isRecurring: cfg.isRecurring,
    recurrencePattern: cfg.recurrencePattern ?? "DAILY",
    recurrenceDayOfWeek: cfg.recurrenceDayOfWeek ?? 1,
    recurrenceDayOfMonth: cfg.recurrenceDayOfMonth ?? 1,
    timeOfDay: cfg.timeOfDay,
    runAt: cfg.runAt ? new Date(cfg.runAt).toISOString().slice(0, 16) : new Date(cfg.nextRunAt).toISOString().slice(0, 16),
    actions: (cfg.actions ?? []).map((a: any) => ({ id: a.id, type: a.type, targetId: a.targetId, config: a.config ?? {} })),
  };
}

export default function EditScheduledConfigPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [value, setValue] = useState<ScheduledConfigFormValue | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/scheduled-configurations/${id}`);
      setValue(toFormValue(data));
      setLogs(data.executionLogs ?? []);
    } catch {
      setError("Failed to load this scheduled configuration");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const canSave = !!value && value.name.trim().length > 0
    && value.actions.length > 0
    && value.actions.every(a => a.targetId);

  const save = async () => {
    if (!value) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/scheduled-configurations/${id}`, {
        name: value.name,
        description: value.description || undefined,
        isRecurring: value.isRecurring,
        recurrencePattern: value.isRecurring ? value.recurrencePattern : undefined,
        recurrenceDayOfWeek: value.isRecurring && value.recurrencePattern === "WEEKLY" ? value.recurrenceDayOfWeek : undefined,
        recurrenceDayOfMonth: value.isRecurring && value.recurrencePattern === "MONTHLY" ? value.recurrenceDayOfMonth : undefined,
        timeOfDay: value.isRecurring ? value.timeOfDay : new Date(value.runAt).toTimeString().slice(0, 5),
        runAt: value.isRecurring ? undefined : new Date(value.runAt).toISOString(),
        actions: value.actions.map(({ id: _id, ...rest }) => rest),
      });
      setToast("Saved"); setTimeout(() => setToast(""), 2000);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save");
    }
    setSaving(false);
  };

  const runNow = async () => {
    setRunning(true);
    try {
      await api.post(`/scheduled-configurations/${id}/run-now`);
      setToast("Ran now"); setTimeout(() => setToast(""), 2000);
      await load();
    } catch {
      setError("Failed to run");
    }
    setRunning(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!value) return <p className="text-sm text-red-600">{error || "Not found"}</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white bg-gray-900">{toast}</div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/cloudforms/scheduled")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Edit Scheduled Configuration</h1>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run Now
        </Button>
      </div>

      <ScheduledConfigForm value={value} onChange={setValue} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={() => router.push("/cloudforms/scheduled")}>Cancel</Button>
        <Button onClick={save} disabled={!canSave || saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </Button>
      </div>

      {/* Execution history */}
      <div className="pt-4 border-t border-gray-100 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Execution History</p>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-400">Hasn't run yet.</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map(log => (
              <div key={log.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  {log.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    : log.status === "partial" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className={cn("font-medium",
                    log.status === "success" ? "text-green-700" : log.status === "partial" ? "text-amber-700" : "text-red-700")}>
                    {log.status}
                  </span>
                  <span className="text-gray-400">{new Date(log.ranAt).toLocaleString()}</span>
                </div>
                {log.errorMessage && <p className="text-red-500 mt-1">{log.errorMessage}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
