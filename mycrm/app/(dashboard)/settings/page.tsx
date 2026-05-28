"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  User, Building2, Shield, Globe, Users, Mail,
  Zap, BarChart3, FileText, ArrowRight,
  CheckCircle2, AlertCircle, GitBranch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg border text-sm mb-4",
      type === "success"
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-700"
    )}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

function ProfileSection() {
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const form = useForm({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
    },
  });

  const onSave = async (data: any) => {
    setSaving(true);
    try {
      const updated = await api.patch(`/users/${user?.id}`, data);
      if (setUser && user) setUser({ ...user, ...updated });
      setMsg({ text: "Profile updated successfully.", type: "success" });
    } catch {
      setMsg({ text: "Failed to update profile.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-4 h-4" /> Profile Information
        </CardTitle>
        <CardDescription>Update your name, email, and contact details.</CardDescription>
      </CardHeader>
      <CardContent>
        {msg && <Toast msg={msg.text} type={msg.type} />}
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input {...form.register("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input {...form.register("lastName")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email address</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input type="tel" placeholder="+1 (555) 000-0000" {...form.register("phone")} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSave = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      setMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }
    if (data.newPassword.length < 8) {
      setMsg({ text: "Password must be at least 8 characters.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/users/${user?.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setMsg({ text: "Password updated successfully.", type: "success" });
      form.reset();
    } catch {
      setMsg({ text: "Failed to update password. Check your current password.", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4" /> Security
        </CardTitle>
        <CardDescription>Change your password and manage account security.</CardDescription>
      </CardHeader>
      <CardContent>
        {msg && <Toast msg={msg.text} type={msg.type} />}
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" {...form.register("currentPassword")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input type="password" {...form.register("newPassword")} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input type="password" {...form.register("confirmPassword")} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Minimum 8 characters. Use a mix of letters, numbers, and symbols.</p>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const ADMIN_QUICK_LINKS = [
  {
    href: "/admin/global-lists",
    icon: Globe,
    label: "Global Lists",
    description: "Manage shared hierarchical lookup data used across modules.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    href: "/admin/departments",
    icon: Building2,
    label: "Departments",
    description: "Organize your organization's structure and teams.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    href: "/admin/permissions",
    icon: Shield,
    label: "Access Control",
    description: "Configure role-based permissions for modules and actions.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    href: "/users",
    icon: Users,
    label: "Users",
    description: "Manage user accounts, roles, and invitations.",
    color: "bg-green-50 text-green-600 border-green-100",
  },
];

const CONFIG_QUICK_LINKS = [
  {
    href: "/forms",
    icon: FileText,
    label: "Forms",
    description: "Build forms, share public links, and view submissions.",
  },
  {
    href: "/settings/automation",
    icon: Zap,
    label: "Automation",
    description: "Workflows, blueprints, and rule-based process automation.",
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    href: "/settings/email",
    icon: Mail,
    label: "Email Settings",
    description: "Configure SMTP, email templates, and notifications.",
    badge: "Coming Soon",
  },
  {
    href: "/settings/analytics",
    icon: BarChart3,
    label: "Analytics",
    description: "Customize dashboards and reporting preferences.",
    badge: "Coming Soon",
  },
];

function QuickLinkCard({ href, icon: Icon, label, description, color, badge }: {
  href: string;
  icon: any;
  label: string;
  description: string;
  color?: string;
  badge?: string;
}) {
  const inner = (
    <div className="group flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white cursor-pointer">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border shrink-0", color || "bg-gray-50 text-gray-600 border-gray-100")}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {badge && <Badge variant="secondary" className="text-xs px-1.5 py-0">{badge}</Badge>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" />
    </div>
  );

  if (badge) return <div className="opacity-60 cursor-not-allowed">{inner}</div>;
  return <Link href={href}>{inner}</Link>;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal account and workspace configuration.</p>
      </div>

      <ProfileSection />
      <SecuritySection />

      {isAdmin && (
        <>
          <Separator />
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Administration</h2>
            <p className="text-sm text-gray-500 mb-4">Manage users, departments, access control, and shared data.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ADMIN_QUICK_LINKS.map(link => (
                <QuickLinkCard key={link.href} {...link} />
              ))}
            </div>
          </div>

          <Separator />
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">Platform-wide settings for email, automation, forms, and analytics.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONFIG_QUICK_LINKS.map(link => (
                <QuickLinkCard key={link.href} {...link} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
