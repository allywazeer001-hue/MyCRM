"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Search, X, ChevronDown, Plus, Trash2, AlertCircle } from "lucide-react";
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
import Link from "next/link";
import { cn, generateId } from "@/lib/utils";
import { FormSectionRenderer } from "@/components/ui/form-section-renderer";
import { DEFAULT_MODULE_LAYOUT } from "@/lib/layout-templates";
import { evaluateModuleRules } from "@/lib/evaluate-layout-rules";
import { DependentGlobalListInput, GlobalListInput } from "@/components/ui/dependent-global-list-input";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useGlobalListDependency } from "@/hooks/use-global-list-dependency";
import { FileUploadInput } from "@/components/ui/file-upload-input";

// ─────────────────────────────────────────────────────────────────────────────
// All field-input components are identical to the existing new/edit pages.
// Only the outer page layout is changed to match the detail page.
// ─────────────────────────────────────────────────────────────────────────────

function LookupInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const settings = (field as any).settings || {};
  const targetModuleId = settings.lookupModuleId || (field as any).lookupModuleId;
  const displayField = settings.displayField || "name";
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!targetModuleId) return;
    setLoading(true);
    api.get(`/records/lookup?moduleId=${targetModuleId}&displayField=${displayField}&search=${search}`)
      .then(r => setResults(r.data || [])).catch(() => setResults([])).finally(() => setLoading(false));
  }, [search, targetModuleId, displayField]);
  if (!targetModuleId) return <p className="text-xs text-gray-400 italic">Lookup not configured</p>;
  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} placeholder={field.placeholder || `Search ${displayField}...`} className="pl-9" />
        </div>
        {selected && <button onClick={() => { setSelected(null); setSearch(""); onChange(null); }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {loading && <p className="text-xs text-gray-400 p-3">Searching...</p>}
          {!loading && results.length === 0 && <p className="text-xs text-gray-400 p-3">No results found</p>}
          {results.map(item => (
            <button key={item.id} type="button" onClick={() => { setSelected(item); setSearch(item.label); onChange(item.id); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors">{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalSourceDropdown({ field, value, onChange, externalOptions }: {
  field: Field; value: any; onChange: (v: any) => void; externalOptions?: any[] | null;
}) {
  const raw = (field as any).settings;
  const s = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : (raw || {});
  const listId = s?.globalListSource?.listId || s?.globalListId;
  const [opts, setOpts] = useState<any[]>([]);
  useEffect(() => {
    if (Array.isArray(externalOptions)) return;
    if (!listId) return;
    api.get(`/global-lists/${listId}/items`).then(r => setOpts(r.data ?? [])).catch(() => {});
  }, [listId, externalOptions]);
  const displayOpts = Array.isArray(externalOptions) ? externalOptions : opts;
  const rawId = value && typeof value === "object" && value.id ? String(value.id) : (value || "__none__");
  return (
    <Select value={rawId} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Select —</SelectItem>
        {displayOpts.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
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

  const loadLevel = async (level: number, parentId: string | undefined): Promise<any[]> => {
    if (!globalListId) return [];
    setLoading(p => ({ ...p, [level]: true }));
    try {
      const r = await api.get(`/global-lists/${globalListId}/items${parentId ? `?parentId=${parentId}` : ""}`);
      const items = r.data || [];
      setOptions(p => ({ ...p, [level]: items }));
      return items;
    } catch { setOptions(p => ({ ...p, [level]: [] })); return []; }
    finally { setLoading(p => ({ ...p, [level]: false })); }
  };

  // On mount: load level 0, then cascade-load subsequent levels for any pre-existing selections
  // (edit mode). Each level needs its parent's selected ID to fetch the right children.
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
    const ns: Record<number, string> = {};
    for (let i = 0; i <= level; i++) ns[i] = i === level ? itemId : selections[i];
    setSelections(ns); onChange(ns);
    if (level + 1 < levels.length) {
      loadLevel(level + 1, itemId);
      setOptions(p => { const n = { ...p }; for (let i = level + 1; i < levels.length; i++) delete n[i]; return n; });
    }
  };
  if (!globalListId) return <p className="text-xs text-gray-400 italic">Global list not configured</p>;
  return (
    <div className="space-y-2">
      {levels.map((lv, i) => (
        <div key={i} className="space-y-1">
          <Label className="text-xs text-gray-500">{lv}</Label>
          <Select value={selections[i] || ""} onValueChange={v => selectLevel(i, v)} disabled={i > 0 && !selections[i - 1]}>
            <SelectTrigger><SelectValue placeholder={loading[i] ? "Loading..." : `Select ${lv}...`} /></SelectTrigger>
            <SelectContent>
              {(options[i] || []).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
              {(options[i] || []).length === 0 && !loading[i] && <div className="px-3 py-2 text-xs text-gray-400">{i > 0 && !selections[i - 1] ? `Select ${levels[i - 1]} first` : "No items"}</div>}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

interface SubformColumn { id: string; name: string; label: string; type: string; required: boolean; options?: { label: string; value: string }[]; formula?: string; lookupModuleId?: string; lookupDisplayField?: string; }
interface SubformRow { _id: string; [key: string]: any }

function evalFormula(expr: string, row: SubformRow): number {
  try {
    let s = expr.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => { const v = Number(row[n]); return isFinite(v) ? String(v) : "0"; });
    s = s.replace(/\{([^}]+)\}/g, (_, n) => { const v = Number(row[n]); return isFinite(v) ? String(v) : "0"; });
    if (!/^[\d\s+\-*/().]+$/.test(s)) return 0;
    // eslint-disable-next-line no-new-func
    return Number(Function(`"use strict"; return (${s})`)());
  } catch { return 0; }
}

function evalTopLevelFormula(expr: string, data: Record<string, any>): number {
  try {
    let s = expr.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => { const v = Number(data[n]); return isFinite(v) ? String(v) : "0"; });
    s = s.replace(/\{([^}]+)\}/g, (_, n) => { const v = Number(data[n]); return isFinite(v) ? String(v) : "0"; });
    if (!/^[\d\s+\-*/().]+$/.test(s)) return 0;
    // eslint-disable-next-line no-new-func
    return Number(Function(`"use strict"; return (${s})`)());
  } catch { return 0; }
}

function recomputeFormulaFields(data: Record<string, any>, fields: Field[]): Record<string, any> {
  const result = { ...data };
  fields.forEach(f => {
    if (f.type !== "FORMULA") return;
    const expr = (f as any).settings?.formula as string | undefined;
    if (expr) result[f.name] = evalTopLevelFormula(expr, result);
  });
  return result;
}

function SubformLookupCell({ col, value, onChange }: { col: SubformColumn; value: any; onChange: (v: any) => void }) {
  const [search, setSearch] = useState(""); const [results, setResults] = useState<any[]>([]); const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => { if (!col.lookupModuleId) return; api.get(`/records/lookup?moduleId=${col.lookupModuleId}&displayField=${col.lookupDisplayField || "name"}&search=${search}`).then(r => setResults(r.data || [])).catch(() => setResults([])); }, [search, col.lookupModuleId, col.lookupDisplayField]);
  if (!col.lookupModuleId) return <Input value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-xs" />;
  return (
    <div ref={ref} className="relative">
      <div className="flex items-center"><Input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search..." className="h-8 text-xs pr-6" />{value && <button type="button" onClick={() => { setSearch(""); onChange(null); }} className="absolute right-2 text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>}</div>
      {open && results.length > 0 && <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white rounded-lg border border-gray-200 shadow-lg max-h-40 overflow-y-auto">{results.map(item => <button key={item.id} type="button" onClick={() => { setSearch(item.label); onChange(item.id); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700">{item.label}</button>)}</div>}
    </div>
  );
}

function SubformCell({ col, value, onChange }: { col: SubformColumn; value: any; onChange: (v: any) => void }) {
  switch (col.type) {
    case "FORMULA": return <div className="h-8 px-2 flex items-center justify-end bg-blue-50 rounded text-xs font-semibold text-blue-700">{value ?? "—"}</div>;
    case "DROPDOWN": return <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}><SelectTrigger className="h-8 text-xs min-w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__" className="text-xs">—</SelectItem>{(col.options || []).map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent></Select>;
    case "BOOLEAN": return <div className="flex items-center h-8 pl-1"><Switch checked={!!value} onCheckedChange={onChange} /></div>;
    case "NUMBER": case "DECIMAL": case "CURRENCY": return <Input type="number" value={value ?? ""} onChange={e => onChange(e.target.value !== "" ? Number(e.target.value) : undefined)} step={col.type !== "NUMBER" ? "0.01" : "1"} className="h-8 text-xs text-right" style={{ minWidth: 80 }} />;
    case "DATE": return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-xs" style={{ minWidth: 130 }} />;
    case "LOOKUP": return <SubformLookupCell col={col} value={value} onChange={onChange} />;
    default: return <Input value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-xs" style={{ minWidth: 120 }} />;
  }
}

function SubformInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const settings = (field as any).settings || {};
  const columns: SubformColumn[] = settings.columns || [];
  const rows: SubformRow[] = Array.isArray(value) ? value : [];
  const recompute = (row: SubformRow): SubformRow => { const u = { ...row }; columns.forEach(c => { if (c.type === "FORMULA" && c.formula) u[c.name] = evalFormula(c.formula, row); }); return u; };
  const updateCell = (rowId: string, col: string, v: any) => onChange(rows.map(r => r._id !== rowId ? r : recompute({ ...r, [col]: v })));
  if (columns.length === 0) return <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg"><p className="text-sm text-gray-400">No columns configured</p></div>;
  return (
    <div className="space-y-2">
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="w-8 px-2 py-2 text-gray-400">#</th>{columns.map(c => <th key={c.id} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{c.label}{c.required && <span className="text-red-400 ml-0.5">*</span>}</th>)}<th className="w-9" /></tr></thead>
            <tbody>{rows.length === 0 ? <tr><td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-400">No rows yet — click Add Row to begin</td></tr> : rows.map((row, i) => <tr key={row._id} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 group"><td className="px-3 py-1.5 text-gray-400 font-mono text-[10px]">{i + 1}</td>{columns.map(c => <td key={c.id} className="px-1.5 py-1.5"><SubformCell col={c} value={row[c.name]} onChange={v => updateCell(row._id, c.name, v)} /></td>)}<td className="px-1.5 py-1.5"><button type="button" onClick={() => onChange(rows.filter(r => r._id !== row._id))} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <button type="button" onClick={() => onChange([...rows, recompute({ _id: generateId() })])} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/40 transition-all flex items-center justify-center gap-2"><Plus className="w-3.5 h-3.5" />Add Row</button>
    </div>
  );
}

function DynamicFieldInput({ field, value, onChange, externalOptions }: { field: Field; value: any; onChange: (v: any) => void; externalOptions?: Record<string, any[]> }) {
  switch (field.type) {
    case "AUTO_NUMBER": return <Input value="(auto-generated)" readOnly disabled className="font-mono text-gray-400 bg-gray-50" />;
    case "FORMULA": return <div className="flex items-center gap-2 h-10 px-3 bg-blue-50/60 border border-blue-100 rounded-md"><span className="text-[10px] font-mono text-blue-400 shrink-0">fx</span><span className="text-sm font-mono font-semibold text-blue-700">{value !== undefined && value !== null && value !== "" ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 }) : <span className="text-blue-300 font-normal">calculated</span>}</span></div>;
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
      return <Select value={value || ""} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={field.placeholder || `Select ${field.label}`} /></SelectTrigger><SelectContent>{field.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
    }
    case "RADIO": return <div className="flex flex-col gap-2">{field.options?.map(opt => <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name={field.name} value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)} className="w-4 h-4 accent-blue-600" /><span className="text-sm text-gray-700">{opt.label}</span></label>)}</div>;
    case "MULTI_SELECT": return <div className="flex flex-wrap gap-2">{field.options?.map(o => { const sel = Array.isArray(value) && value.includes(o.value); return <button key={o.value} type="button" onClick={() => { const c = Array.isArray(value) ? value : []; onChange(sel ? c.filter((v: string) => v !== o.value) : [...c, o.value]); }} className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${sel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}>{o.label}</button>; })}</div>;
    case "NUMBER": case "DECIMAL": case "CURRENCY": return <Input type="number" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} step={field.type === "DECIMAL" ? "0.01" : "1"} />;
    case "DATE": return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} />;
    case "DATETIME": return <Input type="datetime-local" value={value || ""} onChange={e => onChange(e.target.value)} />;
    case "EMAIL": return <Input type="email" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "email@example.com"} />;
    case "PHONE": return <Input type="tel" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "+1 (555) 000-0000"} />;
    case "URL": return <Input type="url" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "https://"} />;
    case "RATING": return <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => onChange(n)} className={`text-2xl transition-transform hover:scale-110 ${n <= (value||0) ? "text-yellow-400" : "text-gray-200"}`}>★</button>)}</div>;
    case "PROGRESS": return <div className="space-y-2"><Input type="range" min="0" max="100" value={value||0} onChange={e => onChange(Number(e.target.value))} className="w-full" /><p className="text-sm text-gray-500 text-right">{value||0}%</p></div>;
    case "COLOR_PICKER": return <Input type="color" value={value||"#3b82f6"} onChange={e => onChange(e.target.value)} className="w-16 h-9 p-1" />;
    case "FILE":
    case "IMAGE":
    case "SIGNATURE":
      return <FileUploadInput value={value} onChange={onChange} fieldType={field.type} />;
    case "INLINE_SUBFORM": return <SubformInput field={field} value={value} onChange={onChange} />;
    default: return <Input value={value||""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
  }
}

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
  let visible = true, required = field.isRequired, readonly = !!(field as any).isReadonly;
  const showRules = conditions.filter(c => c.action === "show");
  const hideRules = conditions.filter(c => c.action === "hide");
  if (showRules.length > 0 && hideRules.length === 0) visible = showRules.some(c => matchRule(c, data));
  else if (hideRules.length > 0) { if (hideRules.some(c => matchRule(c, data))) visible = false; if (showRules.length > 0 && !showRules.some(c => matchRule(c, data))) visible = false; }
  conditions.forEach(c => { if (!matchRule(c, data)) return; if (c.action === "require") required = true; if (c.action === "unrequire") required = false; if (c.action === "readonly") readonly = true; });
  return { visible, required, readonly };
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function NewRecordPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [mod, setMod]         = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading]  = useState(true);
  const [saving, setSaving]    = useState(false);
  const [errors, setErrors]    = useState<Record<string, string>>({});
  const formScrollRef = useRef<HTMLDivElement>(null);
  const [saveError, setSaveError] = useState("");

  const { fieldOptions, onDependencyFieldChange } = useGlobalListDependency(
    (mod?.fields ?? []) as any[],
    formData,
    setFormData
  );

  useEffect(() => {
    api.get(`/modules/by-slug/${slug}`)
      .then(({ data }) => {
        setMod(data);
        console.debug("[NewRecord] loaded module — layout rules:", (data as any)?.settings?.layout?.rules ?? "none");
        const defaults: Record<string, any> = {};
        data.fields?.forEach((f: Field) => { if (f.defaultValue !== undefined) defaults[f.name] = f.defaultValue; });
        setFormData(recomputeFormulaFields(defaults, data.fields || []));
      })
      .catch(() => setSaveError("Module not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const validate = () => {
    const errs: Record<string, string> = {};
    mod?.fields?.forEach((f: Field) => {
      if (f.isHidden || f.type === "AUTO_NUMBER") return; // skip fields not shown to the user
      const state = evaluateFieldState(f, formData);
      if (!state.visible || !state.required) return;
      if (f.type === "INLINE_SUBFORM") {
        if (!Array.isArray(formData[f.name]) || formData[f.name].length === 0)
          errs[f.name] = `${f.label} requires at least one row`;
      } else if (!formData[f.name] && formData[f.name] !== 0) {
        errs[f.name] = `${f.label} is required`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) {
      formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    setSaveError("");
    const cleanData = Object.fromEntries(Object.entries(formData).filter(([k]) => !k.endsWith("__label")));
    try {
      const { data } = await api.post(`/modules/${mod.id}/records`, cleanData);
      router.push(`/m/${slug}/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Failed to save record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  const allFields: Field[]    = mod?.fields || [];
  const ruleEffects = evaluateModuleRules(
    (mod as any)?.settings?.layout?.rules,
    formData,
  );
  const computedFields = allFields
    .filter(f => !f.isHidden && f.type !== "AUTO_NUMBER")
    .map(f => {
      const state = evaluateFieldState(f, formData);
      return {
        ...f,
        _state: {
          visible:  state.visible && !ruleEffects.hiddenFields.has(f.name),
          required: ruleEffects.requiredFields.has(f.name)
            ? true
            : ruleEffects.unrequiredFields.has(f.name)
              ? false
              : state.required,
          readonly: ruleEffects.readonlyFields.has(f.name) ? true : state.readonly,
        },
      };
    })
    .filter((f: any) => f._state.visible);
  const requiredFields        = computedFields.filter((f: any) => f._state.required);
  const filledRequired        = requiredFields.filter((f: any) => {
    const v = formData[f.name];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ══ LEFT PANEL — module info + progress (sticky) ══ */}
      <div className="w-72 xl:w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">

        {/* Accent bar using module color */}
        <div className="h-1 shrink-0" style={{ backgroundColor: mod?.color ?? "#3b82f6" }} />

        {/* Back link */}
        <div className="px-5 pt-5 pb-2">
          <Link href={`/m/${slug}`} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-xs font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to {mod?.name}
          </Link>
        </div>

        {/* Module identity */}
        <div className="px-5 pt-3 pb-5 border-b border-gray-100">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white"
            style={{ backgroundColor: mod?.color ?? "#3b82f6" }}
          >
            <ModuleIcon icon={mod?.icon} slug={slug} size={22} />
          </div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">
            Create New {mod?.name?.replace(/s$/, "") || "Record"}
          </h1>
          {mod?.description && (
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{mod.description}</p>
          )}
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Unsaved draft
            </span>
          </div>
        </div>

        {/* Required fields completion */}
        {requiredFields.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Completion</p>
                <p className="text-sm font-bold text-gray-700">
                  {Math.round((filledRequired.length / requiredFields.length) * 100)}%
                </p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(filledRequired.length / requiredFields.length) * 100}%`,
                    backgroundColor: filledRequired.length === requiredFields.length
                      ? "#10b981"
                      : (mod?.color ?? "#3b82f6"),
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {filledRequired.length} of {requiredFields.length} required fields filled
              </p>
            </div>

            {/* Field checklist */}
            <div className="space-y-1.5">
              {requiredFields.map((f: any) => {
                const v = formData[f.name];
                const filled = v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
                return (
                  <div key={f.id} className="flex items-center gap-2">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      filled ? "border-emerald-500 bg-emerald-500" : "border-gray-300 bg-white"
                    )}>
                      {filled && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={cn(
                      "text-xs transition-colors",
                      filled ? "text-gray-400 line-through" : "text-gray-600"
                    )}>
                      {f.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Field count */}
        <div className="px-5 py-3 text-xs text-gray-400">
          {computedFields.length} field{computedFields.length !== 1 ? "s" : ""} in this form ·{" "}
          <Link href={`/studio/${mod?.id}`} className="text-blue-500 hover:text-blue-700 transition-colors">
            Configure
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Submit + cancel at bottom of left panel */}
        <div className="px-5 py-5 space-y-2 border-t border-gray-100">
          {Object.keys(errors).length > 0 && (
            <p className="text-xs text-red-500 text-center font-medium">
              {Object.keys(errors).length} required field{Object.keys(errors).length > 1 ? "s" : ""} missing — check the form
            </p>
          )}
          {saveError && (
            <p className="text-xs text-red-500 text-center font-medium">
              Save failed — check the form for errors
            </p>
          )}
          <Button
            className="w-full gap-2 text-white border-0"
            style={{ backgroundColor: mod?.color ?? "#3b82f6" }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Record</>}
          </Button>
          <Link href={`/m/${slug}`} className="block">
            <Button variant="ghost" className="w-full text-gray-400 hover:text-gray-700 text-xs h-8">
              Discard and go back
            </Button>
          </Link>
        </div>
      </div>

      {/* ══ RIGHT PANEL — form fields (scrollable) ══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/40">

        {/* Sticky form header */}
        <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Record Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">All required fields are marked with *</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/m/${slug}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <X className="w-4 h-4" /> Cancel
              </Button>
            </Link>
            <Button size="sm" className="gap-2" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Record"}
            </Button>
          </div>
        </div>

        {/* Scrollable form body */}
        <div ref={formScrollRef} className="flex-1 overflow-y-auto px-8 py-8">

          {/* Error / validation banners */}
          {saveError && (
            <div className="mb-6 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {saveError}
            </div>
          )}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              Please fill in all required fields before saving.
            </div>
          )}

          {/* No fields configured */}
          {computedFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
              <span className="text-5xl"><ModuleIcon icon={mod?.icon} slug={slug} size={48} /></span>
              <p className="font-medium text-gray-600">No fields configured yet</p>
              <Link href={`/studio/${mod?.id}`}>
                <Button variant="outline" size="sm">Add Fields in Studio</Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-xl">
              <FormSectionRenderer
                layout={(mod as any)?.settings?.layout ?? DEFAULT_MODULE_LAYOUT}
                fields={computedFields}
                formData={formData}
                showCompletion={false}
                hiddenSectionIds={ruleEffects.hiddenSections}
                renderField={(field: any) => (
                  <>
                    <label
                      htmlFor={field.name}
                      className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"
                    >
                      {field.label}
                      {field._state.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <DynamicFieldInput
                      field={{ ...field, isRequired: field._state.required, isReadonly: field._state.readonly }}
                      value={formData[field.name]}
                      externalOptions={fieldOptions}
                      onChange={(v) => {
                        if (field._state.readonly || field.type === "FORMULA") return;
                        const isSrc = ["GLOBAL_RELATION","GLOBAL_LIST","DEPENDENT_GLOBAL_LIST","DROPDOWN","STATUS"].includes(field.type);
                        const updatedData = recomputeFormulaFields({ ...formData, [field.name]: v }, allFields);
                        setFormData(() => updatedData);
                        if (isSrc) onDependencyFieldChange(field.name, v);
                      }}
                    />
                    {field.helpText && (
                      <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
                    )}
                    {errors[field.name] && (
                      <p className="mt-1 text-xs text-red-500">{errors[field.name]}</p>
                    )}
                  </>
                )}
              />

              {/* Bottom submit row */}
              <div className="mt-10 pt-6 border-t border-gray-200 flex justify-end">
                <div className="flex items-center gap-3">
                  <Link href={`/m/${slug}`}>
                    <Button variant="outline">Cancel</Button>
                  </Link>
                  <Button className="gap-2 px-6" onClick={handleSubmit} disabled={saving}>
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><Save className="w-4 h-4" /> Save Record</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* end right panel */}
      </div>
      {/* end outer container */}
    </div>
  );
}
