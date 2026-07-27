"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LayoutList, Plus, Loader2, Trash2, Edit2, RefreshCw,
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Clock, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "@/components/ui/module-icon";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TaskPanel {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  moduleId?: string;
  module?: { id: string; name: string; icon?: string; slug: string };
  assigneeRoles: string[];
  displayLimit: number;
  highlightNew: boolean;
  newThresholdHours: number;
  isActive: boolean;
  createdAt: string;
}

interface PanelRecord {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  isNew: boolean;
  createdBy?: { firstName: string; lastName: string; email: string };
}

interface PanelResult {
  panel: TaskPanel;
  module: { id: string; name: string; slug: string; icon?: string };
  records: PanelRecord[];
  total: number;
  newCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

function getRecordLabel(data: Record<string, unknown>): string {
  for (const key of ["name", "title", "fullName", "firstName", "subject", "reference", "label"]) {
    const v = data[key];
    if (v && typeof v === "string") return v;
    if (v && typeof v === "object" && (v as any).label) return (v as any).label;
  }
  return String(Object.values(data).find(v => typeof v === "string") ?? "—");
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Panel result section ──────────────────────────────────────────────────────

function PanelResultSection({ result, onRefresh }: { result: PanelResult; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const accentColor = result.panel.color ?? "#3b82f6";
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
        <span className="font-semibold text-gray-800 text-sm flex-1">
          {result.panel.icon && <span className="mr-1.5">{result.panel.icon}</span>}
          {result.panel.name}
        </span>
        <div className="flex items-center gap-2">
          {result.newCount > 0 && (
            <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5">{result.newCount} new</Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{result.total}</Badge>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRefresh(); }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {result.records.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No records match this panel's conditions</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {result.records.map(record => (
                <div key={record.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                  {record.isNew && (
                    <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{getRecordLabel(record.data)}</p>
                    {record.createdBy && (
                      <p className="text-xs text-gray-400">{record.createdBy.firstName} {record.createdBy.lastName}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />{timeAgo(record.createdAt)}
                  </span>
                  <Link href={`/m/${result.module.slug}/${record.id}`} target="_blank" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TaskPanelsPage() {
  const { user } = useAuthStore();
  const isAdmin = (user as any)?.role === "ADMIN" || (user as any)?.role === "SUPER_ADMIN";
  const [tab, setTab] = useState<"my" | "configure">("my");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── My Panels state ────────────────────────────────────────────────────────
  const [myPanels, setMyPanels] = useState<TaskPanel[]>([]);
  const [results, setResults] = useState<Record<string, PanelResult>>({});
  const [loadingMy, setLoadingMy] = useState(false);

  // ── Admin config state ─────────────────────────────────────────────────────
  const [allPanels, setAllPanels] = useState<TaskPanel[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMyPanels = useCallback(async () => {
    setLoadingMy(true);
    try {
      const { data } = await api.get("/task-panels");
      const panels: TaskPanel[] = data ?? [];
      setMyPanels(panels);
      await Promise.all(panels.map(async p => {
        try {
          const res = await api.get(`/task-panels/${p.id}/records`);
          setResults(prev => ({ ...prev, [p.id]: res.data }));
        } catch { /* keep empty */ }
      }));
    } catch { showToast("Failed to load panels", "error"); }
    finally { setLoadingMy(false); }
  }, []);

  const loadAllPanels = useCallback(async () => {
    setLoadingAll(true);
    try {
      const { data } = await api.get("/task-panels/admin");
      setAllPanels(data ?? []);
    } catch { showToast("Failed to load panels", "error"); }
    finally { setLoadingAll(false); }
  }, []);

  useEffect(() => { loadMyPanels(); if (isAdmin) loadAllPanels(); }, [loadMyPanels, loadAllPanels, isAdmin]);

  const handleToggle = async (panel: TaskPanel) => {
    const next = !panel.isActive;
    setAllPanels(prev => prev.map(p => p.id === panel.id ? { ...p, isActive: next } : p));
    try {
      await api.patch(`/task-panels/${panel.id}`, { isActive: next });
    } catch {
      setAllPanels(prev => prev.map(p => p.id === panel.id ? { ...p, isActive: panel.isActive } : p));
      showToast("Failed to update panel", "error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete panel "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/task-panels/${id}`);
      setAllPanels(prev => prev.filter(p => p.id !== id));
      showToast("Panel deleted");
    } catch { showToast("Failed to delete panel", "error"); }
  };

  const totalNew = Object.values(results).reduce((s, r) => s + (r.newCount ?? 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-blue-600" />
            Task Panels
            {totalNew > 0 && <Badge className="bg-red-500 text-white ml-1">{totalNew} new</Badge>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live filtered views of module data, configured per role
          </p>
        </div>
        {isAdmin && (
          <Link href="/settings/task-panels/new">
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Panel</Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        <button
          onClick={() => setTab("my")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            tab === "my" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          My Panels
          {totalNew > 0 && (
            <span className="ml-2 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{totalNew}</span>
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("configure")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === "configure" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            Configure
          </button>
        )}
      </div>

      {/* ── My Panels ───────────────────────────────────────────────────────── */}
      {tab === "my" && (
        <div className="space-y-3">
          {loadingMy ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : myPanels.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
              <LayoutList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No panels for your role</p>
              <p className="text-xs text-gray-400 mt-1">
                {isAdmin ? "Switch to Configure to create panels." : "Ask an admin to set up panels for your role."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{myPanels.length} panel{myPanels.length !== 1 ? "s" : ""}</p>
                <button onClick={loadMyPanels} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <RefreshCw className="w-3 h-3" /> Refresh all
                </button>
              </div>
              {myPanels.map(panel =>
                results[panel.id] ? (
                  <PanelResultSection
                    key={panel.id}
                    result={results[panel.id]}
                    onRefresh={() => {
                      api.get(`/task-panels/${panel.id}/records`)
                        .then(r => setResults(prev => ({ ...prev, [panel.id]: r.data })))
                        .catch(() => {});
                    }}
                  />
                ) : (
                  <div key={panel.id} className="border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: panel.color ?? "#3b82f6" }} />
                    <span className="text-sm text-gray-700">{panel.name}</span>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 ml-auto" />
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* ── Configure (admin) ────────────────────────────────────────────────── */}
      {tab === "configure" && isAdmin && (
        <div>
          {loadingAll ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : allPanels.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center">
              <LayoutList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-600 mb-1">No Task Panels yet</p>
              <p className="text-xs text-gray-400 mb-6">Create panels to show filtered record lists to specific roles.</p>
              <Link href="/settings/task-panels/new">
                <Button className="gap-2"><Plus className="w-4 h-4" /> Create First Panel</Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Roles</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allPanels.map(panel => (
                    <tr key={panel.id} className={cn("hover:bg-gray-50/40 transition-colors", !panel.isActive && "opacity-60")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                            style={{ backgroundColor: (panel.color ?? "#3b82f6") + "22" }}
                          >
                            {panel.icon ?? <LayoutList className="w-3.5 h-3.5 text-blue-500" />}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{panel.name}</p>
                            {panel.description && <p className="text-xs text-gray-400 line-clamp-1">{panel.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {panel.module ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <ModuleIcon icon={panel.module.icon} slug={panel.module.slug} className="w-3.5 h-3.5" />{panel.module.name}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {panel.assigneeRoles?.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {panel.assigneeRoles.slice(0, 3).map(r => (
                              <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">{r}</Badge>
                            ))}
                            {panel.assigneeRoles.length > 3 && <span className="text-[10px] text-gray-400">+{panel.assigneeRoles.length - 3}</span>}
                          </div>
                        ) : <span className="text-xs text-gray-400">All roles</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch checked={panel.isActive} onCheckedChange={() => handleToggle(panel)} className="scale-90" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/settings/task-panels/${panel.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDelete(panel.id, panel.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
