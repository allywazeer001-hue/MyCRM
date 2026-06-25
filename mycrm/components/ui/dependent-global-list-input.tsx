"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { ChevronDown, Search, X, Loader2, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ListItem { id: string; label: string; value: string; parentId: string | null }

// ── Searchable combobox for a single level of a global list ──────────────────
export function GlobalListCombobox({
  listId, parentId, value, onChange, placeholder, disabled, levelLabel, staticItems,
}: {
  listId: string; parentId?: string | null; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; levelLabel?: string;
  /** When provided, skip API fetches and filter this list locally instead */
  staticItems?: ListItem[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const labelFetchedFor = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load items from API — skipped when staticItems is provided
  useEffect(() => {
    if (staticItems !== undefined) return;
    if (!listId) return;
    if (!open && !debouncedSearch) return;
    setLoading(true);
    let url: string;
    if (debouncedSearch) {
      url = "/global-lists/" + listId + "/items?search=" + encodeURIComponent(debouncedSearch);
    } else if (parentId) {
      url = "/global-lists/" + listId + "/items/" + parentId + "/children";
    } else {
      url = "/global-lists/" + listId + "/items";
    }
    api.get(url)
      .then(r => setItems(r.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [listId, parentId, open, debouncedSearch, staticItems]);

  // Pre-load items on mount so the list is ready when opened — skipped in static mode
  useEffect(() => {
    if (staticItems !== undefined || !listId || disabled) return;
    let url = parentId
      ? "/global-lists/" + listId + "/items/" + parentId + "/children"
      : "/global-lists/" + listId + "/items";
    api.get(url)
      .then(r => setItems(r.data ?? []))
      .catch(() => {});
  }, [listId, parentId, disabled, staticItems]);

  // Compute the items to display (static: local filter; dynamic: API result)
  const displayItems: ListItem[] = staticItems !== undefined
    ? (search ? staticItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) : staticItems)
    : items;

  // Resolve selected label — check local list first, fall back to a direct item fetch
  useEffect(() => {
    if (!value) { setSelectedLabel(""); labelFetchedFor.current = ""; return; }
    const all = staticItems !== undefined ? staticItems : items;
    const found = all.find(i => i.id === value);
    if (found) { setSelectedLabel(found.label); return; }
    if (labelFetchedFor.current === value || !listId) { if (!selectedLabel) setSelectedLabel(value); return; }
    labelFetchedFor.current = value;
    api.get("/global-lists/" + listId + "/items/" + value)
      .then(r => setSelectedLabel(r.data?.label || value))
      .catch(() => setSelectedLabel(value));
  }, [value, listId, items, staticItems]);

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) setTimeout(() => inputRef.current?.focus(), 50);
    if (!o) setSearch("");
  };

  const handleSelect = (item: ListItem) => {
    onChange(item.id);
    setSelectedLabel(item.label);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSelectedLabel("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border transition-colors",
            "bg-white border-gray-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-100",
            open && "border-blue-400 ring-2 ring-blue-500/20"
          )}
        >
          <span className={cn("truncate text-left flex-1", !selectedLabel && "text-gray-400")}>
            {disabled ? (levelLabel ? `Select ${levelLabel} first` : "Select parent first") : (selectedLabel || placeholder || "Select…")}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                onClick={handleClear}
                className="w-4 h-4 rounded-full hover:bg-gray-200 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-gray-400" />
              </span>
            )}
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", open && "rotate-180")} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 overflow-hidden border border-gray-200 shadow-lg"
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: 200 }}
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
          {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
          {search && !loading && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {displayItems.length === 0 && !loading ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">
              {search ? "No results found" : "No items available"}
            </div>
          ) : (
            displayItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 transition-colors",
                  value === item.id && "bg-blue-50 text-blue-700 font-medium"
                )}
              >
                <Check className={cn("w-3.5 h-3.5 shrink-0", value === item.id ? "opacity-100 text-blue-600" : "opacity-0")} />
                {item.label}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Cascading multi-level combobox ────────────────────────────────────────────
export function DependentGlobalListInput({
  listId, value, onChange, placeholder,
}: {
  listId: string; value: any; onChange: (v: any) => void; placeholder?: string;
}) {
  const [selections, setSelections] = useState<string[]>([]);
  const [hasChildren, setHasChildren] = useState<Record<string, boolean>>({});
  const lastInitializedValue = useRef<string>("");

  useEffect(() => {
    if (!listId) return;
    const rawVal = value && typeof value === "object" && !Array.isArray(value) && value.id
      ? String(value.id) : value;
    const strVal = Array.isArray(rawVal) ? rawVal.join(",") : (typeof rawVal === "string" ? rawVal : "");

    if (lastInitializedValue.current === strVal) return;
    lastInitializedValue.current = strVal;

    if (!strVal) { setSelections([]); return; }
    if (Array.isArray(value) && value.length > 0) { setSelections(value); return; }

    api.get("/global-lists/" + listId + "/items/" + strVal + "/ancestors")
      .then(r => {
        const ancestors: string[] = r.data ?? [];
        const path = ancestors.length > 0 ? ancestors : [strVal];
        setSelections(path);
        path.slice(0, -1).forEach(id => {
          api.get("/global-lists/" + listId + "/items/" + id + "/children")
            .then(r2 => setHasChildren(prev => ({ ...prev, [id]: (r2.data ?? []).length > 0 })))
            .catch(() => {});
        });
      })
      .catch(() => setSelections([strVal]));
  }, [value, listId]);

  const checkChildren = useCallback(async (lId: string, itemId: string) => {
    if (!itemId) return false;
    try {
      const r = await api.get("/global-lists/" + lId + "/items/" + itemId + "/children");
      return (r.data ?? []).length > 0;
    } catch { return false; }
  }, []);

  const handleSelect = useCallback(async (level: number, itemId: string) => {
    const next = [...selections.slice(0, level), itemId].filter(Boolean);
    setSelections(next);
    const leafValue = next[next.length - 1] || "";
    lastInitializedValue.current = leafValue;
    onChange(leafValue);
    if (itemId) {
      const hasKids = await checkChildren(listId, itemId);
      setHasChildren(prev => ({ ...prev, [itemId]: hasKids }));
    }
  }, [selections, listId, onChange, checkChildren]);

  if (!listId) return <div className="text-xs text-amber-600">No list configured</div>;

  const levels: Array<{ parentId: string | null }> = [{ parentId: null }];
  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];
    if (sel && hasChildren[sel] !== false) levels.push({ parentId: sel });
  }

  return (
    <div className="space-y-2">
      {levels.map((level, i) => (
        <GlobalListCombobox
          key={i + "-" + (level.parentId || "root")}
          listId={listId}
          parentId={level.parentId}
          value={selections[i] || ""}
          onChange={v => handleSelect(i, v)}
          placeholder={i === 0 ? (placeholder || "Select…") : "Select sub-item…"}
          disabled={i > 0 && !selections[i - 1]}
          levelLabel={i > 0 ? `level ${i}` : undefined}
        />
      ))}
    </div>
  );
}

// ── Single-level searchable global list combobox ─────────────────────────────
export function GlobalListInput({
  listId, value, onChange, placeholder,
}: {
  listId: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <GlobalListCombobox
      listId={listId}
      parentId={null}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}
