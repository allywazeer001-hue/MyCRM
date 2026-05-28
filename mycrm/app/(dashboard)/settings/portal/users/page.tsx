"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Loader2, Users, Shield, Crown, ShieldOff, CheckCircle,
  XCircle, RefreshCw, Plus, Mail,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:             "bg-green-100 text-green-700",
  PENDING_ACTIVATION: "bg-amber-100 text-amber-700",
  SUSPENDED:          "bg-red-100 text-red-700",
  DISABLED:           "bg-gray-100 text-gray-500",
};

const ROLE_OPTIONS = [
  { value: "user",        label: "User",        description: "Normal portal access only", icon: ShieldOff, color: "text-gray-500" },
  { value: "admin",       label: "Portal Admin", description: "Can manage fields, sections, pages, menus", icon: Shield, color: "text-violet-600" },
  { value: "super_admin", label: "Super Admin",  description: "Full portal builder + user management", icon: Crown, color: "text-yellow-600" },
];

function RoleIcon({ role }: { role: string }) {
  if (role === "super_admin") return <Crown className="w-4 h-4 text-yellow-500" />;
  if (role === "admin")       return <Shield className="w-4 h-4 text-violet-500" />;
  return null;
}

export default function PortalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleMenu, setRoleMenu] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", firstName: "", lastName: "", phone: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/portal/admin/users")
      .then(r => setUsers(r.data?.users ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-6 max-w-4xl" onClick={() => setRoleMenu(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Portal Users</h1>
          </div>
          <p className="text-sm text-gray-500">
            Manage portal user accounts. Assign <strong>Portal Admin</strong> or <strong>Super Admin</strong> roles
            to allow users to access the portal builder at <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/portal/admin</code>.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Portal User
        </button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3">
        {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, color }) => (
          <div key={value} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm font-semibold text-gray-800">{label}</span>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Create Portal User</h2>
          <p className="text-xs text-gray-500">
            Default password will be the user's last name. They will be prompted to change it on first login.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
              <input
                value={createForm.phone}
                onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555 0100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name *</label>
              <input
                value={createForm.firstName}
                onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name *</label>
              <input
                value={createForm.lastName}
                onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={createUser}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create User
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Users className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">No portal users yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus className="w-4 h-4" />Create the first portal user
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-medium text-gray-500">{users.length} user{users.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {users.map((user: any) => {
                const role = user.portalRole ?? "user";
                return (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <RoleIcon role={role} />
                        {role === "super_admin" && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
                        )}
                        {role === "admin" && (
                          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Portal Admin</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[user.accountStatus] ?? STATUS_COLORS.DISABLED}`}>
                      {user.accountStatus?.replace("_", " ")}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {/* Role dropdown */}
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
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                            {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, color }) => (
                              <button
                                key={value}
                                onClick={() => setRole(user.id, value)}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${role === value ? "bg-indigo-50" : ""}`}
                              >
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

                      {/* Activate/Suspend */}
                      {user.accountStatus === "ACTIVE" ? (
                        <button
                          onClick={() => setStatus(user.id, "SUSPENDED")}
                          disabled={updating === user.id}
                          title="Suspend"
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      ) : user.accountStatus !== "DISABLED" ? (
                        <button
                          onClick={() => setStatus(user.id, "ACTIVE")}
                          disabled={updating === user.id}
                          title="Activate"
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : null}

                      {/* Reset password */}
                      <button
                        onClick={() => resetUser(user.id)}
                        disabled={updating === user.id}
                        title="Reset password to last name"
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* How-to note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">How Portal Admin Access Works</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal ml-4">
          <li>Create a portal user here (or they can self-register at <code className="bg-blue-100 px-1 rounded">/portal/register</code>)</li>
          <li>Use the role dropdown above to assign <strong>Portal Admin</strong> or <strong>Super Admin</strong></li>
          <li>The user logs in at <code className="bg-blue-100 px-1 rounded">/portal/login</code> with their email + last name as initial password</li>
          <li>They will be prompted to change their password on first login</li>
          <li>After login, they see an <strong>Admin Panel</strong> link in the portal sidebar → <code className="bg-blue-100 px-1 rounded">/portal/admin</code></li>
        </ol>
      </div>
    </div>
  );
}
