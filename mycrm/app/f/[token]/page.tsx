"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X, Search, ChevronLeft, ChevronRight, Upload, FileText, ScanSearch, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn, parseFieldSettings } from "@/lib/utils";
import { DateFieldInput } from "@/components/ui/date-field-input";
import { IntegrationFieldInput } from "@/components/records/integration-field-input";
import { applyIntegrationMapping } from "@/lib/integration-mapping";
import { resolvePostSubmitAction } from "@/lib/form-post-submit";

// ── Types ─────────────────────────────────────────────────────────────────────

type RuleOperator = "equals" | "not_equals" | "contains" | "is_empty" | "not_empty" | "gt" | "lt";
type RuleAction   = "show" | "hide" | "require" | "unrequire" | "disable";

interface FieldRule {
  id: string;
  fieldKey: string;
  operator: RuleOperator;
  value: string;
  action: RuleAction;
}

interface PageDef {
  id: string;
  title: string;
  description?: string;
  order: number;
}

interface PageNavRule {
  id: string;
  name?: string;
  sourcePageId: string;
  conditions: { id: string; fieldKey: string; operator: string; value: string }[];
  conditionsLogic: "AND" | "OR";
  targetPageId: string;
}

// ── Rule evaluation ───────────────────────────────────────────────────────────

function matchRule(rule: { fieldKey: string; operator: string; value: string }, data: Record<string, any>): boolean {
  const v = data[rule.fieldKey];
  const rv = rule.value ?? "";
  switch (rule.operator) {
    case "equals":     return String(v ?? "") === rv;
    case "not_equals": return String(v ?? "") !== rv;
    case "contains":   return String(v ?? "").toLowerCase().includes(rv.toLowerCase());
    case "is_empty":   return v === null || v === undefined || v === "";
    case "not_empty":  return v !== null && v !== undefined && v !== "";
    case "gt":         return Number(v) > Number(rv);
    case "lt":         return Number(v) < Number(rv);
    default:           return false;
  }
}

function evalFieldState(ff: any, data: Record<string, any>, formOverrides?: Record<string, FormRuleOverride>) {
  const mf = ff.moduleField || ff;

  let visible  = !ff.isHidden;
  let required = ff.isRequired ?? (!!mf.isRequired || false);
  let readonly = !!ff.isReadonly;

  const rules: FieldRule[] = (ff.conditionalLogic as any)?.rules || [];
  const showRules = rules.filter(r => r.action === "show");
  const hideRules = rules.filter(r => r.action === "hide");

  if (showRules.length > 0 && hideRules.length === 0) {
    visible = showRules.some(r => matchRule(r, data));
  } else if (hideRules.length > 0) {
    if (hideRules.some(r => matchRule(r, data))) visible = false;
    if (showRules.length > 0 && !showRules.some(r => matchRule(r, data))) visible = false;
  }

  for (const rule of rules) {
    if (!matchRule(rule, data)) continue;
    if (rule.action === "require")   required = true;
    if (rule.action === "unrequire") required = false;
    if (rule.action === "disable")   readonly = true;
  }

  const moduleConds: any[] = mf.settings?.conditions || [];
  const mShowRules = moduleConds.filter(c => c.action === "show");
  const mHideRules = moduleConds.filter(c => c.action === "hide");
  if (mShowRules.length > 0 && mHideRules.length === 0) {
    if (!mShowRules.some(c => matchModuleCond(c, data))) visible = false;
  } else if (mHideRules.length > 0) {
    if (mHideRules.some(c => matchModuleCond(c, data))) visible = false;
    if (mShowRules.length > 0 && !mShowRules.some(c => matchModuleCond(c, data))) visible = false;
  }
  for (const c of moduleConds) {
    if (!matchModuleCond(c, data)) continue;
    if (c.action === "require")   required = true;
    if (c.action === "unrequire") required = false;
    if (c.action === "readonly")  readonly = true;
  }

  const mfName = mf?.name || "";
  const over = formOverrides?.[mfName];
  if (over) {
    if (over.visible  !== undefined) visible  = over.visible;
    if (over.required !== undefined) required = over.required;
    if (over.readonly !== undefined) readonly = over.readonly;
  }

  return { visible, required, readonly };
}

function computeAutoPopulateValue(mf: any): string | undefined {
  const settings = parseFieldSettings(mf?.settings);
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  if (mf?.type === "DATE" && settings.autoPopulate === "currentDate") {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  if (mf?.type === "DATETIME" && settings.autoPopulate === "currentDateTime") {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  return undefined;
}

function matchModuleCond(cond: any, data: Record<string, any>): boolean {
  const v = data[cond.whenField];
  switch (cond.operator) {
    case "equals":     return String(v ?? "") === String(cond.whenValue ?? "");
    case "not_equals": return String(v ?? "") !== String(cond.whenValue ?? "");
    case "is_empty":   return v === null || v === undefined || v === "";
    case "not_empty":  return v !== null && v !== undefined && v !== "";
    default:           return false;
  }
}

// ── Form-level rule engine ────────────────────────────────────────────────────

interface FormRuleOverride { visible?: boolean; required?: boolean; readonly?: boolean; setValue?: any; }
interface FormRuleResult {
  fieldOverrides: Record<string, FormRuleOverride>;
  sectionOverrides: Record<string, { visible: boolean }>;
  messages: string[];
  submitBlockers: string[];
}

function evalFormRules(rules: any[], data: Record<string, any>): FormRuleResult {
  const fieldOverrides: Record<string, FormRuleOverride> = {};
  const sectionOverrides: Record<string, { visible: boolean }> = {};
  const messages: string[] = [];
  const submitBlockers: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const action of (rule.actions || [])) {
      if (action.type === "show_section" && action.target) {
        if (!sectionOverrides[action.target]) sectionOverrides[action.target] = { visible: false };
      }
    }
  }

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const conditions: any[] = rule.conditions || [];
    const logic: "AND" | "OR" = rule.conditionsLogic || "AND";
    if (conditions.length === 0) continue;
    const results = conditions.map((c: any) => matchRule(c as any, data));
    const matched = logic === "AND" ? results.every(Boolean) : results.some(Boolean);
    if (!matched) continue;

    for (const action of (rule.actions || [])) {
      const key = action.target;
      switch (action.type) {
        case "show_field":      if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].visible  = true;  } break;
        case "hide_field":      if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].visible  = false; } break;
        case "require_field":   if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].required = true;  } break;
        case "unrequire_field": if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].required = false; } break;
        case "enable_field":    if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].readonly = false; } break;
        case "disable_field":   if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].readonly = true;  } break;
        case "show_section":    if (key) sectionOverrides[key] = { visible: true  }; break;
        case "hide_section":    if (key) sectionOverrides[key] = { visible: false }; break;
        case "set_value":       if (key) { if (!fieldOverrides[key]) fieldOverrides[key] = {}; fieldOverrides[key].setValue = action.value ?? ""; } break;
        case "show_message":    if (action.value) messages.push(action.value); break;
        case "block_submit":    submitBlockers.push(action.value || "A form rule is blocking submission."); break;
      }
    }
  }

  return { fieldOverrides, sectionOverrides, messages, submitBlockers };
}

// ── Branding header ───────────────────────────────────────────────────────────

function FormBrandingHeader({ form }: { form: any }) {
  const s = form?.settings || {};
  const h = s.header || {};
  const hasContent = h.title || h.subtitle || h.logoUrl || h.bannerUrl;
  if (!hasContent) return null;

  const bg = h.bgType === "gradient"
    ? `linear-gradient(${h.gradientAngle ?? 135}deg, ${h.bgColor || "#4338ca"}, ${h.bgGradientTo || "#6366f1"})`
    : (h.bgColor || "#4338ca");
  const align = h.alignment || "center";
  const logoPos = h.logoPosition || "center";
  const logoH: Record<string, string> = { sm: "h-10", md: "h-14", lg: "h-20" };
  const logoClass = logoH[h.logoSize || "md"] || "h-14";
  const isLeft = logoPos === "left" && !!h.logoUrl;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg mb-6">
      {h.bannerUrl && (
        <div className="h-44 bg-slate-100 overflow-hidden">
          <img src={h.bannerUrl} alt="" className="w-full h-full object-cover"
            onError={e => { (e.target as any).parentElement.style.display = "none"; }} />
        </div>
      )}
      <div className="px-8 py-8" style={{ background: bg, color: h.textColor || "#FFFFFF" }}>
        {isLeft ? (
          /* Logo left — logo and text on the same row */
          <div className="flex items-center gap-5" style={{ textAlign: align as any }}>
            <img src={h.logoUrl} alt="Logo"
              className={cn(logoClass, "shrink-0 object-contain")}
              onError={e => { (e.target as any).style.display = "none"; }} />
            <div>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{h.title || form?.name}</h1>
              {h.subtitle && <p className="mt-1 text-sm font-medium" style={{ opacity: 0.82 }}>{h.subtitle}</p>}
              {form?.description && !h.subtitle && <p className="mt-1 text-sm" style={{ opacity: 0.7 }}>{form.description}</p>}
            </div>
          </div>
        ) : (
          /* Logo center/right — stacked */
          <div style={{ textAlign: align as any }}>
            {h.logoUrl && (
              <div className={cn("mb-4", logoPos === "right" ? "text-right" : "text-center")}>
                <img src={h.logoUrl} alt="Logo"
                  className={cn(logoClass, "inline-block object-contain")}
                  onError={e => { (e.target as any).parentElement.style.display = "none"; }} />
              </div>
            )}
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{h.title || form?.name}</h1>
            {h.subtitle && <p className="mt-2 text-sm font-medium" style={{ opacity: 0.82 }}>{h.subtitle}</p>}
            {form?.description && !h.subtitle && <p className="mt-2 text-sm" style={{ opacity: 0.7 }}>{form.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section navigation sidebar ───────────────────────────────────────────────

function SectionNavSidebar({
  groups,
  activeSectionId,
}: {
  groups: { id: string | null; name: string | null }[];
  activeSectionId: string | null;
}) {
  const named = groups.filter(g => g.id && g.name);
  if (named.length < 2) return null;
  return (
    <nav className="hidden xl:block w-44 shrink-0">
      <div className="sticky top-8 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 pb-2">Sections</p>
        {named.map(g => (
          <a
            key={g.id}
            href={`#sec-${g.id}`}
            onClick={e => {
              e.preventDefault();
              document.getElementById(`sec-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={cn(
              "group flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all no-underline",
              activeSectionId === g.id
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/70"
            )}
          >
            <span className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
              activeSectionId === g.id ? "bg-indigo-500 scale-125" : "bg-slate-300 group-hover:bg-slate-400"
            )} />
            <span className="truncate text-xs leading-snug">{g.name}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}

// ── Status screen ─────────────────────────────────────────────────────────────

type StatusType = "success" | "error" | "warning" | "info";

function StatusScreen({ icon, title, message, type = "error" }: {
  icon: "check" | "error" | "clock"; title: string; message: string; type?: StatusType;
}) {
  const styles: Record<StatusType, { bg: string; text: string; border: string; pageBg: string }> = {
    success: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200/60", pageBg: "from-emerald-50 via-white to-teal-50/10"  },
    error:   { bg: "bg-red-100",     text: "text-red-600",     border: "border-red-200/60",     pageBg: "from-red-50 via-white to-rose-50/10"      },
    warning: { bg: "bg-amber-100",   text: "text-amber-600",   border: "border-amber-200/60",   pageBg: "from-amber-50 via-white to-yellow-50/10"  },
    info:    { bg: "bg-blue-100",    text: "text-blue-600",    border: "border-blue-200/60",    pageBg: "from-blue-50 via-white to-indigo-50/10"   },
  };
  const s = styles[type];
  const Icon = icon === "check" ? CheckCircle2 : AlertCircle;
  return (
    <div className={cn("min-h-screen bg-gradient-to-br via-white flex items-center justify-center p-4", s.pageBg)}>
      <div className="max-w-sm w-full">
        <div className={cn("bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border overflow-hidden", s.border)}>
          <div className={cn("h-1 w-full", s.bg)} />
          <div className="p-8 text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5", s.bg)}>
              {icon === "clock"
                ? <svg className={cn("w-8 h-8", s.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                : <Icon className={cn("w-8 h-8", s.text)} />}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">
          Powered by <span className="font-medium text-slate-500">CRM Platform</span>
        </p>
      </div>
    </div>
  );
}

// ── Lookup input ──────────────────────────────────────────────────────────────

function PublicLookupInput({ field, value, onChange, onRecordSelect }: {
  field: any; value: any; onChange: (v: any) => void;
  onRecordSelect?: (id: string, recordData: Record<string, any>, sourceFields?: { id: string; name: string; label: string }[]) => void;
}) {
  const mf = field.moduleField || field;
  const settings = mf.settings || {};
  const targetModuleId = settings.lookupModuleId;
  const displayField = settings.displayField || "name";
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!targetModuleId) return;
    api.get(`/records/lookup?moduleId=${targetModuleId}&displayField=${displayField}&search=${encodeURIComponent(search)}`)
      .then(r => setResults(r.data || [])).catch(() => setResults([]));
  }, [search, targetModuleId, displayField]);

  if (!targetModuleId) return <p className="text-sm text-slate-400 italic">Lookup not configured</p>;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={label || search} onChange={e => { setSearch(e.target.value); setLabel(""); setOpen(true); }}
            onFocus={() => setOpen(true)} placeholder="Search records…" className="pl-9 h-11 rounded-lg border-slate-200" />
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(null); setLabel(""); setSearch(""); }}
            className="text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto">
          {results.map((item: any) => (
            <button key={item.id} type="button"
              onClick={() => { onChange(item.id); setLabel(item.label); setOpen(false); onRecordSelect?.(item.id, item.data || {}); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border-b border-slate-50 last:border-0 transition-colors">
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Global relation input ─────────────────────────────────────────────────────

function PublicGlobalRelationInput({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  const mf = field.moduleField || field;
  const settings = mf.settings || {};
  const globalListId = settings.globalListId;
  const levels: string[] = settings.levels || [];
  const [selections, setSelections] = useState<Record<number, string>>(value || {});
  const [options, setOptions] = useState<Record<number, any[]>>({});
  const [loadingLevel, setLoadingLevel] = useState<Record<number, boolean>>({});

  useEffect(() => { if (globalListId) loadLevel(0, undefined); }, [globalListId]);

  const loadLevel = async (level: number, parentId: string | undefined) => {
    setLoadingLevel(p => ({ ...p, [level]: true }));
    try {
      const params = parentId ? `?parentId=${parentId}` : "";
      const r = await api.get(`/global-lists/${globalListId}/items${params}`);
      setOptions(p => ({ ...p, [level]: r.data || [] }));
    } catch { setOptions(p => ({ ...p, [level]: [] })); }
    finally { setLoadingLevel(p => ({ ...p, [level]: false })); }
  };

  const selectLevel = (level: number, itemId: string) => {
    const newSel = { ...selections };
    newSel[level] = itemId;
    for (let l = level + 1; l < levels.length; l++) { delete newSel[l]; setOptions(p => { const n = { ...p }; delete n[l]; return n; }); }
    setSelections(newSel);
    onChange(newSel);
    if (level + 1 < levels.length) loadLevel(level + 1, itemId);
  };

  const displayLevels = levels.length > 0 ? levels : ["Level 1"];

  return (
    <div className="space-y-3">
      {displayLevels.map((levelLabel, level) => (
        <div key={level} className="space-y-1.5">
          {levels.length > 1 && <p className="text-xs font-medium text-slate-500">{levelLabel}</p>}
          <Select value={selections[level] || ""} onValueChange={v => selectLevel(level, v)}
            disabled={level > 0 && !selections[level - 1]}>
            <SelectTrigger className={cn("h-11 rounded-lg border-slate-200", level > 0 && !selections[level - 1] && "opacity-50 cursor-not-allowed")}>
              <SelectValue placeholder={`Select ${levelLabel}…`} />
            </SelectTrigger>
            <SelectContent>
              {loadingLevel[level] ? <SelectItem value="_" disabled>Loading…</SelectItem>
                : (options[level] || []).map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

// ── Field renderer ────────────────────────────────────────────────────────────

function PublicFieldInput({ field, value, onChange, readonly, onRecordSelect, token }: {
  field: any; value: any; onChange: (v: any) => void; readonly?: boolean;
  onRecordSelect?: (id: string, recordData: Record<string, any>, sourceFields?: { id: string; name: string; label: string }[], allowManualUpdate?: boolean) => void;
  token: string;
}) {
  const mf = field.moduleField || field;
  const type = mf.type;
  const placeholder = field.customPlaceholder || mf.placeholder || "";

  const inputCls = "h-11 rounded-lg border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all";

  const wrapReadonly = (inner: React.ReactNode) =>
    readonly ? <div className="pointer-events-none opacity-55 select-none">{inner}</div> : <>{inner}</>;

  switch (type) {
    case "TEXT": case "EMAIL": case "PHONE": case "URL":
      return wrapReadonly(
        <Input type={type === "EMAIL" ? "email" : type === "PHONE" ? "tel" : type === "URL" ? "url" : "text"}
          value={value || ""} onChange={e => !readonly && onChange(e.target.value)}
          placeholder={placeholder} readOnly={readonly} className={inputCls} />
      );

    case "TEXTAREA": case "RICH_TEXT":
      return wrapReadonly(
        <Textarea value={value || ""} onChange={e => !readonly && onChange(e.target.value)}
          placeholder={placeholder} rows={4}
          className="resize-none rounded-lg border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          readOnly={readonly} />
      );

    case "NUMBER": case "DECIMAL": case "CURRENCY":
      return wrapReadonly(
        <Input type="number" value={value || ""} onChange={e => !readonly && onChange(e.target.value)}
          placeholder={placeholder} readOnly={readonly} className={inputCls} />
      );

    case "BOOLEAN": case "CHECKBOX":
      return (
        <div className="flex items-center gap-3 py-1.5">
          <Switch checked={!!value} onCheckedChange={v => !readonly && onChange(v)} disabled={readonly} />
          <span className="text-sm text-slate-600 font-medium">{value ? "Yes" : "No"}</span>
        </div>
      );

    case "DROPDOWN": case "STATUS": {
      const opts = mf.options || [];
      return wrapReadonly(
        <Select value={(Array.isArray(value) ? value[0] : value) || ""} onValueChange={v => !readonly && onChange(v)} disabled={readonly}>
          <SelectTrigger className="h-11 rounded-lg border-slate-200"><SelectValue placeholder="Choose an option…" /></SelectTrigger>
          <SelectContent>
            {opts.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    case "RADIO": {
      const opts = mf.options || [];
      return (
        <div className="space-y-2 pt-1" role="radiogroup">
          {opts.map((o: any) => {
            const selected = value === o.value;
            return (
              <div
                key={o.value}
                role="radio"
                aria-checked={selected}
                tabIndex={readonly ? -1 : 0}
                onClick={() => !readonly && onChange(o.value)}
                onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !readonly) onChange(o.value); }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all select-none",
                  selected ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white",
                  !readonly && "cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/40",
                  readonly && "opacity-55 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                  selected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                )}>
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-sm text-slate-700 font-medium">{o.label}</span>
              </div>
            );
          })}
        </div>
      );
    }

    case "MULTI_SELECT": {
      const opts = mf.options || [];
      const selected: string[] = Array.isArray(value) ? value : [];
      const toggle = (v: string) => {
        if (readonly) return;
        onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
      };
      return (
        <div className="space-y-2 pt-1">
          {opts.map((o: any) => (
            <label key={o.value} className={cn(
              "flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all",
              selected.includes(o.value) ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              readonly && "opacity-55 cursor-not-allowed"
            )}>
              <div className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                selected.includes(o.value) ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
              )}>
                {selected.includes(o.value) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)}
                disabled={readonly} className="sr-only" />
              <span className="text-sm text-slate-700 font-medium">{o.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case "DATE": case "DATETIME":
      return wrapReadonly(<DateFieldInput field={mf} value={value} onChange={v => !readonly && onChange(v)} readOnly={readonly} className={inputCls} />);

    case "RATING":
      return (
        <div className="flex gap-2 py-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => !readonly && onChange(n)} disabled={readonly}
              className={cn(
                "text-3xl transition-all hover:scale-110",
                n <= (value || 0) ? "text-amber-400" : "text-slate-200 hover:text-amber-300",
                readonly && "cursor-default"
              )}>★</button>
          ))}
        </div>
      );

    case "LOOKUP":
      return <PublicLookupInput field={field} value={value} onChange={v => !readonly && onChange(v)} onRecordSelect={onRecordSelect} />;

    case "INTEGRATION":
      return (
        <IntegrationFieldInput
          fieldId={mf.id}
          searchEndpoint={`/public/forms/${token}/integration-search`}
          value={value}
          onChange={v => !readonly && onChange(v)}
          onRecordSelect={onRecordSelect}
        />
      );

    case "GLOBAL_RELATION":
      return <PublicGlobalRelationInput field={field} value={value} onChange={v => !readonly && onChange(v)} />;

    default:
      return wrapReadonly(<Input value={value || ""} onChange={e => !readonly && onChange(e.target.value)} placeholder={placeholder} readOnly={readonly} className={inputCls} />);
  }
}

// ── Main public form page ─────────────────────────────────────────────────────

// Needs a Suspense boundary for useSearchParams (?prefillToken=).
function PublicFormPageInner() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<{ code: string; message: string; unavailableMessage?: string } | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  // Set when a lookup field's autofill selects an existing CRM record — submitting
  // then updates that record instead of creating a duplicate.
  const [matchedRecordId, setMatchedRecordId] = useState<string | null>(null);
  // Set when this page was opened via a personalized "Send Form Link" —
  // submitting then writes the mapped values back into that record too.
  const [integrationPrefillToken, setIntegrationPrefillToken] = useState<string | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);
  // Set when a manual Integration Field selection is on a field whose config
  // opts in to "allow manual selection to update the CRM record" — submitting
  // then also writes the mapped values back into the record the visitor
  // picked (re-verified server-side; this is just what to ask for).
  const [manualUpdateTarget, setManualUpdateTarget] = useState<{ fieldId: string; recordId: string } | null>(null);
  // Destination field NAMES an Integration Field's mapping just prefilled,
  // keyed by that field's own id — only populated when allowManualUpdate is
  // on, since those are the only fields whose edits actually get written
  // back to the CRM. Locking them (read-only) once filled stops a visitor
  // from accidentally changing data that then overwrites the real record.
  const [lockedFieldsByIntegrationField, setLockedFieldsByIntegrationField] = useState<Record<string, string[]>>({});
  const lockedFieldNames = new Set(Object.values(lockedFieldsByIntegrationField).flat());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<number | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [submittedSnapshot, setSubmittedSnapshot] = useState<Record<string, any>>({});
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const prevSetValues = useRef<Record<string, any>>({});
  // Tracks the values Integration Field mappings last auto-filled, so
  // re-selecting a different search result can tell "still holds our last
  // auto-fill" apart from "the visitor typed their own value" — see
  // applyIntegrationMapping's doc comment.
  const autoFilledRef = useRef<Record<string, any>>({});

  // OCR Upload state
  const [ocrPhase, setOcrPhase] = useState<"landing" | "form">("landing");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExtracting, setDocExtracting] = useState(false);
  const [docFillCount, setDocFillCount] = useState(0);
  const [docError, setDocError] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Multi-page navigation
  const [pageHistory, setPageHistory] = useState<number[]>([0]);
  const [pageVisible, setPageVisible] = useState(true);

  // Section navigation
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/public/forms/${token}`)
      .then(r => { setForm(r.data); setLoading(false); })
      .catch(err => {
        const body = err?.response?.data;
        const code = (typeof body?.message === 'string' ? body.message : null) || "UNKNOWN";
        const unavailableMessage = body?.unavailableMessage || "";
        setLoadErr({ code, message: code, unavailableMessage });
        setLoading(false);
      });
  }, [token]);

  // Seed defaultValue / auto-populate values once the form loads, so hidden
  // fields (e.g. "Created Date") still carry a value through to submission
  // even though no input is ever rendered for them.
  useEffect(() => {
    if (!form || !(form as any).moduleId) return;
    const rawFieldsForDefaults: any[] = (form as any).resolvedFields || (form as any).fields || [];
    const defaults: Record<string, any> = {};
    rawFieldsForDefaults.forEach((ff: any) => {
      const mf = ff.moduleField || ff;
      if (!mf?.name) return;
      if (mf.defaultValue !== undefined && mf.defaultValue !== null) { defaults[mf.name] = mf.defaultValue; return; }
      const auto = computeAutoPopulateValue(mf);
      if (auto !== undefined) defaults[mf.name] = auto;
    });
    if (Object.keys(defaults).length > 0) {
      setFormData(prev => ({ ...defaults, ...prev }));
    }
  }, [form]);

  useEffect(() => {
    if (!submitted) return;
    const settings = form?.settings || {};
    const ps = settings.postSubmit || {};
    if (resolvePostSubmitAction(settings) !== "redirect") return;
    const delay = (ps.redirectDelay ?? 3) * 1000;
    const t = window.setTimeout(() => { window.location.href = ps.redirectUrl; }, delay);
    setRedirectTimer(delay / 1000);
    const interval = setInterval(() => setRedirectTimer(prev => (prev !== null && prev > 1 ? prev - 1 : null)), 1000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [submitted, form]);

  // "Refresh & return to form" — resets to a blank submission after a short
  // delay, same as clicking "Submit Another Response" but automatic.
  useEffect(() => {
    if (!submitted) return;
    const settings = form?.settings || {};
    if (resolvePostSubmitAction(settings) !== "refresh") return;
    const ps = settings.postSubmit || {};
    const delay = (ps.refreshDelay ?? 2) * 1000;
    const t = window.setTimeout(() => { window.location.reload(); }, delay);
    setRefreshTimer(delay / 1000);
    const interval = setInterval(() => setRefreshTimer(prev => (prev !== null && prev > 1 ? prev - 1 : null)), 1000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [submitted, form]);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const ids = document.querySelectorAll("[data-section-id]");
    if (ids.length < 2) return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the topmost visible section
          const topEntry = visible.reduce((a, b) => a.boundingClientRect.top < b.boundingClientRect.top ? a : b);
          setActiveSectionId((topEntry.target as HTMLElement).dataset.sectionId ?? null);
        }
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: 0 }
    );
    ids.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pageHistory]);

  const formRuleResult = evalFormRules(form?.settings?.formRules || [], formData);

  useEffect(() => {
    if (!form) return;
    const updates: Record<string, any> = {};
    for (const [key, over] of Object.entries(formRuleResult.fieldOverrides)) {
      if (over.setValue !== undefined && prevSetValues.current[key] !== over.setValue && formData[key] !== over.setValue) {
        updates[key] = over.setValue;
        prevSetValues.current[key] = over.setValue;
      }
    }
    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
  }, [JSON.stringify(formRuleResult.fieldOverrides), form]);

  // All computed fields
  const isStandalone = !form?.moduleId;
  const customFieldDefs: any[] = (form?.settings?.customFields as any[]) || [];
  const rawFields = isStandalone
    ? customFieldDefs
        .slice()
        .sort((a: any, b: any) => a.order - b.order)
        .map((cf: any) => ({
          id: cf.id,
          fieldId: cf.id,
          name: cf.name,
          label: cf.label,
          type: cf.type,
          placeholder: cf.placeholder || "",
          description: cf.description || "",
          options: cf.options || [],
          sectionId: cf.sectionId || null,
          order: cf.order,
          isRequired: cf.required || false,
          isHidden: false,
          isReadonly: false,
          customLabel: cf.label,
          // Lets the existing handleLookupAutoFill code path work unchanged for
          // a standalone Integration Field — its mappings live directly on the
          // CustomFieldDef (cf.integrationMappings), not a real FormField row.
          conditionalLogic: cf.type === "INTEGRATION" ? { integrationMappings: cf.integrationMappings || [] } : null,
        }))
    : form?.resolvedFields || form?.fields || [];
  const computedFields = rawFields
    .filter((ff: any) => {
      const mf = ff.moduleField || ff;
      return mf.type !== "AUTO_NUMBER" && mf.type !== "FORMULA" && !ff.isHidden;
    })
    .map((ff: any) => {
      const mf = ff.moduleField || ff;
      return { ...ff, _mf: mf, _state: evalFieldState(ff, formData, formRuleResult.fieldOverrides) };
    })
    .filter((ff: any) => {
      if (!ff._state.visible) return false;
      if (ff.sectionId) {
        const sOver = formRuleResult.sectionOverrides[ff.sectionId];
        if (sOver !== undefined && sOver.visible === false) return false;
      }
      return true;
    });

  // Multi-page config derived from form settings
  const settings = form?.settings || {};
  const fieldLayouts: Record<string, "full" | "half"> = settings.fieldLayouts || {};
  const getFieldColSpan = (fieldId: string): "full" | "half" => fieldLayouts[fieldId] || "full";
  const allPages: PageDef[] = [...(settings.pages || [])].sort((a, b) => a.order - b.order);
  const pageSections: Record<string, string> = settings.pageSections || {};
  const pageNavRules: PageNavRule[] = settings.pageRules || [];
  const isMultiPage = allPages.length > 1;
  const currentPageIdx = pageHistory[pageHistory.length - 1];
  const currentPage = isMultiPage ? (allPages[currentPageIdx] ?? null) : null;

  // Filter fields to current page
  const currentPageFields = (() => {
    if (!isMultiPage) return computedFields;
    const pageId = allPages[currentPageIdx]?.id;
    if (!pageId) return computedFields;
    const sectionIdsOnPage = new Set(
      Object.entries(pageSections).filter(([, pid]) => pid === pageId).map(([sid]) => sid)
    );
    return computedFields.filter((ff: any) => {
      const sid = ff.sectionId || null;
      if (!sid) return currentPageIdx === 0;
      return sectionIdsOnPage.has(sid);
    });
  })();

  // Section metadata
  const sectionMeta: Record<string, any> = Object.fromEntries(
    (form?.sections || []).map((s: any) => [s.id, s])
  );

  // Build section groups for current page fields
  const currentFieldGroups: { id: string | null; name: string | null; description?: string; fields: any[] }[] = [];
  for (const ff of currentPageFields) {
    const sid = ff.sectionId || null;
    let g = currentFieldGroups.find(x => x.id === sid);
    if (!g) {
      const sec = sid ? sectionMeta[sid] : null;
      g = { id: sid, name: sec?.label || sec?.name || null, description: sec?.description, fields: [] };
      currentFieldGroups.push(g);
    }
    g.fields.push(ff);
  }

  // Evaluate page navigation rules to get next page index
  const getNextPageIdx = (): number | null => {
    if (!isMultiPage) return null;
    const pageId = allPages[currentPageIdx]?.id;
    if (!pageId) return null;
    const rules = pageNavRules.filter(r => r.sourcePageId === pageId);
    for (const rule of rules) {
      const conditions = rule.conditions || [];
      const logic = rule.conditionsLogic || "AND";
      const results = conditions.map(c => matchRule(c, formData));
      const matched = logic === "AND" ? results.every(Boolean) : results.some(Boolean);
      if (matched) {
        const targetIdx = allPages.findIndex(p => p.id === rule.targetPageId);
        if (targetIdx >= 0) return targetIdx;
      }
    }
    return currentPageIdx < allPages.length - 1 ? currentPageIdx + 1 : null;
  };

  const nextPageIdx = getNextPageIdx();
  const isLastPage = !isMultiPage || nextPageIdx === null;

  // Validate current page required fields only
  const validateCurrentPage = (): boolean => {
    const errs: Record<string, string> = {};
    currentPageFields.forEach((ff: any) => {
      if (!ff._state.required) return;
      const v = formData[ff._mf.name];
      if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
        errs[ff._mf.name] = `${ff.customLabel || ff._mf.label || "This field"} is required`;
      }
    });
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const navigateToPage = (idx: number) => {
    setPageVisible(false);
    setTimeout(() => {
      setPageHistory(prev => [...prev, idx]);
      setFieldErrors({});
      setPageVisible(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 180);
  };

  const goBack = () => {
    if (pageHistory.length <= 1) return;
    setPageVisible(false);
    setTimeout(() => {
      setPageHistory(prev => prev.slice(0, -1));
      setFieldErrors({});
      setPageVisible(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 180);
  };

  const doSubmit = async () => {
    setSubmitError(null);
    if (formRuleResult.submitBlockers.length > 0) {
      setSubmitError(formRuleResult.submitBlockers[0]);
      return;
    }
    // Validate only current page — previous pages were validated on each "Next" click
    if (!validateCurrentPage()) return;
    const snap = { ...formData };
    setSubmittedSnapshot(snap);
    setSubmittedAt(new Date());
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        ...(matchedRecordId ? { __matchedRecordId: matchedRecordId } : {}),
        ...(integrationPrefillToken ? { __integrationPrefillToken: integrationPrefillToken } : {}),
        ...(manualUpdateTarget ? { __integrationManualUpdate: manualUpdateTarget } : {}),
      };
      const result = await api.post(`/public/forms/${token}/submit`, payload);
      if (result.data?.ticketNumber) setAppId(result.data.ticketNumber);
      setSubmitted(true);
    } catch (err: any) {
      const code = err?.response?.data?.message;
      if (code === "FORM_EXPIRED")            setSubmitError(settings.unavailableMessage || settings.expiredMessage        || "This form has expired.");
      else if (code === "FORM_LIMIT_REACHED") setSubmitError(settings.unavailableMessage || settings.limitReachedMessage   || "This form has reached its submission limit.");
      else if (code === "FORM_CLOSED")        setSubmitError(settings.unavailableMessage || settings.closedMessage         || "This form is currently closed.");
      else setSubmitError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); doSubmit(); };

  const handleNext = () => {
    if (!validateCurrentPage()) return;
    if (nextPageIdx !== null) navigateToPage(nextPageIdx);
    else doSubmit();
  };

  const handleLookupAutoFill = (
    ff: any, recordId: string, recordData: Record<string, any>,
    sourceFields?: { id: string; name: string; label: string }[],
    allowManualUpdate?: boolean,
  ) => {
    const mf = ff.moduleField || ff;

    if (mf.type === "INTEGRATION") {
      // Integration Field only copies values into other fields on THIS form —
      // unlike LOOKUP self-service forms, the record being submitted is NOT
      // the searched record, so matchedRecordId is deliberately left untouched.
      // The one opt-in exception: when the field's own config explicitly
      // allows it, remember this selection so submit can also write back
      // into the searched record (verified server-side — see
      // resolveManualUpdateTarget in forms.service.ts).
      setManualUpdateTarget(allowManualUpdate ? { fieldId: mf.id, recordId } : null);

      const mappings: { sourceFieldId: string; destinationFormFieldId: string; behavior: "UPDATE_EXISTING" | "FILL_IF_EMPTY" }[] =
        (ff.conditionalLogic as any)?.integrationMappings || [];
      if (mappings.length === 0) {
        setLockedFieldsByIntegrationField(prev => {
          if (!(mf.id in prev)) return prev;
          const next = { ...prev };
          delete next[mf.id];
          return next;
        });
        return;
      }

      const sourceById = new Map<string, string>((sourceFields || []).map(f => [f.id, f.name]));
      const destById: Map<string, string> = isStandalone
        ? new Map(customFieldDefs.map((c: any) => [c.id, c.name] as [string, string]))
        : new Map((form?.resolvedFields || form?.fields || []).map((f: any) => [f.id, (f.moduleField || f).name] as [string, string]));

      const resolved = mappings
        .map(m => ({
          sourceFieldName: sourceById.get(m.sourceFieldId) || "",
          destinationFieldName: destById.get(m.destinationFormFieldId) || "",
          behavior: m.behavior,
        }))
        .filter(m => m.sourceFieldName && m.destinationFieldName);

      // Only lock fields when this selection can actually write back to the
      // CRM (allowManualUpdate) — otherwise a locked field would just be an
      // annoyance with no corresponding safety benefit.
      setLockedFieldsByIntegrationField(prev => {
        if (!allowManualUpdate) {
          if (!(mf.id in prev)) return prev;
          const next = { ...prev };
          delete next[mf.id];
          return next;
        }
        return { ...prev, [mf.id]: resolved.map(m => m.destinationFieldName) };
      });

      // Deliberately NOT the `setFormData(prev => ...)` functional-updater
      // form here: React (Strict Mode, dev) invokes updater functions twice
      // to catch impure ones, and mutating autoFilledRef inside the updater
      // made the second invocation see an already-advanced ref while `prev`
      // was still the pre-update value — so it read as "neither empty nor
      // still our last fill" and silently skipped the update on every
      // re-selection after the first. Reading `formData` directly from the
      // closure and dispatching a plain value keeps the ref mutation outside
      // React's update machinery entirely.
      const result = applyIntegrationMapping(formData, recordData, resolved, autoFilledRef.current);
      autoFilledRef.current = result.autoFilled;
      setFormData(result.data);
      return;
    }

    const autoFillMap: { sourceField: string; targetFieldKey: string }[] =
      (ff.conditionalLogic as any)?.lookupAutoFill || [];
    if (autoFillMap.length === 0) return;
    const updates: Record<string, any> = {};
    for (const { sourceField, targetFieldKey } of autoFillMap) {
      if (sourceField && targetFieldKey && recordData[sourceField] !== undefined) {
        updates[targetFieldKey] = recordData[sourceField];
      }
    }
    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
    // Data came from this existing record — submitting should update it, not
    // create a duplicate.
    setMatchedRecordId(recordId);
  };

  // Personalized "Send Form Link" — a ?prefillToken= param identifies a
  // specific record; resolve it once the form has loaded and apply its
  // mapped values exactly like a manual Integration Field search-select,
  // then remember the token so submitting writes back into that record.
  useEffect(() => {
    if (!form || prefillApplied) return;
    const prefillToken = searchParams.get("prefillToken");
    if (!prefillToken) return;
    setPrefillApplied(true);
    api.get(`/public/forms/${token}/prefill`, { params: { prefillToken } })
      .then(r => {
        const { integrationFieldId, recordId, recordData, sourceFields } = r.data;
        const ff = rawFields.find((f: any) => f.fieldId === integrationFieldId);
        if (ff) handleLookupAutoFill(ff, recordId, recordData, sourceFields);
        setIntegrationPrefillToken(prefillToken);
      })
      .catch(() => { /* expired/invalid link — fall back to a blank form */ });
  }, [form, prefillApplied, searchParams, token]);

  const handleDocExtract = async () => {
    if (!docFile) return;
    setDocExtracting(true);
    setDocError(null);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => { const r = reader.result as string; res(r.split(",")[1]); };
        reader.onerror = rej;
        reader.readAsDataURL(docFile);
      });
      const result = await api.post(`/public/forms/${token}/extract-document`, {
        fileBase64: base64,
        mediaType: docFile.type,
      });
      if (result.data?.fieldValues) {
        const vals = result.data.fieldValues as Record<string, any>;

        // Normalize option-based fields: OCR may return label text instead of the
        // exact stored value. Try exact → case-insensitive value → case-insensitive label → partial label.
        const allFormFields: any[] = form?.resolvedFields || form?.fields || [];
        const OPTION_TYPES = new Set(["RADIO", "SELECT", "DROPDOWN", "STATUS", "MULTI_SELECT"]);

        const normalized: Record<string, any> = {};
        for (const [key, rawVal] of Object.entries(vals)) {
          const ff = allFormFields.find((f: any) => {
            const mf = f.moduleField || f;
            return (mf?.name === key) || (f?.name === key);
          });
          const mf = ff?.moduleField || ff;
          const opts: { value: string; label: string }[] = mf?.options || [];

          if (opts.length && OPTION_TYPES.has(mf?.type)) {
            const raw = String(rawVal ?? "").trim();
            const lo = raw.toLowerCase();
            const match =
              opts.find(o => o.value === raw) ||
              opts.find(o => o.value.toLowerCase() === lo) ||
              opts.find(o => o.label.toLowerCase() === lo) ||
              opts.find(o => o.label.toLowerCase().includes(lo) || lo.includes(o.label.toLowerCase()));
            normalized[key] = match ? match.value : rawVal;
          } else {
            normalized[key] = rawVal;
          }
        }

        setFormData(prev => ({ ...prev, ...normalized }));
        setDocFillCount(Object.keys(normalized).length);
      }
      setOcrPhase("form");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Could not extract data from the document.";
      setDocError(msg);
    } finally {
      setDocExtracting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto shadow-sm">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading form…</p>
        </div>
      </div>
    );
  }

  // ── Load errors ──
  if (loadErr) {
    const codeToScreen: Record<string, { icon: "check" | "error" | "clock"; title: string; msg: string; type: StatusType }> = {
      FORM_CLOSED:        { icon: "error", title: "Form Closed",            msg: loadErr.unavailableMessage || "This form is currently closed.",                           type: "error"   },
      FORM_EXPIRED:       { icon: "error", title: "Submissions Ended",      msg: loadErr.unavailableMessage || "This form is no longer accepting submissions.",            type: "error"   },
      FORM_LIMIT_REACHED: { icon: "error", title: "Response Limit Reached", msg: loadErr.unavailableMessage || "This form has reached its maximum number of responses.", type: "warning" },
      FORM_NOT_STARTED:   { icon: "clock", title: "Not Yet Open",           msg: loadErr.unavailableMessage || "This form is not yet open. Please check back later.",     type: "info"    },
    };
    const screen = codeToScreen[loadErr.code] || {
      icon: "error" as const, title: "Form Unavailable",
      msg: "This form could not be found or is no longer available.", type: "error" as const,
    };
    return <StatusScreen icon={screen.icon} title={screen.title} message={screen.msg} type={screen.type} />;
  }

  // ── OCR Upload landing page ──
  const ocrEnabled = !!(form && settings.documentIntelligence?.enabled);
  if (ocrEnabled && ocrPhase === "landing") {
    const acceptedTypes: string[] = settings.documentIntelligence.acceptedTypes || ["pdf", "docx", "jpg", "jpeg", "png"];
    const acceptAttr = acceptedTypes.map((t: string) => t === "pdf" ? ".pdf" : t === "docx" ? ".docx" : `image/${t}`).join(",");
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: settings.style?.pageBg || "linear-gradient(to bottom, #f8fafc, #ffffff)" }}
      >
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.ocr-card{animation:fadeUp .3s ease both}`}</style>
        <div className="max-w-md w-full space-y-4 ocr-card">
          {/* Form identity */}
          {(settings.header?.logoUrl || form?.name) && (
            <div className="text-center mb-2">
              {settings.header?.logoUrl && (
                <img src={settings.header.logoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
              )}
              <h1 className="text-xl font-bold text-slate-900">{form?.name}</h1>
              {form?.description && <p className="text-sm text-slate-500 mt-1">{form.description}</p>}
            </div>
          )}

          {/* Option 1 — upload */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <ScanSearch className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-slate-900">Upload Document</p>
                  <p className="text-sm text-slate-500 mt-0.5">Upload your CV, resume, or any relevant document. AI will extract and fill matching fields automatically.</p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Supported: {acceptedTypes.map(t => `.${t}`).join(", ")}
                  </p>
                </div>
              </div>

              <input
                ref={docFileInputRef}
                type="file"
                className="hidden"
                accept={acceptAttr}
                onChange={e => {
                  if (e.target.files?.[0]) { setDocFile(e.target.files[0]); setDocError(null); }
                  e.target.value = "";
                }}
              />

              {/* File drop zone */}
              <div
                onClick={() => docFileInputRef.current?.click()}
                className={cn(
                  "mt-4 border-2 border-dashed rounded-xl px-5 py-5 text-center cursor-pointer transition-all",
                  docFile ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                )}
              >
                {docFile ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <FileText className="w-7 h-7 text-indigo-500" />
                    <p className="text-sm font-medium text-indigo-700">{docFile.name}</p>
                    <p className="text-xs text-indigo-400">{(docFile.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <Upload className="w-7 h-7" />
                    <p className="text-sm font-medium text-slate-600">Click to select a file</p>
                  </div>
                )}
              </div>

              {docError && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{docError}</p>
              )}

              <button
                onClick={handleDocExtract}
                disabled={!docFile || docExtracting}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {docExtracting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Processing document…</>
                  : <><ScanSearch className="w-4 h-4" />Extract &amp; Open Form</>}
              </button>
            </div>
          </div>

          {/* Option 2 — manual */}
          <button
            onClick={() => setOcrPhase("form")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            Open Form Manually
          </button>

          <p className="text-center text-xs text-slate-400">
            Powered by <span className="font-medium text-slate-500">CRM Platform</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    const ps = settings.postSubmit || {};
    const message = ps.message || "Thank you! Your response has been recorded.";
    const postSubmitAction = resolvePostSubmitAction(settings);
    const showReceipt = !!(settings.ticketing?.enabled);

    if (showReceipt) {
      // Build receipt rows from submitted snapshot in form-field order
      const allFormFields = (form?.resolvedFields || form?.fields || []) as any[];
      const receiptRows = allFormFields
        .map((ff: any) => {
          const mf = ff.moduleField;
          const label = ff.customLabel || mf?.label || mf?.name || ff.label || ff.name || "";
          const key = mf?.name || ff.name || ff.fieldId || "";
          const raw = submittedSnapshot[key];
          if (!label || raw === undefined || raw === null || raw === "") return null;
          return { label, value: Array.isArray(raw) ? raw.join(", ") : String(raw) };
        })
        .filter(Boolean) as { label: string; value: string }[];

      const dateStr = submittedAt
        ? submittedAt.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" })
        : new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
      const timeStr = submittedAt
        ? submittedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

      return (
        <div className="min-h-screen flex items-center justify-center p-4 print:bg-white print:block print:p-0"
          style={{ background: settings.style?.pageBg || "linear-gradient(to bottom, #f0f4ff, #ffffff)" }}>
          <style>{`@media print{body{margin:0;padding:0}.no-print{display:none!important}#submission-receipt{box-shadow:none!important;border:1px solid #e2e8f0!important;max-width:100%!important}}`}</style>

          <div className="max-w-lg w-full mx-auto">
            {/* Success banner */}
            <div className="no-print flex items-center gap-3 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Submission Successful</p>
                <p className="text-xs text-emerald-600">Your response has been recorded successfully.</p>
              </div>
            </div>

            {/* Receipt */}
            <div id="submission-receipt" className="bg-white shadow-[0_4px_32px_rgba(0,0,0,0.10)] border border-slate-200 rounded-2xl overflow-hidden print:rounded-none">
              {/* Accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />

              {/* Receipt header */}
              <div className="px-8 pt-6 pb-5 border-b border-slate-100 text-center">
                {settings.header?.logoUrl && (
                  <img src={settings.header.logoUrl} alt="Logo" className="h-9 mx-auto mb-3 object-contain" />
                )}
                <h2 className="text-base font-bold text-slate-900">{form?.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Submission Receipt</p>
              </div>

              {/* Field rows */}
              <div className="px-8 py-5 space-y-0 divide-y divide-slate-50">
                {/* App ID row — only if backend provided one */}
                {appId && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs font-medium text-slate-500 w-40 shrink-0">Application ID</span>
                    <span className="text-xs font-bold text-slate-900 font-mono text-right">{appId}</span>
                  </div>
                )}
                {/* Submission date & time */}
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-slate-500 w-40 shrink-0">Submission Date</span>
                  <span className="text-xs text-slate-800 font-medium text-right">{dateStr}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-slate-500 w-40 shrink-0">Submission Time</span>
                  <span className="text-xs text-slate-800 font-medium text-right">{timeStr}</span>
                </div>
                {/* Status */}
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-slate-500 w-40 shrink-0">Status</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Received</span>
                </div>
                {/* Submitted field values */}
                {receiptRows.map((row, i) => (
                  <div key={i} className="flex items-start justify-between py-2.5 gap-4">
                    <span className="text-xs font-medium text-slate-500 w-40 shrink-0 pt-0.5">{row.label}</span>
                    <span className="text-xs text-slate-900 font-medium text-right flex-1 break-words">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="mx-8 border-t border-dashed border-slate-200" />

              {/* Message */}
              <div className="px-8 py-4 text-center">
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">{message}</p>
              </div>

              {/* Footer note */}
              <div className="px-8 py-3 bg-slate-50 text-center border-t border-slate-100">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Please keep this receipt for your reference</p>
                {ps.redirectUrl && redirectTimer !== null && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Redirecting in {redirectTimer}s…
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons — hidden on print */}
            <div className="no-print flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              >
                Submit Another Response
              </button>
            </div>

            <p className="no-print text-center text-xs text-slate-400 mt-4">
              Powered by <span className="font-medium text-slate-500">CRM Platform</span>
            </p>
          </div>
        </div>
      );
    }

    // ── Default success screen (receipt disabled) — unchanged ──
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-emerald-200/60 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <div className="p-10 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-30" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">All done!</h2>
              <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{message}</p>
              {postSubmitAction === "redirect" && redirectTimer !== null && (
                <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-full px-3 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Redirecting in {redirectTimer}s…
                </div>
              )}
              {postSubmitAction === "refresh" && refreshTimer !== null && (
                <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-full px-3 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Returning to form in {refreshTimer}s…
                </div>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-5">
            Powered by <span className="font-medium text-slate-500">CRM Platform</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──
  const hasBranding = !!(settings.header?.title || settings.header?.logoUrl || settings.header?.bannerUrl || settings.header?.subtitle);
  const accentColor = settings.header?.bgColor || "#4f46e5";
  const submitLabel = settings.submitButtonText || "Submit";
  const progressPct = isMultiPage ? ((currentPageIdx + 1) / allPages.length) * 100 : 100;

  const namedSectionGroups = currentFieldGroups.filter(g => g.id && g.name);

  const sty = settings.style || {};
  const fontFamilyMap: Record<string, string> = {
    inter:        "'Inter', system-ui, sans-serif",
    poppins:      "'Poppins', sans-serif",
    roboto:       "'Roboto', sans-serif",
    lato:         "'Lato', sans-serif",
    "open-sans":  "'Open Sans', sans-serif",
    nunito:       "'Nunito', sans-serif",
    playfair:     "'Playfair Display', Georgia, serif",
    merriweather: "'Merriweather', Georgia, serif",
  };
  const formWidthClass: Record<string, string> = {
    sm: "max-w-[480px]", md: "max-w-[640px]", lg: "max-w-[800px]", full: "max-w-full",
  };
  const formWidth = formWidthClass[sty.formWidth || "md"] || "max-w-[640px]";
  const fontFamily = sty.fontFamily && sty.fontFamily !== "system" ? fontFamilyMap[sty.fontFamily] : undefined;
  const bodyColorStyle = sty.bodyColor ? { color: sty.bodyColor } : undefined;

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: sty.pageBg || undefined, fontFamily: fontFamily || undefined, ...(!sty.pageBg ? { backgroundImage: "linear-gradient(to bottom, #f8fafc, #ffffff)" } : {}) }}
    >
      <div className="max-w-5xl mx-auto flex gap-6 items-start">

        {/* Section navigation sidebar — only desktop, only when 2+ named sections */}
        <SectionNavSidebar groups={namedSectionGroups} activeSectionId={activeSectionId} />

        <div className={cn("flex-1 min-w-0 mx-auto", formWidth)}
          style={bodyColorStyle}
        >

        <FormBrandingHeader form={form} />

        <div className="bg-white rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.07)] border border-slate-200/60 overflow-hidden">

          {/* Progress bar (multi-page only) */}
          {isMultiPage && (
            <div className="h-1.5 bg-slate-100">
              <div
                className="h-full rounded-r-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}bb 100%)`,
                }}
              />
            </div>
          )}

          {/* Page header */}
          {isMultiPage ? (
            <div className="px-8 sm:px-10 pt-8 pb-5">
              <div className="flex items-center justify-between mb-5">
                {/* Step dots */}
                <div className="flex items-center gap-1.5">
                  {allPages.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        i < currentPageIdx  ? "w-2 h-2 bg-indigo-400 opacity-70" :
                        i === currentPageIdx ? "w-6 h-2 bg-indigo-600" :
                        "w-2 h-2 bg-slate-200"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-400 tabular-nums">
                  {currentPageIdx + 1} of {allPages.length}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {currentPage?.title || `Step ${currentPageIdx + 1}`}
              </h2>
              {currentPage?.description && (
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{currentPage.description}</p>
              )}
            </div>
          ) : !hasBranding ? (
            <div className="relative px-8 sm:px-10 pt-8 pb-5">
              <div className="absolute left-0 top-7 h-10 w-1 rounded-r" style={{ backgroundColor: accentColor }} />
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{form?.name}</h1>
              {form?.description && (
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{form.description}</p>
              )}
            </div>
          ) : null}

          <form onSubmit={handleFormSubmit}>
            {/* Fields container with fade transition */}
            <div
              className="px-8 sm:px-10 pb-6"
              style={{
                opacity: pageVisible ? 1 : 0,
                transform: pageVisible ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 180ms ease, transform 180ms ease",
              }}
            >
              {/* OCR fill confirmation banner */}
              {docFillCount > 0 && (
                <div className="mb-4 flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <p className="text-xs font-medium text-indigo-700">
                    {docFillCount} field{docFillCount !== 1 ? "s" : ""} pre-filled from document — review and adjust below
                  </p>
                </div>
              )}

              {/* Rule messages */}
              {formRuleResult.messages.length > 0 && (
                <div className="space-y-2 mb-5">
                  {formRuleResult.messages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-sm mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {currentPageFields.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">No fields configured for this page.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentFieldGroups.map((group) => (
                    <div
                      key={group.id || "default"}
                      id={group.id ? `sec-${group.id}` : undefined}
                      data-section-id={group.id || undefined}
                    >
                      {group.name && (
                        <div className="flex items-center gap-3 mb-4 mt-1">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                              {group.name}
                            </span>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                        </div>
                      )}
                      {group.description && (
                        <p className="text-xs text-slate-400 leading-relaxed mb-3 -mt-2">{group.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {group.fields.map((ff: any) => {
                          const mf = ff._mf;
                          const label = ff.customLabel || mf.label || mf.name;
                          const required = ff._state.required;
                          const readonly = ff._state.readonly || lockedFieldNames.has(mf.name);
                          const err = fieldErrors[mf.name];
                          const colSpan = getFieldColSpan(ff.fieldId || ff.id);
                          const rawVal = formData[mf.name];
                          const isFilled = rawVal !== null && rawVal !== undefined && rawVal !== ""
                            && !(Array.isArray(rawVal) && rawVal.length === 0);

                          return (
                            <div
                              key={ff.id}
                              className={cn(
                                "p-5 rounded-xl border transition-all",
                                colSpan === "half" ? "col-span-1" : "col-span-2",
                                err
                                  ? "border-red-300 bg-red-50/20 shadow-[0_0_0_3px_rgba(239,68,68,0.06)]"
                                  : isFilled
                                    ? "border-emerald-300 bg-emerald-50/20 shadow-[0_0_0_3px_rgba(16,185,129,0.05)] focus-within:border-emerald-400"
                                    : "border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] focus-within:border-indigo-300 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.06)]"
                              )}
                            >
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <Label htmlFor={mf.name} className="text-sm font-semibold text-slate-800 leading-tight cursor-default flex items-center gap-1.5">
                                  {label}
                                  {required && <span className="text-red-500 font-bold text-xs">*</span>}
                                </Label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isFilled && !err && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  )}
                                  {readonly && (
                                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded px-2 py-0.5 uppercase tracking-wide">
                                      Read only
                                    </span>
                                  )}
                                </div>
                              </div>
                              {mf.helpText && (
                                <p className="text-xs text-slate-400 leading-relaxed -mt-1.5 mb-3">{mf.helpText}</p>
                              )}
                              <PublicFieldInput
                                field={ff}
                                value={formData[mf.name] ?? ""}
                                readonly={readonly}
                                onChange={v => setFormData(prev => ({ ...prev, [mf.name]: v }))}
                                onRecordSelect={(rid, rdata, srcFields, allowManualUpdate) => handleLookupAutoFill(ff, rid, rdata, srcFields, allowManualUpdate)}
                                token={token}
                              />
                              {err && (
                                <p className="flex items-center gap-1.5 text-xs text-red-500 mt-2.5 font-medium">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  {err}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation footer */}
            <div className="px-8 sm:px-10 py-5 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between gap-3">
              {/* Back */}
              {isMultiPage && pageHistory.length > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : <div />}

              {/* Next / Submit */}
              {isMultiPage && !isLastPage ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      {submitLabel}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by <span className="font-medium text-slate-500">CRM Platform</span>
        </p>

        </div>{/* /flex-1 form column */}
      </div>{/* /max-w-5xl flex */}
    </div>
  );
}

export default function PublicFormPage() {
  return (
    <Suspense>
      <PublicFormPageInner />
    </Suspense>
  );
}
