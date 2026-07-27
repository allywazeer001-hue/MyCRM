"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Play, RefreshCw, Settings2, AlertTriangle,
  CheckCircle2, XCircle, Copy, GitMerge, ChevronRight,
  Download, BarChart3, Search, Filter, ArrowRight, Loader2,
  Clock, Database, AlertCircle, FileText, Eye, Zap,
  TrendingUp, Info, X, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "issues" | "history" | "report";

interface DashboardData {
  latestScan: {
    id: string;
    createdAt: string;
    status: string;
    scanType: string;
    moduleId?: string | null;
    moduleName?: string | null;
    summary: any;
  } | null;
  scansTotal: number;
  pendingIssues: number;
  byType: Record<string, number>;
  qualityScore: number | null;
  byModule: Record<string, { records: number; issues: number; qualityScore?: number }>;
}

interface Issue {
  id: string;
  issueType: string;
  severity: string;
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
  recordId: string;
  fieldName: string | null;
  details: any;
  isResolved: boolean;
  createdAt: string;
}

interface Scan {
  id: string;
  status: string;
  scanType: string;
  moduleId?: string | null;
  moduleName?: string | null;
  summary: any;
  duration: number | null;
  createdAt: string;
  completedAt: string | null;
  _count: { issues: number };
}

interface ReportData {
  scan: any;
  executive: { totalRecords: number; totalIssues: number; qualityScore: number; cleanRecords: number };
  duplicates: { groupCount: number; affectedRecords: number; groups: any[] };
  missingData: { total: number; byField: any[] };
  validation: { invalidEmails: number; invalidPhones: number; invalidDates: number; invalidUrls: number };
  recommendations: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ISSUE_LABELS: Record<string, string> = {
  DUPLICATE: "Duplicate",
  MISSING_FIELD: "Missing Field",
  INVALID_EMAIL: "Invalid Email",
  INVALID_PHONE: "Invalid Phone",
  INVALID_DATE: "Invalid Date",
  INVALID_URL: "Invalid URL",
};

const ISSUE_COLORS: Record<string, string> = {
  DUPLICATE: "bg-orange-100 text-orange-700 border-orange-200",
  MISSING_FIELD: "bg-red-100 text-red-700 border-red-200",
  INVALID_EMAIL: "bg-yellow-100 text-yellow-700 border-yellow-200",
  INVALID_PHONE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  INVALID_DATE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  INVALID_URL: "bg-slate-100 text-slate-600 border-slate-200",
};

const SEV_COLORS: Record<string, string> = {
  HIGH:   "bg-red-50 text-red-600 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-600 border-amber-200",
  LOW:    "bg-blue-50 text-blue-600 border-blue-200",
};

function fmtDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>;
  const color = score >= 90 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-red-600";
  return <span className={cn("text-2xl font-bold", color)}>{score}%</span>;
}

// ── Merge Dialog ──────────────────────────────────────────────────────────────

// ── Duplicate Group Card ──────────────────────────────────────────────────────

interface DupGroup {
  groupKey: string;
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
  triggerField: string;
  triggerFieldLabel: string;
  recordIds: string[];
  issueIds: string[];
}

function DuplicateGroupCard({
  group,
  onResolved,
}: { group: DupGroup; onResolved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState<{ id?: string; name: string; label: string; type: string }[]>([]);
  const [records, setRecords] = useState<Record<string, any>>({});
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const expand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (Object.keys(records).length > 0) return;
    setLoadingRecords(true);
    try {
      const modRes = await api.get(`/modules/${group.moduleId}`);
      setFields((modRes.data.fields ?? []).filter((f: any) => f.isActive !== false));
      const recResults = await Promise.all(
        group.recordIds.map(id =>
          api.get(`/modules/${group.moduleId}/records/${id}`).then(r => r.data).catch(() => null)
        )
      );
      const map: Record<string, any> = {};
      recResults.forEach((r, i) => { if (r) map[group.recordIds[i]] = r; });
      setRecords(map);
    } catch { setErr("Failed to load records."); }
    finally { setLoadingRecords(false); }
  };

  const keepRecord = async (keepId: string) => {
    const others = group.recordIds.filter(id => id !== keepId);
    setActing(keepId);
    setErr("");
    try {
      for (const mergeId of others) {
        await api.post("/data-quality/merge", { keepId, mergeId, fieldMap: {} });
      }
      onResolved();
    } catch { setErr("Merge failed. Please try again."); setActing(null); }
  };

  const ignoreGroup = async () => {
    setActing("ignore");
    try {
      await api.post("/data-quality/issues/resolve-many", { ids: group.issueIds });
      onResolved();
    } catch { setErr("Failed to dismiss. Please try again."); setActing(null); }
  };

  const getLabel = (fieldName: string) => {
    const f = fields.find(f => f.name === fieldName);
    return f?.label ?? fieldName;
  };

  const displayVal = (val: any): string => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const visibleFields = fields
    .filter(f => !["RICH_TEXT", "FILE", "IMAGE", "SIGNATURE"].includes(f.type))
    .slice(0, 12);

  const recEntries = group.recordIds
    .map(id => ({ id, data: records[id]?.data ?? null }))
    .filter(r => r.data !== null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={expand}
      >
        <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
          <Copy className="w-3.5 h-3.5 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">{group.moduleName}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">
              {group.triggerFieldLabel || group.triggerField}
            </span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
              {group.recordIds.length} duplicate records
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); ignoreGroup(); }}
            disabled={acting !== null}
            className="h-7 px-2.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {acting === "ignore" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ignore"}
          </button>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded comparison */}
      {expanded && (
        <div className="border-t border-gray-100">
          {loadingRecords ? (
            <div className="flex items-center justify-center py-10 gap-2 text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Loading records…
            </div>
          ) : err ? (
            <div className="px-4 py-4 text-xs text-red-500">{err}</div>
          ) : recEntries.length === 0 ? (
            <div className="px-4 py-4 text-xs text-gray-400">Records not available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 w-36 sticky left-0 bg-gray-50 z-10">Field</th>
                    {recEntries.map((r, i) => (
                      <th key={r.id} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 min-w-[180px]">
                        Record {String.fromCharCode(65 + i)}
                        <span className="ml-1.5 font-normal text-gray-400 font-mono">{r.id.slice(-6)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleFields.map(field => {
                    const vals = recEntries.map(r => displayVal(r.data?.[field.name]));
                    const isDiff = new Set(vals).size > 1;
                    const isTrigger = field.name === group.triggerField;
                    return (
                      <tr key={field.id ?? field.name}
                        className={cn(
                          "transition-colors",
                          isTrigger ? "bg-amber-50/60" : isDiff ? "bg-blue-50/30" : ""
                        )}>
                        <td className={cn(
                          "px-4 py-2 text-gray-600 font-medium flex items-center gap-1.5 sticky left-0 z-10",
                          isTrigger ? "bg-amber-50" : isDiff ? "bg-blue-50" : "bg-white"
                        )}>
                          {field.label}
                          {isTrigger && (
                            <span className="text-[10px] px-1 py-0 bg-amber-200 text-amber-800 rounded font-semibold">dup</span>
                          )}
                        </td>
                        {recEntries.map(r => (
                          <td key={r.id} className={cn(
                            "px-4 py-2",
                            isTrigger ? "text-amber-800 font-medium" : isDiff ? "text-blue-700" : "text-gray-700"
                          )}>
                            {displayVal(r.data?.[field.name])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10">Actions</td>
                    {recEntries.map(r => (
                      <td key={r.id} className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => keepRecord(r.id)}
                            disabled={acting !== null}
                            className="h-7 px-2.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {acting === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Keep this
                          </button>
                          <Link
                            href={`/m/${group.moduleSlug}/${r.id}`}
                            target="_blank"
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                            title="Open record"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Missing / Validation section ──────────────────────────────────────────────

interface RecordIssueGroup {
  recordId: string;
  moduleId: string;
  moduleName: string;
  moduleSlug: string;
  issues: Issue[];
}

function MissingSection({
  scanId,
  moduleSlugMap,
  onRefresh,
}: { scanId?: string; moduleSlugMap: Record<string, string>; onRefresh: () => void }) {
  const [groups, setGroups] = useState<RecordIssueGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const router = useRouter();
  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const resolveSlug = (issue: Issue) => issue.moduleSlug || moduleSlugMap[issue.moduleId] || issue.moduleId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: "200", isResolved: "false",
        ...(scanId ? { scanId } : {}),
        ...(typeFilter ? { issueType: typeFilter } : { issueType: "MISSING_FIELD,INVALID_EMAIL,INVALID_PHONE,INVALID_DATE,INVALID_URL" }),
      });
      const { data: res } = await api.get(`/data-quality/issues?${params}`);
      const items: Issue[] = res.items ?? [];

      // Group by recordId
      const map = new Map<string, RecordIssueGroup>();
      for (const issue of items) {
        if (!map.has(issue.recordId)) {
          map.set(issue.recordId, {
            recordId: issue.recordId,
            moduleId: issue.moduleId,
            moduleName: issue.moduleName,
            moduleSlug: resolveSlug(issue),
            issues: [],
          });
        }
        map.get(issue.recordId)!.issues.push(issue);
      }
      setGroups(Array.from(map.values()));
      setTotal(res.total);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [page, scanId, typeFilter, moduleSlugMap]);

  useEffect(() => { load(); }, [load]);

  const dismissRecord = async (group: RecordIssueGroup) => {
    setResolving(group.recordId);
    try {
      await api.post("/data-quality/issues/resolve-many", { ids: group.issues.map(i => i.id) });
      setGroups(prev => prev.filter(g => g.recordId !== group.recordId));
      setTotal(t => t - group.issues.length);
      onRefresh();
    } catch { /* noop */ } finally { setResolving(null); }
  };

  const ISSUE_CHIP: Record<string, { label: string; cls: string }> = {
    MISSING_FIELD:  { label: "Missing", cls: "bg-red-50 text-red-600 border-red-200" },
    INVALID_EMAIL:  { label: "Bad Email", cls: "bg-orange-50 text-orange-600 border-orange-200" },
    INVALID_PHONE:  { label: "Bad Phone", cls: "bg-orange-50 text-orange-600 border-orange-200" },
    INVALID_DATE:   { label: "Bad Date", cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
    INVALID_URL:    { label: "Bad URL", cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">All validation issues</option>
          <option value="MISSING_FIELD">Missing required fields</option>
          <option value="INVALID_EMAIL">Invalid emails</option>
          <option value="INVALID_PHONE">Invalid phones</option>
          <option value="INVALID_DATE">Invalid dates</option>
          <option value="INVALID_URL">Invalid URLs</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">{groups.length} records affected</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <CheckCircle2 className="w-10 h-10 text-green-200" />
            <p className="text-sm font-medium text-gray-500">No validation issues found</p>
            <p className="text-xs text-gray-400">Run a scan to detect problems.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Record</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Issues</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detected</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map(group => {
                // Dedup chips: one per unique issueType+fieldName combo
                const seen = new Set<string>();
                const uniqueIssues = group.issues.filter(issue => {
                  const key = `${issue.issueType}__${issue.fieldName ?? ""}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                // Record display name from any issue's details
                const recordSummary = (group.issues[0]?.details as any)?.recordSummary ?? "";

                const detectedDate = fmtDate(group.issues[0]?.createdAt);

                return (
                <tr
                  key={group.recordId}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  onClick={() => router.push(`/m/${group.moduleSlug}/${group.recordId}`)}
                >
                  <td className="px-4 py-3">
                    <div>
                      {recordSummary
                        ? <span className="text-xs font-medium text-gray-800">{recordSummary}</span>
                        : <span className="text-xs text-gray-500 font-mono">{group.recordId.slice(-10)}</span>
                      }
                      <span className="block text-[11px] text-gray-400 font-mono">{group.recordId.slice(-10)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600">{group.moduleName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {uniqueIssues.map(issue => {
                        const chip = ISSUE_CHIP[issue.issueType];
                        const label = (issue.details as any)?.fieldLabel ?? issue.fieldName ?? issue.issueType;
                        return (
                          <span key={`${issue.issueType}__${issue.fieldName}`}
                            className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium",
                              chip?.cls ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                            {chip ? `${chip.label}: ${label}` : label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">{detectedDate}</span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => dismissRecord(group)}
                        disabled={resolving === group.recordId}
                        className="h-7 px-2.5 text-xs flex items-center gap-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {resolving === group.recordId
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle2 className="w-3 h-3" />}
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Duplicates section ─────────────────────────────────────────────────────────

function DuplicatesSection({
  scanId,
  moduleSlugMap,
  onRefresh,
}: { scanId?: string; moduleSlugMap: Record<string, string>; onRefresh: () => void }) {
  const [dupGroups, setDupGroups] = useState<DupGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        issueType: "DUPLICATE", isResolved: "false", limit: "500",
        ...(scanId ? { scanId } : {}),
      });
      const { data: res } = await api.get(`/data-quality/issues?${params}`);
      const items: Issue[] = res.items ?? [];

      // Deduplicate into groups by sorted recordIds
      const seen = new Map<string, DupGroup>();
      for (const issue of items) {
        const details = issue.details as any;
        const ids: string[] = details?.duplicateGroup ?? [issue.recordId];
        const key = [...ids].sort().join("|");
        if (!seen.has(key)) {
          seen.set(key, {
            groupKey: key,
            moduleId: issue.moduleId,
            moduleName: issue.moduleName,
            moduleSlug: issue.moduleSlug || moduleSlugMap[issue.moduleId] || issue.moduleId,
            triggerField: issue.fieldName ?? "",
            triggerFieldLabel: (issue.details as any)?.fieldLabel ?? issue.fieldName ?? "",
            recordIds: ids,
            issueIds: [],
          });
        }
        seen.get(key)!.issueIds.push(issue.id);
      }
      setDupGroups(Array.from(seen.values()));
    } catch { /* noop */ } finally { setLoading(false); }
  }, [scanId, moduleSlugMap]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
    </div>
  );

  if (dupGroups.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <CheckCircle2 className="w-10 h-10 text-green-200" />
      <p className="text-sm font-medium text-gray-500">No duplicates found</p>
      <p className="text-xs text-gray-400">
        Add duplicate detection rules in Settings → Data Quality, then run a scan.
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{dupGroups.length} duplicate group{dupGroups.length !== 1 ? "s" : ""} found</p>
      {dupGroups.map(group => (
        <DuplicateGroupCard
          key={group.groupKey}
          group={group}
          onResolved={() => {
            setDupGroups(prev => prev.filter(g => g.groupKey !== group.groupKey));
            onRefresh();
          }}
        />
      ))}
    </div>
  );
}

// ── Scan skeleton ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-gray-100 animate-pulse", className)} />;
}

function ScanningState() {
  return (
    <div className="space-y-6 pointer-events-none select-none">
      {/* Score row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Bar chart skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
        <Skeleton className="h-4 w-32" />
        {[100, 65, 45, 30].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-24 shrink-0" />
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gray-200 animate-pulse" style={{ width: `${w}%` }} />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>

      {/* Status label */}
      <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" /> Scan running — results will appear automatically
      </p>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────

function DashboardTab({ data, onRunScan, scanning }: {
  data: DashboardData | null;
  onRunScan: () => void;
  scanning: boolean;
}) {
  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
    </div>
  );

  if (scanning) return <ScanningState />;

  const summary = data.latestScan?.summary;
  const byType = data.byType;
  const byModule = data.byModule ?? {};

  const metrics = [
    {
      label: "Total Records Analyzed",
      value: summary?.totalRecords?.toLocaleString() ?? "—",
      icon: Database,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Open Issues",
      value: data.pendingIssues.toLocaleString(),
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Duplicate Groups",
      value: byType.DUPLICATE ? Math.floor(byType.DUPLICATE / 2).toLocaleString() : "0",
      icon: Copy,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Missing Required",
      value: (byType.MISSING_FIELD ?? 0).toLocaleString(),
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  // Only show types that were actually detected
  const ALL_ISSUE_TYPES = [
    { key: "DUPLICATE",     label: "Duplicates",     color: "bg-orange-500" },
    { key: "MISSING_FIELD", label: "Missing Fields",  color: "bg-red-500"    },
    { key: "INVALID_EMAIL", label: "Invalid Emails",  color: "bg-amber-500"  },
    { key: "INVALID_PHONE", label: "Invalid Phones",  color: "bg-yellow-500" },
    { key: "INVALID_DATE",  label: "Invalid Dates",   color: "bg-purple-500" },
    { key: "INVALID_URL",   label: "Invalid URLs",    color: "bg-blue-400"   },
  ];
  const detectedTypes = ALL_ISSUE_TYPES.filter(t => (byType[t.key] ?? 0) > 0);
  const maxCount = Math.max(...detectedTypes.map(t => byType[t.key] ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Score + last scan */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Quality Score</p>
          <ScoreBadge score={data.qualityScore} />
          {data.latestScan && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-gray-400">
                Last scan: {fmtDate(data.latestScan.createdAt)}
              </p>
              {data.latestScan.scanType === "MODULE" && data.latestScan.moduleName ? (
                <span className="text-[11px] px-1.5 py-0.5 rounded-md border bg-teal-50 text-teal-700 border-teal-200 font-medium">
                  Scope: {data.latestScan.moduleName}
                </span>
              ) : (
                <span className="text-[11px] px-1.5 py-0.5 rounded-md border bg-gray-50 text-gray-500 border-gray-200 font-medium">
                  Scope: All Modules
                </span>
              )}
            </div>
          )}
        </div>
        {!data.latestScan && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
            <Info className="w-4 h-4 shrink-0" />
            <span>Run your first scan to see data quality metrics.</span>
            <button onClick={onRunScan}
              className="ml-2 text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors shrink-0">
              Run Scan
            </button>
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", m.bg)}>
              <m.icon className={cn("w-4 h-4", m.color)} />
            </div>
            <p className="text-xl font-bold text-gray-900">{m.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Issues by type — only detected types */}
      {detectedTypes.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-4">Issues by Type</p>
        <div className="space-y-3">
          {detectedTypes.map(t => {
            const count = byType[t.key] ?? 0;
            const pct = (count / maxCount) * 100;
            return (
              <div key={t.key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-gray-600 font-medium">{t.label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", t.color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-xs text-right font-semibold text-gray-700">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* By module */}
      {Object.keys(byModule).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Issues by Module</p>
          <div className="space-y-0">
            {Object.entries(byModule)
              .sort((a, b) => b[1].issues - a[1].issues)
              .slice(0, 10)
              .map(([name, val]) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">{val.records.toLocaleString()} records</span>
                    <span className={cn("font-medium w-16 text-right", val.issues > 0 ? "text-red-500" : "text-green-500")}>
                      {val.issues} issues
                    </span>
                    {val.qualityScore !== undefined && (
                      <span className={cn(
                        "font-semibold w-10 text-right",
                        val.qualityScore >= 90 ? "text-green-600" : val.qualityScore >= 70 ? "text-amber-600" : "text-red-600"
                      )}>
                        {val.qualityScore}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Issues Tab ────────────────────────────────────────────────────────────────

function IssuesTab({ scanId, onRefresh }: { scanId?: string; onRefresh?: () => void }) {
  // null while we haven't yet determined which sub-tab actually has issues
  const [subTab, setSubTab] = useState<"missing" | "duplicates" | null>(null);
  const [counts, setCounts] = useState<{ missing: number; duplicates: number } | null>(null);
  const [moduleSlugMap, setModuleSlugMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get("/modules").then(r => {
      const map: Record<string, string> = {};
      for (const m of (r.data ?? [])) map[m.id] = m.slug;
      setModuleSlugMap(map);
    }).catch(() => {});
  }, []);

  const loadCounts = useCallback(async () => {
    const buildParams = (issueType: string) => new URLSearchParams({
      page: "1", limit: "1", isResolved: "false", issueType,
      ...(scanId ? { scanId } : {}),
    });
    try {
      const [missingRes, dupRes] = await Promise.all([
        api.get(`/data-quality/issues?${buildParams("MISSING_FIELD,INVALID_EMAIL,INVALID_PHONE,INVALID_DATE,INVALID_URL")}`),
        api.get(`/data-quality/issues?${buildParams("DUPLICATE")}`),
      ]);
      return { missing: missingRes.data.total ?? 0, duplicates: dupRes.data.total ?? 0 };
    } catch {
      return { missing: 0, duplicates: 0 };
    }
  }, [scanId]);

  // Decide the default sub-tab from actual issue counts — never default to a
  // tab that looks "clean" while the other tab is hiding real issues.
  useEffect(() => {
    let cancelled = false;
    setCounts(null);
    setSubTab(null);
    loadCounts().then(c => {
      if (cancelled) return;
      setCounts(c);
      setSubTab(c.missing === 0 && c.duplicates > 0 ? "duplicates" : "missing");
    });
    return () => { cancelled = true; };
  }, [loadCounts]);

  const handleSectionResolved = () => {
    onRefresh?.();
    loadCounts().then(setCounts);
  };

  if (subTab === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setSubTab("missing")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
            subTab === "missing"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Missing &amp; Validation
          {!!counts?.missing && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-100 text-red-600 text-[10px] font-semibold">
              {counts.missing}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab("duplicates")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
            subTab === "duplicates"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Duplicates
          {!!counts?.duplicates && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-semibold">
              {counts.duplicates}
            </span>
          )}
        </button>
      </div>

      {subTab === "missing" ? (
        <MissingSection
          scanId={scanId}
          moduleSlugMap={moduleSlugMap}
          onRefresh={handleSectionResolved}
        />
      ) : (
        <DuplicatesSection
          scanId={scanId}
          moduleSlugMap={moduleSlugMap}
          onRefresh={handleSectionResolved}
        />
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({ onSelectScan }: { onSelectScan: (id: string) => void }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/data-quality/scans?limit=50")
      .then(res => setScans(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
    </div>
  );

  if (scans.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <Clock className="w-10 h-10 text-gray-200" />
      <p className="text-sm font-medium text-gray-600">No scans yet</p>
      <p className="text-xs text-gray-400">Run your first scan to see history here.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Records</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issues</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
              <th className="text-right px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {scans.map(scan => {
              const summary = scan.summary as any;
              return (
                <tr key={scan.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-700">{fmtDate(scan.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-md border w-fit",
                        scan.scanType === "MANUAL"
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : scan.scanType === "MODULE"
                          ? "bg-teal-50 text-teal-600 border-teal-100"
                          : "bg-purple-50 text-purple-600 border-purple-100")}>
                        {scan.scanType}
                      </span>
                      {scan.scanType === "MODULE" && scan.moduleName && (
                        <span className="text-[10px] text-gray-400">{scan.moduleName}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {scan.status === "COMPLETED" && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Completed</span>}
                    {scan.status === "RUNNING"   && <span className="flex items-center gap-1 text-xs text-blue-600"><Loader2 className="w-3 h-3 animate-spin" /> Running</span>}
                    {scan.status === "FAILED"    && <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3 h-3" /> Failed</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{summary?.totalRecords?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{summary?.totalIssues ?? "—"}</td>
                  <td className="px-4 py-3">
                    {summary?.qualityScore !== undefined
                      ? <span className={cn("text-xs font-semibold",
                          summary.qualityScore >= 90 ? "text-green-600" : summary.qualityScore >= 70 ? "text-amber-600" : "text-red-600")}>
                          {summary.qualityScore}%
                        </span>
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDuration(scan.duration)}</td>
                  <td className="px-4 py-3 text-right">
                    {scan.status === "COMPLETED" && (
                      <button
                        onClick={() => onSelectScan(scan.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 ml-auto"
                      >
                        Report <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Report Tab ────────────────────────────────────────────────────────────────

function ReportTab({ scanId }: { scanId?: string }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestId, setLatestId] = useState(scanId);

  useEffect(() => {
    if (!latestId) {
      api.get("/data-quality/scans?limit=1")
        .then(res => {
          const scans: Scan[] = res.data;
          const c = scans.find(s => s.status === "COMPLETED");
          if (c) setLatestId(c.id);
        })
        .catch(() => {});
    }
  }, [latestId]);

  useEffect(() => {
    if (!latestId) return;
    setLoading(true);
    api.get(`/data-quality/scans/${latestId}/report`)
      .then(res => setReport(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [latestId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
    </div>
  );

  if (!report) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <FileText className="w-10 h-10 text-gray-200" />
      <p className="text-sm font-medium text-gray-600">No report available</p>
      <p className="text-xs text-gray-400">Run a scan to generate a data quality report.</p>
    </div>
  );

  const { executive, duplicates, missingData, validation, recommendations } = report;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Executive summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" /> Executive Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: executive.totalRecords.toLocaleString() },
            { label: "Clean Records",  value: executive.cleanRecords.toLocaleString(), green: true },
            { label: "Issues Found",   value: executive.totalIssues.toLocaleString(), red: executive.totalIssues > 0 },
            { label: "Quality Score",  value: `${executive.qualityScore}%`,
              color: executive.qualityScore >= 90 ? "text-green-600" : executive.qualityScore >= 70 ? "text-amber-600" : "text-red-600" },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className={cn("text-2xl font-bold", (m as any).color ?? ((m as any).green ? "text-green-600" : (m as any).red ? "text-red-500" : "text-gray-900"))}>
                {m.value}
              </p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Duplicates */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Copy className="w-4 h-4 text-orange-500" /> Duplicate Summary
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
            <p className="text-xl font-bold text-orange-700">{duplicates.groupCount}</p>
            <p className="text-xs text-orange-500">Duplicate Groups</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
            <p className="text-xl font-bold text-red-700">{duplicates.affectedRecords}</p>
            <p className="text-xs text-red-500">Affected Records</p>
          </div>
        </div>
      </div>

      {/* Missing data */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" /> Missing Data Summary
        </p>
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold text-red-600">{missingData.total}</span> records with missing required fields
        </p>
        {missingData.byField.length > 0 && (
          <div className="space-y-1.5">
            {missingData.byField.slice(0, 10).map(f => (
              <div key={`${f.fieldName}_${f.modules?.[0]}`} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{f.label}</span>
                <div className="flex items-center gap-3 text-gray-400">
                  <span>{f.modules?.join(", ")}</span>
                  <span className="font-medium text-red-500">{f.count} missing</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Validation Summary
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Invalid Emails",  value: validation.invalidEmails },
            { label: "Invalid Phones",  value: validation.invalidPhones },
            { label: "Invalid Dates",   value: validation.invalidDates },
            { label: "Invalid URLs",    value: validation.invalidUrls },
          ].map(v => (
            <div key={v.label} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
              <span className="text-gray-600 text-xs">{v.label}</span>
              <span className={cn("font-semibold text-sm", v.value > 0 ? "text-amber-600" : "text-green-600")}>
                {v.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
          <p className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Recommendations
          </p>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DataQualityPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [reportScanId, setReportScanId] = useState<string | undefined>();
  const [selectedScanId, setSelectedScanId] = useState<string | undefined>();
  const [scanModuleId, setScanModuleId] = useState("");
  const [modules, setModules] = useState<Array<{ id: string; name: string }>>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await api.get("/data-quality/dashboard");
      setDashboard(data);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    loadDashboard();
    api.get("/modules").then(r => setModules(r.data ?? [])).catch(() => {});
  }, [loadDashboard]);

  const runScan = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const body = scanModuleId ? { moduleId: scanModuleId } : {};
      const { data: scan } = await api.post("/data-quality/scan", body);
      const modName = scanModuleId ? modules.find(m => m.id === scanModuleId)?.name : undefined;
      setScanMsg(modName ? `Scanning ${modName} — results will appear when complete.` : "Scan started — results will appear when complete.");
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const { data: s } = await api.get(`/data-quality/scans/${scan.id}`);
          if (s.status === "COMPLETED" || s.status === "FAILED") {
            clearInterval(poll);
            setScanning(false);
            if (s.status === "COMPLETED") {
              const issueCount = (s.summary as any)?.totalIssues ?? 0;
              setScanMsg(`Scan complete — ${issueCount} issues found.`);
              // Scope Issues/Report tabs to this scan (in case the user navigates
              // there manually) but stay on the Dashboard to show the fresh score.
              setSelectedScanId(scan.id);
              setReportScanId(scan.id);
            } else {
              setScanMsg("Scan failed. Please try again.");
            }
            loadDashboard();
            setTimeout(() => setScanMsg(null), 5000);
          }
        } catch { clearInterval(poll); setScanning(false); }
      }, 2000);
    } catch {
      setScanning(false);
      setScanMsg("Failed to start scan.");
    }
  };

  const handleSelectScan = (id: string) => {
    setReportScanId(id);
    setSelectedScanId(id);
    setTab("report");
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "dashboard", label: "Dashboard",     icon: BarChart3    },
    { id: "issues",    label: "Issues",         icon: AlertTriangle },
    { id: "history",   label: "Scan History",   icon: Clock        },
    { id: "report",    label: "Report",         icon: FileText     },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900">Data Quality</h1>
          <p className="text-xs text-gray-400">
            Detect duplicates, missing fields, and data inconsistencies across all modules.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/settings/data-quality">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> Configure
            </Button>
          </Link>
          {modules.length > 0 && (
            <select
              value={scanModuleId}
              onChange={e => setScanModuleId(e.target.value)}
              disabled={scanning}
              className="h-8 px-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-blue-400 max-w-[148px] disabled:opacity-50"
            >
              <option value="">All modules</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            onClick={runScan}
            disabled={scanning}
            className="h-8 px-3 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {scanning
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…</>
              : <><Play className="w-3.5 h-3.5" /> {scanModuleId ? "Scan Module" : "Scan All"}</>}
          </Button>
        </div>
      </div>

      {/* Scan status banner */}
      {scanMsg && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-2 shrink-0">
          <Info className="w-4 h-4 shrink-0" />
          {scanMsg}
          <button onClick={() => setScanMsg(null)} className="ml-auto text-blue-400 hover:text-blue-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 border-b border-gray-100 bg-white shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "dashboard" && (
          <DashboardTab data={dashboard} onRunScan={runScan} scanning={scanning} />
        )}
        {tab === "issues" && (
          <div className="space-y-3">
            {selectedScanId && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                Showing issues from the selected scan only.
                <button
                  onClick={() => setSelectedScanId(undefined)}
                  className="ml-auto flex items-center gap-1 text-blue-500 hover:text-blue-700 font-medium"
                >
                  <X className="w-3 h-3" /> Show all issues
                </button>
              </div>
            )}
            <IssuesTab scanId={selectedScanId} onRefresh={loadDashboard} />
          </div>
        )}
        {tab === "history" && (
          <HistoryTab onSelectScan={handleSelectScan} />
        )}
        {tab === "report" && (
          <ReportTab scanId={reportScanId} />
        )}
      </div>
    </div>
  );
}
