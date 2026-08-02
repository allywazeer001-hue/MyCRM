"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  label: string;
  value: string;
}

// A closed-by-default dropdown for choosing more than one option — used for
// Multi-Select fields wherever they're edited. Deliberately not a row of
// always-expanded pill/tab buttons: that pattern doesn't scale once a field
// has more than a handful of options and reads as tabs rather than a field.
export function MultiSelectDropdown({
  options, value, onChange, placeholder = "Select…",
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };

  const selected = options.filter(o => value.includes(o.value));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-9 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white flex items-center justify-between gap-2 hover:border-gray-300 transition-colors"
      >
        <span className="flex flex-wrap gap-1 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selected.map(o => (
              <span key={o.value} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-brand/10 text-brand text-xs rounded-full">
                {o.label}
                <X
                  className="w-3 h-3 cursor-pointer hover:opacity-70"
                  onClick={e => { e.stopPropagation(); toggle(o.value); }}
                />
              </span>
            ))
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 min-w-[200px] max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No options</p>
          ) : options.map(o => {
            const checked = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors",
                  checked && "bg-brand/5"
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded border shrink-0 flex items-center justify-center",
                  checked ? "bg-brand border-brand" : "border-gray-300"
                )}>
                  {checked && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
