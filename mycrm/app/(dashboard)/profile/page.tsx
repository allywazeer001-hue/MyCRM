"use client";
import { useEffect, useState } from "react";
import {
  User, Mail, Phone, Building2, Shield, Calendar, Clock,
  FileText, MessageSquare, Activity, CheckCircle2, XCircle,
  Pencil, Save, X, Eye, PenLine, Trash2, Download, Upload,
  Printer, BarChart2, Workflow, Layout, FormInput, Settings2, Key
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/toast";

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  MANAGER: "bg-amber-100 text-amber-700 border-amber-200",
  USER: "bg-gray-100 text-gray-700 border-gray-200",
  VIEWER: "bg-purple-100 text-purple-700 border-purple-200",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  USER_CREATED: { label: "User Created", color: "text-blue-600" },
  RECORD_CREATED: { label: "Record Created", color: "text-green-600" },
  RECORD_UPDATED: { label: "Record Updated", color: "text-amber-600" },
  RECORD_DELETED: { label: "Record Deleted", color: "text-red-600" },
  MODULE_CREATED: { label: "Module Created", color: "text-purple-600" },
  FIELD_CREATED: { label: "Field Added", color: "text-indigo-600" },
  IMPORT: { label: "Imported Records", color: "text-teal-600" },
  EXPORT: { label: "Exported Records", color: "text-cyan-600" },
};

const MODULE_PERMS = [
  { key: "canView", label: "View", icon: Eye },
  { key: "canCreate", label: "Create", icon: PenLine },
  { key: "canEdit", label: "Edit", icon: Settings2 },
  { key: "canDelete", label: "Delete", icon: Trash2 },
  { key: "canExport", label: "Export", icon: Download },
  { key: "canImport", label: "Import", icon: Upload },
  { key: "canPrint", label: "Print", icon: Printer },
  { key: "canAnalytics", label: "Analytics", icon: BarChart2 },
  { key: "canStudio", label: "Studio", icon: Layout },
  { key: "canWorkflow", label: "Workflow", icon: Workflow },
  { key: "canForms", label: "Forms", icon: FormInput },
] as const;

type ProfileData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  jobTitle?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  departmentId?: string;
  department?: { id: string; name: string; color: string };
  _count?: { createdRecords: number; comments: number };
  recentActivity?: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }>;
  departmentPermissions?: Array<{
    id: string;
    moduleId?: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canImport: boolean;
    canPrint: boolean;
    canAnalytics: boolean;
    canStudio: boolean;
    canWorkflow: boolean;
    canForms: boolean;
    canDashboard: boolean;
    module?: { id: string; name: string; slug: string; icon?: string };
  }>;
};

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (form.next.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/users/me", { currentPassword: form.current, password: form.next });
      toast.success("Password changed successfully");
      setForm({ current: "", next: "", confirm: "" });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-4 h-4" /> Change Password
          </DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNext ? "text" : "password"}
                value={form.next}
                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowNext((v) => !v)}
              >
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Change Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// EyeOff icon inline since it might not be in some lucide versions
function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
    </svg>
  );
}

export default function ProfilePage() {
  const toast = useToast();
  const { user: authUser, setUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    phone: "",
  });

  useEffect(() => {
    api.get("/users/me/profile")
      .then(({ data }) => {
        setProfile(data);
        setEditForm({
          firstName: data.firstName,
          lastName: data.lastName,
          jobTitle: data.jobTitle || "",
          phone: data.phone || "",
        });
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${profile!.id}`, editForm);
      setProfile((p) => p ? { ...p, ...data } : p);
      setUser({ ...authUser!, firstName: data.firstName, lastName: data.lastName });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (profile) {
      setEditForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        jobTitle: profile.jobTitle || "",
        phone: profile.phone || "",
      });
    }
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Failed to load profile.
      </div>
    );
  }

  const systemPerm = profile.departmentPermissions?.find((p) => !p.moduleId);
  const modulePems = profile.departmentPermissions?.filter((p) => !!p.moduleId) || [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your personal information and account settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)} className="gap-1.5">
            <Key className="w-3.5 h-3.5" /> Change Password
          </Button>
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="w-16 h-16 flex-shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xl">
                {(editing ? editForm.firstName : profile.firstName)[0]}
                {(editing ? editForm.lastName : profile.lastName)[0]}
              </AvatarFallback>
            </Avatar>

            {editing ? (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Job Title</Label>
                  <Input
                    value={editForm.jobTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    placeholder="e.g. Sales Manager"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 555 0100"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[profile.role] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    {profile.role.replace(/_/g, " ")}
                  </span>
                </div>
                {profile.jobTitle && (
                  <p className="text-sm text-gray-500 mt-0.5">{profile.jobTitle}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {profile.email}
                  </span>
                  {profile.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {profile.phone}
                    </span>
                  )}
                  {profile.department && (
                    <span
                      className="flex items-center gap-1.5 font-medium"
                      style={{ color: profile.department.color }}
                    >
                      <Building2 className="w-3.5 h-3.5" /> {profile.department.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col items-end gap-1 text-xs text-gray-400 flex-shrink-0">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {formatDate(profile.createdAt)}
              </span>
              {profile.lastLoginAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last login {formatDate(profile.lastLoginAt)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats + Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{profile._count?.createdRecords ?? 0}</p>
                  <p className="text-xs text-gray-500">Records Created</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{profile._count?.comments ?? 0}</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!profile.recentActivity?.length ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {profile.recentActivity.map((log) => {
                    const info = ACTION_LABELS[log.action] || { label: log.action.replace(/_/g, " "), color: "text-gray-600" };
                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
                          <p className="text-xs text-gray-400">{log.entityType}</p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.createdAt)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Department + Permissions */}
        <div className="space-y-6">
          {profile.department ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> My Department
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className="flex items-center gap-2 p-3 rounded-lg border"
                  style={{
                    backgroundColor: `${profile.department.color}12`,
                    borderColor: `${profile.department.color}30`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: profile.department.color }}
                  />
                  <span className="font-medium text-sm text-gray-800">{profile.department.name}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-gray-400 text-center">
                Not assigned to a department
              </CardContent>
            </Card>
          )}

          {systemPerm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> My Access
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {[
                  { key: "canDashboard", label: "Dashboard" },
                  { key: "canAnalytics", label: "Analytics" },
                  { key: "canWorkflow", label: "Workflows" },
                  { key: "canForms", label: "Forms" },
                  { key: "canStudio", label: "Module Studio" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{label}</span>
                    {(systemPerm as any)[key] ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {modulePems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Module Access
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {modulePems.map((perm) => (
                  <div key={perm.id}>
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">
                      {perm.module?.name || "Unknown module"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {MODULE_PERMS.map(({ key, label }) =>
                        (perm as any)[key] ? (
                          <span
                            key={key}
                            className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {label}
                          </span>
                        ) : null
                      )}
                      {MODULE_PERMS.every(({ key }) => !(perm as any)[key]) && (
                        <span className="text-xs text-gray-400">No permissions</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
