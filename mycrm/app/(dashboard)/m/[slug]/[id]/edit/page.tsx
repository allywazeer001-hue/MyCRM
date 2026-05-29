"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Search, X, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

// ── Reusable field inputs ─────────────────────────────────────────────────

function LookupInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const settings = (field as any).settings || {};
  const targetModuleId = settings.lookupModuleId;
  const displayField = settings.displayField || "name";
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        {value && <button onClick={() => { setSearch(""); onChange(null); }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
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

function GlobalRelationInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const settings = (field as any).settings || {};
  const globalListId = settings.globalListId;
  const levels: string[] = settings.levels || [];
  const [selections, setSelections] = useState<Record<number, string>>(value || {});
  const [options, setOptions] = useState<Record<number, any[]>>({});

  useEffect(() => {
    if (!globalListId) return;
    api.get(`/global-lists/${globalListId}/items`).then(r => setOptions(prev => ({ ...prev, 0: r.data || [] }))).catch(() => {});
  }, [globalListId]);

  const selectLevel = (level: number, itemId: string) => {
    const newSel: Record<number, string> = {};
    for (let i = 0; i <= level; i++) newSel[i] = i === level ? itemId : selections[i];
    setSelections(newSel);
    onChange(newSel);
    if (level + 1 < levels.length) {
      api.get(`/global-lists/${globalListId}/items?parentId=${itemId}`)
        .then(r => setOptions(prev => ({ ...prev, [level + 1]: r.data || [] }))).catch(() => {});
    }
  };

  if (!globalListId) return <p className="text-xs text-gray-400 italic">Global list not configured</p>;

  return (
    <div className="space-y-2">
      {levels.map((levelName, i) => (
        <div key={i} className="space-y-1">
          <Label className="text-xs text-gray-500">{levelName}</Label>
          <Select value={selections[i] || "__none__"} onValueChange={v => v !== "__none__" && selectLevel(i, v)} disabled={i > 0 && !selections[i - 1]}>
            <SelectTrigger><SelectValue placeholder={`Select ${levelName}...`} /></SelectTrigger>
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

function evalTopLevelFormula(expr: string, data: Record<string, any>): number {
  try {
    let safe = expr.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => {
      const v = Number(data[n]); return isFinite(v) ? String(v) : "0";
    });
    safe = safe.replace(/\{([^}]+)\}/g, (_, n) => {
      const v = Number(data[n]); return isFinite(v) ? String(v) : "0";
    });
    if (!/^[\d\s+\-*/().]+$/.test(safe)) return 0;
    // eslint-disable-next-line no-new-func
    return Number(Function(`"use strict"; return (${safe})`)());
  } catch { return 0; }
}

function recomputeFormulaFields(data: Record<string, any>, fields: Field[]): Record<string, any> {
  const result = { ...data };
  fields.forEach((f) => {
    if (f.type !== "FORMULA") return;
    const expr = (f as any).settings?.formula as string | undefined;
    if (!expr) return;
    result[f.name] = evalTopLevelFormula(expr, result);
  });
  return result;
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
  const settings = (field as any).settings || {};
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

  const addRow = () => onChange([...rows, recomputeFormulas({ _id: crypto.randomUUID() })]);
  const removeRow = (rowId: string) => onChange(rows.filter(r => r._id !== rowId));

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
                <th className="w-9 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="px-4 py-8 text-center text-gray-400">
                  No rows yet — click <strong>Add Row</strong> to begin
                </td></tr>
              ) : rows.map((row, rowIdx) => (
                <tr key={row._id} className={cn("border-b border-gray-100 last:border-b-0 group transition-colors hover:bg-blue-50/30")}>
                  <td className="px-3 py-1.5 text-gray-400 font-mono text-[10px] align-middle">{rowIdx + 1}</td>
                  {columns.map(col => (
                    <td key={col.id} className="px-1.5 py-1.5 align-middle">
                      <SubformCell col={col} value={row[col.name]} onChange={v => updateCell(row._id, col.name, v)} />
                    </td>
                  ))}
                  <td className="px-1.5 py-1.5 align-middle">
                    <button type="button" onClick={() => removeRow(row._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50" title="Remove row">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button type="button" onClick={addRow}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/40 transition-all flex items-center justify-center gap-2">
        <Plus className="w-3.5 h-3.5" /> Add Row
      </button>
    </div>
  );
}

function DynamicFieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  switch (field.type) {
    case "AUTO_NUMBER":
      return <Input value={value || "(auto-generated)"} readOnly disabled className="font-mono text-gray-400 bg-gray-50" />;
    case "FORMULA":
      return (
        <div className="flex items-center gap-2 h-10 px-3 bg-blue-50/60 border border-blue-100 rounded-md">
          <span className="text-[10px] font-mono text-blue-400 shrink-0">fx</span>
          <span className="text-sm font-mono font-semibold text-blue-700 tabular-nums">
            {value !== undefined && value !== null && value !== ""
              ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
              : <span className="text-blue-300 font-normal">calculated</span>}
          </span>
        </div>
      );
    case "LOOKUP":
      return <LookupInput field={field} value={value} onChange={onChange} />;
    case "GLOBAL_RELATION":
      return <GlobalRelationInput field={field} value={value} onChange={onChange} />;
    case "TEXTAREA": case "RICH_TEXT":
      return <Textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={4} />;
    case "BOOLEAN":
      return (
        <div className="flex items-center gap-2">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm text-gray-600">{value ? "Yes" : "No"}</span>
        </div>
      );
    case "CHECKBOX":
      return <div className="flex items-center gap-2"><Checkbox checked={!!value} onCheckedChange={onChange} /><Label>{field.label}</Label></div>;
    case "DROPDOWN": case "STATUS":
      return (
        <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select —</SelectItem>
            {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "RADIO":
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => (
            <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${value === opt.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      );
    case "MULTI_SELECT":
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <button key={opt.value} type="button"
                onClick={() => { const c = Array.isArray(value) ? value : []; onChange(selected ? c.filter((v: string) => v !== opt.value) : [...c, opt.value]); }}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${selected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"}`}>
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    case "NUMBER": case "DECIMAL": case "CURRENCY":
      return <Input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} step={field.type === "DECIMAL" ? "0.01" : "1"} />;
    case "DATE":
      return <Input type="date" value={value || ""} onChange={e => onChange(e.target.value)} />;
    case "DATETIME":
      return <Input type="datetime-local" value={value || ""} onChange={e => onChange(e.target.value)} />;
    case "EMAIL":
      return <Input type="email" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "email@example.com"} />;
    case "PHONE":
      return <Input type="tel" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
    case "URL":
      return <Input type="url" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || "https://"} />;
    case "RATING":
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => onChange(n)}
              className={`text-2xl transition-transform hover:scale-110 ${n <= (value || 0) ? "text-yellow-400" : "text-gray-200"}`}>★</button>
          ))}
        </div>
      );
    case "PROGRESS":
      return (
        <div className="space-y-2">
          <input type="range" min="0" max="100" value={value || 0} onChange={e => onChange(Number(e.target.value))} className="w-full" />
          <p className="text-sm text-gray-500 text-right">{value || 0}%</p>
        </div>
      );
    case "COLOR_PICKER":
      return <Input type="color" value={value || "#3b82f6"} onChange={e => onChange(e.target.value)} className="w-16 h-9 p-1" />;
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

  // Auto-save state tracking
  const isLoaded = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modIdRef = useRef<string | null>(null);
  const recordIdRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const modRes = await api.get(`/modules/by-slug/${slug}`);
        const module = modRes.data;
        setMod(module);
        modIdRef.current = module.id;
        recordIdRef.current = id;
        const recRes = await api.get(`/modules/${module.id}/records/${id}`);
        const loaded = (recRes.data.data as Record<string, any>) || {};
        setFormData(recomputeFormulaFields(loaded, module.fields || []));
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

    const captured = formData;
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

  const validate = () => {
    const errs: Record<string, string> = {};
    mod?.fields?.forEach((f: Field) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.patch(`/modules/${mod.id}/records/${id}`, formData);
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

  const computedFields = (mod?.fields || [])
    .filter((f: Field) => !f.isHidden)
    .map((f: Field) => ({ ...f, _state: evaluateFieldState(f, formData) }))
    .filter((f: any) => f._state.visible);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/m/${slug}/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit {mod?.name?.replace(/s$/, "")} Record</h1>
          <p className="text-sm text-gray-500">Update the fields and save changes.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>{mod?.icon || "📦"}</span>
            {mod?.name} Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {computedFields.map((field: any) => (
              <div key={field.id} className="space-y-1.5">
                <Label htmlFor={field.name} className="flex items-center gap-1">
                  {field.label}
                  {field._state.required && <span className="text-red-500 text-xs">*</span>}
                  {field.type === "AUTO_NUMBER" && <Badge variant="secondary" className="text-xs ml-1">Auto</Badge>}
                </Label>
                <DynamicFieldInput
                  field={{ ...field, isRequired: field._state.required, isReadonly: field._state.readonly }}
                  value={formData[field.name]}
                  onChange={v => {
                    if (field._state.readonly || field.type === "FORMULA") return;
                    setFormData(prev => recomputeFormulaFields({ ...prev, [field.name]: v }, mod?.fields || []));
                  }}
                />
                {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
                {errors[field.name] && <p className="text-xs text-red-500">{errors[field.name]}</p>}
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-400 h-6">
                {autoSaving && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Auto-saving…</span>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Link href={`/m/${slug}/${id}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
