"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Search, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Field } from "@/store/modules.store";
import { cn, generateId, parseFieldSettings } from "@/lib/utils";
import { FormSectionRenderer } from "@/components/ui/form-section-renderer";
import { DEFAULT_MODULE_LAYOUT } from "@/lib/layout-templates";
import { evaluateModuleRules } from "@/lib/evaluate-layout-rules";
import { FileUploadInput } from "@/components/ui/file-upload-input";
import { DependentGlobalListInput, GlobalListInput, GlobalListCombobox } from "@/components/ui/dependent-global-list-input";
import { useGlobalListDependency } from "@/hooks/use-global-list-dependency";
import { useWorkflowEvaluator } from "@/hooks/use-workflow-evaluator";
import { ModuleIcon } from "@/components/ui/module-icon";
import { DateFieldInput } from "@/components/ui/date-field-input";
import { recomputeFormulaFields, formatFormulaDisplayValue } from "@/lib/formula-engine";
import { IntegrationFieldInput } from "@/components/records/integration-field-input";
import { applyIntegrationMapping } from "@/lib/integration-mapping";

// ── Reusable field inputs ─────────────────────────────────────────────────

function LookupInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const rawSettings = (field as any).settings;
  const settings = typeof rawSettings === "string" ? (() => { try { return JSON.parse(rawSettings); } catch { return {}; } })() : (rawSettings || {});
  const targetModuleId = settings.lookupModuleId || (field as any).lookupModuleId;
  const displayField = settings.displayField || "name";

  // Resolver may return {id, label} — extract both for initialization
  const resolvedId    = value && typeof value === "object" && value.id  ? String(value.id)    : (typeof value === "string" ? value : "");
  const resolvedLabel = value && typeof value === "object" && value.label ? String(value.label) : "";

  const [search, setSearch] = useState(resolvedLabel);
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // When the record loads with a pre-existing value, pre-populate the search with the label
  useEffect(() => {
    if (resolvedLabel && !search) setSearch(resolvedLabel);
  }, [resolvedLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!targetModuleId) return;
    setLoading(true);
    api.get(`/records/lookup?moduleId=${targetModuleId}&displayField=${displayField}&search=${search}`)
      .then(r => setResults(r.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [search, targetModuleId, displayField]);

  if (!targetModuleId) return <p className="text-xs text-gray-400 italic">Lookup not configured</p>;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={`Search ${displayField}...`}
            className="pl-9"
          />
        </div>
        {resolvedId && <button onClick={() => { setSearch(""); onChange(null); }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border shadow-lg max-h-48 overflow-y-auto">
          {loading && <p className="text-xs text-gray-400 p-3">Searching...</p>}
          {!loading && results.length === 0 && <p className="text-xs text-gray-400 p-3">No results</p>}
          {results.map(item => (
            <button key={item.id} type="button" onClick={() => { setSearch(item.label); onChange(item.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Dropdown that loads options from a Global List — supports externalOptions for dependency engine
function GlobalSourceDropdown({ field, value, onChange, externalOptions }: {
  field: Field; value: any; onChange: (v: any) => void; externalOptions?: any[] | null;
}) {
  const raw = (field as any).settings;
  const s = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : (raw || {});
  const listId = s?.globalListSource?.listId || s?.globalListId || "";
  const rawId = value && typeof value === "object" && value.id ? String(value.id) : (value || "");

  // Dependent field with engine-provided options → static combobox (local search)
  if (Array.isArray(externalOptions)) {
    return (
      <GlobalListCombobox
        listId={listId}
        value={rawId}
        onChange={onChange}
        placeholder="--select--"
        staticItems={externalOptions}
        disabled={externalOptions.length === 0 && !rawId}
      />
    );
  }
  // Primary / independent field → full combobox with backend search
  return (
    <GlobalListCombobox
      listId={listId}
      value={rawId}
      onChange={onChange}
      placeholder="--select--"
    />
  );
}

function GlobalRelationInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const raw = (field as any).settings;
  const settings = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : (raw || {});
  const globalListId = settings.globalListId;
  const levels: string[] = settings.levels || [];
  const [selections, setSelections] = useState<Record<number, string>>(value || {});
  const [options, setOptions] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const loadLevel = async (level: number, parentId?: string): Promise<void> => {
    if (!globalListId) return;
    setLoading(p => ({ ...p, [level]: true }));
    try {
      const r = await api.get(`/global-lists/${globalListId}/items${parentId ? `?parentId=${parentId}` : ""}`);
      setOptions(p => ({ ...p, [level]: r.data || [] }));
    } catch { setOptions(p => ({ ...p, [level]: [] })); }
    finally { setLoading(p => ({ ...p, [level]: false })); }
  };

  // Load level 0 on mount, then cascade through any pre-existing selections (edit mode).
  useEffect(() => {
    if (!globalListId) return;
    const initial = value || {};
    const cascade = async () => {
      await loadLevel(0, undefined);
      for (let i = 0; i + 1 < levels.length; i++) {
        const parentId = initial[i];
        if (!parentId) break;
        await loadLevel(i + 1, parentId);
      }
    };
    cascade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalListId]);

  const selectLevel = (level: number, itemId: string) => {
    const newSel: Record<number, string> = {};
    for (let i = 0; i <= level; i++) newSel[i] = i === level ? itemId : selections[i];
    setSelections(newSel);
    onChange(newSel);
    if (level + 1 < levels.length) {
      loadLevel(level + 1, itemId);
      setOptions(p => { const n = { ...p }; for (let i = level + 1; i < levels.length; i++) delete n[i]; return n; });
    }
  };

  if (!globalListId) return <p className="text-xs text-gray-400 italic">Global list not configured</p>;

  return (
    <div className="space-y-2">
      {levels.map((levelName, i) => (
        <div key={i} className="space-y-1">
          <Label className="text-xs text-gray-500">{levelName}</Label>
          <Select value={selections[i] || "__none__"} onValueChange={v => v !== "__none__" && selectLevel(i, v)} disabled={(i > 0 && !selections[i - 1]) || !!loading[i]}>
            <SelectTrigger><SelectValue placeholder={loading[i] ? "Loading…" : `Select ${levelName}...`} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select {levelName}...</SelectItem>
              {(options[i] || []).map((item: any) => (
                <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

// ── Subform ────────────────────────────────────────────────────────────────

interface SubformColumn {
  id: string; name: string; label: string; type: string; required: boolean;
  options?: { label: string; value: string }[];
  formula?: string; lookupModuleId?: string; lookupDisplayField?: string;
  aggregate?: boolean;
}
interface SubformRow { _id: string; [key: string]: any }

function evalFormula(expr: string, row: SubformRow): number {
  try {
    // Support $field_name syntax (new) and {field_name} syntax (legacy)
    let safe = expr.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => {
      const v = Number(row[n]); return isFinite(v) ? String(v) : "0";
    });
    safe = safe.replace(/\{([^}]+)\}/g, (_, n) => {
      const v = Number(row[n]); return isFinite(v) ? String(v) : "0";
    });
    if (!/^[\d\s+\-*/().]+$/.test(safe)) return 0;
    // eslint-disable-next-line no-new-func
    return Number(Function(`"use strict"; return (${safe})`)());
  } catch { return 0; }
}

const SUBFORM_AGGREGATE_FN = /\b(SUM|AVG|MIN|MAX|COUNT)\(([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\)/g;

function computeSubformAggregate(fn: string, rows: any[], column: string): number {
  const values = rows
    .map(r => r?.[column])
    .filter(v => v !== undefined && v !== null && v !== "")
    .map(Number)
    .filter(v => isFinite(v));
  switch (fn) {
    case "SUM":   return values.reduce((a, b) => a + b, 0);
    case "AVG":   return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case "MIN":   return values.length ? Math.min(...values) : 0;
    case "MAX":   return values.length ? Math.max(...values) : 0;
    case "COUNT": return values.length;
    default:      return 0;
  }
}

function applySubformAggregates(expr: string, data: Record<string, any>): string {
  return expr.replace(SUBFORM_AGGREGATE_FN, (_, fn, fieldName, column) => {
    const rows = Array.isArray(data[fieldName]) ? data[fieldName] : [];
    return String(computeSubformAggregate(fn, rows, column));
  });
}


function SubformLookupCell({ col, value, onChange }: { col: SubformColumn; value: any; onChange: (v: any) => void }) {
  const moduleId = col.lookupModuleId;
  const displayField = col.lookupDisplayField || "name";
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!moduleId) return;
    api.get(`/records/lookup?moduleId=${moduleId}&displayField=${displayField}&search=${search}`)
      .then(r => setResults(r.data || [])).catch(() => setResults([]));
  }, [search, moduleId, displayField]);

  if (!moduleId) return <Input value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-xs border-gray-200" />;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <Input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} placeholder="Search..." className="h-8 text-xs border-gray-200 pr-6" />
        {value && <button type="button" onClick={() => { setSearch(""); onChange(null); setOpen(false); }}
          className="absolute right-2 text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white rounded-lg border border-gray-200 shadow-lg max-h-40 overflow-y-auto">
          {results.map(item => (
            <button key={item.id} type="button"
              onClick={() => { setSearch(item.label); onChange(item.id); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubformCell({ col, value, onChange }: { col: SubformColumn; value: any; onChange: (v: any) => void }) {
  switch (col.type) {
    case "FORMULA":
      return (
        <div className="h-8 px-2 flex items-center justify-end bg-blue-50 rounded text-xs font-semibold text-blue-700 min-w-[60px]">
          {value !== undefined && value !== null && value !== "" ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
        </div>
      );
    case "DROPDOWN":
      return (
        <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs border-gray-200 bg-white min-w-[100px]"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs">—</SelectItem>
            {(col.options || []).map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "BOOLEAN":
      return <div className="flex items-center h-8 pl-1"><Switch checked={!!value} onCheckedChange={onChange} /></div>;
    case "NUMBER": case "DECIMAL": case "CURRENCY":
      return (
        <Input type="number" value={value ?? ""}
          onChange={e => onChange(e.target.value !== "" ? Number(e.target.value) : undefined)}
          step={col.type === "DECIMAL" || col.type === "CURRENCY" ? "0.01" : "1"}
          className="h-8 text-xs border-gray-200 text-right" style={{ minWidth: 80 }} />
      );
    case "DATE":
      return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-xs border-gray-200" style={{ minWidth: 130 }} />;
    case "LOOKUP":
      return <SubformLookupCell col={col} value={value} onChange={onChange} />;
    default:
      return <Input value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-xs border-gray-200" style={{ minWidth: 120 }} />;
  }
}

function SubformInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const settings = parseFieldSettings((field as any).settings);
  const columns: SubformColumn[] = settings.columns || [];
  const rows: SubformRow[] = Array.isArray(value) ? value : [];

  const recomputeFormulas = (row: SubformRow): SubformRow => {
    const updated = { ...row };
    columns.forEach(col => {
      if (col.type === "FORMULA" && col.formula) updated[col.name] = evalFormula(col.formula, row);
    });
    return updated;
  };

  const updateCell = (rowId: string, colName: string, cellValue: any) => {
    onChange(rows.map(r => r._id !== rowId ? r : recomputeFormulas({ ...r, [colName]: cellValue })));
  };

  const addRow = () => onChange([...rows, recomputeFormulas({ _id: generateId() })]);
  const removeRow = (rowId: string) => onChange(rows.filter(r => r._id !== rowId));

  // A subform always has a default first row present — auto-seed one blank
  // row the moment columns exist but no rows have been added yet.
  useEffect(() => {
    if (columns.length > 0 && rows.length === 0) addRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.length, rows.length]);

  if (columns.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-sm text-gray-400">No columns configured</p>
        <p className="text-xs text-gray-300 mt-1">Configure subform columns in Module Studio</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8 px-2 py-2 text-left text-gray-400 font-medium">#</th>
                {columns.map(col => (
                  <th key={col.id} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap" style={{ minWidth: col.type === "FORMULA" ? 90 : 120 }}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.required && <span className="text-red-400">*</span>}
                      {col.type === "FORMULA" && <span className="text-[10px] text-blue-400 font-mono">fx</span>}
                    </span>
                  </th>
                ))}
                <th className="w-14 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={row._id} className={cn("border-b border-gray-100 last:border-b-0 group transition-colors hover:bg-blue-50/30")}>
                  <td className="px-3 py-1.5 text-gray-400 font-mono text-[10px] align-middle">{rowIdx + 1}</td>
                  {columns.map(col => (
                    <td key={col.id} className="px-1.5 py-1.5 align-middle">
                      <SubformCell col={col} value={row[col.name]} onChange={v => updateCell(row._id, col.name, v)} />
                    </td>
                  ))}
                  <td className="px-1.5 py-1.5 align-middle">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={addRow} title="Add row"
                        className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      {rowIdx > 0 && (
                        <button type="button" onClick={() => removeRow(row._id)}
                          className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors shrink-0" title="Remove row">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && columns.some(c => c.aggregate) && (
              <tfoot><tr className="border-t-2 border-gray-200 bg-gray-50/70 font-semibold">
                <td className="px-3 py-1.5" />
                {columns.map(col => (
                  <td key={col.id} className="px-2 py-1.5 text-gray-700">
                    {col.aggregate ? computeSubformAggregate("SUM", rows, col.name).toLocaleString(undefined, { maximumFractionDigits: 2 }) : ""}
                  </td>
                ))}
                <td className="px-1.5 py-1.5" />
              </tr></tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ── DynamicFieldInput — exact same implementation as create (new) page ──────
function DynamicFieldInput({ field, value, onChange, externalOptions }: { field: Field; value: any; onChange: (v: any) => void; externalOptions?: Record<string, any[]> }) {
  const readonly = !!(field as any).isReadonly;
  const inner = renderDynamicFieldInput({ field, value, onChange, externalOptions });
  return readonly ? <div className="pointer-events-none opacity-60 select-none">{inner}</div> : <>{inner}</>;
}

function renderDynamicFieldInput({ field, value, onChange, externalOptions }: { field: Field; value: any; onChange: (v: any) => void; externalOptions?: Record<string, any[]> }) {
  switch (field.type) {
    case "AUTO_NUMBER": return <Input value="(auto-generated)" readOnly disabled className="font-mono text-gray-400 bg-gray-50" />;
    case "FORMULA": {
      const rawFS = (field as any).settings;
      const parsedFS = typeof rawFS === "string" ? (() => { try { return JSON.parse(rawFS); } catch { return {}; } })() : (rawFS || {});
      const displayVal = formatFormulaDisplayValue(value, parsedFS.thousandsSeparator !== false);
      return <div className="flex items-center gap-2 h-10 px-3 bg-blue-50/60 border border-blue-100 rounded-md"><span className="text-sm font-mono font-semibold text-blue-700">{displayVal || <span className="text-blue-300 font-normal">calculated</span>}</span></div>;
    }
    case "LOOKUP": return <LookupInput field={field} value={value} onChange={onChange} />;
    case "GLOBAL_RELATION": {
      const role = (field as any).settings?.fieldRole;
      const extOpts = (role === "primary" || role === "dependent") ? (externalOptions?.[(field as any).id] ?? null) : null;
      if (extOpts !== null) {
        return (
          <select value={value || ""} onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select...</option>
            {extOpts.map((item: any) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        );
      }
      return <GlobalRelationInput field={field} value={value} onChange={onChange} />;
    }
    case "DEPENDENT_GLOBAL_LIST": {
      const _sD = (field as any).settings;
      const _pD = typeof _sD === "string" ? (() => { try { return JSON.parse(_sD); } catch { return {}; } })() : (_sD || {});
      return <DependentGlobalListInput listId={_pD.globalListId || _pD.globalListSource?.listId || ""} value={value || ""} onChange={onChange} />;
    }
    case "GLOBAL_LIST": {
      const _sG = (field as any).settings;
      const _pG = typeof _sG === "string" ? (() => { try { return JSON.parse(_sG); } catch { return {}; } })() : (_sG || {});
      return <GlobalListInput listId={_pG.globalListId || _pG.globalListSource?.listId || ""} value={value || ""} onChange={onChange} />;
    }
    case "TEXTAREA": case "RICH_TEXT": return <Textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={4} />;
    case "BOOLEAN": return <div className="flex items-center gap-2"><Switch checked={!!value} onCheckedChange={onChange} /><span className="text-sm text-gray-600">{value ? "Yes" : "No"}</span></div>;
    case "CHECKBOX": return <div className="flex items-center gap-2"><Checkbox checked={!!value} onCheckedChange={onChange} /><Label>{field.label}</Label></div>;
    case "DROPDOWN": case "STATUS": {
      const rawSN = (field as any).settings;
      const parsedSN = typeof rawSN === "string" ? (() => { try { return JSON.parse(rawSN); } catch { return {}; } })() : (rawSN || {});
      const hasGlSrc = !!(parsedSN?.globalListSource?.listId || parsedSN?.globalListId);
      if (hasGlSrc) {
        const depExtN = externalOptions?.[(field as any).id];
        const isDependentN = parsedSN?.fieldRole === "dependent";
        const extOptsN = Array.isArray(depExtN) ? depExtN : (isDependentN ? [] : null);
        return <GlobalSourceDropdown field={field} value={value} onChange={onChange} externalOptions={extOptsN} />;
      }
      return <Select value={(Array.isArray(value) ? value[0] : value) || ""} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={field.placeholder || "--select--"} /></SelectTrigger><SelectContent>{field.options?.map((o, i) => <SelectItem key={o.id ?? `${o.value}-${i}`} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
    }
    case "RADIO": return <div className="flex flex-col gap-2">{field.options?.map((opt, i) => <label key={opt.id ?? `${opt.value}-${i}`} className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name={field.name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} className="w-4 h-4 accent-blue-600" /><span className="text-sm text-gray-700">{opt.label}</span></label>)}</div>;
    case "MULTI_SELECT": return <div className="flex flex-wrap gap-2">{field.options?.map((o, i) => { const sel = Array.isArray(value) && value.includes(o.value); return <button key={o.id ?? `${o.value}-${i}`} type="button" onClick={() => { const c = Array.isArray(value) ? value : []; onChange(sel ? c.filter((v: string) => v !== o.value) : [...c, o.value]); }} className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${sel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}>{o.label}</button>; })}</div>;
    case "NUMBER": case "DECIMAL": case "CURRENCY": return <Input type="number" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} step={field.type === "DECIMAL" ? "0.01" : "1"} />;
    case "DATE": case "DATETIME": return <DateFieldInput field={field} value={value} onChange={onChange} />;
    case "EMAIL": return <Input type="email" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "email@example.com"} />;
    case "PHONE": return <Input type="tel" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "+1 (555) 000-0000"} />;
    case "URL": return <Input type="url" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "https://"} />;
    case "RATING": return <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => onChange(n)} className={`text-2xl transition-transform hover:scale-110 ${n <= (value||0) ? "text-yellow-400" : "text-gray-200"}`}>★</button>)}</div>;
    case "PROGRESS": return <div className="space-y-2"><Input type="range" min="0" max="100" value={value||0} onChange={e => onChange(Number(e.target.value))} className="w-full" /><p className="text-sm text-gray-500 text-right">{value||0}%</p></div>;
    case "COLOR_PICKER": return <Input type="color" value={value||"#3b82f6"} onChange={e => onChange(e.target.value)} className="w-16 h-9 p-1" />;
    case "FILE":
    case "IMAGE":
    case "SIGNATURE":
      return (
        <FileUploadInput
          value={value}
          onChange={onChange}
          fieldType={field.type}
          disabled={(field as any).isReadonly}
        />
      );
    case "INLINE_SUBFORM":
      return <SubformInput field={field} value={value} onChange={onChange} />;
    default:
      return <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
}

// ── Layout Rules Evaluation ────────────────────────────────────────────────

function matchRule(cond: any, data: Record<string, any>): boolean {
  const v = data[cond.whenField];
  switch (cond.operator) {
    case "equals":     return String(v ?? "") === String(cond.whenValue ?? "");
    case "not_equals": return String(v ?? "") !== String(cond.whenValue ?? "");
    case "is_empty":   return v === null || v === undefined || v === "";
    case "not_empty":  return v !== null && v !== undefined && v !== "";
    default:           return false;
  }
}

function evaluateFieldState(field: Field, data: Record<string, any>) {
  const conditions: any[] = (field as any).settings?.conditions || [];
  let visible = true;
  let required = field.isRequired;
  let readonly = !!(field as any).isReadonly;

  const showRules = conditions.filter(c => c.action === "show");
  const hideRules = conditions.filter(c => c.action === "hide");

  if (showRules.length > 0 && hideRules.length === 0) {
    visible = showRules.some(c => matchRule(c, data));
  } else if (hideRules.length > 0) {
    if (hideRules.some(c => matchRule(c, data))) visible = false;
    if (showRules.length > 0 && !showRules.some(c => matchRule(c, data))) visible = false;
  }

  conditions.forEach(c => {
    if (!matchRule(c, data)) return;
    if (c.action === "require")   required = true;
    if (c.action === "unrequire") required = false;
    if (c.action === "readonly")  readonly = true;
  });

  return { visible, required, readonly };
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EditRecordPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const [mod, setMod] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [blueprintStatusField, setBlueprintStatusField] = useState<string | null>(null);

  // Auto-save state tracking
  const isLoaded = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modIdRef = useRef<string | null>(null);
  const recordIdRef = useRef<string | null>(null);
  const loadedDataRef = useRef<Record<string, any>>({});
  const bootstrapped = useRef(false);
  // Tracks the values Integration Field mappings last auto-filled — see
  // applyIntegrationMapping's doc comment (mycrm/lib/integration-mapping.ts).
  const autoFilledRef = useRef<Record<string, any>>({});

  // Same module-level "Internal Record Mappings" used by the Create page —
  // configured in Studio, separate from a form's per-form mappings.
  const handleIntegrationSelect = (
    integrationField: Field, recordId: string, recordData: Record<string, any>,
    sourceFields: { id: string; name: string; label: string }[],
  ) => {
    const settings = parseFieldSettings((integrationField as any).settings) || {};
    const mappings: { sourceFieldId: string; destinationFieldId: string; behavior: "UPDATE_EXISTING" | "FILL_IF_EMPTY" }[] =
      settings.internalMappings || [];
    if (mappings.length === 0) return;

    const allFields = mod?.fields || [];
    const sourceById = new Map<string, string>(sourceFields.map(f => [f.id, f.name]));
    const destById = new Map<string, string>(allFields.map((f: any) => [f.id, f.name] as [string, string]));
    const resolved = mappings
      .map(m => ({
        sourceFieldName: sourceById.get(m.sourceFieldId) || "",
        destinationFieldName: destById.get(m.destinationFieldId) || "",
        behavior: m.behavior,
      }))
      .filter(m => m.sourceFieldName && m.destinationFieldName);

    // Not the functional-updater form here — React double-invokes updaters
    // in Strict Mode (dev) to catch impure ones, and mutating autoFilledRef
    // inside the updater made re-selection silently stop applying after the
    // first pick (the second invocation saw an already-advanced ref against
    // a not-yet-updated `prev`). Reading formData from the closure keeps the
    // ref mutation outside React's update machinery.
    const result = applyIntegrationMapping(formData, recordData, resolved, autoFilledRef.current);
    autoFilledRef.current = result.autoFilled;
    setFormData(recomputeFormulaFields(result.data, allFields));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const modRes = await api.get(`/modules/by-slug/${slug}`);
        const module = modRes.data;
        console.debug("[EditRecord] loaded module — layout rules:", (module as any)?.settings?.layout?.rules ?? "none");
        setMod(module);
        modIdRef.current = module.id;
        recordIdRef.current = id;
        api.get(`/blueprints/module/${module.id}`)
          .then(r => setBlueprintStatusField(r.data?.statusFieldName ?? null))
          .catch(() => setBlueprintStatusField(null));
        const recRes = await api.get(`/modules/${module.id}/records/${id}`);
        const loaded = (recRes.data.data as Record<string, any>) || {};
        const computedData = recomputeFormulaFields(loaded, module.fields || []);
        loadedDataRef.current = computedData;
        setFormData(computedData);
        setDataLoaded(true);
      } catch {
        router.push(`/m/${slug}`);
      } finally {
        setLoading(false);
        // Mark loaded after a tick so initial formData set doesn't trigger auto-save
        setTimeout(() => { isLoaded.current = true; }, 200);
      }
    };
    load();
  }, [slug, id, router]);

  // Reactive auto-save: fire 800ms after last field change → triggers workflow evaluation on backend
  useEffect(() => {
    if (!isLoaded.current) return;
    const mId = modIdRef.current;
    const rId = recordIdRef.current;
    if (!mId || !rId) return;

    const captured = Object.fromEntries(Object.entries(formData).filter(([k]) => !k.endsWith("__label")));
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await api.patch(`/modules/${mId}/records/${rId}`, captured);
      } catch {}
      finally { setAutoSaving(false); }
    }, 800);

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  const { fieldOptions, onDependencyFieldChange, bootstrapDependencies } = useGlobalListDependency(
    (mod?.fields ?? []) as any[],
    formData,
    setFormData
  );

  // Explicitly load dependent field options based on already-loaded parent values
  useEffect(() => {
    if (!dataLoaded || !mod || bootstrapped.current) return;
    bootstrapped.current = true;
    bootstrapDependencies(loadedDataRef.current);
  }, [dataLoaded, mod, bootstrapDependencies]);

  const { execLog, showDebug, setShowDebug } = useWorkflowEvaluator(
    (mod as any)?.id,
    id,
    formData,
    (fieldName, newValue) => {
      setFormData(prev => ({ ...prev, [fieldName]: newValue }));
    }
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    mod?.fields?.forEach((f: Field) => {
      if (f.isHidden || f.type === "AUTO_NUMBER") return; // skip fields not shown to the user
      const state = evaluateFieldState(f, formData);
      if (!state.visible || !state.required) return;
      if (f.type === "INLINE_SUBFORM") {
        if (!Array.isArray(formData[f.name]) || formData[f.name].length === 0) {
          errs[f.name] = `${f.label} requires at least one row`;
        }
      } else if (!formData[f.name] && formData[f.name] !== 0) {
        errs[f.name] = `${f.label} is required`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const cleanData = Object.fromEntries(Object.entries(formData).filter(([k]) => !k.endsWith("__label")));
    try {
      await api.patch(`/modules/${mod.id}/records/${id}`, cleanData);
      router.push(`/m/${slug}/${id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  const ruleEffects = evaluateModuleRules(
    (mod as any)?.settings?.layout?.rules,
    formData,
  );
  const computedFields = (mod?.fields || [])
    .filter((f: Field) => !f.isHidden)
    .map((f: Field) => {
      const state = evaluateFieldState(f, formData);
      const isBlueprintStatusField = !!blueprintStatusField && f.name === blueprintStatusField;
      return {
        ...f,
        _state: {
          visible:  state.visible && !ruleEffects.hiddenFields.has(f.name),
          required: isBlueprintStatusField
            ? false
            : ruleEffects.requiredFields.has(f.name)
              ? true
              : ruleEffects.unrequiredFields.has(f.name)
                ? false
                : state.required,
          readonly: isBlueprintStatusField
            ? true
            : ruleEffects.readonlyFields.has(f.name) ? true : state.readonly,
          isBlueprintStatusField,
        },
      };
    })
    .filter((f: any) => f._state.visible);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-6xl mx-auto">

      {/* Sticky top bar — always visible */}
      <div className="flex items-center justify-between gap-3 px-1 py-3 shrink-0 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/m/${slug}/${id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900 truncate flex items-center gap-2">
            {mod?.icon && <ModuleIcon icon={mod.icon} slug={mod?.slug ?? ""} size={18} />}
            Edit {mod?.name}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {autoSaving && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
          <Link href={`/m/${slug}/${id}`}>
            <Button type="button" variant="outline" size="sm">Cancel</Button>
          </Link>
          <Button size="sm" className="gap-2" onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              : <><Save className="w-4 h-4" />Save Changes</>}
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-5 px-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ModuleIcon icon={mod?.icon} slug={mod?.slug ?? ""} className="w-4 h-4" />
              {mod?.name} Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {Object.keys(errors).length > 0 && (
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  Please fill in all required fields before saving.
                </div>
              )}
              <FormSectionRenderer
                layout={(mod as any)?.settings?.layout ?? DEFAULT_MODULE_LAYOUT}
                fields={computedFields}
                formData={formData}
                showCompletion={false}
                hiddenSectionIds={ruleEffects.hiddenSections}
                renderField={(field: any) => (
                  <>
                    <Label htmlFor={field.name} className="flex items-center gap-1">
                      {field.label}
                      {field._state.required && <span className="text-red-500 text-xs">*</span>}
                      {field.type === "AUTO_NUMBER" && <Badge variant="secondary" className="text-xs ml-1">Auto</Badge>}
                      {field._state.isBlueprintStatusField && <Badge variant="secondary" className="text-xs ml-1">Process-managed</Badge>}
                    </Label>
                    {field.type === "INTEGRATION" ? (
                      <IntegrationFieldInput
                        fieldId={field.id}
                        searchEndpoint="/records/integration-search"
                        value={formData[field.name]}
                        onChange={v => setFormData(prev => ({ ...prev, [field.name]: v }))}
                        onRecordSelect={(rid, rdata, srcFields) => handleIntegrationSelect(field, rid, rdata, srcFields || [])}
                      />
                    ) : (
                      <DynamicFieldInput
                        field={{ ...field, isRequired: field._state.required, isReadonly: field._state.readonly }}
                        value={formData[field.name]}
                        externalOptions={fieldOptions}
                        onChange={v => {
                          if (field._state.readonly || field.type === "FORMULA") return;
                          const allFields = mod?.fields || [];
                          setFormData(prev => recomputeFormulaFields({ ...prev, [field.name]: v }, allFields));
                          if (["GLOBAL_RELATION","GLOBAL_LIST","DEPENDENT_GLOBAL_LIST","DROPDOWN","STATUS"].includes(field.type)) {
                            onDependencyFieldChange(field.name, v);
                          }
                        }}
                      />
                    )}
                    {field._state.isBlueprintStatusField && (
                      <p className="text-xs text-gray-400">Managed by the blueprint process — use the process actions on the record page to change stage.</p>
                    )}
                    {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
                    {errors[field.name] && <p className="text-xs text-red-500">{errors[field.name]}</p>}
                  </>
                )}
              />
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Link href={`/m/${slug}/${id}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                    : <><Save className="w-4 h-4" />Save Changes</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Workflow debug (fixed overlay) */}
      {execLog.length > 0 && (
        <button
          onClick={() => setShowDebug(s => !s)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-full shadow-lg transition-colors"
        >
          ⚡ {execLog.length} workflow{execLog.length !== 1 ? "s" : ""} ran
        </button>
      )}
      {showDebug && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-white">
            <span className="text-xs font-semibold">⚡ Workflow Activity</span>
            <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {execLog.slice(0, 20).map((log, i) => (
              <div key={i} className={"px-3 py-2 text-xs " + (log.conditionResult ? "bg-green-50" : "bg-gray-50")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 truncate flex-1">{log.workflowName}</span>
                  <span className={log.conditionResult ? "text-green-600 shrink-0" : "text-gray-400 shrink-0"}>
                    {log.conditionResult ? "✓ matched" : "✗ skip"}
                  </span>
                </div>
                {log.fieldChanged && (
                  <div className="text-gray-400 mt-0.5 truncate">
                    {log.fieldChanged}: {String(log.oldValue ?? "∅")} → {String(log.newValue ?? "∅")}
                  </div>
                )}
                {log.conditionResult && (
                  <div className="text-green-600 mt-0.5">
                    {log.actionsExecuted} action{log.actionsExecuted !== 1 ? "s" : ""} fired
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
