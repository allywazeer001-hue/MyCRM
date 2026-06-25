import Link from "next/link";
import { Settings2, FileText, GitBranch } from "lucide-react";

const ITEMS = [
  { href: "/customization/request-types", icon: FileText, label: "Request Types", desc: "Create and manage configurable request categories" },
  { href: "/customization/blueprints",    icon: GitBranch, label: "Blueprints",    desc: "Design approval workflows with stages and actions" },
];

export default function CustomizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings2 className="w-6 h-6 text-blue-600" /> Customization</h1>
        <p className="text-sm text-gray-500 mt-1">Configure workflows, request types, and approval processes</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ITEMS.map(item => (
          <Link key={item.href} href={item.href} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{item.label}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
