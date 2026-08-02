"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  User, Shield, Mail,
  Zap, BarChart3, ArrowRight,
  CheckCircle2, AlertCircle, GitFork,
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
import { BRAND } from "@/lib/core-brand";
import { useTheme } from "next-themes";
import { THEMES, THEME_STORAGE_KEY, resolveAutoTheme, type ThemeChoice } from "@/lib/themes";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

const CONFIG_QUICK_LINKS = [
  {
    href: "/settings/routing",
    icon: GitFork,
    label: "Request Routing",
    description: "Route CRM records to users, departments, or roles based on configurable conditions.",
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    href: "/settings/field-rules",
    icon: Zap,
    label: "Field Rules",
    description: "Auto-populate and control fields based on conditions as users fill out records.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
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

function AppearanceSection() {
  const { user, setUser } = useAuthStore();
  const { setTheme } = useTheme();
  const [choice, setChoice] = useState<ThemeChoice>("light");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined" ? localStorage.getItem(THEME_STORAGE_KEY) : null) as ThemeChoice | null;
    setChoice(((user?.theme as ThemeChoice) || stored || "light"));
  }, [user?.theme]);

  const pick = async (id: ThemeChoice) => {
    setChoice(id);
    setTheme(id === "auto" ? resolveAutoTheme() : id);
    if (typeof window !== "undefined") localStorage.setItem(THEME_STORAGE_KEY, id);
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${user?.id}`, { theme: id });
      if (user) setUser({ ...user, ...data, theme: id } as any);
    } catch {}
    setSaving(false);
  };

  const options: { id: ThemeChoice; label: string; description: string; swatches: string[] }[] = [
    ...THEMES.map(t => ({ id: t.id as ThemeChoice, label: t.label, description: t.description, swatches: t.swatches })),
    { id: "auto", label: "Auto", description: "Follows local time — Light during the day, Dark at night.", swatches: ["#ffffff", "#0d1220"] },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-base font-semibold text-gray-900">Appearance</h2>
        {saving && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Choose how {BRAND.name} looks for you. Applies immediately and syncs to your account.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map(opt => {
          const active = choice === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt.id)}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all",
                active ? "border-brand bg-brand/5 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-semibold flex items-center gap-1.5", active ? "text-brand" : "text-gray-800")}>
                  <span className="flex -space-x-1">
                    {opt.swatches.map((c, i) => (
                      <span key={i} className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: c }} />
                    ))}
                  </span>
                  {opt.label}
                </span>
                {active && <span className="text-xs px-2 py-0.5 bg-brand text-white rounded-full font-medium">Active</span>}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
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

      <Separator />
      <AppearanceSection />

      {isAdmin && (
        <>
          <Separator />
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Administration</h2>
            <p className="text-sm text-gray-500 mb-4">
              Organization, units, access control, users, and everything else administrative now lives in one place.
            </p>
            <Link href="/admin">
              <div className="group flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white cursor-pointer">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 bg-amber-50 text-amber-600 border-amber-100">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Admin Panel</p>
                  <p className="text-xs text-gray-500 mt-0.5">Organization, landing page, units, access control, users, and more.</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
              </div>
            </Link>
          </div>

          <Separator />
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">Platform-wide settings for request routing and field rules.</p>
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
