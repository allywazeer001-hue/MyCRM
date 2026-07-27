"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ScheduledConfigForm, emptyFormValue, type ScheduledConfigFormValue } from "../scheduled-config-form";

export default function NewScheduledConfigPage() {
  const router = useRouter();
  const [value, setValue] = useState<ScheduledConfigFormValue>(emptyFormValue());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = value.name.trim().length > 0
    && value.actions.length > 0
    && value.actions.every(a => a.targetId);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.post("/scheduled-configurations", {
        name: value.name,
        description: value.description || undefined,
        isRecurring: value.isRecurring,
        recurrencePattern: value.isRecurring ? value.recurrencePattern : undefined,
        recurrenceDayOfWeek: value.isRecurring && value.recurrencePattern === "WEEKLY" ? value.recurrenceDayOfWeek : undefined,
        recurrenceDayOfMonth: value.isRecurring && value.recurrencePattern === "MONTHLY" ? value.recurrenceDayOfMonth : undefined,
        timeOfDay: value.isRecurring ? value.timeOfDay : new Date(value.runAt).toTimeString().slice(0, 5),
        runAt: value.isRecurring ? undefined : new Date(value.runAt).toISOString(),
        actions: value.actions.map(({ id, ...rest }) => rest),
      });
      router.push("/cloudforms/scheduled");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create scheduled configuration");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/cloudforms/scheduled")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">New Scheduled Configuration</h1>
      </div>

      <ScheduledConfigForm value={value} onChange={setValue} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={() => router.push("/cloudforms/scheduled")}>Cancel</Button>
        <Button onClick={save} disabled={!canSave || saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Schedule
        </Button>
      </div>
    </div>
  );
}
