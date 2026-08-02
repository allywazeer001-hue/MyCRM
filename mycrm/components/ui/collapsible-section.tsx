"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared "settings group" primitive: an icon + title + optional at-a-glance
// summary (so the current value is visible without expanding), collapsible
// so a long settings panel reads as distinct groups instead of one flat
// scroll of loosely-separated fields.
export function CollapsibleSection({
  icon: Icon, iconClassName, title, summary, defaultOpen = true, children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", iconClassName ?? "bg-gray-100 text-gray-500")}>
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-gray-700 shrink-0">{title}</span>
          {summary && <span className="text-xs text-gray-400 truncate">· {summary}</span>}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150", open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-2.5 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}
