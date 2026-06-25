"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Plus, Search, Building2, Users, Database, FileText,
  Workflow, GitBranch, MoreVertical, CheckCircle2, AlertCircle,
  PauseCircle, XCircle, Loader2, RefreshCw, Eye, Settings2,
  Hash, Calendar, ChevronDown, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Org {
  id: string; name: string; slug: string; code?: string;
  description?: string; logo?: string; website?: string;
  status: string; isActive: boolean; createdAt: string;
  _count?: {
    users: number; modules: number; records: number;
    forms: number; workflows: number; blueprints: number; portalUsers: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
    ACTIVE:    { label: "Active",    icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700" },
    SUSPENDED: { label: "Suspended", icon: PauseCircle,  cls: "bg-amber-100 text-amber-700"    },
    INACTIVE:  { label: "Inactive",  icon: XCircle,      cls: "bg-slate-100 text-slate-500"    },
  };
  const s = map[status] || map.ACTIVE;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", s.cls)}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function OrgInitials({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-cyan-500", "bg-indigo-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0", color)}>
      {initials}
    </div>
  );
}

// ── Delete confirmation dialog ─────────────────────────────────────────────────

function OrgDeleteDialog({
  org,
  onConfirm,
  onClose,
}: {
  org: Org | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (org) setTyped("");
  }, [org]);

  if (!org) return null;

  const confirmed = typed.trim() === org.name;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-red-900">Delete Organization Permanently</h2>
            <p className="text-xs text-red-700 mt-0.5">
              This removes <strong>all data</strong> — users, records, modules, forms, and more. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">
            You are about to permanently delete <strong>{org.name}</strong>.
            {org._count && (
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "Users",   val: org._count.users   },
                  { label: "Modules", val: org._count.modules },
                  { label: "Records", val: org._count.records },
                  { label: "Forms",   val: org._count.forms   },
                ].map(({ label, val }) => (
                  <span key={label} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-600">
                    {val.toLocaleString()} {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-slate-600">
              Type <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{org.name}</span> to confirm:
            </p>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={org.name}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!confirmed || deleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                : <><Trash2 className="w-3.5 h-3.5" /> Delete Everything</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Org card ───────────────────────────────────────────────────────────────────

function OrgCard({ org, myOrgId, onAction }: { org: Org; myOrgId: string; onAction: (id: string, action: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const counts = org._count;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <OrgInitials name={org.name} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 text-sm truncate">{org.name}</h3>
              {org.code && (
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {org.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">/{org.slug}</p>
            {org.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{org.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusChip status={org.status || "ACTIVE"} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-xl w-44 py-1 overflow-hidden">
                  {org.status !== "ACTIVE" && (
                    <button onClick={() => { onAction(org.id, "activate"); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Activate
                    </button>
                  )}
                  {org.status === "ACTIVE" && (
                    <button onClick={() => { onAction(org.id, "suspend"); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                      <PauseCircle className="w-4 h-4" /> Suspend
                    </button>
                  )}
                  <button onClick={() => { onAction(org.id, "deactivate"); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Deactivate
                  </button>
                  {org.id !== myOrgId && (
                    <>
                      <div className="mx-2 my-1 border-t border-slate-100" />
                      <button onClick={() => { onAction(org.id, "delete"); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 font-semibold">
                        <Trash2 className="w-4 h-4" /> Delete Permanently
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {counts && (
        <div className="px-5 pb-4 grid grid-cols-4 gap-2">
          {[
            { icon: Users,     val: counts.users,    label: "Users"    },
            { icon: Database,  val: counts.modules,  label: "Modules"  },
            { icon: FileText,  val: counts.records,  label: "Records"  },
            { icon: GitBranch, val: counts.blueprints, label: "BPs"    },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <p className="text-sm font-bold text-slate-800">{val.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 pb-4 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {new Date(org.createdAt).toLocaleDateString()}
        </span>
        {org.website && (
          <a href={org.website} target="_blank" rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors truncate max-w-[140px]">
            {org.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Create org modal ───────────────────────────────────────────────────────────

function CreateOrgModal({ onClose, onCreate }: { onClose: () => void; onCreate: (org: Org) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", code: "", description: "",
    website: "", phone: "", address: "",
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const set = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !prev.slug) next.slug = autoSlug(value);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { setError("Name and slug are required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/organizations", {
        name: form.name.trim(),
        slug: form.slug.trim(),
        code: form.code.trim().toUpperCase() || undefined,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      onCreate(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create organization.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">New Organization</h2>
              <p className="text-xs text-slate-500">Create a new tenant organization</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Mo Dewji Foundation"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Slug <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-slate-400">(URL identifier)</span>
              </Label>
              <Input
                value={form.slug}
                onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="mo-dewji-foundation"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Code
                <span className="ml-1 text-xs font-normal text-slate-400">(short ID)</span>
              </Label>
              <Input
                value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase().slice(0, 10))}
                placeholder="MODF"
                className="uppercase"
                maxLength={10}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Brief description…"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Website</Label>
              <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" type="url" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+255 …" type="tel" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Address</Label>
            <Textarea
              value={form.address}
              onChange={e => set("address", e.target.value)}
              placeholder="Physical address…"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create Organization</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PlatformPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const toast = useToast();

  // Redirect non-super-admins
  if (user && user.role !== "SUPER_ADMIN") {
    router.replace("/dashboard");
    return null;
  }

  const myOrgId = (user as any)?.organizationId ?? "";

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "INACTIVE">("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/organizations");
      setOrgs(res.data || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, action: string) => {
    if (action === "delete") {
      const org = orgs.find(o => o.id === id);
      if (org) setDeleteTarget(org);
      return;
    }
    setActionLoading(id);
    try {
      if (action === "suspend")    await api.patch(`/organizations/${id}/suspend`);
      if (action === "activate")   await api.patch(`/organizations/${id}/activate`);
      if (action === "deactivate") await api.delete(`/organizations/${id}`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally { setActionLoading(null); }
  };

  const handleHardDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/organizations/${deleteTarget.id}/permanent`);
    setOrgs(prev => prev.filter(o => o.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.name}" permanently deleted`);
  };

  const filtered = orgs.filter(o => {
    if (filter !== "ALL" && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.name.toLowerCase().includes(q) || o.slug.includes(q) || (o.code || "").toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    total:     orgs.length,
    active:    orgs.filter(o => o.status === "ACTIVE").length,
    suspended: orgs.filter(o => o.status === "SUSPENDED").length,
    inactive:  orgs.filter(o => o.status === "INACTIVE").length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Platform — Organizations</h1>
          </div>
          <p className="text-sm text-slate-500 ml-9">
            Manage all tenant organizations on the Cloudbox platform
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Organization
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total,     cls: "bg-blue-600",    active: filter === "ALL" },
          { label: "Active", value: counts.active,   cls: "bg-emerald-500", active: filter === "ACTIVE" },
          { label: "Suspended", value: counts.suspended, cls: "bg-amber-500", active: filter === "SUSPENDED" },
          { label: "Inactive", value: counts.inactive,   cls: "bg-slate-400", active: filter === "INACTIVE" },
        ].map(({ label, value, cls, active }) => (
          <button
            key={label}
            onClick={() => setFilter(label === "Total" ? "ALL" : label.toUpperCase() as any)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              active
                ? "bg-white border-blue-300 shadow-sm ring-1 ring-blue-200"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn("w-2 h-2 rounded-full", cls)} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search organizations by name, slug, or code…"
          className="pl-9"
        />
      </div>

      {/* Org grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">
            {search ? "No organizations match your search" : "No organizations yet"}
          </p>
          {!search && (
            <Button onClick={() => setShowCreate(true)} variant="outline" className="mt-3 gap-2">
              <Plus className="w-4 h-4" /> Create first organization
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(org => (
            <OrgCard
              key={org.id}
              org={org}
              myOrgId={myOrgId}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateOrgModal
          onClose={() => setShowCreate(false)}
          onCreate={org => setOrgs(prev => [org, ...prev])}
        />
      )}

      <OrgDeleteDialog
        org={deleteTarget}
        onConfirm={handleHardDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
