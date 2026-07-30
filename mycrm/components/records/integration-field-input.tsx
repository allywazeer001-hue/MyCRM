"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, SlidersHorizontal, Check } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface IntegrationSearchItem {
  id: string;
  label: string;
  columns: Record<string, any>;
  data: Record<string, any>;
}

interface IntegrationFieldInputProps {
  /** The Integration Field itself (has settings.resultColumnFieldIds etc.) */
  fieldId: string;
  /** Full API path to search against — differs for internal vs public forms */
  searchEndpoint: string;
  value: any;
  onChange: (v: any) => void;
  /**
   * Fired with the selected record's raw id + data, plus the source module's
   * full field list (id/name/label) — the caller needs the latter to resolve
   * a mapping's sourceFieldId to the name that keys into recordData. The
   * final `allowManualUpdate` flag tells the caller whether this field's own
   * config opts in to writing mapped values back into this exact record on
   * submit (see the field's "Allow manual selection to update the CRM
   * record" setting) — off unless the admin explicitly turned it on.
   */
  onRecordSelect?: (
    id: string,
    recordData: Record<string, any>,
    sourceFields: { id: string; name: string; label: string }[],
    allowManualUpdate?: boolean,
  ) => void;
  placeholder?: string;
}

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export function IntegrationFieldInput({
  fieldId, searchEndpoint, value, onChange, onRecordSelect, placeholder = "Search records…",
}: IntegrationFieldInputProps) {
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<IntegrationSearchItem[]>([]);
  const [columns, setColumns] = useState<{ name: string; label: string }[]>([]);
  const [sourceFields, setSourceFields] = useState<{ id: string; name: string; label: string }[]>([]);
  const [searchFields, setSearchFields] = useState<{ name: string; label: string }[]>([]);
  const [allowManualUpdate, setAllowManualUpdate] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Advanced search" — restrict matching to exactly one configured Search
  // Field instead of OR-ing across all of them (useful once results get
  // ambiguous, e.g. short numeric IDs substring-matching each other).
  const [advancedField, setAdvancedField] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (advancedRef.current && !advancedRef.current.contains(e.target as Node)) setAdvancedOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const runSearch = (q: string, p: number, fieldOverride: string | null) => {
    setLoading(true);
    const searchFieldParam = fieldOverride ? `&searchField=${encodeURIComponent(fieldOverride)}` : "";
    api.get(`${searchEndpoint}?fieldId=${encodeURIComponent(fieldId)}&search=${encodeURIComponent(q)}&page=${p}&pageSize=${PAGE_SIZE}${searchFieldParam}`)
      .then(({ data }) => {
        setItems(prev => p === 1 ? (data.items || []) : [...prev, ...(data.items || [])]);
        setTotal(data.total ?? 0);
        setColumns(data.columns || []);
        setSourceFields(data.sourceFields || []);
        setSearchFields(data.searchFields || []);
        setAllowManualUpdate(!!data.allowManualUpdate);
        setActiveIdx(-1);
      })
      .catch(() => { if (p === 1) { setItems([]); setTotal(0); } })
      .finally(() => setLoading(false));
  };

  // Load the configured Search Fields up front — metadata only, no records —
  // so the Advanced Search icon is there and ready the moment the field
  // renders, not appear only after an interaction. pageSize=1 since only
  // `searchFields`/`sourceFields`/`columns` from the response are used here;
  // `items`/`total` are deliberately left alone (see the effect below —
  // nothing should be listed until the visitor actually types something).
  useEffect(() => {
    api.get(`${searchEndpoint}?fieldId=${encodeURIComponent(fieldId)}&search=&page=1&pageSize=1`)
      .then(({ data }) => {
        setColumns(data.columns || []);
        setSourceFields(data.sourceFields || []);
        setSearchFields(data.searchFields || []);
        setAllowManualUpdate(!!data.allowManualUpdate);
      })
      .catch(() => {});
  }, [fieldId, searchEndpoint]);

  // The only fetch trigger: typing, debounced — re-runs on every change to
  // the query, the active Advanced Search field, or the field itself, so
  // picking a different result after an earlier selection always reflects
  // whatever is currently typed rather than getting stuck on old results.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Don't list anything until there's an actual query — an empty search
    // matches every record in the module, which isn't a "search result."
    if (!search.trim()) { setItems([]); setTotal(0); return; }
    debounceRef.current = setTimeout(() => { setPage(1); runSearch(search, 1, advancedField); }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open, fieldId, advancedField]);

  const select = (item: IntegrationSearchItem) => {
    onChange(item.id);
    setLabel(item.label);
    setSearch("");
    setItems([]);
    setTotal(0);
    setOpen(false);
    onRecordSelect?.(item.id, item.data || {}, sourceFields, allowManualUpdate);
  };

  const clear = () => { onChange(null); setLabel(""); setSearch(""); setItems([]); setTotal(0); };

  const chooseAdvancedField = (name: string | null) => {
    setAdvancedField(name);
    setAdvancedOpen(false);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIdx >= 0) select(items[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const activeFieldLabel = advancedField ? searchFields.find(f => f.name === advancedField)?.label ?? advancedField : null;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={label || search}
          onChange={e => { setSearch(e.target.value); setLabel(""); setOpen(true); }}
          onFocus={e => { setOpen(true); setAdvancedOpen(false); e.target.select(); }}
          onClick={e => (e.target as HTMLInputElement).select()}
          onKeyDown={onKeyDown}
          placeholder={activeFieldLabel ? `Search by ${activeFieldLabel}…` : placeholder}
          className={cn(
            "w-full pl-9 h-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400",
            searchFields.length > 0 ? "pr-16" : "pr-9",
          )}
        />

        {/* Advanced search — lives inside the search field itself, always
            available as soon as Search Fields are configured, not just once
            the visitor has clicked/typed into the box. */}
        {searchFields.length > 0 && (
          <div ref={advancedRef} className="absolute right-9 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => { setAdvancedOpen(v => !v); setOpen(false); }}
              title="Advanced search — choose a field to search by"
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center transition-colors",
                advancedField ? "text-indigo-600" : "text-slate-400 hover:text-slate-600",
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {advancedOpen && (
              <div className="absolute z-50 top-full right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl min-w-[190px] py-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Search by</p>
                <button
                  type="button"
                  onClick={() => chooseAdvancedField(null)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                    !advancedField ? "text-indigo-700 font-medium" : "text-slate-700",
                  )}
                >
                  All fields
                  {!advancedField && <Check className="w-3.5 h-3.5" />}
                </button>
                <div className="border-t border-slate-100 my-1" />
                {searchFields.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => chooseAdvancedField(f.name)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                      advancedField === f.name ? "text-indigo-700 font-medium" : "text-slate-700",
                    )}
                  >
                    <span className="truncate">{f.label}</span>
                    {advancedField === f.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 animate-spin pointer-events-none" />}
        {value && !loading && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && search.trim() && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto min-w-max">
          {loading && items.length === 0 ? (
            <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300 mx-auto" /></div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">No matching record found</div>
          ) : (
            <>
              {columns.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sticky top-0 bg-white">
                  <span className="flex-1">Record</span>
                  {columns.map(c => <span key={c.name} className="w-28 shrink-0 truncate">{c.label}</span>)}
                </div>
              )}
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm border-b border-slate-50 last:border-0 transition-colors",
                    i === activeIdx ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {columns.map(c => <span key={c.name} className="w-28 shrink-0 truncate text-xs text-slate-500">{String(item.columns?.[c.name] ?? "")}</span>)}
                </button>
              ))}
              {items.length < total && (
                <button
                  type="button"
                  onClick={() => { const next = page + 1; setPage(next); runSearch(search, next, advancedField); }}
                  disabled={loading}
                  className="w-full py-2 text-xs text-center text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Loading…" : `Load more (${items.length} of ${total})`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
