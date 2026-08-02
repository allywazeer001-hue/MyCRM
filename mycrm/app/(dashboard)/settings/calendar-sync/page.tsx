"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Calendar, CheckCircle2, XCircle, Link2, RefreshCw, Loader2,
  AlertCircle, ChevronRight, Settings2, Bell, Zap, RotateCcw, Plus,
  Unlink, Clock,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConnectionStatus {
  connected: boolean;
  configured: boolean;
  selectedCalendarId: string | null;
  calendarName: string | null;
  syncMode: string;
  syncTasks: boolean;
  taskSyncMode: string;
  defaultReminders: number[];
  connectedSince: string | null;
}

interface GCal { id: string; name: string; isPrimary?: boolean; }

const REMINDER_OPTIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour",     value: 60 },
  { label: "1 day",      value: 1440 },
];

const SYNC_MODES = [
  { value: "manual",   label: "Manual Sync",    desc: "Sync only when you click the sync button" },
  { value: "auto",     label: "Automatic Sync",  desc: "Sync whenever a task is created or updated" },
  { value: "realtime", label: "Real-Time Sync",  desc: "Instant sync on every change" },
];

const TASK_SYNC_MODES = [
  { value: "all",           label: "Sync all tasks" },
  { value: "with_due_date", label: "Sync only tasks with due dates" },
  { value: "assigned",      label: "Sync only tasks assigned to me" },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CalendarSyncPage() {
  const [status,       setStatus]       = useState<ConnectionStatus | null>(null);
  const [calendars,    setCalendars]    = useState<GCal[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [calLoading,   setCalLoading]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [settings,     setSettings]     = useState({
    syncMode: "manual", syncTasks: false, taskSyncMode: "all",
    defaultReminders: [15] as number[],
    selectedCalendarId: "" as string | null,
    calendarName: "" as string | null,
  });

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get("/calendar-sync/status");
      const s: ConnectionStatus = res.data;
      setStatus(s);
      setSettings({
        syncMode:            s.syncMode,
        syncTasks:           s.syncTasks,
        taskSyncMode:        s.taskSyncMode,
        defaultReminders:    s.defaultReminders,
        selectedCalendarId:  s.selectedCalendarId,
        calendarName:        s.calendarName,
      });
    } catch {
      setStatus({ connected: false, configured: false, selectedCalendarId: null, calendarName: null,
        syncMode: "manual", syncTasks: false, taskSyncMode: "all", defaultReminders: [15], connectedSince: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Check for OAuth callback query param
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      showToast("Google Calendar connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      loadStatus();
    }
    if (params.get("error")) {
      showToast(decodeURIComponent(params.get("error") ?? "Connection failed"), "err");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadStatus, showToast]);

  const loadCalendars = useCallback(async () => {
    setCalLoading(true);
    try {
      const res = await api.get("/calendar-sync/calendars");
      setCalendars(res.data ?? []);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to load calendars", "err");
    } finally { setCalLoading(false); }
  }, [showToast]);

  useEffect(() => {
    if (status?.connected) loadCalendars();
  }, [status?.connected, loadCalendars]);

  const handleConnect = async () => {
    try {
      const res = await api.get("/calendar-sync/auth/url");
      window.location.href = res.data.url;
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Could not get auth URL", "err");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Existing event mappings will be removed.")) return;
    try {
      await api.delete("/calendar-sync/disconnect");
      setStatus(s => s ? { ...s, connected: false, selectedCalendarId: null, calendarName: null } : null);
      setCalendars([]);
      showToast("Disconnected from Google Calendar");
    } catch { showToast("Failed to disconnect", "err"); }
  };

  const handleCreateCloudBoxCalendar = async () => {
    setCalLoading(true);
    try {
      const res = await api.post("/calendar-sync/calendars/create-cloudbox");
      showToast(`Created calendar "${res.data.name}"`);
      await loadCalendars();
      setSettings(s => ({ ...s, selectedCalendarId: res.data.id, calendarName: res.data.name }));
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to create calendar", "err");
    } finally { setCalLoading(false); }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.patch("/calendar-sync/settings", settings);
      showToast("Settings saved");
      loadStatus();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Failed to save settings", "err");
    } finally { setSaving(false); }
  };

  const handleBulkSync = async () => {
    setBulkLoading(true);
    try {
      const res = await api.post("/calendar-sync/sync/tasks/bulk");
      showToast(`Synced ${res.data.synced} tasks (${res.data.failed} failed)`);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? "Bulk sync failed", "err");
    } finally { setBulkLoading(false); }
  };

  const toggleReminder = (val: number) => {
    setSettings(s => ({
      ...s,
      defaultReminders: s.defaultReminders.includes(val)
        ? s.defaultReminders.filter(v => v !== val)
        : [...s.defaultReminders, val],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all
          ${toast.type === "ok" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Google Calendar Sync</h1>
          <p className="text-sm text-gray-500">Sync your tasks and planner events with Google Calendar</p>
        </div>
      </div>

      {/* Not configured warning */}
      {!status?.configured && (
        <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Google credentials not configured</p>
            <p className="text-amber-700 mt-0.5">
              Add <code className="bg-amber-100 px-1 rounded text-xs">GOOGLE_CLIENT_ID</code>,{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">GOOGLE_CLIENT_SECRET</code>, and{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">GOOGLE_REDIRECT_URI</code> to{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">backend/.env</code> then restart the server.
            </p>
          </div>
        </div>
      )}

      {/* Connection card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M45.5 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h12.1c-.5 2.9-2.2 5.3-4.7 7v5.8h7.5c4.4-4 6.6-10 6.6-16.5z" />
              <path fill="#34A853" d="M24 46c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-6.5 0-12-4.4-13.9-10.3H2.3v6C6.3 41.7 14.6 46 24 46z" />
              <path fill="#FBBC05" d="M10.1 26.3c-.5-1.4-.8-2.9-.8-4.3s.3-2.9.8-4.3v-6H2.3C.8 14.9 0 19.3 0 24s.8 9.1 2.3 12.3l7.8-6z" />
              <path fill="#EA4335" d="M24 9.5c3.6 0 6.8 1.2 9.4 3.6l7-7C36 2.1 30.5 0 24 0 14.6 0 6.3 4.3 2.3 11.7l7.8 6C12 11.9 17.5 9.5 24 9.5z" />
            </svg>
            <div>
              <p className="font-semibold text-sm text-gray-900">Google Calendar</p>
              {status?.connected && status.connectedSince && (
                <p className="text-xs text-gray-400">
                  Connected since {new Date(status.connectedSince).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {status?.connected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
              </span>
              <button onClick={handleDisconnect}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                <Unlink className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={!status?.configured}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand text-white rounded-lg hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed">
              <Link2 className="w-4 h-4" /> Connect
            </button>
          )}
        </div>

        {/* Calendar selector — only when connected */}
        {status?.connected && (
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Calendar</label>
              <div className="flex gap-2">
                <select
                  value={settings.selectedCalendarId ?? ""}
                  onChange={e => {
                    const cal = calendars.find(c => c.id === e.target.value);
                    setSettings(s => ({ ...s, selectedCalendarId: e.target.value, calendarName: cal?.name ?? null }));
                  }}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select a calendar —</option>
                  {calendars.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.isPrimary ? " (Primary)" : ""}
                    </option>
                  ))}
                </select>
                <button onClick={loadCalendars} disabled={calLoading}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition">
                  <RefreshCw className={`w-4 h-4 ${calLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <button onClick={handleCreateCloudBoxCalendar} disabled={calLoading}
                className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Create dedicated "CloudBox" calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sync settings — only when connected */}
      {status?.connected && (
        <>
          {/* Sync mode */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm text-gray-900">Sync Mode</h2>
            </div>
            <div className="space-y-2">
              {SYNC_MODES.map(m => (
                <label key={m.value} className="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="syncMode" value={m.value}
                    checked={settings.syncMode === m.value}
                    onChange={() => setSettings(s => ({ ...s, syncMode: m.value }))}
                    className="mt-0.5 accent-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.label}</p>
                    <p className="text-xs text-gray-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Task sync settings */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm text-gray-900">Task Synchronization</h2>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.syncTasks}
                onChange={e => setSettings(s => ({ ...s, syncTasks: e.target.checked }))}
                className="w-4 h-4 accent-blue-600 rounded" />
              <span className="text-sm font-medium text-gray-800">Enable task synchronization</span>
            </label>
            {settings.syncTasks && (
              <div className="pl-7 space-y-2">
                {TASK_SYNC_MODES.map(m => (
                  <label key={m.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="taskSyncMode" value={m.value}
                      checked={settings.taskSyncMode === m.value}
                      onChange={() => setSettings(s => ({ ...s, taskSyncMode: m.value }))}
                      className="accent-blue-600" />
                    <span className="text-sm text-gray-700">{m.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Reminders */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm text-gray-900">Default Reminders</h2>
            </div>
            <p className="text-xs text-gray-500">These reminders will be added to Google Calendar events.</p>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map(r => {
                const active = settings.defaultReminders.includes(r.value);
                return (
                  <button key={r.value} onClick={() => toggleReminder(r.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition
                      ${active
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-gray-700 border-gray-200 hover:border-brand/50 hover:text-brand"}`}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button onClick={handleSaveSettings} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark transition disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Settings
            </button>
          </div>

          {/* Bulk sync actions */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-sm text-gray-900">Bulk Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <BulkActionButton icon={RefreshCw} label="Sync All Tasks" loading={bulkLoading}
                onClick={handleBulkSync} />
              <BulkActionButton icon={RotateCcw} label="Reconnect Calendar"
                onClick={handleConnect} />
            </div>
          </div>
        </>
      )}

      {/* Info footer */}
      <p className="text-center text-xs text-gray-400 pb-4">
        Google Calendar is an external provider. CloudBox remains the source of truth.
        <br />Events in Google Calendar will be read-only from the Google side.
      </p>
    </div>
  );
}

function BulkActionButton({
  icon: Icon, label, loading, onClick,
}: { icon: any; label: string; loading?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition disabled:opacity-60">
      <Icon className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}
