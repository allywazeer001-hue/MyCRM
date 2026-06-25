"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, Loader2, AlertCircle, MessageSquare,
  Send, Clock, User, Calendar, Printer, MoreHorizontal, ExternalLink,
  Layers, ChevronRight, UserPlus, CheckCircle, RefreshCw, Save, X, FileText,
  Copy, Archive, Lock, Unlock, History, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploadInput } from "@/components/ui/file-upload-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Field, useModulesStore } from "@/store/modules.store";
import { DependentGlobalListInput, GlobalListCombobox } from "@/components/ui/dependent-global-list-input";
import { useGlobalListDependency } from "@/hooks/use-global-list-dependency";
import { PermissionGate, useModulePermission } from "@/components/ui/permission-gate";
import { BlueprintActions } from "@/components/blueprints/blueprint-actions";

// Thin wrapper so the import doesn't cause the whole page to re-render on every state change
function BlueprintActionsSection({
  recordId,
  moduleFields,
  onStageChanged,
}: {
  recordId: string;
  moduleFields: { name: string; label: string; type?: string }[];
  onStageChanged: (newStage: string) => void;
}) {
  return (
    <BlueprintActions
      recordId={recordId}
      moduleFields={moduleFields}
      onStageChanged={onStageChanged}
    />
  );
}

// ── Interfaces ─────────────────────────────────────────────────────────────

interface SubformColumn {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  formula?: string;
  options?: { label: string; value: string }[];
  lookupModuleId?: string;
  lookupDisplayField?: string;
}

interface RelatedModuleTab {
  module: any;
  linkField: Field;
}

// ── Subform read-only renderer ──────────────────────────────────────────────

const COL_TYPE_ALIGN: Record<string, string> = {
  NUMBER: "text-right", DECIMAL: "text-right", CURRENCY: "text-right", FORMULA: "text-right",
};

function SubformCellValue({ value, col }: { value: any; col: SubformColumn }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300 select-none">—</span>;
  }
  switch (col.type) {
    case "BOOLEAN":
      return (
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          value ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", value ? "bg-emerald-500" : "bg-gray-400")} />
          {value ? "Yes" : "No"}
        </span>
      );
    case "DROPDOWN": {
      const opt = col.options?.find(o => o.value === String(value));
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {opt?.label || String(value)}
        </span>
      );
    }
    case "CURRENCY":
      return <span className="text-sm font-semibold text-gray-800 tabular-nums">${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
    case "NUMBER":
    case "DECIMAL":
      return <span className="text-sm font-mono text-gray-700 tabular-nums">{Number(value).toLocaleString()}</span>;
    case "DATE":
      return <span className="text-sm text-gray-600">{formatDate(value)}</span>;
    case "FORMULA":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
          <span className="text-blue-400 text-[10px]">fx</span>{value}
        </span>
      );
    default:
      return <span className="text-sm text-gray-700">{String(value)}</span>;
  }
}

function SubformReadOnly({ value, field }: { value: any; field: Field }) {
  const [collapsed, setCollapsed] = useState(false);
  const rows: Record<string, any>[] = Array.isArray(value) ? value : [];
  const cols = ((field.settings?.columns || []) as SubformColumn[]);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100 text-gray-400 text-sm italic">
        <span className="text-base">📋</span> No entries yet
      </div>
    );
  }
  if (cols.length === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
        <span className="text-xs font-mono text-gray-500">{rows.length}</span>
        <span className="text-xs text-gray-400">row{rows.length !== 1 ? "s" : ""}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-1">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {rows.length} {rows.length === 1 ? "Entry" : "Entries"}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-600 bg-blue-100/70">
            {cols.length} col{cols.length !== 1 ? "s" : ""}
          </span>
        </div>
        <svg
          className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", collapsed && "-rotate-90")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 border-b border-gray-200 w-9 tabular-nums">
                  #
                </th>
                {cols.map((col, ci) => (
                  <th
                    key={col.id || `col-${ci}`}
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap",
                      COL_TYPE_ALIGN[col.type] || "text-left"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      {col.type === "FORMULA" && (
                        <span className="text-[9px] font-mono text-blue-400 bg-blue-50 px-1 rounded">fx</span>
                      )}
                      {col.type === "CURRENCY" && <span className="text-[9px] text-green-500">$</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={cn(
                    "border-b border-gray-100 last:border-b-0 transition-colors",
                    ri % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                    "hover:bg-blue-50/40"
                  )}
                >
                  <td className="px-3 py-2.5 text-xs text-gray-400 font-mono tabular-nums">{ri + 1}</td>
                  {cols.map((col, ci) => (
                    <td
                      key={col.id || `col-${ci}`}
                      className={cn("px-3 py-2.5", COL_TYPE_ALIGN[col.type] || "")}
                    >
                      <SubformCellValue value={row[col.name]} col={col} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── User display (async name resolution for USER_SELECT) ──────────────────

function UserDisplay({ value, resolvedLabel }: { value: any; resolvedLabel?: string }) {
  const [name, setName] = useState<string | null>(resolvedLabel ?? null);
  useEffect(() => {
    if (resolvedLabel || !value) return;
    let cancelled = false;
    api.get(`/users/${value}`)
      .then(r => {
        if (cancelled) return;
        const u = r.data;
        const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || String(value);
        setName(n);
      })
      .catch(() => { if (!cancelled) setName(String(value)); });
    return () => { cancelled = true; };
  }, [value, resolvedLabel]);

  const displayName = name ?? String(value);
  const initial = displayName[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
        {initial}
      </span>
      <span className="text-sm text-gray-800">{displayName}</span>
    </div>
  );
}

// ── Global relation display (async label from GlobalList) ─────────────────

function GlobalRelationDisplay({ value, field, resolvedLabel }: { value: any; field: Field; resolvedLabel?: string }) {
  const [label, setLabel] = useState<string | null>(resolvedLabel ?? null);
  const raw = (field as any).settings;
  const settings: Record<string, any> = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : (raw || {});
  const globalListId: string | undefined = settings.globalListId || settings.globalListSource?.listId;

  useEffect(() => {
    if (resolvedLabel || !value || !globalListId) return;
    let cancelled = false;
    api.get(`/global-lists/${globalListId}/items`)
      .then(r => {
        if (cancelled) return;
        const items: any[] = Array.isArray(r.data) ? r.data : [];
        const item = items.find(i => i.id === value || i.value === value);
        setLabel(item?.label ?? String(value));
      })
      .catch(() => { if (!cancelled) setLabel(String(value)); });
    return () => { cancelled = true; };
  }, [value, globalListId, resolvedLabel]);

  return <span className="text-sm text-gray-800">{label ?? String(value)}</span>;
}

// ── Lookup display (async label resolution) ────────────────────────────────

function LookupDisplay({ value, field, resolvedLabel }: { value: any; field: Field; resolvedLabel?: string }) {
  const { modules } = useModulesStore();
  const [label, setLabel] = useState<string | null>(resolvedLabel ?? null);
  const settings = (field.settings || {}) as Record<string, any>;
  const targetModuleId = settings.lookupModuleId as string | undefined;
  const displayField = (settings.displayField as string) || "name";

  useEffect(() => {
    // If the backend already resolved this label, skip the API call
    if (resolvedLabel) { setLabel(resolvedLabel); return; }
    if (!value || !targetModuleId) return;
    let cancelled = false;
    api.get(`/modules/${targetModuleId}/records/${value}`)
      .then(r => {
        if (!cancelled) {
          const rec = r.data;
          const lbl = rec?.data?.[displayField] ?? rec?.data?.name ?? rec?.data?.title ?? String(value);
          setLabel(String(lbl));
        }
      })
      .catch(() => { if (!cancelled) setLabel(String(value)); });
    return () => { cancelled = true; };
  }, [value, targetModuleId, displayField, resolvedLabel]);

  const targetMod = modules.find(m => m.id === targetModuleId);

  return (
    <div className="flex items-center gap-1.5">
      {targetMod && <span className="text-sm">{targetMod.icon || "📦"}</span>}
      <span className="text-sm text-gray-800">{label ?? String(value)}</span>
      {targetMod && value && (
        <Link href={`/m/${targetMod.slug}/${value}`} className="text-blue-400 hover:text-blue-600 transition-colors" title="Open linked record">
          <ExternalLink className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── Field value display ─────────────────────────────────────────────────────

function RecordFieldValue({ value, field, resolvedLabel }: { value: any; field: Field; resolvedLabel?: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400 italic text-sm">—</span>;
  }

  if (field.type === "INLINE_SUBFORM") {
    return <SubformReadOnly value={value} field={field} />;
  }
  if (field.type === "GLOBAL_RELATION") {
    return <GlobalRelationDisplay value={value} field={field} resolvedLabel={resolvedLabel} />;
  }
  if (field.type === "USER_SELECT") {
    return <UserDisplay value={value} resolvedLabel={resolvedLabel} />;
  }
  if (field.type === "GLOBAL_LIST" || field.type === "DEPENDENT_GLOBAL_LIST") {
    const display = resolvedLabel || (typeof value === "object" && value !== null ? (value.label ?? value.name ?? String(value)) : String(value));
    return <span className="text-sm text-gray-800">{display}</span>;
  }
  if (field.type === "LOOKUP") {
    return <LookupDisplay value={value} field={field} resolvedLabel={resolvedLabel} />;
  }
  if (field.type === "BOOLEAN") {
    return <Badge variant={value ? "success" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
  }
  if (field.type === "STATUS" || field.type === "DROPDOWN") {
    const parsedSettings = (() => { try { return typeof (field as any).settings === "string" ? JSON.parse((field as any).settings) : ((field as any).settings ?? {}); } catch { return {}; } })();
    const hasGlobalListSource = !!(parsedSettings?.globalListSource?.listId || parsedSettings?.globalListId);
    if (hasGlobalListSource && resolvedLabel) {
      return <span className="text-sm text-gray-800">{resolvedLabel}</span>;
    }
    const opt = field.options?.find(o => o.value === value);
    const label = (hasGlobalListSource && resolvedLabel) ? resolvedLabel : (opt?.label || value);
    const colorMap: Record<string, string> = {
      active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-600",
      pending: "bg-yellow-100 text-yellow-700", completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const cls = colorMap[String(value).toLowerCase()] || "bg-gray-100 text-gray-600";
    return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", cls)}>{label}</span>;
  }
  if (field.type === "RADIO") {
    const opt = field.options?.find(o => o.value === value);
    const label = opt?.label ?? String(value);
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-800">
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
        {label}
      </span>
    );
  }
  if (field.type === "MULTI_SELECT" || field.type === "TAGS") {
    const vals = Array.isArray(value) ? value : [value];
    return (
      <div className="flex flex-wrap gap-1">
        {vals.map((v: any, i: number) => {
          const opt = field.options?.find(o => o.value === String(v));
          return <Badge key={i} variant="secondary" className="text-xs">{opt?.label || String(v)}</Badge>;
        })}
      </div>
    );
  }
  if (field.type === "RATING") {
    return <span className="text-yellow-400 text-base">{"★".repeat(Number(value))}{"☆".repeat(5 - Number(value))}</span>;
  }
  if (field.type === "PROGRESS") {
    return (
      <div className="flex items-center gap-2 max-w-xs">
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, Number(value))}%` }} />
        </div>
        <span className="text-sm text-gray-600 w-10">{value}%</span>
      </div>
    );
  }
  if (field.type === "EMAIL") return <a href={`mailto:${value}`} className="text-blue-600 hover:underline text-sm">{value}</a>;
  if (field.type === "PHONE") return <a href={`tel:${value}`} className="text-blue-600 hover:underline text-sm">{value}</a>;
  if (field.type === "URL") {
    return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs block">{value}</a>;
  }
  if (field.type === "DATE" || field.type === "DATETIME") {
    return <span className="text-sm text-gray-700">{formatDate(value)}</span>;
  }
  if (field.type === "CURRENCY") {
    return <span className="text-sm font-semibold text-gray-800">${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
  }
  if (field.type === "COLOR_PICKER") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: value }} />
        <span className="text-sm text-gray-600 font-mono">{value}</span>
      </div>
    );
  }
  if (field.type === "TEXTAREA" || field.type === "RICH_TEXT") {
    return <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{value}</p>;
  }
  if (field.type === "AUTO_NUMBER") {
    return <span className="text-sm font-mono font-medium text-blue-600">{value}</span>;
  }
  if (field.type === "FORMULA") {
    return <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{value}</span>;
  }
  if (field.type === "FILE" || field.type === "IMAGE" || field.type === "SIGNATURE") {
    if (typeof value !== "string" || !value) return <span className="text-gray-400 italic text-sm">—</span>;
    const isImg = field.type === "IMAGE" || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);
    if (isImg) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="h-20 max-w-xs rounded-lg border border-gray-200 object-cover hover:opacity-90 transition-opacity" />
        </a>
      );
    }
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
        <FileText className="w-3.5 h-3.5 shrink-0" />
        {value.split("/").pop() || "Download file"}
      </a>
    );
  }

  // Safe fallback — never String() an object/array
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400 italic text-sm">—</span>;
    if (typeof value[0] === "object") {
      return <Badge variant="secondary" className="text-xs">{value.length} item{value.length !== 1 ? "s" : ""}</Badge>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v: any, i: number) => <Badge key={i} variant="secondary" className="text-xs">{String(v)}</Badge>)}
      </div>
    );
  }
  if (typeof value === "object") {
    const readable = (value as any).name ?? (value as any).label ?? (value as any).title;
    return readable
      ? <span className="text-sm text-gray-800">{String(readable)}</span>
      : <span className="text-gray-400 italic text-sm">—</span>;
  }

  return <span className="text-sm text-gray-800">{String(value)}</span>;
}

// ── Comment item ───────────────────────────────────────────────────────────

// ── Utilities ──────────────────────────────────────────────────────────────

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function renderMentions(text: string) {
  const parts = text.split(/(@[\w][\w ]*[\w]|@[\w])/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-blue-600 font-medium bg-blue-50 px-0.5 rounded">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ── Activity Tab ───────────────────────────────────────────────────────────

const ACTION_ICON: Record<string, React.ReactNode> = {
  RECORD_CREATED:   <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0"><Plus   className="w-3.5 h-3.5 text-green-600" /></span>,
  RECORD_UPDATED:   <span className="w-6 h-6 rounded-full bg-blue-100  flex items-center justify-center shrink-0"><Edit   className="w-3.5 h-3.5 text-blue-600" /></span>,
  RECORD_DELETED:   <span className="w-6 h-6 rounded-full bg-red-100   flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-600" /></span>,
  RECORD_ARCHIVED:  <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Archive className="w-3.5 h-3.5 text-amber-600" /></span>,
  RECORD_UNARCHIVED:<span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Archive className="w-3.5 h-3.5 text-amber-500" /></span>,
  RECORD_LOCKED:    <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0"><Lock   className="w-3.5 h-3.5 text-purple-600" /></span>,
  RECORD_UNLOCKED:  <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0"><Unlock className="w-3.5 h-3.5 text-purple-500" /></span>,
  COMMENT_ADDED:    <span className="w-6 h-6 rounded-full bg-gray-100  flex items-center justify-center shrink-0"><MessageSquare className="w-3.5 h-3.5 text-gray-500" /></span>,
};

const ACTION_LABEL: Record<string, string> = {
  RECORD_CREATED:    "created this record",
  RECORD_UPDATED:    "updated this record",
  RECORD_DELETED:    "deleted this record",
  RECORD_ARCHIVED:   "archived this record",
  RECORD_UNARCHIVED: "unarchived this record",
  RECORD_LOCKED:     "locked this record",
  RECORD_UNLOCKED:   "unlocked this record",
  COMMENT_ADDED:     "commented",
};

function ActivityTab({ moduleId, recordId }: { moduleId: string; recordId: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/modules/${moduleId}/records/${recordId}/activity`)
      .then(r => setEntries(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleId, recordId]);

  if (loading) return (
    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
  );
  if (entries.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet.</p>
  );

  return (
    <div className="divide-y divide-gray-50">
      {entries.map((entry: any) => (
        <div key={entry.id} className="flex gap-3 py-3">
          {ACTION_ICON[entry.action] ?? (
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <History className="w-3.5 h-3.5 text-gray-400" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">
                {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "System"}
              </span>
              <span className="text-sm text-gray-500">
                {ACTION_LABEL[entry.action] ?? entry.action.toLowerCase().replace(/_/g, " ")}
              </span>
              <span className="text-xs text-gray-400 ml-auto shrink-0" title={entry.createdAt}>
                {relativeTime(entry.createdAt)}
              </span>
            </div>
            {/* Field changes */}
            {entry.action === "RECORD_UPDATED" && entry.metadata?.newValues && (
              <div className="mt-1.5 space-y-0.5">
                {Object.entries(entry.metadata.newValues as Record<string, any>).map(([key, nv]) => {
                  const ov = entry.metadata?.oldValues?.[key];
                  return (
                    <div key={key} className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-600 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-gray-300">·</span>
                      <span className="line-through text-gray-400 max-w-[120px] truncate" title={String(ov ?? "—")}>{String(ov ?? "—")}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-700 max-w-[120px] truncate" title={String(nv ?? "—")}>{String(nv ?? "—")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Comment content */}
            {entry.action === "COMMENT_ADDED" && entry.metadata?.content && (
              <p className="mt-1 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                {renderMentions(entry.metadata.content)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Comment ────────────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: any }) {
  return (
    <div className="flex gap-3 py-3">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
        {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-800">
            {comment.user?.firstName} {comment.user?.lastName}
          </span>
          <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{renderMentions(comment.content)}</p>
      </div>
    </div>
  );
}

// ── Related records table ──────────────────────────────────────────────────

function RelatedRecordsTable({ tab, currentRecordId }: { tab: RelatedModuleTab; currentRecordId: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fg = JSON.stringify({
      conditions: [{ field: tab.linkField.name, operator: "is", value: currentRecordId }],
      logic: "AND",
    });
    api.get(`/modules/${tab.module.id}/records?filterGroup=${encodeURIComponent(fg)}&limit=50`)
      .then(r => setRecords(r.data?.data || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [tab.module.id, tab.linkField.name, currentRecordId]);

  const displayFields: Field[] = (tab.module.fields || []).filter(
    (f: Field) => f.id !== tab.linkField.id && !["FILE", "IMAGE", "SIGNATURE", "INLINE_SUBFORM"].includes(f.type)
  ).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Layers className="w-8 h-8 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">No {tab.module.name} records linked to this record.</p>
        <Link href={`/m/${tab.module.slug}/new`} className="mt-3">
          <Button size="sm" variant="outline">Add {tab.module.name}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{records.length} record{records.length !== 1 ? "s" : ""}</p>
        <Link href={`/m/${tab.module.slug}/new`}>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            + Add {tab.module.name}
          </Button>
        </Link>
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {displayFields.map(f => (
                <th key={f.id} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((rec: any) => (
              <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                {displayFields.map(f => (
                  <td key={f.id} className="px-4 py-2.5 max-w-[200px] truncate">
                    <RecordFieldValue value={rec.data?.[f.name]} field={f} resolvedLabel={rec.data?.[f.name + "__label"]} />
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/m/${tab.module.slug}/${rec.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Inline global-list helpers ─────────────────────────────────────────────

function parseGlobalListId(rawSettings: any): string {
  const s = typeof rawSettings === "string"
    ? (() => { try { return JSON.parse(rawSettings); } catch { return {}; } })()
    : (rawSettings || {});
  return s?.globalListId || s?.globalListSource?.listId || "";
}

function InlineGlobalListField({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const listId = parseGlobalListId((field as any).settings);
  if (!listId) return <span className="text-xs text-amber-600 font-medium">⚠ No list configured</span>;
  const rawId = value && typeof value === "object" && value.id ? String(value.id) : (value || "");
  return <GlobalListCombobox listId={listId} parentId={null} value={rawId} onChange={onChange} placeholder="Select…" />;
}

function InlineDependentGlobalListField({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const listId = parseGlobalListId((field as any).settings);
  if (!listId) return <span className="text-xs text-amber-600 font-medium">⚠ No list configured (listId missing)</span>;
  return <DependentGlobalListInput listId={listId} value={value} onChange={onChange} />;
}

// ── Inline field editor ────────────────────────────────────────────────────
// Renders an editable control for each field type, in-place within the detail layout.
// Complex types (LOOKUP, INLINE_SUBFORM, FORMULA, AUTO_NUMBER) remain read-only.

function InlineFieldEditor({
  field, value, onChange, fieldOptions, onDependencyFieldChange,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  fieldOptions?: Record<string, any[]>;
  onDependencyFieldChange?: (name: string, v: any) => void;
}) {
  const handleChange = (v: any) => {
    onChange(v);
    const isGlobalSrc = ["GLOBAL_RELATION", "GLOBAL_LIST", "DEPENDENT_GLOBAL_LIST", "DROPDOWN", "STATUS"].includes(field.type);
    if (isGlobalSrc && onDependencyFieldChange) onDependencyFieldChange(field.name, v);
  };

  switch (field.type) {
    case "TEXT":
    case "EMAIL":
    case "URL":
    case "PHONE":
      return (
        <Input
          value={value ?? ""}
          type={field.type === "EMAIL" ? "email" : field.type === "URL" ? "url" : field.type === "PHONE" ? "tel" : "text"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm"
        />
      );

    case "NUMBER":
    case "DECIMAL":
    case "CURRENCY":
    case "PERCENTAGE":
      return (
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="h-8 text-sm"
        />
      );

    case "TEXTAREA":
    case "RICH_TEXT":
      return (
        <Textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="text-sm resize-y"
        />
      );

    case "BOOLEAN":
      return (
        <Switch checked={!!value} onCheckedChange={onChange} />
      );

    case "DATE":
      return (
        <Input
          type="date"
          value={value ? String(value).split("T")[0] : ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 text-sm"
        />
      );

    case "DATETIME":
      return (
        <Input
          type="datetime-local"
          value={value ? String(value).replace("Z", "").slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 text-sm"
        />
      );

    case "STATUS":
    case "DROPDOWN": {
      const _listId = parseGlobalListId((field as any).settings);
      if (_listId) {
        // Backed by a global list — use dependency-aware rendering
        const _raw = (field as any).settings;
        const _ps = typeof _raw === "string" ? (() => { try { return JSON.parse(_raw); } catch { return {}; } })() : (_raw || {});
        const _isDependent = _ps?.fieldRole === "dependent";
        const _extOpts = fieldOptions?.[(field as any).id];
        // Dependent field: use engine-loaded options (combobox with local search)
        if (_isDependent) {
          // undefined = parent not yet chosen; [] = parent chosen but no children
          const opts: any[] | undefined = Array.isArray(_extOpts) ? _extOpts : undefined;
          const rawId = value && typeof value === "object" && value.id ? String(value.id) : (value || "");
          return (
            <GlobalListCombobox
              listId={_listId}
              value={rawId}
              onChange={handleChange}
              placeholder={opts === undefined ? "Select parent first…" : "Select…"}
              disabled={opts === undefined}
              staticItems={opts ?? []}
            />
          );
        }
        // Primary / independent: load all root items (pass handleChange so engine tracks changes)
        return <InlineGlobalListField field={field} value={value} onChange={handleChange} />;
      }
      const opts = field.options || [];
      return (
        <Select value={value ?? ""} onValueChange={handleChange}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    case "MULTI_SELECT":
    case "TAGS": {
      const current: string[] = Array.isArray(value) ? value : [];
      const opts = field.options || [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {opts.map((o) => {
            const active = current.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(active ? current.filter((v) => v !== o.value) : [...current, o.value])}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs border transition-colors",
                  active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "RADIO": {
      const opts = field.options || [];
      return (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(value === o.value ? null : o.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                value === o.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }

    case "FILE":
    case "IMAGE":
    case "SIGNATURE":
      return <FileUploadInput value={value} onChange={onChange} fieldType={field.type} />;

    case "GLOBAL_LIST":
      return <InlineGlobalListField field={field} value={value} onChange={handleChange} />;

    case "DEPENDENT_GLOBAL_LIST":
      return <InlineDependentGlobalListField field={field} value={value} onChange={handleChange} />;

    default:
      // LOOKUP, INLINE_SUBFORM, FORMULA, AUTO_NUMBER — read-only in inline mode
      return (
        <span className="text-sm text-gray-500 italic">
          <RecordFieldValue value={value} field={field} />
        </span>
      );
  }
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RecordDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const { modules, fetchModules } = useModulesStore();
  const perm = useModulePermission(slug ?? "");
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  // ── Inline edit state ──────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [draftData, setDraftData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [editingSectionTitle, setEditingSectionTitle] = useState(false);
  const [sectionTitleValue, setSectionTitleValue] = useState("");
  const [editError, setEditError] = useState("");
  // Per-field double-click editing (does not require entering full editMode)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<any>(null);
  // Portal user state
  const [portalStatus, setPortalStatus] = useState<{ portalEnabled: boolean; portalLabel?: string; portalUser: any } | null>(null);
  // Duplicate / Archive / Lock
  const [duplicating, setDuplicating] = useState(false);
  // @mention state for comments
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [creatingPortalUser, setCreatingPortalUser] = useState(false);
  const [portalMsg, setPortalMsg] = useState("");

  // Dependency engine — handles cross-field global-list filtering (Region→District→Ward)
  const editFields = (record?.module?.fields || []) as Field[];
  const { fieldOptions, onDependencyFieldChange, bootstrapDependencies } = useGlobalListDependency(
    editFields as any[],
    draftData,
    setDraftData,
  );

  const load = async () => {
    try {
      const modRes = await api.get(`/modules/by-slug/${slug}`);
      const mod = modRes.data;
      const recRes = await api.get(`/modules/${mod.id}/records/${id}`);
      setRecord(recRes.data);
    } catch {
      setError("Record not found");
    } finally {
      setLoading(false);
    }
  };

  const loadPortalStatus = async (recordId: string) => {
    try {
      const { data } = await api.get(`/portal/admin/records/${recordId}/portal-status`);
      setPortalStatus(data);
    } catch {}
  };

  useEffect(() => {
    load();
    if (modules.length === 0) fetchModules();
  }, [slug, id]);

  useEffect(() => {
    if (id) loadPortalStatus(id);
  }, [id]);

  // Fetch user list once for @mentions
  useEffect(() => {
    api.get("/users", { params: { limit: 200 } })
      .then(r => setAllUsers(Array.isArray(r.data) ? r.data : (r.data?.data ?? [])))
      .catch(() => {});
  }, []);

  // ── Duplicate / Archive / Lock ──────────────────────────────────────────

  const handleDuplicate = async () => {
    if (!record) return;
    setDuplicating(true);
    try {
      const { data: newRec } = await api.post(`/modules/${record.module.id}/records/${id}/duplicate`);
      router.push(`/m/${slug}/${newRec.id}`);
    } catch {
      alert("Failed to duplicate record");
    } finally {
      setDuplicating(false);
    }
  };

  const handleArchive = async () => {
    if (!record) return;
    const archived = !record.isArchived;
    try {
      await api.patch(`/modules/${record.module.id}/records/${id}/archive`, { archived });
      setRecord((prev: any) => ({ ...prev, isArchived: archived, archivedAt: archived ? new Date().toISOString() : null }));
    } catch {
      alert("Failed to update archive status");
    }
  };

  const handleLock = async () => {
    if (!record) return;
    const locked = !record.isLocked;
    try {
      await api.patch(`/modules/${record.module.id}/records/${id}/lock`, { locked });
      setRecord((prev: any) => ({ ...prev, isLocked: locked, lockedAt: locked ? new Date().toISOString() : null }));
    } catch {
      alert("Failed to update lock status");
    }
  };

  // ── @mentions ────────────────────────────────────────────────────────────

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setComment(val);
    const cursor = e.target.selectionStart ?? val.length;
    const upToCursor = val.slice(0, cursor);
    const lastAt = upToCursor.lastIndexOf("@");
    if (lastAt >= 0 && !upToCursor.slice(lastAt + 1).includes(" ")) {
      setMentionStart(lastAt);
      setMentionQuery(upToCursor.slice(lastAt + 1).toLowerCase());
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (user: any) => {
    const name = `${user.firstName} ${user.lastName}`;
    const before = comment.slice(0, mentionStart);
    const after = comment.slice(mentionStart + 1 + mentionQuery.length);
    setComment(`${before}@${name}${after}`);
    setMentionOpen(false);
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/modules/${record.module.id}/records/${id}`);
      router.push(`/m/${slug}`);
    } catch {
      setDeleting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const { data } = await api.post(`/modules/${record.module.id}/records/${id}/comments`, { content: comment });
      setRecord((prev: any) => ({ ...prev, comments: [data, ...(prev.comments || [])] }));
      setComment("");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCreatePortalUser = async () => {
    setCreatingPortalUser(true);
    setPortalMsg("");
    try {
      const { data } = await api.post(`/portal/admin/records/${id}/create-portal-user`);
      setPortalMsg(data.existed
        ? `Portal user already exists: ${data.user.email}`
        : `Portal user created! Login: ${data.user.email} / Password: their last name`
      );
      loadPortalStatus(id);
    } catch (err: any) {
      setPortalMsg(err?.response?.data?.message || "Failed to create portal user");
    }
    setCreatingPortalUser(false);
  };

  const handleSyncPortal = async () => {
    try {
      const { data } = await api.post(`/portal/admin/records/${id}/sync`);
      setPortalMsg(data.synced ? "Portal user synced successfully" : data.message);
      setTimeout(() => setPortalMsg(""), 4000);
    } catch {}
  };

  const handlePrint = () => window.print();

  const handleStartEdit = () => {
    const initialData = { ...(record.data as Record<string, any>) };
    setDraftData(initialData);
    setEditError("");
    setEditMode(true);
    // Pre-load filtered options for dependent fields that already have a parent value
    bootstrapDependencies(initialData);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setDraftData({});
    setEditError("");
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditError("");
    try {
      const mod = record.module;
      await api.patch(`/modules/${mod.id}/records/${id}`, draftData);
      setRecord((prev: any) => ({ ...prev, data: { ...(prev.data || {}), ...draftData } }));
      setEditMode(false);
      setDraftData({});
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Save a single field edited via double-click
  const saveFieldEdit = async (field: Field) => {
    const mod = record.module;
    try {
      await api.patch(`/modules/${mod.id}/records/${id}`, { [field.name]: fieldDraft });
      setRecord((prev: any) => ({ ...prev, data: { ...(prev.data || {}), [field.name]: fieldDraft } }));
    } catch { /* silent — keep editing */ }
    setEditingFieldId(null);
    setFieldDraft(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  if (error || !record) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error || "Record not found"}</p>
        <Link href={`/m/${slug}`}><Button variant="outline">Back to List</Button></Link>
      </div>
    );
  }

  const mod = record.module;
  const fields: Field[] = mod?.fields || [];
  const data = record.data as Record<string, any>;
  const comments = record.comments || [];

  const titleField = fields.find(f => ["TEXT", "AUTO_NUMBER", "EMAIL"].includes(f.type));
  const titleValue = titleField ? data[titleField.name] : record.id.slice(0, 8);
  const statusField = fields.find(f => f.type === "STATUS");

  const baseFields = fields.filter(f => f.type !== "AUTO_NUMBER" || f.id !== titleField?.id);

  // Evaluate layout rules (field.settings.conditions) against current data.
  // action "show" → field hidden unless condition met
  // action "hide" → field shown unless condition met
  const evalLayoutRule = (fieldSettings: any, currentData: Record<string, any>) => {
    const settings = typeof fieldSettings === "string"
      ? (() => { try { return JSON.parse(fieldSettings); } catch { return {}; } })()
      : (fieldSettings || {});
    const conditions: any[] = settings.conditions || [];
    if (!conditions.length) return { hidden: false, required: false, readonly: false };

    let hidden = false;
    let required = false;
    let readonly = false;

    for (const rule of conditions) {
      const fieldVal = String(currentData[rule.whenField] ?? "");
      let match = false;
      if (rule.operator === "equals")     match = fieldVal === String(rule.whenValue ?? "");
      else if (rule.operator === "not_equals") match = fieldVal !== String(rule.whenValue ?? "");
      else if (rule.operator === "is_empty")   match = !fieldVal || fieldVal === "null";
      else if (rule.operator === "not_empty")  match = !!fieldVal && fieldVal !== "null";

      if (match) {
        if (rule.action === "hide")      hidden = true;
        if (rule.action === "show")      hidden = false;
        if (rule.action === "require")   required = true;
        if (rule.action === "unrequire") required = false;
        if (rule.action === "readonly")  readonly = true;
      } else {
        // "show" rule: if condition not met, hide the field
        if (rule.action === "show") hidden = true;
      }
    }
    return { hidden, required, readonly };
  };

  // Use the live data (draftData in edit mode, record.data otherwise) for evaluation
  const liveData = editMode ? { ...data, ...draftData } : data;
  const displayFields = baseFields.filter(f => {
    const result = evalLayoutRule((f as any).settings, liveData);
    return !result.hidden;
  });

  // Discover related modules: other modules with a LOOKUP field pointing to this module
  const relatedTabs: RelatedModuleTab[] = modules
    .filter(m => m.id !== mod.id)
    .flatMap(m =>
      (m.fields || [])
        .filter((f: Field) => f.type === "LOOKUP" && (f.settings as any)?.lookupModuleId === mod.id)
        .map((f: Field) => ({ module: m, linkField: f }))
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-none">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/m/${slug}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{mod?.icon || "📦"}</span>
              <h1 className="text-2xl font-bold text-gray-900 truncate max-w-lg">{String(titleValue || "Untitled")}</h1>
              {statusField && data[statusField.name] && (
                <RecordFieldValue value={data[statusField.name]} field={statusField} resolvedLabel={data[statusField.name + "__label"]} />
              )}
            </div>
            <p className="text-sm text-gray-400 ml-7 mt-0.5">
              {mod?.name} · Created {formatDate(record.createdAt)}
              {record.createdBy && ` by ${record.createdBy.firstName} ${record.createdBy.lastName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <PermissionGate slug={slug ?? ""} action="canEdit">
            {editMode ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1.5">
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button size="sm" className="gap-2" onClick={handleStartEdit}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
            )}
          </PermissionGate>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
                <Printer className="w-4 h-4" /> Print Record
              </DropdownMenuItem>
              <PermissionGate slug={slug ?? ""} action="canCreate">
                <DropdownMenuItem onClick={handleDuplicate} disabled={duplicating} className="gap-2 cursor-pointer">
                  {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Duplicate Record
                </DropdownMenuItem>
              </PermissionGate>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                className="gap-2 cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                {record?.isArchived ? "Unarchive Record" : "Archive Record"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLock}
                className="gap-2 cursor-pointer"
              >
                {record?.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {record?.isLocked ? "Unlock Record" : "Lock Record"}
              </DropdownMenuItem>
              {portalStatus?.portalEnabled && (
                <>
                  <DropdownMenuSeparator />
                  {portalStatus.portalUser ? (
                    <>
                      <DropdownMenuItem disabled className="gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Portal User: {portalStatus.portalUser.email}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSyncPortal} className="gap-2 cursor-pointer">
                        <RefreshCw className="w-4 h-4" /> Sync to Portal
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={handleCreatePortalUser}
                      disabled={creatingPortalUser}
                      className="gap-2 cursor-pointer text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                    >
                      {creatingPortalUser
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <UserPlus className="w-4 h-4" />}
                      Create Portal User
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {perm.canDelete && <DropdownMenuSeparator />}
              {perm.canDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting..." : "Delete Record"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Portal status banner */}
      {portalMsg && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm print:hidden ${
          portalMsg.includes("Failed") || portalMsg.includes("not enabled") || portalMsg.includes("not mapped")
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-indigo-50 border border-indigo-200 text-indigo-700"
        }`}>
          {(portalMsg.includes("Failed") || portalMsg.includes("not enabled") || portalMsg.includes("not mapped"))
            ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <span>{portalMsg}</span>
            {(portalMsg.includes("not enabled") || portalMsg.includes("not mapped") || portalMsg.includes("identity")) && (
              <div className="mt-1">
                <a
                  href="/settings/portal"
                  className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:opacity-80"
                >
                  → Go to Settings → Portal Settings to enable portal for this module
                </a>
              </div>
            )}
          </div>
          <button onClick={() => setPortalMsg("")} className="ml-auto text-gray-400 hover:text-gray-600 shrink-0">✕</button>
        </div>
      )}
      {portalStatus?.portalEnabled && portalStatus.portalUser && !portalMsg && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 print:hidden">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <span>Portal user linked: <strong>{portalStatus.portalUser.email}</strong></span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
            portalStatus.portalUser.accountStatus === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>{portalStatus.portalUser.accountStatus}</span>
        </div>
      )}

      {/* Archive / Lock banners */}
      {record?.isArchived && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 print:hidden">
          <Archive className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This record is <strong>archived</strong>. Editing is disabled until unarchived.</span>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs text-amber-700 hover:bg-amber-100" onClick={handleArchive}>
            Unarchive
          </Button>
        </div>
      )}
      {record?.isLocked && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-sm text-purple-800 print:hidden">
          <Lock className="w-4 h-4 text-purple-600 shrink-0" />
          <span>This record is <strong>locked</strong>. Only admins can edit or delete it.</span>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs text-purple-700 hover:bg-purple-100" onClick={handleLock}>
            Unlock
          </Button>
        </div>
      )}

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{mod?.name}: {String(titleValue || record.id)}</h1>
        <p className="text-sm text-gray-500">Created: {formatDate(record.createdAt)}</p>
      </div>

      {/* Blueprint process actions — current stage + available transition buttons */}
      <div className="print:hidden">
        <BlueprintActionsSection
          recordId={id}
          moduleFields={(fields as any[]).map((f: any) => ({ name: f.name, label: f.label, type: f.type }))}
          onStageChanged={() => load()}
        />
      </div>

      {/* Tabs — always visible: Details, Activity, and any related modules */}
      <div className="border-b border-gray-200 print:hidden">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {(["details", "activity"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab === "activity" && <History className="w-3.5 h-3.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {relatedTabs.map(tab => (
            <button
              key={tab.module.id}
              onClick={() => setActiveTab(tab.module.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5",
                activeTab === tab.module.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <span>{tab.module.icon || "📦"}</span>
              {tab.module.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Activity tab content */}
      {activeTab === "activity" && record && (
        <div className="print:hidden">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <History className="w-4 h-4" /> Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTab moduleId={record.module.id} recordId={id} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Related module tab content */}
      {activeTab !== "details" && activeTab !== "activity" && (
        <div className="print:hidden">
          {relatedTabs
            .filter(tab => tab.module.id === activeTab)
            .map(tab => (
              <Card key={tab.module.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-base">{tab.module.icon || "📦"}</span>
                    {tab.module.name}
                    <span className="text-xs text-gray-400 font-normal">linked via {tab.linkField.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RelatedRecordsTable tab={tab} currentRecordId={id} />
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}

      {/* Details tab content */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main fields */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {editingSectionTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={sectionTitleValue}
                        onChange={e => setSectionTitleValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { setEditingSectionTitle(false); }
                          if (e.key === "Escape") { setEditingSectionTitle(false); setSectionTitleValue(""); }
                        }}
                        onBlur={() => setEditingSectionTitle(false)}
                        autoFocus
                        className="text-sm font-semibold text-gray-700 bg-transparent border-b border-blue-400 focus:outline-none flex-1 py-0.5"
                      />
                    </div>
                  ) : (
                    <CardTitle
                      className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-blue-600 group flex items-center gap-1.5"
                      onDoubleClick={() => { setEditingSectionTitle(true); setSectionTitleValue("Record Details"); }}
                      title="Double-click to rename this section"
                    >
                      {sectionTitleValue || "Record Details"}
                      <span className="opacity-0 group-hover:opacity-50 text-[10px] font-normal text-gray-400">✎</span>
                    </CardTitle>
                  )}
                  {editMode && (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Edit className="w-3 h-3" /> Editing
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Error banner */}
                {editError && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {editError}
                  </div>
                )}
                {/* Edit mode hint */}
                {editMode && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                    Fields are now editable. Click <strong>Save</strong> to apply changes or <strong>Cancel</strong> to discard.
                  </div>
                )}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {displayFields.map(field => {
                    const isEditingThis = editingFieldId === field.id;
                    // canEditInline: can be edited in bulk-edit mode (Edit button)
                    const canEditInline = !["FORMULA", "AUTO_NUMBER", "INLINE_SUBFORM", "LOOKUP"].includes(field.type);
                    // canDoubleClickEdit: subset — FILE/IMAGE fields use full edit mode only, not double-click
                    const canDoubleClickEdit = canEditInline && !["FILE", "IMAGE", "SIGNATURE"].includes(field.type);
                    return (
                      <div key={field.id} className={cn(
                        "space-y-1.5",
                        ["TEXTAREA", "RICH_TEXT", "MULTI_SELECT", "INLINE_SUBFORM", "TAGS", "FILE", "IMAGE", "SIGNATURE", "DEPENDENT_GLOBAL_LIST"].includes(field.type) && "sm:col-span-2",
                        editMode && canEditInline && "rounded-lg p-2 -mx-2 bg-blue-50/30 ring-1 ring-blue-100",
                        isEditingThis && "rounded-lg p-2 -mx-2 bg-indigo-50/40 ring-2 ring-indigo-300"
                      )}>
                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</dt>
                        <dd>
                          {/* Per-field double-click edit mode */}
                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <div className="flex-1">
                                <InlineFieldEditor
                                  field={field}
                                  value={fieldDraft}
                                  onChange={setFieldDraft}
                                  fieldOptions={fieldOptions}
                                  onDependencyFieldChange={onDependencyFieldChange}
                                />
                              </div>
                              <button
                                onClick={() => saveFieldEdit(field)}
                                title="Save"
                                className="w-6 h-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shrink-0 transition-colors"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => { setEditingFieldId(null); setFieldDraft(null); }}
                                title="Cancel"
                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full shrink-0 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : editMode && canEditInline ? (
                            <InlineFieldEditor
                              field={field}
                              value={draftData[field.name]}
                              onChange={(v) => setDraftData((prev) => ({ ...prev, [field.name]: v }))}
                              fieldOptions={fieldOptions}
                              onDependencyFieldChange={onDependencyFieldChange}
                            />
                          ) : (
                            <div
                              onDoubleClick={() => {
                                if (canDoubleClickEdit && perm.canEdit && !editMode) {
                                  setEditingFieldId(field.id);
                                  setFieldDraft(data[field.name]);
                                }
                              }}
                              title={canDoubleClickEdit && perm.canEdit ? "Double-click to edit" : undefined}
                              className={cn(
                                canDoubleClickEdit && perm.canEdit && !editMode && "cursor-text group/field"
                              )}
                            >
                              <RecordFieldValue value={data[field.name]} field={field} resolvedLabel={data[field.name + "__label"]} />
                              {canDoubleClickEdit && perm.canEdit && !editMode && (
                                <span className="ml-1 opacity-0 group-hover/field:opacity-40 text-[10px] text-gray-400 select-none">✎</span>
                              )}
                            </div>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                  {displayFields.length === 0 && (
                    <p className="text-sm text-gray-400 sm:col-span-2">No fields configured.</p>
                  )}
                </dl>
                {/* Bottom save bar when in edit mode */}
                {editMode && (
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} className="gap-1.5">
                      <X className="w-4 h-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <form onSubmit={handleAddComment} className="flex gap-2 pb-4">
                  <div className="relative flex-1">
                    <Input
                      ref={commentInputRef}
                      value={comment}
                      onChange={handleCommentChange}
                      onKeyDown={e => { if (e.key === "Escape") setMentionOpen(false); }}
                      placeholder="Add a comment… (type @ to mention someone)"
                      className="w-full"
                    />
                    {mentionOpen && (
                      <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                        {allUsers
                          .filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(mentionQuery))
                          .slice(0, 6)
                          .map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onMouseDown={e => { e.preventDefault(); insertMention(user); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left text-sm"
                            >
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </span>
                              <span>{user.firstName} {user.lastName}</span>
                            </button>
                          ))}
                        {allUsers.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(mentionQuery)).length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-400">No users match</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Button type="submit" size="sm" disabled={!comment.trim() || submittingComment}>
                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>

                {comments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {comments.map((c: any) => <CommentItem key={c.id} comment={c} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 print:hidden">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Record Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Created by</p>
                    <p className="text-sm font-medium text-gray-800">
                      {record.createdBy ? `${record.createdBy.firstName} ${record.createdBy.lastName}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(record.createdAt)}</p>
                  </div>
                </div>
                {record.updatedAt !== record.createdAt && (
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Last updated</p>
                      <p className="text-sm font-medium text-gray-800">{formatDate(record.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {relatedTabs.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs text-gray-500 font-medium">Related</p>
                    {relatedTabs.map(tab => (
                      <button
                        key={tab.module.id}
                        onClick={() => setActiveTab(tab.module.id)}
                        className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm">{tab.module.icon || "📦"}</span>
                        <span className="text-sm text-gray-700 flex-1">{tab.module.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-mono">{record.id}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <PermissionGate slug={slug ?? ""} action="canEdit">
                {editMode ? (
                  <Button variant="outline" className="w-full gap-2" onClick={handleCancelEdit}>
                    <X className="w-4 h-4" /> Cancel Editing
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full gap-2" onClick={handleStartEdit}>
                    <Edit className="w-4 h-4" /> Edit Record
                  </Button>
                )}
              </PermissionGate>
              {perm.canDelete && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting..." : "Delete Record"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
