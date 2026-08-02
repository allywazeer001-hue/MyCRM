"use client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ModuleIcon } from "@/components/ui/module-icon";
import { cn } from "@/lib/utils";
import { PORTAL_APPEARANCES, getStoredAppearance, setStoredAppearance, AppearanceId, BRAND } from "@/lib/core-brand";
import {
  Loader2, Settings2, CheckCircle, XCircle, AlertCircle, ChevronRight, ToggleLeft, ToggleRight,
  Users, Shield, Crown, ShieldOff, RefreshCw, Plus, Mail, Search, Trash2, RotateCcw,
  AlertTriangle, X, Palette, LayoutGrid,
} from "lucide-react";

// ── Shared tab shell ────────────────────────────────────────────────────────
// Portal Settings, Portal Users, and Portal Appearance used to be separate
// nav links; they're consolidated here as tabs of one page since they're all
// "everything about the portal" from the user's point of view.

type TabKey = "modules" | "users" | "appearance";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "modules",    label: "Modules",    icon: LayoutGrid },
  { key: "users",      label: "Users",      icon: Users },
  { key: "appearance", label: "Appearance", icon: Palette },
];

function PortalSettingsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(tabParam && TABS.some(t => t.key === tabParam) ? tabParam : "modules");

  const changeTab = (key: TabKey) => {
    setTab(key);
    router.replace(key === "modules" ? "/settings/portal" : `/settings/portal?tab=${key}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portal Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect CRM modules to the portal, manage portal user accounts, and choose the portal's appearance — all in one place.
        </p>
      </div>

      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "modules" && <ModulesTab />}
      {tab === "users" && <UsersTab />}
      {tab === "appearance" && <AppearanceTab />}
    </div>
  );
}

export default function PortalSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <PortalSettingsShell />
    </Suspense>
  );
}

// ── Modules tab ──────────────────────────────────────────────────────────────

interface ModuleRow {
  module: { id: string; name: string; slug: string; icon?: string; color?: string };
  config: {
    id: string; portalLabel: string; portalType: string; isEnabled: boolean;
    fieldMappings?: any[];
  } | null;
  isEnabled: boolean;
  mappingCount: number;
}

const PORTAL_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "academic", label: "Academic" },
  { value: "medical",  label: "Medical / Healthcare" },
  { value: "hr",       label: "HR / Employees" },
  { value: "crm",      label: "CRM / Clients" },
  { value: "vendor",   label: "Vendors" },
  { value: "member",   label: "Members" },
];

function ModulesTab() {
  const router = useRouter();
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    api.get("/portal/admin/module-configs")
      .then(r => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (moduleId: string, current: boolean) => {
    setToggling(moduleId);
    try {
      const { data } = await api.patch(`/portal/admin/module-configs/${moduleId}`, {
        isEnabled: !current,
      });
      setRows(prev => prev.map(r =>
        r.module.id === moduleId
          ? { ...r, isEnabled: data.isEnabled, config: data }
          : r
      ));
    } catch {}
    setToggling(null);
  };

  const enabledCount = rows.filter(r => r.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Settings2 className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{rows.length}</p>
            <p className="text-xs text-gray-500">Total modules</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-4.5 h-4.5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{enabledCount}</p>
            <p className="text-xs text-gray-500">Portal enabled</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">
              {rows.filter(r => r.isEnabled && r.mappingCount === 0).length}
            </p>
            <p className="text-xs text-gray-500">Need field mapping</p>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Associated Portal Modules</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">No modules found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rows.map(({ module, config, isEnabled, mappingCount }) => {
              const portalTypeLabel = PORTAL_TYPES.find(t => t.value === config?.portalType)?.label ?? "Standard";
              const isTogglingThis = toggling === module.id;

              return (
                <div
                  key={module.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${isEnabled ? "bg-white" : "bg-gray-50/50"}`}
                >
                  {/* Module icon + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: module.color ? module.color + "20" : "#f3f4f6" }}
                    >
                      <ModuleIcon icon={module.icon} slug={module.slug} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{module.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {isEnabled ? (config?.portalLabel || `${module.name} Portal`) : "Portal disabled"}
                        {isEnabled && config?.portalType && ` · ${portalTypeLabel}`}
                      </p>
                    </div>
                  </div>

                  {/* Mapping status */}
                  <div className="shrink-0 hidden sm:block">
                    {!isEnabled ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : mappingCount === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> No mappings
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> {mappingCount} field{mappingCount !== 1 ? "s" : ""} mapped
                      </span>
                    )}
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => toggle(module.id, isEnabled)}
                    disabled={!!toggling}
                    className="shrink-0 transition-opacity disabled:opacity-50"
                    title={isEnabled ? "Disable portal" : "Enable portal"}
                  >
                    {isTogglingThis ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : isEnabled ? (
                      <ToggleRight className="w-8 h-8 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-300" />
                    )}
                  </button>

                  {/* Configure button */}
                  <button
                    onClick={() => router.push(`/settings/portal/${module.id}`)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                  >
                    Configure
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How Portal Association works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
          <li>Enable a module for portal access using the toggle above</li>
          <li>Click <strong>Configure</strong> to set the portal label, type, and map CRM fields to portal identity fields</li>
          <li>Open any record in that module and use <strong>Create Portal User</strong> from the actions menu</li>
          <li>The portal user can log in and view their linked record data</li>
        </ol>
      </div>
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:             "bg-green-100 text-green-700 border-green-200",
  PENDING_ACTIVATION: "bg-amber-100 text-amber-700 border-amber-200",
  SUSPENDED:          "bg-orange-100 text-orange-700 border-orange-200",
  DELETED:            "bg-red-100 text-red-600 border-red-200",
  DISABLED:           "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:             "Active",
  PENDING_ACTIVATION: "Pending",
  SUSPENDED:          "Suspended",
  DELETED:            "Deleted",
  DISABLED:           "Disabled",
};

const ROLE_OPTIONS = [
  { value: "user",        label: "User",         description: "Normal portal access only",                      icon: ShieldOff, color: "text-gray-500" },
  { value: "admin",       label: "Portal Admin", description: "Can manage fields, sections, pages, menus",      icon: Shield,    color: "text-violet-600" },
  { value: "super_admin", label: "Super Admin",  description: "Full portal builder + user management",          icon: Crown,     color: "text-yellow-600" },
];

type FilterTab = "ALL" | "ACTIVE" | "SUSPENDED" | "DELETED";

function RoleIcon({ role }: { role: string }) {
  if (role === "super_admin") return <Crown className="w-4 h-4 text-yellow-500" />;
  if (role === "admin")       return <Shield className="w-4 h-4 text-violet-500" />;
  return null;
}

function ConfirmDeleteDialog({
  user, onConfirm, onCancel,
}: {
  user: any;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete Portal Account</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong>&apos;s portal account?
            </p>
            <p className="text-xs text-gray-400 mt-2">
              This will immediately revoke their access. The account can be restored later by a Super Admin.
              All submitted forms and history will be preserved.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [roleMenu, setRoleMenu]     = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", firstName: "", lastName: "", phone: "" });
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState("");
  const [search, setSearch]         = useState("");
  const [activeTab, setActiveTab]   = useState<FilterTab>("ALL");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [permDeleteTarget, setPermDeleteTarget] = useState<any | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    // Load ALL users including deleted so filters work client-side
    api.get("/portal/admin/users")
      .then(r => setUsers(r.data?.users ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    ALL:       users.filter(u => u.accountStatus !== "DELETED").length,
    ACTIVE:    users.filter(u => u.accountStatus === "ACTIVE").length,
    SUSPENDED: users.filter(u => u.accountStatus === "SUSPENDED").length,
    DELETED:   users.filter(u => u.accountStatus === "DELETED").length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (activeTab === "ALL") list = list.filter(u => u.accountStatus !== "DELETED");
    else list = list.filter(u => u.accountStatus === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, activeTab, search]);

  const setRole = async (userId: string, portalRole: string) => {
    setUpdating(userId);
    setRoleMenu(null);
    try {
      await api.patch(`/portal/admin/users/${userId}/role`, { portalRole });
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, portalRole, isPortalAdmin: ["admin", "super_admin"].includes(portalRole) }
          : u
      ));
    } catch {}
    setUpdating(null);
  };

  const setStatus = async (userId: string, status: string) => {
    setUpdating(userId);
    try {
      await api.patch(`/portal/admin/users/${userId}/status`, { status });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, accountStatus: status } : u));
    } catch {}
    setUpdating(null);
  };

  const resetUser = async (userId: string) => {
    if (!confirm("Reset this user to first-login state? Their password will be reset to their last name.")) return;
    setUpdating(userId);
    try {
      await api.post(`/portal/admin/users/${userId}/reset`);
      load();
    } catch {}
    setUpdating(null);
  };

  const softDelete = async (user: any) => {
    setDeleting(true);
    try {
      try {
        await api.delete(`/portal/padmin/users/${user.id}`);
      } catch {
        await api.patch(`/portal/admin/users/${user.id}/status`, { status: "DELETED" });
      }
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, accountStatus: "DELETED", isActive: false } : u
      ));
    } catch {}
    setDeleting(false);
    setDeleteTarget(null);
  };

  const permanentDelete = async (user: any) => {
    setPermDeleting(true);
    try {
      await api.delete(`/portal/padmin/users/${user.id}/permanent`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch {}
    setPermDeleting(false);
    setPermDeleteTarget(null);
  };

  const restoreUser = async (userId: string) => {
    setUpdating(userId);
    try {
      try {
        await api.post(`/portal/padmin/users/${userId}/restore`);
      } catch {
        await api.patch(`/portal/admin/users/${userId}/status`, { status: "ACTIVE" });
      }
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, accountStatus: "ACTIVE", isActive: true } : u
      ));
    } catch {}
    setUpdating(null);
  };

  const createUser = async () => {
    if (!createForm.email || !createForm.firstName || !createForm.lastName) {
      setCreateError("Email, first name, and last name are required");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      await api.post("/portal/admin/users", createForm);
      setShowCreate(false);
      setCreateForm({ email: "", firstName: "", lastName: "", phone: "" });
      load();
    } catch (e: any) {
      setCreateError(e?.response?.data?.message ?? "Failed to create user");
    }
    setCreating(false);
  };

  const FILTER_TABS: { key: FilterTab; label: string; color: string }[] = [
    { key: "ALL",       label: "All",       color: "text-gray-600" },
    { key: "ACTIVE",    label: "Active",    color: "text-green-600" },
    { key: "SUSPENDED", label: "Suspended", color: "text-orange-600" },
    { key: "DELETED",   label: "Deleted",   color: "text-red-600" },
  ];

  return (
    <div className="space-y-6" onClick={() => setRoleMenu(null)}>

      {deleteTarget && (
        <ConfirmDeleteDialog
          user={deleteTarget}
          onConfirm={() => softDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {permDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Permanently Delete Account</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Permanently delete <strong>{permDeleteTarget.firstName} {permDeleteTarget.lastName}</strong>&apos;s account?
                </p>
                <p className="text-xs text-red-600 font-medium mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ⚠️ This cannot be undone. The account will be removed from the system permanently.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setPermDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => permanentDelete(permDeleteTarget)} disabled={permDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg disabled:opacity-60">
                {permDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Portal User
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Create Portal User</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Default password will be the user&apos;s last name. They will be prompted to change it on first login.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
              <input type="email" value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
              <input value={createForm.phone}
                onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 0100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name *</label>
              <input value={createForm.firstName}
                onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name *</label>
              <input value={createForm.lastName}
                onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={createUser} disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create User
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
          {FILTER_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.key
                  ? "bg-white shadow-sm " + t.color
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === t.key ? "bg-gray-100" : "bg-gray-200 text-gray-500"
              }`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Users className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {search ? `No users match "${search}"` : "No users in this category."}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="text-sm text-indigo-600 hover:text-indigo-700">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center px-5 py-2.5 border-b border-gray-100 bg-gray-50 gap-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-10" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">User</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right pr-1">
                {filtered.length} of {users.length}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {filtered.map((user: any) => {
                const role = user.portalRole ?? "user";
                const isDeleted = user.accountStatus === "DELETED";

                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${isDeleted ? "bg-red-50/40" : "hover:bg-gray-50/60"}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      isDeleted ? "bg-gray-100 text-gray-400" : "bg-indigo-100 text-indigo-700"
                    }`}>
                      <span className={isDeleted ? "line-through opacity-50" : ""}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${isDeleted ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        {!isDeleted && <RoleIcon role={role} />}
                        {role === "super_admin" && !isDeleted && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
                        )}
                        {role === "admin" && !isDeleted && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Portal Admin</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <p className={`text-xs truncate ${isDeleted ? "text-gray-400" : "text-gray-500"}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${
                      STATUS_COLORS[user.accountStatus] ?? STATUS_COLORS.DISABLED
                    }`}>
                      {STATUS_LABELS[user.accountStatus] ?? user.accountStatus}
                    </span>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {isDeleted ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => restoreUser(user.id)}
                            disabled={updating === user.id}
                            title="Restore account"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {updating === user.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <RotateCcw className="w-3.5 h-3.5" />}
                            Restore
                          </button>
                          <button
                            onClick={() => setPermDeleteTarget(user)}
                            title="Delete forever"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Forever
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <button
                              onClick={() => setRoleMenu(roleMenu === user.id ? null : user.id)}
                              disabled={updating === user.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                            >
                              {updating === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RoleIcon role={role} />}
                              {ROLE_OPTIONS.find(r => r.value === role)?.label ?? "User"}
                              <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {roleMenu === user.id && (
                              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl z-[200]">
                                {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, color }) => (
                                  <button key={value} onClick={() => setRole(user.id, value)}
                                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${role === value ? "bg-indigo-50" : ""}`}>
                                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                                    <div>
                                      <p className={`text-sm font-medium ${role === value ? "text-indigo-700" : "text-gray-800"}`}>{label}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {user.accountStatus === "ACTIVE" ? (
                            <button onClick={() => setStatus(user.id, "SUSPENDED")} disabled={updating === user.id}
                              title="Suspend user"
                              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50">
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => setStatus(user.id, "ACTIVE")} disabled={updating === user.id}
                              title="Activate user"
                              className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button onClick={() => resetUser(user.id)} disabled={updating === user.id}
                            title="Reset password to last name"
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50">
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(user)}
                            disabled={updating === user.id}
                            title="Delete account"
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Appearance tab ────────────────────────────────────────────────────────────

function AppearanceTab() {
  const [activeAppearance, setActiveAppearance] = useState<AppearanceId>("professional-web");

  useEffect(() => { setActiveAppearance(getStoredAppearance()); }, []);

  const handleAppearanceChange = (id: AppearanceId) => {
    setActiveAppearance(id);
    setStoredAppearance(id);
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Choose how the {BRAND.name} portal looks and feels for your users.
        Selection is saved automatically and persists across sessions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PORTAL_APPEARANCES.map(appearance => {
          const active = activeAppearance === appearance.id;
          return (
            <button
              key={appearance.id}
              type="button"
              onClick={() => handleAppearanceChange(appearance.id)}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all bg-white",
                active ? "border-brand bg-brand/5 shadow-sm" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-semibold", active ? "text-brand" : "text-gray-800")}>
                  {appearance.name}
                </span>
                {active && (
                  <span className="text-xs px-2 py-0.5 bg-brand text-white rounded-full font-medium">Active</span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{appearance.description}</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize">{appearance.navStyle} nav</span>
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize">{appearance.layout}</span>
                <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize">{appearance.density}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
