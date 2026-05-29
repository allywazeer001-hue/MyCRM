"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Users, Plus, Mail, Shield, MoreHorizontal, Search,
  Building2, Check, Eye, UserCheck, UserX, Pencil,
  RefreshCw, Key, Lock, Unlock, Ban, AlertTriangle,
  Download, Printer, ChevronRight, X, Info, ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth.store";

// ── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"] as const;

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  MANAGER: "bg-amber-100 text-amber-700 border-amber-200",
  USER: "bg-gray-100 text-gray-700 border-gray-200",
  VIEWER: "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIVE:                   { label: "Active",                color: "bg-green-100 text-green-700 border-green-200",  icon: UserCheck },
  SUSPENDED:                { label: "Suspended",             color: "bg-amber-100 text-amber-700 border-amber-200",  icon: Ban },
  LOCKED:                   { label: "Locked",                color: "bg-red-100 text-red-700 border-red-200",        icon: Lock },
  DISABLED:                 { label: "Disabled",              color: "bg-gray-100 text-gray-500 border-gray-200",     icon: UserX },
  PENDING_ACTIVATION:       { label: "Pending",               color: "bg-blue-100 text-blue-600 border-blue-200",     icon: Info },
  PASSWORD_RESET_REQUIRED:  { label: "Password Reset",        color: "bg-orange-100 text-orange-700 border-orange-200", icon: Key },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Department = { id: string; name: string; color: string };

type CrmUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  status: string;
  mustChangePassword: boolean;
  jobTitle?: string;
  phone?: string;
  departmentId?: string;
  department?: Department;
  createdAt: string;
  lastLoginAt?: string;
  suspendedAt?: string;
  lockedAt?: string;
  avatar?: string;
};

// ── PDF Credential Generator ──────────────────────────────────────────────────

function printCredentials(user: CrmUser, tempPassword: string, orgName: string) {
  const loginUrl = window.location.origin + "/login";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Login Credentials — ${user.firstName} ${user.lastName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 32px; }
        .card { background: white; border-radius: 12px; padding: 40px 48px; max-width: 540px; width: 100%; box-shadow: 0 4px 32px rgba(0,0,0,.12); }
        .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 28px; }
        .logo { width: 48px; height: 48px; background: #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 800; flex-shrink: 0; }
        .org { font-size: 18px; font-weight: 700; color: #1e293b; }
        .sub { font-size: 13px; color: #64748b; margin-top: 2px; }
        h2 { font-size: 20px; color: #1e293b; margin-bottom: 6px; }
        .greeting { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; }
        .cred-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
        .cred-row:last-child { margin-bottom: 0; }
        .cred-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #94a3b8; width: 100px; flex-shrink: 0; padding-top: 2px; }
        .cred-value { font-size: 15px; font-weight: 600; color: #1e293b; word-break: break-all; }
        .password-value { font-family: 'Courier New', monospace; font-size: 18px; color: #7c3aed; letter-spacing: 1px; }
        .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #92400e; line-height: 1.5; margin-bottom: 20px; }
        .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
        @media print { body { background: white; } .card { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">E</div>
          <div><div class="org">${orgName}</div><div class="sub">System Administration</div></div>
        </div>
        <h2>Welcome, ${user.firstName} ${user.lastName}!</h2>
        <p class="greeting">Your account has been created successfully. Please use the following credentials to log in for the first time.</p>
        <div class="cred-box">
          <div class="cred-row"><div class="cred-label">Full Name</div><div class="cred-value">${user.firstName} ${user.lastName}</div></div>
          <div class="cred-row"><div class="cred-label">Username</div><div class="cred-value">${user.email}</div></div>
          <div class="cred-row"><div class="cred-label">Password</div><div class="cred-value password-value">${tempPassword}</div></div>
          <div class="cred-row"><div class="cred-label">Role</div><div class="cred-value">${user.role.replace(/_/g, " ")}</div></div>
          <div class="cred-row"><div class="cred-label">Login URL</div><div class="cred-value">${loginUrl}</div></div>
        </div>
        <div class="warning">⚠️ <strong>Important:</strong> You will be required to change this password immediately after your first login. Please keep these credentials secure and do not share them.</div>
        <div class="footer">This document was generated by ${orgName} — ${new Date().toLocaleDateString()}. Please destroy after use.</div>
      </div>
    </body>
    </html>
  `;
  const win = window.open("", "_blank", "width=640,height=820");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ── Credential Success Dialog ─────────────────────────────────────────────────

function CredentialDialog({
  open, user, tempPassword, orgName, onClose,
}: {
  open: boolean;
  user: CrmUser | null;
  tempPassword: string;
  orgName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <Check className="w-5 h-5 bg-green-100 rounded-full p-0.5" />
            Account Created Successfully
          </DialogTitle>
          <DialogDescription>
            Credentials have been generated. Share them securely — the temporary password will not be shown again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Credential card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Username (Email)</span>
              <span className="font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Temporary Password</span>
              <span className="font-mono font-bold text-purple-700 text-base tracking-wider">{tempPassword}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-gray-900">{user.role.replace(/_/g, " ")}</span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            User must change this password on first login. Default password is their last name.
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Password copied"); }}
          >
            <Key className="w-4 h-4" /> Copy Password
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => printCredentials(user, tempPassword, orgName)}
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </Button>
          <Button size="sm" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── User Form Dialog ──────────────────────────────────────────────────────────

function UserFormDialog({
  open, onClose, onSaved, departments, editUser,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (user: CrmUser, tempPassword?: string) => void;
  departments: Department[];
  editUser: CrmUser | null;
}) {
  const toast = useToast();
  const isEdit = !!editUser;

  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "",
    role: "USER", departmentId: "__none__",
    jobTitle: "", phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editUser ? {
        email: editUser.email, firstName: editUser.firstName, lastName: editUser.lastName,
        role: editUser.role,
        departmentId: editUser.departmentId || "__none__",
        jobTitle: editUser.jobTitle || "", phone: editUser.phone || "",
      } : { email: "", firstName: "", lastName: "", role: "USER", departmentId: "__none__", jobTitle: "", phone: "" });
    }
  }, [open, editUser]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        email: form.email, firstName: form.firstName, lastName: form.lastName,
        role: form.role,
        departmentId: form.departmentId === "__none__" ? null : form.departmentId || null,
        jobTitle: form.jobTitle || null, phone: form.phone || null,
      };
      const { data } = isEdit
        ? await api.patch(`/users/${editUser!.id}`, payload)
        : await api.post("/users", payload);

      if (!isEdit && data.tempPassword) {
        onSaved(data, data.tempPassword);
      } else {
        toast.success(isEdit ? "User updated" : "User created");
        onSaved(data);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update user details, role, and department."
              : "Create a new workspace user. Password will default to their last name and must be changed on first login."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name <span className="text-red-500">*</span></Label>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name <span className="text-red-500">*</span></Label>
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Doe" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email Address <span className="text-red-500">*</span></Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="jane@company.com" required disabled={isEdit} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                <SelectTrigger><SelectValue placeholder="No department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Sales Manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 0100" />
            </div>
          </div>
          {!isEdit && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex gap-2">
              <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Default password will be set to the user&apos;s last name. They must change it on first login.
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Permission Override Dialog ────────────────────────────────────────────────

function PermissionSummaryDialog({
  open, userId, userName, onClose,
}: {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    api.get(`/users/${userId}/permissions`)
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, userId]);

  const effective = summary?.effective;
  const overrides  = summary?.overrides || [];
  const MODULE_PERMS = ["canView", "canCreate", "canEdit", "canDelete", "canExport", "canImport"];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" />
            Permission Summary — {userName}
          </DialogTitle>
          <DialogDescription>Effective permissions after department rules and user-specific overrides.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : effective ? (
          <div className="space-y-5 py-2">
            {/* Admin badge */}
            {effective.isAdmin && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-800 font-medium">
                <Shield className="w-4 h-4" /> Full Administrator Access
              </div>
            )}

            {/* System perms */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">System Access</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(effective.system || {}).map(([k, v]) => (
                  <div key={k} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border ${v ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                    {v ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {k.replace("can", "")}
                  </div>
                ))}
              </div>
            </div>

            {/* Module perms */}
            {Object.keys(effective.modules || {}).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Module Permissions</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">Module</th>
                        {MODULE_PERMS.map(p => (
                          <th key={p} className="px-2 py-2 font-semibold text-gray-500 text-center">{p.replace("can", "")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(effective.modules).map(([slug, perms]: [string, any]) => (
                        <tr key={slug} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-medium text-gray-700">{slug}</td>
                          {MODULE_PERMS.map(p => (
                            <td key={p} className="px-2 py-1.5 text-center">
                              {perms[p]
                                ? <Check className="w-3.5 h-3.5 text-green-500 mx-auto" />
                                : <X className="w-3.5 h-3.5 text-gray-300 mx-auto" />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Active overrides */}
            {overrides.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Overrides ({overrides.length})</p>
                <div className="space-y-1.5">
                  {overrides.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-medium text-amber-900">{o.moduleSlug ? `Module: ${o.moduleSlug}` : "System-level override"}</span>
                        {o.reason && <span className="text-amber-600">— {o.reason}</span>}
                      </div>
                      {o.expiresAt && (
                        <span className="text-amber-600">Expires {formatDate(o.expiresAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            Could not load permissions
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, description, confirmLabel = "Confirm", destructive = false, onConfirm, onClose,
}: {
  open: boolean; title: string; description: string;
  confirmLabel?: string; destructive?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"}
            onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuthStore();
  const orgName = (me as any)?.organization?.name || "Enterprise CRM";

  const [users, setUsers]               = useState<CrmUser[]>([]);
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterRole, setFilterRole]     = useState("__all__");
  const [filterDept, setFilterDept]     = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const [formOpen, setFormOpen]   = useState(false);
  const [editUser, setEditUser]   = useState<CrmUser | null>(null);

  const [credDialog, setCredDialog]       = useState<{ user: CrmUser; tempPassword: string } | null>(null);
  const [permDialog, setPermDialog]       = useState<CrmUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: CrmUser; action: string } | null>(null);
  const [resetResult, setResetResult]     = useState<{ user: CrmUser; tempPassword: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.allSettled([
        api.get("/users"),
        api.get("/departments"),
      ]);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data);
      if (deptsRes.status === "fulfilled") setDepartments(deptsRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function upsertUser(updated: CrmUser) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [updated, ...prev];
    });
  }

  async function executeAction(user: CrmUser, action: string) {
    try {
      if (action === "deactivate") {
        await api.delete(`/users/${user.id}`);
        upsertUser({ ...user, isActive: false, status: "DISABLED" });
        toast.success(`${user.firstName} deactivated`);
      } else if (action === "reactivate") {
        const { data } = await api.patch(`/users/${user.id}/reactivate`);
        upsertUser(data);
        toast.success(`${user.firstName} reactivated`);
      } else if (action === "suspend") {
        const { data } = await api.patch(`/users/${user.id}/suspend`);
        upsertUser(data);
        toast.success(`${user.firstName} suspended`);
      } else if (action === "unsuspend") {
        const { data } = await api.patch(`/users/${user.id}/unsuspend`);
        upsertUser(data);
        toast.success(`${user.firstName} unsuspended`);
      } else if (action === "lock") {
        const { data } = await api.patch(`/users/${user.id}/lock`);
        upsertUser(data);
        toast.success(`${user.firstName} locked`);
      } else if (action === "unlock") {
        const { data } = await api.patch(`/users/${user.id}/unlock`);
        upsertUser(data);
        toast.success(`${user.firstName} unlocked`);
      } else if (action === "force-reset") {
        const { data } = await api.patch(`/users/${user.id}/force-password-reset`);
        upsertUser(data);
        toast.success(`Password reset required for ${user.firstName}`);
      } else if (action === "reset-password") {
        const { data } = await api.post(`/users/${user.id}/reset-password`);
        setResetResult({ user, tempPassword: data.tempPassword });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Action failed`);
    }
  }

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.firstName} ${u.lastName} ${u.email} ${u.jobTitle || ""}`.toLowerCase().includes(q)) return false;
    }
    if (filterRole !== "__all__" && u.role !== filterRole) return false;
    if (filterDept !== "__all__") {
      if (filterDept === "__none__" && u.departmentId) return false;
      if (filterDept !== "__none__" && u.departmentId !== filterDept) return false;
    }
    if (filterStatus !== "__all__" && u.status !== filterStatus) return false;
    return true;
  });

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  function getActionLabel(action: string, user: CrmUser) {
    const map: Record<string, string> = {
      deactivate: `Deactivate ${user.firstName}?`,
      reactivate: `Reactivate ${user.firstName}?`,
      suspend: `Suspend ${user.firstName}?`,
      unsuspend: `Unsuspend ${user.firstName}?`,
      lock: `Lock ${user.firstName}'s account?`,
      unlock: `Unlock ${user.firstName}'s account?`,
      "force-reset": `Force password reset for ${user.firstName}?`,
    };
    return map[action] ?? "Confirm action?";
  }

  function getActionDesc(action: string) {
    const map: Record<string, string> = {
      deactivate: "This user will be disabled and can no longer log in.",
      reactivate: "This user will regain access to the workspace.",
      suspend: "The user's account will be temporarily suspended.",
      unsuspend: "The suspension will be lifted and the user will regain access.",
      lock: "The account will be locked. The user must contact an admin to unlock it.",
      unlock: "The account will be unlocked and the user can log in again.",
      "force-reset": "The user will be required to change their password on next login.",
    };
    return map[action] ?? "This action cannot be undone.";
  }

  const isDestructive = (action: string) => ["deactivate", "suspend", "lock"].includes(action);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500 mt-1">{activeCount} active · {users.length} total</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditUser(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-40">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All departments</SelectItem>
            <SelectItem value="__none__">No department</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || filterRole !== "__all__" || filterDept !== "__all__" || filterStatus !== "__all__") && (
          <Button variant="ghost" size="sm"
            onClick={() => { setSearch(""); setFilterRole("__all__"); setFilterDept("__all__"); setFilterStatus("__all__"); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Users list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Users className="w-10 h-10" />
              <p className="text-sm">{users.length === 0 ? "No users yet" : "No users match your filters"}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((user) => {
                const statusCfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.ACTIVE;
                const StatusIcon = statusCfg.icon;
                const isInactive = !user.isActive || ["DISABLED", "SUSPENDED", "LOCKED"].includes(user.status);

                return (
                  <div key={user.id} className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${isInactive ? "opacity-60" : ""}`}>
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="flex-shrink-0">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          {user.mustChangePassword && (
                            <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-1.5 py-0.5">
                              <Key className="w-2.5 h-2.5" /> Must reset
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />{user.email}
                        </p>
                        {user.jobTitle && <p className="text-xs text-gray-400">{user.jobTitle}</p>}
                      </div>
                    </div>

                    {/* Badges + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      {/* Dept badge */}
                      {user.department ? (
                        <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{ backgroundColor: `${user.department.color}18`, borderColor: `${user.department.color}40`, color: user.department.color }}>
                          <Building2 className="w-2.5 h-2.5" />{user.department.name}
                        </span>
                      ) : (
                        <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-gray-400 border border-gray-200 bg-gray-50">
                          <Building2 className="w-2.5 h-2.5" />No dept.
                        </span>
                      )}

                      {/* Role badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        <Shield className="w-2.5 h-2.5" />{user.role.replace(/_/g, " ")}
                      </span>

                      {/* Status badge */}
                      <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" />{statusCfg.label}
                      </span>

                      {/* Last login */}
                      <p className="text-xs text-gray-400 hidden lg:block w-28 text-right">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never logged in"}
                      </p>

                      {/* Actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => { setEditUser(user); setFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPermDialog(user)}>
                            <ShieldAlert className="w-3.5 h-3.5 mr-2" /> View Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setConfirmAction({ user, action: "reset-password" })}>
                            <Key className="w-3.5 h-3.5 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirmAction({ user, action: "force-reset" })}>
                            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Force Password Reset
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "ACTIVE" && (
                            <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                              onClick={() => setConfirmAction({ user, action: "suspend" })}>
                              <Ban className="w-3.5 h-3.5 mr-2" /> Suspend
                            </DropdownMenuItem>
                          )}
                          {user.status === "SUSPENDED" && (
                            <DropdownMenuItem className="text-green-600 focus:text-green-600 focus:bg-green-50"
                              onClick={() => setConfirmAction({ user, action: "unsuspend" })}>
                              <UserCheck className="w-3.5 h-3.5 mr-2" /> Unsuspend
                            </DropdownMenuItem>
                          )}
                          {user.status !== "LOCKED" ? (
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setConfirmAction({ user, action: "lock" })}>
                              <Lock className="w-3.5 h-3.5 mr-2" /> Lock Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-green-600 focus:text-green-600 focus:bg-green-50"
                              onClick={() => setConfirmAction({ user, action: "unlock" })}>
                              <Unlock className="w-3.5 h-3.5 mr-2" /> Unlock Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {user.isActive ? (
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setConfirmAction({ user, action: "deactivate" })}>
                              <UserX className="w-3.5 h-3.5 mr-2" /> Disable Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-green-600 focus:text-green-600 focus:bg-green-50"
                              onClick={() => setConfirmAction({ user, action: "reactivate" })}>
                              <UserCheck className="w-3.5 h-3.5 mr-2" /> Enable Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && users.length > 0 && (
        <p className="text-sm text-gray-500 px-1">Showing {filtered.length} of {users.length} users</p>
      )}

      {/* ── Dialogs ── */}
      <UserFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditUser(null); }}
        onSaved={(user, tempPassword) => {
          upsertUser(user);
          if (tempPassword) setCredDialog({ user, tempPassword });
        }}
        departments={departments}
        editUser={editUser}
      />

      <CredentialDialog
        open={!!credDialog}
        user={credDialog?.user ?? null}
        tempPassword={credDialog?.tempPassword ?? ""}
        orgName={orgName}
        onClose={() => setCredDialog(null)}
      />

      {/* Reset password result */}
      {resetResult && (
        <CredentialDialog
          open={true}
          user={resetResult.user}
          tempPassword={resetResult.tempPassword}
          orgName={orgName}
          onClose={() => setResetResult(null)}
        />
      )}

      {permDialog && (
        <PermissionSummaryDialog
          open={true}
          userId={permDialog.id}
          userName={`${permDialog.firstName} ${permDialog.lastName}`}
          onClose={() => setPermDialog(null)}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          open={true}
          title={getActionLabel(confirmAction.action, confirmAction.user)}
          description={getActionDesc(confirmAction.action)}
          confirmLabel={confirmAction.action === "reset-password" ? "Reset Password" : "Confirm"}
          destructive={isDestructive(confirmAction.action)}
          onConfirm={() => executeAction(confirmAction.user, confirmAction.action)}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
