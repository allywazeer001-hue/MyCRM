"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateWelcomePDF } from "@/lib/pdf-templates";
import { BRAND } from "@/lib/core-brand";
import { DomainEmailInput } from "@/components/ui/domain-email-input";
import {
  Users, Plus, Mail, Shield, MoreHorizontal, Search,
  Building2, Check, Eye, UserCheck, UserX, Pencil,
  RefreshCw, Key, Lock, Unlock, Ban, AlertTriangle,
  Download, Printer, ChevronRight, X, Info, ShieldAlert, Globe, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { formatDate, cn } from "@/lib/utils";
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

type Organization = { id: string; name: string };

type StaffRoleItem = { id: string; label: string; value: string };

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
  teamRole?: string;
  departmentId?: string;
  department?: Department;
  organizationId?: string;
  organization?: Organization;
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
  open, onClose, onSaved, departments, staffRoles, editUser, emailDomain,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (user: CrmUser, tempPassword?: string) => void;
  departments: Department[];
  staffRoles: StaffRoleItem[];
  editUser: CrmUser | null;
  emailDomain?: string | null;
}) {
  const toast = useToast();
  const isEdit = !!editUser;
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: "", firstName: "", lastName: "",
    role: "USER", departmentId: "__none__", teamRole: "",
    jobTitle: "", phone: "", avatar: "",
  });
  const [saving, setSaving] = useState(false);
  // Portal link options: "none" | "create"
  const [portalLink, setPortalLink] = useState<"none" | "create">("none");

  useEffect(() => {
    if (open) {
      setPortalLink("none");
      setForm(editUser ? {
        email: editUser.email, firstName: editUser.firstName, lastName: editUser.lastName,
        role: editUser.role,
        departmentId: editUser.departmentId || "__none__",
        teamRole: editUser.teamRole || "",
        jobTitle: editUser.jobTitle || "", phone: editUser.phone || "",
        avatar: editUser.avatar || "",
      } : { email: "", firstName: "", lastName: "", role: "USER", departmentId: "__none__", teamRole: "", jobTitle: "", phone: "", avatar: "" });
    }
  }, [open, editUser]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("avatar", ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const initials = [form.firstName, form.lastName]
    .filter(Boolean).map((n) => n[0].toUpperCase()).join("") || "?";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        email: form.email, firstName: form.firstName, lastName: form.lastName,
        role: form.role,
        departmentId: form.departmentId === "__none__" ? null : form.departmentId || null,
        teamRole: form.teamRole || null,
        jobTitle: form.jobTitle || null, phone: form.phone || null,
        avatar: form.avatar || null,
      };
      const { data } = isEdit
        ? await api.patch(`/users/${editUser!.id}`, payload)
        : await api.post("/users", payload);

      // Optionally create portal user if requested
      if (!isEdit && portalLink === "create" && data.id) {
        try {
          await api.post("/portal/padmin/users", {
            email: form.email, firstName: form.firstName, lastName: form.lastName,
            role: "USER",
          });
        } catch { /* non-blocking */ }
      }

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
      <DialogContent className="max-w-2xl p-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              {isEdit ? "Edit User" : "Create New User"}
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? "Update user details and access settings." : "Fill in the details below to create a new CRM user."}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">

            {/* ── Portal link banner ── */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Portal Access</span>
                <span className="text-xs text-gray-400 ml-1">— link this user with the customer portal</span>
              </div>
              <div className="flex gap-3">
                {([
                  { val: "none",   label: "No portal link",        desc: "CRM access only" },
                  { val: "create", label: "Create portal account",  desc: "Auto-create portal user" },
                ] as const).map(({ val, label, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPortalLink(val)}
                    className={cn(
                      "flex-1 text-left rounded-lg border px-3 py-2.5 transition-all text-xs",
                      portalLink === val
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn(
                        "w-3 h-3 rounded-full border-2 flex-shrink-0",
                        portalLink === val ? "border-blue-500 bg-blue-500" : "border-gray-300"
                      )} />
                      <span className="font-medium">{label}</span>
                    </div>
                    <span className="text-gray-400 pl-4">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Profile picture + basic info ── */}
            <div className="flex gap-6">

              {/* Left: Avatar */}
              <div className="flex flex-col items-center gap-3 w-36 flex-shrink-0">
                <div className="relative group">
                  {form.avatar ? (
                    <img src={form.avatar} alt="avatar"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm select-none">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <span className="text-white text-[10px] font-medium text-center leading-tight px-2">Change<br />photo</span>
                  </button>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Upload a new one
                </button>
                {form.avatar && (
                  <button type="button" onClick={() => set("avatar", "")}
                    className="text-xs text-red-500 hover:text-red-600">
                    Remove photo
                  </button>
                )}
              </div>

              {/* Right: Basic Info */}
              <div className="flex-1 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">First name <span className="text-red-500">*</span></Label>
                    <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
                      placeholder="Jane" required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Last name <span className="text-red-500">*</span></Label>
                    <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
                      placeholder="Doe" required className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">E-mail <span className="text-red-500">*</span></Label>
                  {isEdit ? (
                    <Input type="email" value={form.email} disabled className="h-9 text-sm" />
                  ) : (
                    <DomainEmailInput
                      value={form.email}
                      onChange={v => set("email", v)}
                      domain={emailDomain}
                      placeholder={emailDomain ? `jane@${emailDomain}` : "jane@company.com"}
                      required
                      className="h-9 text-sm"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Phone number</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    placeholder="+1 555 0100" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* ── Department & User Type ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account Setup</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">User type <span className="text-red-500">*</span></Label>
                  <Select value={form.role} onValueChange={(v) => set("role", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              r === "SUPER_ADMIN" ? "bg-red-500" :
                              r === "ADMIN"       ? "bg-blue-500" :
                              r === "MANAGER"     ? "bg-amber-500" :
                              r === "VIEWER"      ? "bg-purple-500" : "bg-gray-400"
                            )} />
                            {r.replace(/_/g, " ")}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Department / Unit</Label>
                  <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No unit</SelectItem>
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
                  <Label className="text-xs text-gray-600">Team Role</Label>
                  <Select
                    value={staffRoles.some(r => r.label === form.teamRole) ? form.teamRole : (form.teamRole ? "__custom__" : "__none__")}
                    onValueChange={(v) => {
                      if (v === "__none__") set("teamRole", "");
                      else if (v !== "__custom__") set("teamRole", v);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No team role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No team role</SelectItem>
                      {staffRoles.map((r) => (
                        <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        <span className="text-blue-600">+ Other (type below)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Custom role input shown when "Other" is selected or value not in list */}
                  {form.teamRole && !staffRoles.some(r => r.label === form.teamRole) && (
                    <Input
                      value={form.teamRole}
                      onChange={(e) => set("teamRole", e.target.value)}
                      placeholder="Type custom role name"
                      className="h-9 text-sm mt-1"
                      autoFocus
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Job title</Label>
                  <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)}
                    placeholder="e.g. Sales Manager" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* ── Info notices ── */}
            {form.role === "SUPER_ADMIN" && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                Super Admin has full platform access and is not restricted to any unit.
              </div>
            )}
            {!isEdit && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex gap-2">
                <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Default password will be the user&apos;s last name. They must change it on first login.
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-9 px-5">
              {saving
                ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Saving…</>
                : isEdit ? "Save Changes" : "Create User"}
            </Button>
          </div>
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
          <DialogDescription>Effective permissions after unit rules and user-specific overrides.</DialogDescription>
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
                  <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
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

// ── Hard Delete — OTP Confirmation Dialog ────────────────────────────────────
// Generates a secure 6-digit code shown to the admin; they must re-enter it
// within 5 minutes to confirm permanent deletion. Replaces the old "type email"
// approach with a more enterprise-grade verification step.

function generateOTP(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
}

function HardDeleteDialog({
  open, user, onConfirm, onClose,
}: {
  open: boolean;
  user: CrmUser | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [otp, setOtp]         = useState("");
  const [typed, setTyped]     = useState("");
  const [deleting, setDeleting] = useState(false);
  const [expiry, setExpiry]   = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 min in seconds

  useEffect(() => {
    if (open && user) {
      const code = generateOTP();
      setOtp(code);
      setTyped("");
      const exp = new Date(Date.now() + 5 * 60 * 1000);
      setExpiry(exp);
      setTimeLeft(300);
    }
  }, [open, user]);

  // Countdown timer
  useEffect(() => {
    if (!open || !expiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [open, expiry]);

  const confirmed = typed.trim() === otp && timeLeft > 0;
  const expired   = timeLeft === 0;
  const minutes   = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds   = String(timeLeft % 60).padStart(2, "0");

  async function handleDelete() {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  function regenerate() {
    const code = generateOTP();
    setOtp(code);
    setTyped("");
    const exp = new Date(Date.now() + 5 * 60 * 1000);
    setExpiry(exp);
    setTimeLeft(300);
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Permanently Delete User
          </DialogTitle>
          <DialogDescription>
            This action <strong>cannot be undone</strong>. All data for this user will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* User info */}
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 space-y-1">
            <p className="font-semibold">{user.firstName} {user.lastName}</p>
            <p className="text-red-600 text-xs">{user.email} · {user.role}</p>
          </div>

          {/* OTP display */}
          <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50/60 p-4 text-center space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Verification Code</p>
            <div className="flex items-center justify-center gap-2">
              {otp.split("").map((digit, i) => (
                <span key={i} className="w-9 h-11 flex items-center justify-center rounded-lg bg-white border-2 border-red-300 text-red-700 text-xl font-mono font-bold shadow-sm">
                  {digit}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              {expired ? (
                <span className="text-xs text-red-600 font-semibold">Code expired</span>
              ) : (
                <span className="text-xs text-gray-500">Expires in <span className="font-mono font-bold text-red-600">{minutes}:{seconds}</span></span>
              )}
              <button
                type="button"
                onClick={regenerate}
                className="text-xs text-blue-600 hover:underline ml-2 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> New code
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Enter the 6-digit code above to confirm deletion
            </label>
            <Input
              value={typed}
              onChange={e => setTyped(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-10 text-center text-xl font-mono tracking-[0.4em] letter-spacing-wide"
              autoComplete="off"
              autoFocus
              maxLength={6}
              disabled={expired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!confirmed || deleting}
            onClick={handleDelete}
            className="gap-1.5"
          >
            {deleting
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
              : <><Trash2 className="w-3.5 h-3.5" /> Delete Permanently</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const toast = useToast();
  const router = useRouter();
  const { user: me } = useAuthStore();
  const orgName = (me as any)?.organization?.name || BRAND.name;

  const isSuperAdmin = me?.role === "SUPER_ADMIN";

  const [users, setUsers]               = useState<CrmUser[]>([]);
  const [departments, setDepartments]   = useState<Department[]>([]);
  const [staffRoles, setStaffRoles]     = useState<StaffRoleItem[]>([]);
  const [orgs, setOrgs]                 = useState<Organization[]>([]);
  const [emailDomain, setEmailDomain]   = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterRole, setFilterRole]     = useState("__all__");
  const [filterDept, setFilterDept]     = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [orgFilter, setOrgFilter]       = useState("all");

  const [formOpen, setFormOpen]   = useState(false);
  const [editUser, setEditUser]   = useState<CrmUser | null>(null);

  const [credDialog, setCredDialog]       = useState<{ user: CrmUser; tempPassword: string } | null>(null);
  const [permDialog, setPermDialog]       = useState<CrmUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: CrmUser; action: string } | null>(null);
  const [resetResult, setResetResult]     = useState<{ user: CrmUser; tempPassword: string } | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<CrmUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests: Promise<any>[] = [
        api.get("/users"),
        api.get("/departments"),
        api.get("/organizations/me"),
        api.get("/global-lists/staff-roles"),
      ];
      if (isSuperAdmin) requests.push(api.get("/organizations"));

      const [usersRes, deptsRes, orgRes, staffRolesRes, allOrgsRes] = await Promise.allSettled(requests);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data);
      if (deptsRes.status === "fulfilled") setDepartments(deptsRes.value.data);
      if (staffRolesRes.status === "fulfilled") setStaffRoles(staffRolesRes.value.data?.items ?? []);
      if (orgRes.status === "fulfilled") {
        const domain = (orgRes.value.data?.settings as any)?.emailDomain;
        setEmailDomain(domain || null);
      }
      if (isSuperAdmin && allOrgsRes && allOrgsRes.status === "fulfilled") {
        setOrgs(allOrgsRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

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
    if (orgFilter !== "all" && u.organizationId !== orgFilter) return false;
    return true;
  });

  // Group by organization when SUPER_ADMIN and no org filter is applied
  const groupedByOrg: { org: Organization | null; users: CrmUser[] }[] | null =
    isSuperAdmin && orgFilter === "all"
      ? (() => {
          const map = new Map<string, { org: Organization | null; users: CrmUser[] }>();
          for (const u of filtered) {
            const key = u.organizationId ?? "__none__";
            if (!map.has(key)) {
              map.set(key, {
                org: u.organization ?? (u.organizationId ? { id: u.organizationId, name: u.organizationId } : null),
                users: [],
              });
            }
            map.get(key)!.users.push(u);
          }
          return Array.from(map.values());
        })()
      : null;

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

  async function hardDeleteUser(user: CrmUser) {
    await api.delete(`/users/${user.id}/permanent`);
    setUsers(prev => prev.filter(u => u.id !== user.id));
    toast.success(`${user.firstName} ${user.lastName} permanently deleted`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <SelectValue placeholder="All units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All units</SelectItem>
            <SelectItem value="__none__">No unit</SelectItem>
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
        {isSuperAdmin && orgs.length > 0 && (
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-44">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(search || filterRole !== "__all__" || filterDept !== "__all__" || filterStatus !== "__all__" || orgFilter !== "all") && (
          <Button variant="ghost" size="sm"
            onClick={() => { setSearch(""); setFilterRole("__all__"); setFilterDept("__all__"); setFilterStatus("__all__"); setOrgFilter("all"); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Users list */}
      <div className="overflow-x-auto">
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
              {(() => {
                function renderUserRow(user: CrmUser) {
                  const statusCfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.ACTIVE;
                  const StatusIcon = statusCfg.icon;
                  const isInactive = !user.isActive || ["DISABLED", "SUSPENDED", "LOCKED"].includes(user.status);

                  return (
                    <div key={user.id} className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${isInactive ? "opacity-60" : ""}`}>
                      {/* Avatar + info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => router.push(`/users/${user.id}`)} className="flex-shrink-0 focus:outline-none">
                          <Avatar className="flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all">
                            {user.avatar && <AvatarImage src={user.avatar} alt={`${user.firstName[0]}${user.lastName[0]}`} className="object-cover" />}
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => router.push(`/users/${user.id}`)} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left">{user.firstName} {user.lastName}</button>
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
                            <Building2 className="w-2.5 h-2.5" />No unit
                          </span>
                        )}

                        {/* Team role badge */}
                        {user.teamRole && (
                          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-teal-50 border-teal-200 text-teal-700">
                            {user.teamRole}
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-700 focus:text-red-700 focus:bg-red-50 font-medium"
                              onClick={() => setHardDeleteTarget(user)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                }

                if (groupedByOrg) {
                  return groupedByOrg.map(({ org, users: groupUsers }) => (
                    <div key={org?.id ?? "__none__"}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 sticky top-0 z-10">
                        <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {org?.name ?? "No Organization"}
                        </span>
                        <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                          {groupUsers.length} {groupUsers.length === 1 ? "user" : "users"}
                        </span>
                      </div>
                      {groupUsers.map(renderUserRow)}
                    </div>
                  ));
                }

                return filtered.map(renderUserRow);
              })()}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {!loading && users.length > 0 && (
        <p className="text-sm text-gray-500 px-1">Showing {filtered.length} of {users.length} users</p>
      )}

      {/* ── Dialogs ── */}
      <UserFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditUser(null); }}
        onSaved={(user, tempPassword) => {
          upsertUser(user);
          if (tempPassword) {
            setCredDialog({ user, tempPassword });
            generateWelcomePDF(user);
          }
        }}
        departments={departments}
        staffRoles={staffRoles}
        editUser={editUser}
        emailDomain={emailDomain}
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

      <HardDeleteDialog
        open={!!hardDeleteTarget}
        user={hardDeleteTarget}
        onConfirm={async () => { if (hardDeleteTarget) await hardDeleteUser(hardDeleteTarget); }}
        onClose={() => { setHardDeleteTarget(null); router.push("/users"); }}
      />
    </div>
  );
}
