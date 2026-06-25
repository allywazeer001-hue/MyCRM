"use client";
import { useEffect, useState, useCallback } from "react";
import { portalApi } from "@/lib/portal-api";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  Loader2, Shield, ShieldOff, CheckCircle, XCircle,
  Users, Crown, Trash2, RotateCcw, AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED" | "PENDING_ACTIVATION" | "DISABLED";
type StatusFilter = "ALL" | AccountStatus;

interface PortalUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountStatus: AccountStatus;
  portalRole?: string;
  isPortalAdmin?: boolean;
}

interface StatusCounts {
  ACTIVE: number;
  SUSPENDED: number;
  DELETED: number;
  PENDING_ACTIVATION: number;
  total: number;
}

// ─── Status badge config ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { cls: string; label: string; strikethrough?: boolean }> = {
  ACTIVE:             { cls: "bg-green-100 text-green-700 border border-green-200",    label: "Active" },
  PENDING_ACTIVATION: { cls: "bg-blue-100 text-blue-700 border border-blue-200",       label: "Pending" },
  SUSPENDED:          { cls: "bg-amber-100 text-amber-700 border border-amber-200",    label: "Suspended" },
  DELETED:            { cls: "bg-red-100 text-red-600 border border-red-200",          label: "Deleted", strikethrough: true },
  DISABLED:           { cls: "bg-gray-100 text-gray-500 border border-gray-200",       label: "Disabled" },
};

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-yellow-100 text-yellow-700",
  admin:       "bg-violet-100 text-violet-700",
  user:        "bg-gray-100 text-gray-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.DISABLED;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "super_admin") return (
    <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${ROLE_STYLES.super_admin}`}>
      <Crown className="w-3 h-3" />Super Admin
    </span>
  );
  if (role === "admin") return (
    <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${ROLE_STYLES.admin}`}>
      <Shield className="w-3 h-3" />Admin
    </span>
  );
  return null;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// ─── Confirmation Dialog ───────────────────────────────────────────────────────

interface ConfirmDeleteDialogProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmDeleteDialog({ userName, onConfirm, onCancel, loading }: ConfirmDeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete portal account?</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete{" "}
              <span className="text-gray-900 font-medium">{userName}</span>{"'s"} portal account?
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          This will immediately revoke their access. The account can be restored later.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Tab Bar ────────────────────────────────────────────────────────────

interface FilterTabsProps {
  active: StatusFilter;
  counts: StatusCounts | null;
  onChange: (f: StatusFilter) => void;
}

function FilterTabs({ active, counts, onChange }: FilterTabsProps) {
  const tabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "ALL",       label: "All",       count: counts?.total },
    { key: "ACTIVE",    label: "Active",    count: counts?.ACTIVE },
    { key: "SUSPENDED", label: "Suspended", count: counts?.SUSPENDED },
    { key: "DELETED",   label: "Deleted",   count: counts?.DELETED },
  ];

  return (
    <div className="overflow-x-auto"><div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
              active === tab.key ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-500"
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div></div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortalUsersAdminPage() {
  const currentUser = usePortalAuthStore(s => s.user);
  const isSuperAdmin = currentUser?.portalRole === "SUPER_ADMIN" ||
                       currentUser?.portalRole === "super_admin";

  const [users, setUsers]               = useState<PortalUser[]>([]);
  const [counts, setCounts]             = useState<StatusCounts | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState<string | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<PortalUser | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Fetch counts ──
  const fetchCounts = useCallback(async () => {
    try {
      const r = await portalApi.get("/portal/padmin/users/counts");
      setCounts(r.data);
    } catch {}
  }, []);

  // ── Fetch users (with optional status filter) ──
  const fetchUsers = useCallback(async (filter: StatusFilter) => {
    setLoading(true);
    try {
      const params = filter !== "ALL" ? `?status=${filter}` : "";
      const r = await portalApi.get(`/portal/padmin/users${params}`);
      setUsers(r.data?.users ?? r.data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchUsers("ALL");
  }, [fetchCounts, fetchUsers]);

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    fetchUsers(filter);
  };

  // ── Role update ──
  const updateRole = async (user: PortalUser, portalRole: string) => {
    setUpdating(user.id);
    setRoleDropdown(null);
    try {
      await portalApi.patch(`/portal/padmin/users/${user.id}/role`, { portalRole });
      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, portalRole, isPortalAdmin: ["admin", "super_admin"].includes(portalRole) }
          : u
      ));
    } catch {}
    setUpdating(null);
  };

  // ── Status update (suspend / activate) ──
  const updateStatus = async (user: PortalUser, accountStatus: string) => {
    setUpdating(user.id);
    try {
      await portalApi.patch(`/portal/padmin/users/${user.id}/status`, { accountStatus });
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, accountStatus: accountStatus as AccountStatus } : u
      ));
      await fetchCounts();
    } catch {}
    setUpdating(null);
  };

  // ── Restore deleted user ──
  const restoreUser = async (user: PortalUser) => {
    setUpdating(user.id);
    try {
      await portalApi.post(`/portal/padmin/users/${user.id}/restore`, {});
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, accountStatus: "ACTIVE" as AccountStatus } : u
      ));
      await fetchCounts();
      // If filter is DELETED, remove from list
      if (statusFilter === "DELETED") {
        setUsers(prev => prev.filter(u => u.id !== user.id));
      }
    } catch {}
    setUpdating(null);
  };

  // ── Delete user ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await portalApi.delete(`/portal/padmin/users/${deleteTarget.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      await fetchCounts();
      setDeleteTarget(null);
    } catch {}
    setDeleting(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {deleteTarget && (
        <ConfirmDeleteDialog
          userName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <div className="space-y-5 max-w-5xl mx-auto" onClick={() => setRoleDropdown(null)}>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Users className="w-5 h-5 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Portal Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage portal user accounts, roles, and access.</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <FilterTabs active={statusFilter} counts={counts} onChange={handleFilterChange} />

        {/* User List */}
        <div className="overflow-x-auto"><div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              No portal users found{statusFilter !== "ALL" ? ` with status "${statusFilter}"` : ""}.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((user) => {
                const role = user.portalRole ?? "user";
                const isDeleted = user.accountStatus === "DELETED";

                return (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      isDeleted ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700"
                    }`}>
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${isDeleted ? "text-gray-400 line-through" : "text-gray-900"}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        {!isDeleted && <RoleBadge role={role} />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Status badge */}
                    <StatusBadge status={user.accountStatus} />

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>

                      {/* Role selector — only for non-deleted users */}
                      {!isDeleted && (
                        <div className="relative">
                          <button
                            onClick={() => setRoleDropdown(roleDropdown === user.id ? null : user.id)}
                            disabled={updating === user.id}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              role === "super_admin" ? "text-yellow-600 hover:bg-yellow-50" :
                              role === "admin"       ? "text-violet-600 hover:bg-violet-50" :
                              "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            }`}
                            title="Change role"
                          >
                            {updating === user.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : role === "super_admin" ? <Crown className="w-4 h-4" />
                              : role === "admin"       ? <Shield className="w-4 h-4" />
                              : <ShieldOff className="w-4 h-4" />
                            }
                          </button>

                          {roleDropdown === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                              {[
                                { value: "user",        label: "User",        icon: ShieldOff },
                                { value: "admin",       label: "Admin",       icon: Shield },
                                { value: "super_admin", label: "Super Admin", icon: Crown },
                              ].map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  onClick={() => updateRole(user, value)}
                                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                                    role === value ? "text-gray-900 font-medium" : "text-gray-500"
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  {label}
                                  {role === value && <CheckIcon className="w-3.5 h-3.5 ml-auto text-violet-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Suspend button — ACTIVE users */}
                      {user.accountStatus === "ACTIVE" && (
                        <button
                          onClick={() => updateStatus(user, "SUSPENDED")}
                          disabled={updating === user.id}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Suspend"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Activate button — SUSPENDED or PENDING_ACTIVATION users */}
                      {(user.accountStatus === "SUSPENDED" || user.accountStatus === "PENDING_ACTIVATION") && (
                        <button
                          onClick={() => updateStatus(user, "ACTIVE")}
                          disabled={updating === user.id}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Activate"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Restore button — DELETED users (Super Admin only) */}
                      {user.accountStatus === "DELETED" && isSuperAdmin && (
                        <button
                          onClick={() => restoreUser(user)}
                          disabled={updating === user.id}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Restore account"
                        >
                          {updating === user.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RotateCcw className="w-4 h-4" />
                          }
                        </button>
                      )}

                      {/* Delete button — ACTIVE or SUSPENDED users (Super Admin only) */}
                      {(user.accountStatus === "ACTIVE" || user.accountStatus === "SUSPENDED") && isSuperAdmin && (
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={updating === user.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div></div>
      </div>
    </>
  );
}
