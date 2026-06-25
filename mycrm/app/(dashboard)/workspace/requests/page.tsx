"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Loader2, X, Clock, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDisplayName } from "@/lib/user";

interface RType { id: string; name: string; icon: string; color: string; }
interface Req {
  id: string; requestNumber: string; title: string; status: string; priority: string;
  currentStage: string | null;
  type: { id: string; name: string; icon: string; color: string };
  requester: { id: string; firstName: string; lastName: string; avatar: string | null };
  assignedUser: { id: string; firstName: string; lastName: string } | null;
  _count: { comments: number; attachments: number };
  createdAt: string; dueDate: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  OPEN:        { label: "Open",        color: "#3b82f6", icon: Circle },
  IN_PROGRESS: { label: "In Progress", color: "#f97316", icon: Clock },
  ON_HOLD:     { label: "On Hold",     color: "#eab308", icon: AlertCircle },
  COMPLETED:   { label: "Completed",   color: "#22c55e", icon: CheckCircle2 },
  REJECTED:    { label: "Rejected",    color: "#ef4444", icon: X },
  CANCELLED:   { label: "Cancelled",   color: "#6b7280", icon: X },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "#6b7280" },
  MEDIUM: { label: "Medium", color: "#3b82f6" },
  HIGH:   { label: "High",   color: "#f97316" },
  URGENT: { label: "Urgent", color: "#ef4444" },
};

function fmtDate(d: string) { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Req[]>([]);
  const [types, setTypes]       = useState<RType[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]     = useState("");

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (search)       params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (typeFilter)   params.typeId = typeFilter;
    api.get("/requests", { params }).then(r => setRequests(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get("/request-types").then(r => setTypes(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [search, statusFilter, typeFilter]); // eslint-disable-line

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold text-gray-900">All Requests</h1><p className="text-sm text-gray-500 mt-0.5">Track and manage all submitted requests</p></div>
        <Button onClick={() => router.push("/workspace/requests/new")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> New Request
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…" className="pl-9 h-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 border border-slate-200 rounded-md px-3 text-sm">
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 border border-slate-200 rounded-md px-3 text-sm">
          <option value="">All types</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-gray-500 font-medium">No requests found</p>
          <Button onClick={() => router.push("/workspace/requests/new")} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Submit First Request</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(r => {
                const sm = STATUS_META[r.status] ?? STATUS_META.OPEN;
                const pm = PRIORITY_META[r.priority] ?? PRIORITY_META.MEDIUM;
                const StatusIcon = sm.icon;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/workspace/requests/${r.id}`)}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{r.requestNumber}</span>
                          {r._count.comments > 0 && <span className="text-[10px] text-gray-400">{r._count.comments} comments</span>}
                        </div>
                        <p className="font-medium text-gray-900 mt-0.5 line-clamp-1">{r.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">by {getDisplayName(r.requester)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: r.type.color + '18', color: r.type.color }}>{r.type.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.currentStage ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sm.color + '18', color: sm.color }}>
                        <StatusIcon className="w-3 h-3" />{sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: pm.color }}>{pm.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {fmtDate(r.createdAt)}
                      {r.dueDate && <div className="text-amber-600">Due {fmtDate(r.dueDate)}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.assignedUser ? getDisplayName(r.assignedUser) : <span className="text-gray-300">Unassigned</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
