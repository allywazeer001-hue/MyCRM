"use client";
import { useEffect, useState } from "react";
import { portalApi } from "@/lib/portal-api";
import { Loader2, Shield, ShieldOff, CheckCircle, XCircle, Users, Crown } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:             "bg-green-900/30 text-green-400",
  PENDING_ACTIVATION: "bg-amber-900/30 text-amber-400",
  SUSPENDED:          "bg-red-900/30 text-red-400",
  DISABLED:           "bg-gray-800 text-gray-500",
};

const ROLE_STYLES: Record<string, string> = {
  super_admin: "bg-yellow-900/30 text-yellow-400",
  admin:       "bg-violet-900/30 text-violet-400",
  user:        "bg-gray-800 text-gray-500",
};

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

export default function PortalUsersAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

  useEffect(() => {
    portalApi.get("/portal/padmin/users")
      .then(r => setUsers(r.data?.users ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateRole = async (user: any, portalRole: string) => {
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

  const updateStatus = async (user: any, status: string) => {
    setUpdating(user.id);
    try {
      await portalApi.patch(`/portal/padmin/users/${user.id}/status`, { status });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, accountStatus: status } : u));
    } catch {}
    setUpdating(null);
  };

  return (
    <div className="space-y-5 max-w-4xl" onClick={() => setRoleDropdown(null)}>
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Portal Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage portal user accounts, roles, and access.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-600 text-sm">No portal users found.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {users.map((user: any) => {
              const role = user.portalRole ?? "user";
              return (
                <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300 shrink-0">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                      <RoleBadge role={role} />
                    </div>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[user.accountStatus] ?? STATUS_COLORS.DISABLED}`}>
                    {user.accountStatus?.replace("_", " ")}
                  </span>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Role selector */}
                    <div className="relative">
                      <button
                        onClick={() => setRoleDropdown(roleDropdown === user.id ? null : user.id)}
                        disabled={updating === user.id}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          role === "super_admin" ? "text-yellow-400 hover:bg-yellow-900/20" :
                          role === "admin"       ? "text-violet-400 hover:bg-violet-900/20" :
                          "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
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
                        <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                          {[
                            { value: "user",        label: "User",        icon: ShieldOff },
                            { value: "admin",       label: "Admin",       icon: Shield },
                            { value: "super_admin", label: "Super Admin", icon: Crown },
                          ].map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => updateRole(user, value)}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-gray-700 ${
                                role === value ? "text-white font-medium" : "text-gray-400"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              {label}
                              {role === value && <Check className="w-3.5 h-3.5 ml-auto text-violet-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Toggle active/suspended */}
                    {user.accountStatus === "ACTIVE" ? (
                      <button
                        onClick={() => updateStatus(user, "SUSPENDED")}
                        disabled={updating === user.id}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Suspend"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : user.accountStatus !== "DISABLED" ? (
                      <button
                        onClick={() => updateStatus(user, "ACTIVE")}
                        disabled={updating === user.id}
                        className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Activate"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
