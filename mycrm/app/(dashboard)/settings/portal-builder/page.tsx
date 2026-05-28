"use client";
import { useRouter } from "next/navigation";
import { FileText, Menu, Bell, ChevronRight, Blocks } from "lucide-react";

const SECTIONS = [
  {
    href: "/settings/portal-builder/pages",
    icon: FileText,
    color: "indigo",
    title: "Page Builder",
    description: "Create custom pages with drag-and-drop content blocks. Publish to the portal for users to view.",
  },
  {
    href: "/settings/portal-builder/menus",
    icon: Menu,
    color: "violet",
    title: "Menu Builder",
    description: "Design the portal sidebar navigation. Add parent/child items, link to pages or built-in sections.",
  },
  {
    href: "/settings/portal-builder/notifications",
    icon: Bell,
    color: "amber",
    title: "Notifications & Announcements",
    description: "Create targeted announcements, schedule broadcasts, and manage notification delivery to portal users.",
  },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; badge: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
  amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  badge: "bg-amber-100 text-amber-700" },
};

export default function PortalBuilderHubPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Blocks className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Portal Builder</h1>
        </div>
        <p className="text-sm text-gray-500">
          Design and customise your portal experience — pages, navigation menus, and notifications — all in one place.
        </p>
      </div>

      <div className="grid gap-4">
        {SECTIONS.map(({ href, icon: Icon, color, title, description }) => {
          const c = COLOR_MAP[color];
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left flex items-start gap-4 hover:border-gray-200 hover:shadow-md transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${c.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How Portal Builder works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
          <li>Build custom pages with heading, text, card, and table blocks</li>
          <li>Add pages to the sidebar menu with parent/child structure</li>
          <li>Publish pages so portal users can view them under the linked menu items</li>
          <li>Use Notifications to send targeted announcements to active portal users</li>
        </ol>
      </div>
    </div>
  );
}
