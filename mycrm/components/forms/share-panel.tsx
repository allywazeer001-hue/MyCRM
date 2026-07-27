"use client";
import { useEffect, useState } from "react";
import { Share2, X, Building2, Users, Search, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function FormSharePanel({ form, onClose }: { form: { id: string; name: string }; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [sharedDepts, setSharedDepts] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [tab, setTab] = useState<"depts" | "users">("users");

  useEffect(() => {
    Promise.all([
      api.get(`/forms/${form.id}/sharing`),
      api.get("/users?limit=200"),
      api.get("/departments"),
    ]).then(([s, u, d]) => {
      setSharedUsers(s.data?.sharedUsers ?? []);
      setSharedDepts(s.data?.sharedDepts ?? []);
      setUsers(u.data?.data ?? u.data ?? []);
      setDepts(d.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [form.id]);

  const toggleDept = (id: string) =>
    setSharedDepts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleUser = (id: string) =>
    setSharedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/forms/${form.id}/sharing`, { sharedUsers, sharedDepts });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute left-0 top-[44px] bottom-0 w-[300px] bg-white flex flex-col overflow-hidden"
        style={{ boxShadow: "4px 0 24px rgba(30,27,75,0.18)", borderRight: "1px solid #ede9fe" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <Share2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-slate-800">Share Form</h2>
            <p className="text-[11px] text-slate-400 truncate">{form.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-2 pt-2 shrink-0">
              {([
                { key: "depts", label: "Departments", Icon: Building2 },
                { key: "users", label: "Users",       Icon: Users },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg transition-colors",
                    tab === key ? "text-violet-700 border-b-2 border-violet-600" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {key === "depts" && sharedDepts.length > 0 && (
                    <span className="ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: "#7c3aed" }}>
                      {sharedDepts.length}
                    </span>
                  )}
                  {key === "users" && sharedUsers.length > 0 && (
                    <span className="ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: "#7c3aed" }}>
                      {sharedUsers.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 flex-1 overflow-y-auto">
              {tab === "depts" && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Departments that can view this form
                  </p>
                  {depts.length === 0 ? (
                    <p className="text-[12px] text-slate-400 text-center py-4">No departments found</p>
                  ) : depts.map((dept: any) => (
                    <button
                      key={dept.id}
                      onClick={() => toggleDept(dept.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                        sharedDepts.includes(dept.id) ? "text-violet-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                      )}
                      style={sharedDepts.includes(dept.id)
                        ? { background: "#f5f3ff", border: "1.5px solid #c4b5fd" }
                        : { border: "1.5px solid #f1f5f9" }}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: dept.color || "#7c3aed" }} />
                      <span className="text-[12px] flex-1 truncate">{dept.name}</span>
                      {sharedDepts.includes(dept.id) && <Check className="w-3.5 h-3.5 text-violet-600" />}
                    </button>
                  ))}
                </div>
              )}

              {tab === "users" && (
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users…"
                      className="w-full pl-7 pr-3 py-2 text-[12px] rounded-xl outline-none"
                      style={{ border: "1.5px solid #ede9fe", background: "#f8f7ff" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    {filteredUsers.length === 0 ? (
                      <p className="text-[12px] text-slate-400 text-center py-4">No users found</p>
                    ) : filteredUsers.slice(0, 50).map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => toggleUser(u.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left",
                          sharedUsers.includes(u.id) ? "text-violet-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                        )}
                        style={sharedUsers.includes(u.id)
                          ? { background: "#f5f3ff", border: "1.5px solid #c4b5fd" }
                          : { border: "1.5px solid #f1f5f9" }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        {sharedUsers.includes(u.id) && <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <div className="text-[10.5px] text-slate-400 mb-3 flex flex-wrap gap-2">
                {sharedDepts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                    {sharedDepts.length} dept{sharedDepts.length > 1 ? "s" : ""}
                  </span>
                )}
                {sharedUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                    {sharedUsers.length} user{sharedUsers.length > 1 ? "s" : ""}
                  </span>
                )}
                {sharedDepts.length === 0 && sharedUsers.length === 0 && (
                  <span className="text-slate-400">Owner only (not shared)</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-xl text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 3px 10px rgba(124,58,237,0.3)" }}>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
