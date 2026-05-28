"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

// ── Rule evaluation ───────────────────────────────────────────────────────────

function matchRule(rule: FieldRule, data: Record<string, any>): boolean {
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

  // Static states from FormField
  let visible  = !ff.isHidden;
  let required = ff.isRequired ?? (!!mf.isRequired || false);
  let readonly = !!ff.isReadonly;

  // Apply FormField-level conditional logic rules
  const rules: FieldRule[] = (ff.conditionalLogic as any)?.rules || [];
  const showRules = rules.filter(r => r.action === "show");
  const hideRules = rules.filter(r => r.action === "hide");

  // Show/hide: if any show-rules exist and none of them match → hidden
  if (showRules.length > 0 && hideRules.length === 0) {
    visible = showRules.some(r => matchRule(r, data));
  } else if (hideRules.length > 0) {
    if (hideRules.some(r => matchRule(r, data))) visible = false;
    if (showRules.length > 0 && !showRules.some(r => matchRule(r, data))) visible = false;
  }

  // Require / unrequire / disable
  for (const rule of rules) {
    if (!matchRule(rule, data)) continue;
    if (rule.action === "require")   required = true;
    if (rule.action === "unrequire") required = false;
    if (rule.action === "disable")   readonly = true;
  }

  // Also apply module-level conditions from field.settings.conditions (studio rules)
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

  // Apply form-level rule overrides (highest priority)
  const mfName = mf?.name || "";
  const over = formOverrides?.[mfName];
  if (over) {
    if (over.visible  !== undefined) visible  = over.visible;
    if (over.required !== undefined) required = over.required;
    if (over.readonly !== undefined) readonly = over.readonly;
  }

  return { visible, required, readonly };
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

  // First pass: sections targeted by show_section rules start hidden by default.
  // This enables the pattern: "show Bank Section only when Payment Method = Bank".
  for (const rule of rules) {
    if (!rule.enabled) continue;
    for (const action of (rule.actions || [])) {
      if (action.type === "show_section" && action.target) {
        if (!sectionOverrides[action.target]) sectionOverrides[action.target] = { visible: false };
      }
    }
  }

  // Second pass: evaluate conditions and apply actions
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
  const settings = form?.settings || {};
  const h = settings.header || {};
  const hasContent = h.title || h.subtitle || h.logoUrl || h.bannerUrl;
  if (!hasContent) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mb-6">
      {h.bannerUrl && (
        <div className="h-36 bg-gray-100 overflow-hidden">
          <img src={h.bannerUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as any).parentElement.style.display = "none"; }} />
        </div>
      )}
      <div
        className="px-8 py-6"
        style={{ backgroundColor: h.bgColor || "#4F46E5", color: h.textColor || "#FFFFFF", textAlign: (h.alignment || "center") as any }}
      >
        {h.logoUrl && (
          <img src={h.logoUrl} alt="Logo" className="h-10 mb-3 inline-block"
            onError={e => { (e.target as any).style.display = "none"; }} />
        )}
        <h1 className="text-xl font-bold leading-tight">{h.title || form?.name}</h1>
        {h.subtitle && <p className="mt-1 text-sm opacity-85">{h.subtitle}</p>}
        {form?.description && !h.subtitle && (
          <p className="mt-1 text-sm opacity-70">{form.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Status / error screens ────────────────────────────────────────────────────

function StatusScreen({ icon, title, message, color }: { icon: "check" | "error" | "clock"; title: string; message: string; color: string }) {
  const Icon = icon === "check" ? CheckCircle2 : AlertCircle;
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4", color)}>
          {icon === "clock"
            ? <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            : <Icon className="w-7 h-7" />}
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// ── Lookup input ──────────────────────────────────────────────────────────────

function PublicLookupInput({ field, value, onChange, onRecordSelect }: {
  field: any; value: any; onChange: (v: any) => void;
  onRecordSelect?: (id: string, recordData: Record<string, any>) => void;
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

  if (!targetModuleId) return <p className="text-sm text-gray-400 italic">Lookup not configured</p>;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={label || search} onChange={e => { setSearch(e.target.value); setLabel(""); setOpen(true); }}
            onFocus={() => setOpen(true)} placeholder="Search…" className="pl-9" />
        </div>
        {value && (
          <button type="button" onClick={() => { onChange(null); setLabel(""); setSearch(""); }} className="text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
          {results.map((item: any) => (
            <button key={item.id} type="button"
              onClick={() => { onChange(item.id); setLabel(item.label); setOpen(false); onRecordSelect?.(item.id, item.data || {}); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0">
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
    <div className="space-y-2">
      {displayLevels.map((levelLabel, level) => (
        <div key={level} className="space-y-1">
          {levels.length > 1 && <p className="text-xs text-gray-400">{levelLabel}</p>}
          <Select value={selections[level] || ""} onValueChange={v => selectLevel(level, v)}
            disabled={level > 0 && !selections[level - 1]}>
            <SelectTrigger className={cn(level > 0 && !selections[level - 1] && "opacity-50 cursor-not-allowed")}>
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

function PublicFieldInput({ field, value, onChange, readonly, onRecordSelect }: {
  field: any; value: any; onChange: (v: any) => void; readonly?: boolean;
  onRecordSelect?: (id: string, recordData: Record<string, any>) => void;
}) {
  const mf = field.moduleField || field;
  const type = mf.type;
  const placeholder = field.customPlaceholder || mf.placeholder || "";

  const wrapReadonly = (inner: React.ReactNode) =>
    readonly ? <div className="pointer-events-none opacity-60 select-none">{inner}</div> : <>{inner}</>;

  switch (type) {
    case "TEXT": case "EMAIL": case "PHONE": case "URL":
      return wrapReadonly(
        <Input type={type === "EMAIL" ? "email" : type === "PHONE" ? "tel" : type === "URL" ? "url" : "text"}
          value={value || ""} onChange={e => !readonly && onChange(e.target.value)}
          placeholder={placeholder} readOnly={readonly} />
      );

    case "TEXTAREA": case "RICH_TEXT":
      return wrapReadonly(
        <Textarea value={value || ""} onChange={e => !readonly && onChange(e.target.value)}
          placeholder={placeholder} rows={4} className="resize-none" readOnly={readonly} />
      );

    case "NUMBER": case "DECIMAL": case "CURRENCY":
      return wrapReadonly(
        <Input type="number" value={value || ""} onChange={e => !readonly && onChange(e.target.value)}
          placeholder={placeholder} readOnly={readonly} />
      );

    case "BOOLEAN": case "CHECKBOX":
      return (
        <div className="flex items-center gap-2">
          <Switch checked={!!value} onCheckedChange={v => !readonly && onChange(v)} disabled={readonly} />
          <span className="text-sm text-gray-600">{value ? "Yes" : "No"}</span>
        </div>
      );

    case "DROPDOWN": case "STATUS": {
      const opts = mf.options || [];
      return wrapReadonly(
        <Select value={value || ""} onValueChange={v => !readonly && onChange(v)} disabled={readonly}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {opts.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    case "RADIO": {
      const opts = mf.options || [];
      return (
        <div className="space-y-2">
          {opts.map((o: any) => (
            <label key={o.value} className={cn("flex items-center gap-2 cursor-pointer", readonly && "opacity-60 cursor-not-allowed")}>
              <input type="radio" value={o.value} checked={value === o.value}
                onChange={() => !readonly && onChange(o.value)} disabled={readonly}
                className="accent-blue-600" />
              <span className="text-sm text-gray-700">{o.label}</span>
            </label>
          ))}
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
        <div className="space-y-2">
          {opts.map((o: any) => (
            <label key={o.value} className={cn("flex items-center gap-2 cursor-pointer", readonly && "opacity-60 cursor-not-allowed")}>
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)}
                disabled={readonly} className="accent-blue-600" />
              <span className="text-sm text-gray-700">{o.label}</span>
            </label>
          ))}
        </div>
      );
    }

    case "DATE":
      return wrapReadonly(<Input type="date" value={value || ""} onChange={e => !readonly && onChange(e.target.value)} readOnly={readonly} />);

    case "DATETIME":
      return wrapReadonly(<Input type="datetime-local" value={value || ""} onChange={e => !readonly && onChange(e.target.value)} readOnly={readonly} />);

    case "RATING":
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => !readonly && onChange(n)} disabled={readonly}
              className={cn("text-2xl hover:scale-110 transition-transform", n <= (value || 0) ? "text-yellow-400" : "text-gray-200", readonly && "cursor-default")}>★</button>
          ))}
        </div>
      );

    case "LOOKUP":
      return <PublicLookupInput field={field} value={value} onChange={v => !readonly && onChange(v)} onRecordSelect={onRecordSelect} />;

    case "GLOBAL_RELATION":
      return <PublicGlobalRelationInput field={field} value={value} onChange={v => !readonly && onChange(v)} />;

    default:
      return wrapReadonly(<Input value={value || ""} onChange={e => !readonly && onChange(e.target.value)} placeholder={placeholder} readOnly={readonly} />);
  }
}

// ── Main public form page ─────────────────────────────────────────────────────

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<{ code: string; message: string } | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);
  const prevSetValues = useRef<Record<string, any>>({});

  useEffect(() => {
    api.get(`/public/forms/${token}`)
      .then(r => { setForm(r.data); setLoading(false); })
      .catch(err => {
        const code = err?.response?.data?.message || "UNKNOWN";
        const msg  = err?.response?.data?.message || "Form not found or unavailable.";
        setLoadErr({ code, message: msg });
        setLoading(false);
      });
  }, [token]);

  // Post-submit redirect timer
  useEffect(() => {
    if (!submitted) return;
    const settings = form?.settings || {};
    const ps = settings.postSubmit || {};
    if (!ps.redirectUrl) return;
    const delay = (ps.redirectDelay ?? 3) * 1000;
    const t = window.setTimeout(() => { window.location.href = ps.redirectUrl; }, delay);
    setRedirectTimer(delay / 1000);
    const interval = setInterval(() => setRedirectTimer(prev => (prev !== null && prev > 1 ? prev - 1 : null)), 1000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [submitted, form]);

  // Evaluate form-level rules on every render (fast for typical rule counts)
  const formRuleResult = evalFormRules(form?.settings?.formRules || [], formData);

  // Apply set_value actions — only when the target value actually differs
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

  const rawFields = form?.resolvedFields || form?.fields || [];
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
      // Section-level visibility: hide all fields whose section is hidden by a form rule
      if (ff.sectionId) {
        const sOver = formRuleResult.sectionOverrides[ff.sectionId];
        if (sOver !== undefined && sOver.visible === false) return false;
      }
      return true;
    });

  const validate = () => {
    const errs: Record<string, string> = {};
    computedFields.forEach((ff: any) => {
      if (!ff._state.required) return;
      const v = formData[ff._mf.name];
      if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
        errs[ff._mf.name] = `${ff.customLabel || ff._mf.label || "This field"} is required`;
      }
    });
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLookupAutoFill = (ff: any, _recordId: string, recordData: Record<string, any>) => {
    const autoFillMap: { sourceField: string; targetFieldKey: string }[] =
      (ff.conditionalLogic as any)?.lookupAutoFill || [];
    if (autoFillMap.length === 0) return;
    const updates: Record<string, any> = {};
    for (const { sourceField, targetFieldKey } of autoFillMap) {
      if (sourceField && targetFieldKey && recordData[sourceField] !== undefined) {
        updates[targetFieldKey] = recordData[sourceField];
      }
    }
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (formRuleResult.submitBlockers.length > 0) {
      setSubmitError(formRuleResult.submitBlockers[0]);
      return;
    }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post(`/public/forms/${token}/submit`, formData);
      setSubmitted(true);
    } catch (err: any) {
      const code = err?.response?.data?.message;
      const settings = form?.settings || {};
      if (code === "FORM_EXPIRED")       setSubmitError(settings.expiredMessage      || "This form has expired.");
      else if (code === "FORM_LIMIT_REACHED") setSubmitError(settings.limitReachedMessage || "This form has reached its submission limit.");
      else if (code === "FORM_CLOSED")   setSubmitError(settings.closedMessage       || "This form is currently closed.");
      else setSubmitError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ── Load errors ──
  if (loadErr) {
    const settings = form?.settings || {};
    const codeToScreen: Record<string, { icon: any; title: string; msg: string; color: string }> = {
      FORM_CLOSED:      { icon: "error", title: "Form Closed",        msg: settings.closedMessage || "This form is currently closed.", color: "bg-gray-100 text-gray-600" },
      FORM_EXPIRED:     { icon: "error", title: "Submissions Ended",  msg: settings.expiredMessage || "This form is no longer accepting submissions.", color: "bg-red-100 text-red-600" },
      FORM_LIMIT_REACHED: { icon: "error", title: "Limit Reached",   msg: settings.limitReachedMessage || "This form has reached its maximum responses.", color: "bg-orange-100 text-orange-600" },
      FORM_NOT_STARTED: { icon: "clock", title: "Not Yet Open",       msg: settings.notStartedMessage || "This form is not yet open. Please check back later.", color: "bg-blue-100 text-blue-600" },
    };
    const screen = codeToScreen[loadErr.code] || {
      icon: "error", title: "Form Unavailable", msg: "This form could not be found or is no longer available.", color: "bg-red-100 text-red-600",
    };
    return <StatusScreen icon={screen.icon} title={screen.title} message={screen.msg} color={screen.color} />;
  }

  // ── Success screen ──
  if (submitted) {
    const settings = form?.settings || {};
    const ps = settings.postSubmit || {};
    const message = ps.message || "Thank you! Your response has been recorded.";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Submitted!</h2>
          <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{message}</p>
          {ps.redirectUrl && redirectTimer !== null && (
            <p className="text-xs text-gray-400 mt-4">Redirecting in {redirectTimer}s…</p>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──
  const settings = form?.settings || {};

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Branding header */}
        <FormBrandingHeader form={form} />

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Default title bar (shown when no branding header is configured) */}
          {!(settings.header?.title || settings.header?.logoUrl || settings.header?.bannerUrl || settings.header?.subtitle) && (
            <div className="px-8 pt-8 pb-2">
              <h1 className="text-xl font-bold text-gray-900">{form?.name}</h1>
              {form?.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
            {/* Form-rule messages */}
            {formRuleResult.messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {msg}
              </div>
            ))}

            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {submitError}
              </div>
            )}

            {computedFields.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No fields configured for this form.</div>
            ) : (
              computedFields.map((ff: any) => {
                const mf = ff._mf;
                const label = ff.customLabel || mf.label || mf.name;
                const required = ff._state.required;
                const readonly = ff._state.readonly;
                const err = fieldErrors[mf.name];

                return (
                  <div key={ff.id} className="space-y-1.5">
                    <Label htmlFor={mf.name} className="flex items-center gap-1">
                      <span>{label}</span>
                      {required && <span className="text-red-500 text-xs">*</span>}
                      {readonly && <span className="text-xs text-gray-400 font-normal ml-1">(read-only)</span>}
                    </Label>
                    {mf.helpText && <p className="text-xs text-gray-400">{mf.helpText}</p>}
                    <PublicFieldInput
                      field={ff}
                      value={formData[mf.name] ?? ""}
                      readonly={readonly}
                      onChange={v => setFormData(prev => ({ ...prev, [mf.name]: v }))}
                      onRecordSelect={(rid, rdata) => handleLookupAutoFill(ff, rid, rdata)}
                    />
                    {err && <p className="text-xs text-red-500">{err}</p>}
                  </div>
                );
              })
            )}

            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full h-11 text-base font-medium">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit"}
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by CRM Platform
        </p>
      </div>
    </div>
  );
}
