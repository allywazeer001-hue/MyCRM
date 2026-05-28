"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, Loader2, AlertCircle, MessageSquare,
  Send, Clock, User, Calendar, Printer, MoreHorizontal, ExternalLink,
  Layers, ChevronRight, UserPlus, CheckCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Field, useModulesStore } from "@/store/modules.store";

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

// ── Lookup display (async label resolution) ────────────────────────────────

function LookupDisplay({ value, field }: { value: any; field: Field }) {
  const { modules } = useModulesStore();
  const [label, setLabel] = useState<string | null>(null);
  const settings = (field.settings || {}) as Record<string, any>;
  const targetModuleId = settings.lookupModuleId as string | undefined;
  const displayField = (settings.displayField as string) || "name";

  useEffect(() => {
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
  }, [value, targetModuleId, displayField]);

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

function RecordFieldValue({ value, field }: { value: any; field: Field }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400 italic text-sm">—</span>;
  }

  if (field.type === "INLINE_SUBFORM") {
    return <SubformReadOnly value={value} field={field} />;
  }
  if (field.type === "LOOKUP" || field.type === "GLOBAL_RELATION") {
    return <LookupDisplay value={value} field={field} />;
  }
  if (field.type === "BOOLEAN") {
    return <Badge variant={value ? "success" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
  }
  if (field.type === "STATUS" || field.type === "DROPDOWN") {
    const opt = field.options?.find(o => o.value === value);
    const label = opt?.label || value;
    const colorMap: Record<string, string> = {
      active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-600",
      pending: "bg-yellow-100 text-yellow-700", completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const cls = colorMap[String(value).toLowerCase()] || "bg-gray-100 text-gray-600";
    return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", cls)}>{label}</span>;
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
        <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
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
                    <RecordFieldValue value={rec.data?.[f.name]} field={f} />
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

// ── Main page ──────────────────────────────────────────────────────────────

export default function RecordDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const { modules, fetchModules } = useModulesStore();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  // Portal user state
  const [portalStatus, setPortalStatus] = useState<{ portalEnabled: boolean; portalLabel?: string; portalUser: any } | null>(null);
  const [creatingPortalUser, setCreatingPortalUser] = useState(false);
  const [portalMsg, setPortalMsg] = useState("");

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

  const displayFields = fields.filter(f => f.type !== "AUTO_NUMBER" || f.id !== titleField?.id);

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
                <RecordFieldValue value={data[statusField.name]} field={statusField} />
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
          <Link href={`/m/${slug}/${id}/edit`}>
            <Button size="sm" className="gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete Record"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Portal status banner */}
      {portalMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm print:hidden ${
          portalMsg.includes("Failed") || portalMsg.includes("not")
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-indigo-50 border border-indigo-200 text-indigo-700"
        }`}>
          {portalMsg.includes("Failed") ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{portalMsg}</span>
          <button onClick={() => setPortalMsg("")} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
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

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">{mod?.name}: {String(titleValue || record.id)}</h1>
        <p className="text-sm text-gray-500">Created: {formatDate(record.createdAt)}</p>
      </div>

      {/* Tabs (only if there are related modules) */}
      {relatedTabs.length > 0 && (
        <div className="border-b border-gray-200 print:hidden">
          <nav className="-mb-px flex gap-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                activeTab === "details"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Details
            </button>
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
      )}

      {/* Related module tab content */}
      {activeTab !== "details" && (
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
                <CardTitle className="text-sm font-semibold text-gray-700">Record Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {displayFields.map(field => (
                    <div key={field.id} className={cn(
                      "space-y-1",
                      ["TEXTAREA", "RICH_TEXT", "MULTI_SELECT", "INLINE_SUBFORM", "TAGS"].includes(field.type) && "sm:col-span-2"
                    )}>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</dt>
                      <dd>
                        <RecordFieldValue value={data[field.name]} field={field} />
                      </dd>
                    </div>
                  ))}
                  {displayFields.length === 0 && (
                    <p className="text-sm text-gray-400 sm:col-span-2">No fields configured.</p>
                  )}
                </dl>
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
                  <Input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1"
                  />
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
              <Link href={`/m/${slug}/${id}/edit`}>
                <Button variant="outline" className="w-full gap-2">
                  <Edit className="w-4 h-4" /> Edit Record
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete Record"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
