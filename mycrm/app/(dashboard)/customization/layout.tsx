import { ReactNode } from "react";
import Link from "next/link";

const NAV = [
  { href: "/customization/request-types",  label: "Request Types" },
  { href: "/customization/blueprints",     label: "Blueprints" },
];

export default function CustomizationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-6 min-h-full">
      <aside className="w-52 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-3 mb-3">Customization</h2>
        <nav className="space-y-0.5">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-100 transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
