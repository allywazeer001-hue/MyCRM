"use client";
/**
 * AccessControlEditor — reusable panel for setting "who can see" rules on a
 * dashboard or analytics view. Used by DashboardBuilder (AccessPanel) and the
 * analytics view share dialog.
 *
 * Access model: isPublic OR role ∈ sharedRoles OR dept ∈ sharedDepartments
 *               OR userId ∈ sharedUsers. Admins / creators always have access
 *               (enforced by the backend, not stored here).
 */
import { useEffect, useState } from "react";
import { Globe, Lock, Users, Building2, Shield, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"] as const;

interface Dept { id: string; name: string; }
interface User { id: string; firstName: string; lastName: string; email: string; }

export interface AccessRules {
  isPublic: boolean;
  sharedRoles: string[];
  sharedDepartments: string[];
  sharedUsers: string[];
}

interface Props extends AccessRules {
  onChange: (rules: AccessRules) => void;
}

export function AccessControlEditor({
  isPublic,
  sharedRoles,
  sharedDepartments,
  sharedUsers,
  onChange,
}: Props) {
  const [depts, setDepts]   = useState<Dept[]>([]);
  const [users, setUsers]   = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    api.get("/departments").then(r => setDepts(r.data ?? [])).catch(() => {});
    api.get("/users").then(r => setUsers(r.data ?? [])).catch(() => {});
  }, []);

  const emit = (patch: Partial<AccessRules>) =>
    onChange({ isPublic, sharedRoles, sharedDepartments, sharedUsers, ...patch });

  const toggleRole = (role: string) => {
    const next = sharedRoles.includes(role)
      ? sharedRoles.filter(r => r !== role)
      : [...sharedRoles, role];
    emit({ sharedRoles: next });
  };

  const toggleDept = (id: string) => {
    const next = sharedDepartments.includes(id)
      ? sharedDepartments.filter(d => d !== id)
      : [...sharedDepartments, id];
    emit({ sharedDepartments: next });
  };

  const toggleUser = (id: string) => {
    const next = sharedUsers.includes(id)
      ? sharedUsers.filter(u => u !== id)
      : [...sharedUsers, id];
    emit({ sharedUsers: next });
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q
      || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 text-sm">

      {/* Public toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => emit({ isPublic: !isPublic })}
          className={cn(
            "w-10 h-5 rounded-full transition-colors flex items-center shrink-0",
            isPublic ? "bg-brand" : "bg-gray-200"
          )}
        >
          <div className={cn(
            "w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5",
            isPublic ? "translate-x-5" : "translate-x-0"
          )} />
        </div>
        <div className="flex items-center gap-2">
          {isPublic ? <Globe className="w-4 h-4 text-brand" /> : <Lock className="w-4 h-4 text-gray-400" />}
          <div>
            <p className="font-medium text-gray-800">{isPublic ? "Everyone in organization" : "Restricted access"}</p>
            <p className="text-xs text-gray-400">
              {isPublic
                ? "All users with dashboard access can see this"
                : "Only users matching the rules below can see this"}
            </p>
          </div>
        </div>
      </label>

      {!isPublic && (
        <>
          {/* Roles */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Roles</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map(role => {
                const active = sharedRoles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition",
                      active
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    )}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departments */}
          {depts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Departments</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {depts.map(d => {
                  const active = sharedDepartments.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDept(d.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition",
                        active
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      )}
                    >
                      {active && <Check className="w-3 h-3" />}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Specific users */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <p className="font-medium text-gray-700 text-xs uppercase tracking-wide">Specific Users</p>
            </div>

            {/* Selected users chips */}
            {sharedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {sharedUsers.map(uid => {
                  const u = users.find(x => x.id === uid);
                  return (
                    <span
                      key={uid}
                      className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs"
                    >
                      {u ? `${u.firstName} ${u.lastName}` : uid}
                      <button
                        onClick={() => toggleUser(uid)}
                        className="hover:text-red-500 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              placeholder="Search users to add…"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full h-8 px-3 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-blue-300"
            />
            {userSearch && (
              <div className="mt-1 max-h-36 overflow-y-auto border border-gray-100 rounded-lg shadow-sm bg-white">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">No users found</p>
                ) : (
                  filteredUsers.slice(0, 20).map(u => {
                    const selected = sharedUsers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => { toggleUser(u.id); setUserSearch(""); }}
                        className={cn(
                          "flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition",
                          selected && "bg-orange-50 text-orange-700"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-[10px] font-semibold text-gray-600">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-gray-400 truncate">{u.email}</p>
                        </div>
                        {selected && <Check className="w-3 h-3 text-orange-500 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          {(sharedRoles.length > 0 || sharedDepartments.length > 0 || sharedUsers.length > 0) && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Accessible to:{" "}
              {[
                sharedRoles.length > 0 && `roles: ${sharedRoles.join(", ")}`,
                sharedDepartments.length > 0 && `${sharedDepartments.length} dept${sharedDepartments.length > 1 ? "s" : ""}`,
                sharedUsers.length > 0 && `${sharedUsers.length} user${sharedUsers.length > 1 ? "s" : ""}`,
              ].filter(Boolean).join(" · ")}
              {" "}(plus admins &amp; creator)
            </p>
          )}

          {sharedRoles.length === 0 && sharedDepartments.length === 0 && sharedUsers.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Only you and admins can see this. Add roles, departments, or users to share it.
            </p>
          )}
        </>
      )}
    </div>
  );
}
