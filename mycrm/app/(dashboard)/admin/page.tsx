"use client";
import Link from "next/link";
import {
  Building2, Palette, Shield, Globe as GlobeIcon, Plug, Users, LayoutGrid, ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

// One organized hub for everything administrative — organization branding,
// the public landing page, units/access/users, and (Super Admin only) the
// cross-organization Platform view. Replaces having these scattered across
// separate sidebar links.

const ADMIN_SECTIONS = [
  {
    href: "/settings/organization",
    icon: Building2,
    label: "Organization",
    description: "Organization profile, branding, and usage statistics.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    href: "/land-admin",
    icon: Palette,
    label: "Landing Page",
    description: "Edit the public marketing page's content, images, and colors.",
    color: "bg-pink-50 text-pink-600 border-pink-100",
  },
  {
    href: "/admin/departments",
    icon: Building2,
    label: "Units",
    description: "Organizational units, unit heads, and unit-level permissions.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    href: "/admin/permissions",
    icon: Shield,
    label: "Access Control",
    description: "Role-based permissions per module, down to individual fields.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    href: "/admin/global-lists",
    icon: GlobeIcon,
    label: "Global Lists",
    description: "Shared hierarchical lookup data used across modules.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    href: "/users",
    icon: Users,
    label: "Users",
    description: "User accounts, roles, and invitations.",
    color: "bg-green-50 text-green-600 border-green-100",
  },
  {
    href: "/settings/connected-apps",
    icon: Plug,
    label: "Connected Applications",
    description: "Approve external apps, issue API credentials, and control access.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    href: "/settings/portal",
    icon: LayoutGrid,
    label: "Portal Settings",
    description: "Modules, users, appearance, and the portal page builder.",
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
];

const SUPER_ADMIN_SECTIONS = [
  {
    href: "/platform",
    icon: GlobeIcon,
    label: "Platform Organizations",
    description: "Manage every organization on the platform.",
    color: "bg-slate-50 text-slate-600 border-slate-200",
  },
];

function AdminCard({ href, icon: Icon, label, description, color }: {
  href: string; icon: any; label: string; description: string; color: string;
}) {
  return (
    <Link href={href}>
      <div className="group flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white cursor-pointer h-full">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" />
      </div>
    </Link>
  );
}

export default function AdminPanelPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-0.5">Everything administrative, organized in one place.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ADMIN_SECTIONS.map(section => (
          <AdminCard key={section.href} {...section} />
        ))}
      </div>

      {isSuperAdmin && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Platform</h2>
          <p className="text-sm text-gray-500 mb-4">Super Admin only — spans every organization, not just this one.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUPER_ADMIN_SECTIONS.map(section => (
              <AdminCard key={section.href} {...section} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
