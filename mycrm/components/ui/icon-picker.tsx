"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { LUCIDE_MAP, LUCIDE_ICON_NAMES } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "./module-icon";

const QUICK_EMOJI = [
  "📦","👤","📋","🏢","🏫","🏥","📊","🎯","🔧","🌍",
  "📁","💼","🔑","💡","🚀","⚙️","📌","🗂️","💰","📈",
  "🎓","❤️","🌱","🏆","🔐","📲","💬","🎪","🌐","🏠",
];

interface IconPickerProps {
  value?: string | null;
  onChange: (icon: string) => void;
  color?: string | null;
  size?: number;
}

export function IconPicker({ value, onChange, color, size = 26 }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = LUCIDE_ICON_NAMES.filter(
    name => !search || name.toLowerCase().includes(search.toLowerCase()),
  );

  const close = () => { setOpen(false); setSearch(""); };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Click to change icon"
        className="w-14 h-14 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={color ? { backgroundColor: `${color}18`, borderColor: `${color}55` } : undefined}
      >
        <ModuleIcon icon={value || "Package"} size={size} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute left-0 top-full z-40 mt-1.5 w-72 bg-white rounded-xl border border-gray-200 shadow-2xl p-3">

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search icons…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Lucide icon grid */}
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
              Icons {search && `· ${filtered.length} results`}
            </p>
            <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto">
              {filtered.map(name => {
                const Icon = LUCIDE_MAP[name] as any;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => { onChange(name); close(); }}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 transition text-gray-500 hover:text-blue-600",
                      value === name && "bg-blue-100 text-blue-600 ring-1 ring-blue-400",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-8 text-center text-xs text-gray-400 py-4">No icons found</p>
              )}
            </div>

            {/* Emoji quick-picks */}
            {!search && (
              <div className="border-t border-gray-100 mt-2 pt-2">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Emoji</p>
                <div className="grid grid-cols-10 gap-0.5">
                  {QUICK_EMOJI.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => { onChange(em); close(); }}
                      className={cn(
                        "w-7 h-7 rounded-md text-base flex items-center justify-center hover:bg-blue-50 transition",
                        value === em && "bg-blue-100 ring-1 ring-blue-400",
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
