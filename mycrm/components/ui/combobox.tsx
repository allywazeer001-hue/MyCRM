"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

// Guards against upstream data issues (e.g. two records that legitimately share a
// name) producing options with duplicate `value`s — which would otherwise crash
// React's key uniqueness check. Keeps the first occurrence of each value.
function dedupeOptions(options: ComboboxOption[]): ComboboxOption[] {
  const seen = new Set<string>();
  return options.filter(o => {
    if (seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });
}

// Both Combobox and MultiCombobox render their dropdown panel into document.body via a
// portal, positioned with `fixed` coordinates computed from the trigger's own bounding
// rect. Rendering it inline (position: absolute) would get silently clipped by any
// ancestor with overflow:hidden/scroll — e.g. the ScrollArea these are commonly used
// inside — with no visual indication anything is wrong, just an empty-looking dropdown.
interface DropdownPos { top: number; left: number; width: number; openUpward: boolean; }
const ESTIMATED_PANEL_HEIGHT = 260;

function useDropdownPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>): DropdownPos | null {
  const [pos, setPos] = useState<DropdownPos | null>(null);

  useEffect(() => {
    if (!open) { setPos(null); return; }
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < ESTIMATED_PANEL_HEIGHT && rect.top > spaceBelow;
      setPos({
        top: openUpward ? rect.top : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return pos;
}

function panelStyle(pos: DropdownPos): React.CSSProperties {
  return pos.openUpward
    ? { position: "fixed", bottom: window.innerHeight - pos.top + 4, left: pos.left, width: pos.width }
    : { position: "fixed", top: pos.top + 4, left: pos.left, width: pos.width };
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
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pos = useDropdownPosition(open, containerRef);

  const dedupedOptions = dedupeOptions(options);
  const selected = dedupedOptions.find(o => o.value === value);
  const filtered = search
    ? dedupedOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : dedupedOptions;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
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

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          className="z-50 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg"
          style={panelStyle(pos)}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}

// ── MultiCombobox ───────────────────────────────────────────────────────────
// Same search-filtered dropdown as Combobox, but for picking several values.
// Only ever renders options matching the current search term — safe for lists
// that can grow large, since the full option set is never dumped into the DOM
// as a wall of chips.

interface MultiComboboxProps {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiCombobox({
  options,
  values,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  className,
  disabled,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pos = useDropdownPosition(open, containerRef);

  const dedupedOptions = dedupeOptions(options);
  const selectedOptions = dedupedOptions.filter(o => values.includes(o.value));
  const filtered = search
    ? dedupedOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : dedupedOptions;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
    else setSearch("");
  }, [open]);

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter(x => x !== v) : [...values, v]);

  const removeValue = (v: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(values.filter(x => x !== v));
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5 text-sm shadow-sm transition-colors min-h-9",
          "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
          open ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50"
        )}
      >
        <div className="flex flex-wrap gap-1 min-w-0 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 truncate">{placeholder}</span>
          ) : (
            selectedOptions.map(o => (
              <span
                key={o.value}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium"
              >
                <span className="truncate max-w-[140px]">{o.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => removeValue(o.value, e)}
                  onKeyDown={e => { if (e.key === "Enter") removeValue(o.value); }}
                  className="hover:text-red-500"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          className="z-50 min-w-[220px] rounded-md border border-gray-200 bg-white shadow-lg"
          style={panelStyle(pos)}
        >
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
              filtered.map(o => {
                const active = values.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-gray-50",
                      active ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    )}
                  >
                    <Check className={cn("w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600", active ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <p className="truncate">{o.label}</p>
                      {o.description && <p className="text-xs text-gray-400 truncate mt-0.5">{o.description}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
