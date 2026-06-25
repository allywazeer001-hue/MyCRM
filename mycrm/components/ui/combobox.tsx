"use client";
import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  clearable?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export function Combobox({
  options,
  value = "",
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  className,
  clearable,
  loading,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
    else setSearch("");
  }, [open]);

  const select = (v: string) => { onChange(v); setOpen(false); };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors",
          "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
          open ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50"
        )}
      >
        <span className={cn("truncate min-w-0 mr-2", selected ? "text-gray-900" : "text-gray-400")}>
          {loading ? "Loading…" : (selected?.label ?? placeholder)}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); onChange(""); }}
              onKeyDown={e => e.key === "Enter" && onChange("")}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-1.5 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm border-none focus:outline-none bg-transparent"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">{emptyText}</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-gray-50",
                    o.value === value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  )}
                >
                  <Check className={cn("w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600", o.value === value ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="truncate">{o.label}</p>
                    {o.description && <p className="text-xs text-gray-400 truncate mt-0.5">{o.description}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
