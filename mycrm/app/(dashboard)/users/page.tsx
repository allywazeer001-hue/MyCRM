"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Users, Plus, Mail, Shield, MoreHorizontal, Search,
  Building2, Check, Eye, EyeOff, UserCheck, UserX,
  Pencil, RefreshCw, Key
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "VIEWER"] as const;

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 border-red-200",
  ADMIN: "bg-blue-100 text-blue-700 border-blue-200",
  MANAGER: "bg-amber-100 text-amber-700 border-amber-200",
  USER: "bg-gray-100 text-gray-700 border-gray-200",
  VIEWER: "bg-purple-100 text-purple-700 border-purple-200",
};

type Department = { id: string; name: string; color: string };
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  jobTitle?: string;
  phone?: string;
  departmentId?: string;
  department?: Department;
  createdAt: string;
  avatar?: string;
};

type UserFormData = {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string;
  jobTitle: string;
  phone: string;
  sendInviteEmail: boolean;
};

const defaultForm: UserFormData = {
  email: "",
  firstName: "",
  lastName: "",
  role: "USER",
  departmentId: "__none__",
  jobTitle: "",
  phone: "",
  sendInviteEmail: true,
};

function UserFormDialog({
  open,
  onClose,
  onSaved,
  departments,
  editUser,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
  departments: Department[];
  editUser: User | null;
}) {
  const toast = useToast();
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const isEdit = !!editUser;

  useEffect(() => {
    if (open) {
      if (editUser) {
        setForm({
          email: editUser.email,
          firstName: editUser.firstName,
          lastName: editUser.lastName,
          role: editUser.role,
          departmentId: editUser.departmentId || "__none__",
          jobTitle: editUser.jobTitle || "",
          phone: editUser.phone || "",
          sendInviteEmail: false,
        });
      } else {
        setForm(defaultForm);
      }
      setTempPassword(null);
    }
  }, [open, editUser]);

  function set(field: keyof UserFormData, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        departmentId: form.departmentId === "__none__" ? null : form.departmentId || null,
        jobTitle: form.jobTitle || null,
        phone: form.phone || null,
      };
      if (!isEdit) payload.sendInviteEmail = form.sendInviteEmail;

      const { data } = isEdit
        ? await api.patch(`/users/${editUser!.id}`, payload)
        : await api.post("/users", payload);

      if (!isEdit && data.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        toast.success(isEdit ? "User updated successfully" : "User created successfully");
        onSaved(data);
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || (isEdit ? "Failed to update user" : "Failed to create user"));
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setTempPassword(null);
    onClose();
  }

  if (tempPassword) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleDone(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              The user account has been created. Save the temporary password below — it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-1">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide flex items-center gap-1">
                <Key className="w-3 h-3" /> Temporary Password
              </p>
              <p className="font-mono text-lg font-bold text-amber-900 tracking-wider select-all">
                {tempPassword}
              </p>
              <p className="text-xs text-amber-600">Share this with the user. They can change it after login.</p>
            </div>
            <div className="text-sm text-gray-600">
              <strong>{form.firstName} {form.lastName}</strong> ({form.email}) has been added to your workspace.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Password copied"); }}
            >
              Copy Password
            </Button>
            <Button onClick={handleDone}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update user details, role, and department assignment."
              : "Add a new member to your workspace. A temporary password will be generated."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Jane"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email Address <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jane@company.com"
              required
              disabled={isEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
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
              <Input
                value={form.jobTitle}
                onChange={(e) => set("jobTitle", e.target.value)}
                placeholder="Sales Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendInviteEmail}
                  onChange={(e) => set("sendInviteEmail", e.target.checked)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Send email invitation
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Send the user an email with their login credentials and a welcome message.
                    {!form.sendInviteEmail && " The temporary password will be shown to you after creation."}
                  </p>
                </div>
              </label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
              ) : isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
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
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("__all__");
  const [filterDept, setFilterDept] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);
  const [confirmReactivate, setConfirmReactivate] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, deptRes] = await Promise.all([
        api.get("/users"),
        api.get("/departments"),
      ]);
      setUsers(usersRes.data);
      setDepartments(deptRes.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleUserSaved(user: User) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = user;
        return next;
      }
      return [user, ...prev];
    });
    toast.success(editUser ? "User updated" : "User created");
  }

  async function handleDeactivate(user: User) {
    try {
      await api.delete(`/users/${user.id}`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: false } : u));
      toast.success(`${user.firstName} has been deactivated`);
    } catch {
      toast.error("Failed to deactivate user");
    }
  }

  async function handleReactivate(user: User) {
    try {
      await api.patch(`/users/${user.id}/reactivate`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: true } : u));
      toast.success(`${user.firstName} has been reactivated`);
    } catch {
      toast.error("Failed to reactivate user");
    }
  }

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      const match = `${u.firstName} ${u.lastName} ${u.email} ${u.jobTitle || ""}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    if (filterRole !== "__all__" && u.role !== filterRole) return false;
    if (filterDept !== "__all__") {
      if (filterDept === "__none__" && u.departmentId) return false;
      if (filterDept !== "__none__" && u.departmentId !== filterDept) return false;
    }
    if (filterStatus !== "__all__") {
      if (filterStatus === "active" && !u.isActive) return false;
      if (filterStatus === "inactive" && u.isActive) return false;
    }
    return true;
  });

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500 mt-1">
            {activeCount} active · {users.length} total
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => { setEditUser(null); setFormOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36">
            <Shield className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
            ))}
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
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterRole !== "__all__" || filterDept !== "__all__" || filterStatus !== "__all__") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setFilterRole("__all__"); setFilterDept("__all__"); setFilterStatus("__all__"); }}
          >
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
              {filtered.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${!user.isActive ? "opacity-60" : ""}`}
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                        {!user.isActive && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">(inactive)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {user.email}
                      </p>
                      {user.jobTitle && (
                        <p className="text-xs text-gray-400">{user.jobTitle}</p>
                      )}
                    </div>
                  </div>

                  {/* Badges + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {/* Department badge */}
                    {user.department ? (
                      <span
                        className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                        style={{
                          backgroundColor: `${user.department.color}18`,
                          borderColor: `${user.department.color}40`,
                          color: user.department.color,
                        }}
                      >
                        <Building2 className="w-2.5 h-2.5" />
                        {user.department.name}
                      </span>
                    ) : (
                      <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-gray-400 border border-gray-200 bg-gray-50">
                        <Building2 className="w-2.5 h-2.5" />
                        No dept.
                      </span>
                    )}

                    {/* Role badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      {user.role.replace(/_/g, " ")}
                    </span>

                    {/* Joined date */}
                    <p className="text-xs text-gray-400 hidden lg:block w-24 text-right">
                      {formatDate(user.createdAt)}
                    </p>

                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => { setEditUser(user); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.location.assign(`/users/${user.id}/profile`)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.isActive ? (
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => setConfirmDeactivate(user)}
                          >
                            <UserX className="w-3.5 h-3.5 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600 focus:text-green-600 focus:bg-green-50"
                            onClick={() => setConfirmReactivate(user)}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats footer */}
      {!loading && users.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-gray-500 px-1">
          <span>Showing {filtered.length} of {users.length} users</span>
          {departments.length > 0 && (
            <span>{departments.length} department{departments.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      )}

      {/* Dialogs */}
      <UserFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditUser(null); }}
        onSaved={handleUserSaved}
        departments={departments}
        editUser={editUser}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        title={`Deactivate ${confirmDeactivate?.firstName}?`}
        description="This user will no longer be able to log in. You can reactivate them at any time."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
        onClose={() => setConfirmDeactivate(null)}
      />

      <ConfirmDialog
        open={!!confirmReactivate}
        title={`Reactivate ${confirmReactivate?.firstName}?`}
        description="This user will regain access to the workspace with their previous role and permissions."
        confirmLabel="Reactivate"
        onConfirm={() => confirmReactivate && handleReactivate(confirmReactivate)}
        onClose={() => setConfirmReactivate(null)}
      />
    </div>
  );
}
