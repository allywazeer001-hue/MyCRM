"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Building2, Globe, Phone, MapPin, Save, CheckCircle2,
  AlertCircle, Users, Database, FileText, Workflow,
  BarChart3, GitBranch, Link2, ListTree, Building,
  Loader2, Shield, Hash, AtSign, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgStats {
  users: number; modules: number; records: number; forms: number;
  workflows: number; blueprints: number; portalUsers: number;
  globalLists: number; departments: number;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg border text-sm",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:    { label: "Active",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    SUSPENDED: { label: "Suspended", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    INACTIVE:  { label: "Inactive",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const s = map[status] || map.ACTIVE;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-400")} />
      {s.label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrganizationSettingsPage() {
  const { user, setUser } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [org, setOrg] = useState<any>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ fieldsAdded: number; relationshipsAdded: number; log: string[] } | null>(null);

  const form = useForm({
    defaultValues: {
      name: "", code: "", description: "",
      website: "", phone: "", address: "",
      emailDomain: "",
    },
  });

  useEffect(() => {
    Promise.all([
      api.get("/organizations/me"),
      api.get("/organizations/me/stats"),
    ]).then(([orgRes, statsRes]) => {
      const o = orgRes.data;
      setOrg(o);
      setStats(statsRes.data);
      form.reset({
        name:        o.name || "",
        code:        o.code || "",
        description: o.description || "",
        website:     o.website || "",
        phone:       o.phone || "",
        address:     o.address || "",
        emailDomain: (o.settings as any)?.emailDomain || "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const onSave = async (data: any) => {
    setSaving(true);
    setMsg(null);
    try {
      const { emailDomain, ...rest } = data;
      const existingSettings = (org?.settings as any) ?? {};
      const payload = {
        ...rest,
        settings: { ...existingSettings, emailDomain: emailDomain?.trim().toLowerCase() || null },
      };
      const updated = await api.patch("/organizations/me", payload);
      setOrg(updated.data);
      // Refresh user in auth store so topbar/sidebar reflect changes immediately
      const profileRes = await api.get("/auth/profile");
      setUser(profileRes.data);
      setMsg({ text: "Organization profile updated successfully.", type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.message || "Failed to save changes.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleBlueprintSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post("/industry-setup/sync");
      setSyncResult(data);
    } catch {
      setSyncResult({ fieldsAdded: 0, relationshipsAdded: 0, log: ["Sync failed — no blueprint installed, or server error."] });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const statItems = [
    { icon: Users,    label: "Active Users",     value: stats?.users        || 0, color: "bg-blue-100 text-blue-600"    },
    { icon: Database, label: "Modules",           value: stats?.modules      || 0, color: "bg-violet-100 text-violet-600" },
    { icon: FileText, label: "Records",           value: stats?.records      || 0, color: "bg-emerald-100 text-emerald-600" },
    { icon: ListTree, label: "Forms",             value: stats?.forms        || 0, color: "bg-orange-100 text-orange-600"  },
    { icon: Workflow, label: "Workflows",         value: stats?.workflows    || 0, color: "bg-cyan-100 text-cyan-600"     },
    { icon: GitBranch,label: "Blueprints",        value: stats?.blueprints   || 0, color: "bg-pink-100 text-pink-600"     },
    { icon: Globe,    label: "Portal Users",      value: stats?.portalUsers  || 0, color: "bg-teal-100 text-teal-600"     },
    { icon: Building, label: "Units",             value: stats?.departments  || 0, color: "bg-amber-100 text-amber-600"   },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your organization profile and settings</p>
        </div>
        {org?.status && <StatusBadge status={org.status} />}
      </div>

      {/* Stats */}
      {stats && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Usage Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map(s => (
              <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} />
            ))}
          </div>
        </section>
      )}

      {/* Profile form */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Organization Profile</h2>
            <p className="text-xs text-slate-500">Name, branding, and contact information</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSave)} className="px-6 py-5 space-y-5">
          {msg && <Toast msg={msg.text} type={msg.type} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...form.register("name", { required: true })}
                placeholder="Mo Dewji Foundation"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-sm font-medium text-slate-700">
                Organization Code
                <span className="ml-1 text-xs font-normal text-slate-400">(short identifier)</span>
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="code"
                  {...form.register("code")}
                  placeholder="MODF"
                  className="pl-9 uppercase"
                  maxLength={10}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Brief description of your organization…"
              rows={3}
              className="resize-none"
              disabled={!isAdmin}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-sm font-medium text-slate-700">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="website"
                  {...form.register("website")}
                  placeholder="https://example.org"
                  className="pl-9"
                  type="url"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+255 700 000 000"
                  className="pl-9"
                  type="tel"
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-sm font-medium text-slate-700">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Textarea
                id="address"
                {...form.register("address")}
                placeholder="Physical address…"
                rows={2}
                className="pl-9 resize-none"
                disabled={!isAdmin}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emailDomain" className="text-sm font-medium text-slate-700">
              Email Domain
              <span className="ml-1.5 text-xs font-normal text-slate-400">— used for @ autocomplete when adding users</span>
            </Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="emailDomain"
                {...form.register("emailDomain")}
                placeholder="modewjifoundation.org"
                className="pl-9"
                disabled={!isAdmin}
              />
            </div>
            <p className="text-xs text-slate-400">
              When set, typing <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-600">@</code> in email fields
              will suggest <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-600">@{form.watch("emailDomain") || "yourdomain.org"}</code>
            </p>
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
              </Button>
            </div>
          )}
        </form>
      </section>

      {/* Blueprint sync */}
      {isAdmin && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <GitBranch className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Blueprint Sync</h2>
                <p className="text-xs text-slate-500">Add missing fields and relationships from your installed blueprint</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBlueprintSync}
              disabled={syncing}
              className="gap-2 shrink-0"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? "Syncing…" : "Sync Now"}
            </Button>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-xs text-slate-500">
              Safe to run anytime — existing records and field configurations are never modified.
              Only new fields and relationship links that are missing are added.
            </p>
            {syncResult && (
              <div className={cn(
                "rounded-lg border p-3 text-xs space-y-1.5",
                syncResult.fieldsAdded > 0 || syncResult.relationshipsAdded > 0
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              )}>
                <p className="font-semibold">
                  {syncResult.fieldsAdded} field(s) added · {syncResult.relationshipsAdded} relationship(s) synced
                </p>
                <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                  {syncResult.log.map((line, i) => <li key={i} className="font-mono text-[11px]">{line}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* System info */}
      <section className="bg-slate-50 rounded-2xl border border-slate-200 px-6 py-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">System Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Organization ID</span>
            <code className="text-xs text-slate-700 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{org?.id}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Slug</span>
            <code className="text-xs text-slate-700 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{org?.slug}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Created</span>
            <span className="text-slate-700">{org?.createdAt ? new Date(org.createdAt).toLocaleDateString() : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Last Updated</span>
            <span className="text-slate-700">{org?.updatedAt ? new Date(org.updatedAt).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
