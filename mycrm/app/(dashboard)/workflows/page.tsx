"use client";
import { useEffect, useRef, useState } from "react";
import {
  Workflow, Plus, Play, Pause, Zap, Clock, Bell, Globe, Trash2,
  ChevronDown, ChevronRight, X, Settings2, CheckCircle2, AlertCircle,
  ArrowRight, Loader2, Edit2, History, Mail, Link2, CheckSquare,
  FileText, RotateCcw, Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useModulesStore } from "@/store/modules.store";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/user";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkflowCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logic?: "AND" | "OR";
}

interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, any>;
  order: number;
  recipientUsers: string[];
  recipientDepts: string[];
}

interface WorkflowDraft {
  name: string;
  description: string;
  trigger: string;
  moduleId: string;
  tags: string[];
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "RECORD_CREATED",  label: "Record Created",  icon: "✨", description: "Fires when a new record is added" },
  { value: "RECORD_UPDATED",  label: "Record Updated",  icon: "✏️", description: "Fires when any field is changed" },
  { value: "FIELD_CHANGED",   label: "Field Changed",   icon: "🔀", description: "Fires when a specific field changes" },
  { value: "RECORD_DELETED",  label: "Record Deleted",  icon: "🗑️", description: "Fires when a record is deleted" },
  { value: "FORM_SUBMITTED",  label: "Form Submitted",  icon: "📋", description: "Fires when a public form is submitted" },
  { value: "MANUAL",          label: "Manual",          icon: "▶️", description: "Triggered manually by a user" },
];

const TRIGGER_ICONS: Record<string, any> = {
  RECORD_CREATED: Zap,
  RECORD_UPDATED: Edit2,
  FIELD_CHANGED:  Settings2,
  RECORD_DELETED: Trash2,
  FORM_SUBMITTED: FileText,
  SCHEDULED:      Clock,
  MANUAL:         Play,
  WEBHOOK:        Globe,
};

const CONDITION_OPERATORS = [
  { value: "is",           label: "is" },
  { value: "is_not",       label: "is not" },
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "empty",        label: "is empty" },
  { value: "not_empty",    label: "is not empty" },
  { value: "gt",           label: "greater than" },
  { value: "lt",           label: "less than" },
  { value: "gte",          label: ">= (greater or equal)" },
  { value: "lte",          label: "<= (less or equal)" },
  { value: "between",      label: "between (a,b)" },
  { value: "is_one_of",    label: "is one of (comma-separated)" },
  { value: "changed_from", label: "changed from" },
  { value: "changed_to",   label: "changed to" },
];

const ACTION_TYPES = [
  { value: "SET_FIELD",         label: "Set Field Value",           icon: "✏️" },
  { value: "UPDATE_RECORD",     label: "Update Multiple Fields",    icon: "📝" },
  { value: "SEND_NOTIFICATION", label: "Send Notification",         icon: "🔔" },
  { value: "ASSIGN_USER",       label: "Assign User",               icon: "👤" },
  { value: "CREATE_RECORD",     label: "Create Record",             icon: "➕" },
  { value: "SEND_EMAIL",        label: "Send Email",                icon: "📧" },
  { value: "WEBHOOK",           label: "Webhook / HTTP Request",    icon: "🌐" },
  { value: "UPDATE_RELATED",    label: "Update Related Record",     icon: "🔗" },
  { value: "CREATE_TASK",       label: "Create Task in Module",     icon: "✅" },
  { value: "DELAY",             label: "Delay / Wait",              icon: "⏱️" },
  { value: "TRIGGER_WORKFLOW",  label: "Trigger Another Workflow",  icon: "⚡" },
  { value: "TAG",              label: "Add Tags to Record",        icon: "🏷️" },
];

const needsValue = (op: string) => !["empty", "not_empty"].includes(op);

const OPTION_FIELD_TYPES = ["DROPDOWN", "STATUS", "RADIO", "SELECT", "MULTI_SELECT", "CHECKBOX"];

function isOptionField(fields: any[], fieldName: string) {
  const f = fields.find(f => f.name === fieldName);
  return f && OPTION_FIELD_TYPES.includes(f.type?.toUpperCase());
}

function fieldOptions(fields: any[], fieldName: string): { label: string; value: string }[] {
  const f = fields.find(f => f.name === fieldName);
  return (f?.options ?? []).map((o: any) => ({ label: o.label, value: o.value ?? o.label }));
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function relativeTime(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Create Record Config (field mapping) ──────────────────────────────────────

function CreateRecordConfig({
  cfg, sourceFields, modules, onChange,
}: {
  cfg: Record<string, any>;
  sourceFields: any[];
  modules: any[];
  onChange: (cfg: Record<string, any>) => void;
}) {
  const [targetFields, setTargetFields] = useState<any[]>([]);
  const [autoNumberFields, setAutoNumberFields] = useState<any[]>([]);
  const [loadingTarget, setLoadingTarget] = useState(false);
  // Ref so the async callback always sees the latest mappings (avoids stale closure)
  const mappingsRef = useRef<any[]>([]);
  const mappings: any[] = cfg.fieldMappings ?? [];
  mappingsRef.current = mappings;

  useEffect(() => {
    if (!cfg.moduleId) { setTargetFields([]); setAutoNumberFields([]); return; }
    let cancelled = false;
    setLoadingTarget(true);
    api.get(`/modules/${cfg.moduleId}/fields`)
      .then(r => {
        if (cancelled) return;
        const all: any[] = r.data ?? [];
        const autoNums = all.filter((f: any) => (f.type ?? '').toUpperCase() === 'AUTO_NUMBER');
        const mappable = all.filter((f: any) => (f.type ?? '').toUpperCase() !== 'AUTO_NUMBER');
        setAutoNumberFields(autoNums);
        setTargetFields(mappable);
        // Auto-suggest only when user has no mappings yet
        if (mappingsRef.current.length === 0 && mappable.length > 0) {
          const suggested = mappable.flatMap(tf => {
            const sf = sourceFields.find(s =>
              s.name === tf.name ||
              (s.label && tf.label && s.label.toLowerCase() === tf.label.toLowerCase())
            );
            return sf
              ? [{ targetField: tf.name, type: 'reference', sourceField: sf.name, staticValue: '' }]
              : [];
          });
          if (suggested.length > 0) onChange({ ...cfg, fieldMappings: suggested });
        }
      })
      .catch(() => { if (!cancelled) { setTargetFields([]); setAutoNumberFields([]); } })
      .finally(() => { if (!cancelled) setLoadingTarget(false); });
    return () => { cancelled = true; };
  }, [cfg.moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMapping = (i: number, patch: Partial<typeof mappings[0]>) => {
    const next = mappings.map((m, j) => j === i ? { ...m, ...patch } : m);
    onChange({ ...cfg, fieldMappings: next });
  };

  const addMapping = () =>
    onChange({ ...cfg, fieldMappings: [...mappings, { targetField: '', type: 'reference', sourceField: '', staticValue: '' }] });

  const removeMapping = (i: number) =>
    onChange({ ...cfg, fieldMappings: mappings.filter((_, j) => j !== i) });

  return (
    <div className="mt-2 space-y-3">
      {/* Target module */}
      <div>
        <Label className="text-xs">Target Module</Label>
        <Select
          value={cfg.moduleId || ""}
          onValueChange={v => onChange({ ...cfg, moduleId: v, fieldMappings: [] })}
        >
          <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select module" /></SelectTrigger>
          <SelectContent>
            {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Field mappings */}
      {cfg.moduleId && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs">Field Mappings</Label>
            {loadingTarget && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          </div>

          {/* Auto-number locked rows — always shown when the module has them */}
          {autoNumberFields.length > 0 && (
            <div className="mb-2 space-y-1">
              {autoNumberFields.map(f => (
                <div key={f.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-xs font-medium text-amber-800 flex-1 truncate">{f.label}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 shrink-0">Auto-generated</span>
                  <span className="text-[10px] text-amber-600 shrink-0">System will fill this</span>
                </div>
              ))}
            </div>
          )}

          {mappings.length === 0 && autoNumberFields.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">
              {loadingTarget ? "Loading fields…" : "No mappings. Add one or wait for auto-suggestions."}
            </p>
          ) : mappings.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1">
              {loadingTarget ? "Loading fields…" : "No manual mappings. Add one below."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_1fr_20px] gap-1 text-[10px] text-gray-400 font-medium px-0.5">
                <span>Target Field</span>
                <span>Type</span>
                <span>Source / Value</span>
                <span />
              </div>
              {mappings.map((m, i) => {
                const tField = targetFields.find(tf => tf.name === m.targetField);
                const tOpts: any[] = tField?.options ?? [];
                const isOpt = tField && ['DROPDOWN', 'STATUS', 'SELECT', 'RADIO'].includes((tField.type ?? '').toUpperCase());
                return (
                  <div key={i} className="grid grid-cols-[1fr_80px_1fr_20px] gap-1.5 items-center">
                    {/* Target field selector */}
                    <Select
                      value={m.targetField || ""}
                      onValueChange={v => updateMapping(i, { targetField: v, staticValue: '' })}
                    >
                      <SelectTrigger className="h-8 text-xs min-w-0">
                        <SelectValue placeholder="Target field" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map(tf => (
                          <SelectItem key={tf.name} value={tf.name} className="text-xs">{tf.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Mapping type */}
                    <Select
                      value={m.type || "reference"}
                      onValueChange={v => updateMapping(i, { type: v, sourceField: '', staticValue: '' })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reference" className="text-xs">Reference</SelectItem>
                        <SelectItem value="static" className="text-xs">Static</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Source field (reference) or value (static) */}
                    {m.type !== 'static' ? (
                      <Select
                        value={m.sourceField || ""}
                        onValueChange={v => updateMapping(i, { sourceField: v })}
                      >
                        <SelectTrigger className="h-8 text-xs min-w-0">
                          <SelectValue placeholder="Source field" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceFields.map(sf => (
                            <SelectItem key={sf.name} value={sf.name} className="text-xs">{sf.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : isOpt ? (
                      <Select
                        value={m.staticValue || ""}
                        onValueChange={v => updateMapping(i, { staticValue: v })}
                      >
                        <SelectTrigger className="h-8 text-xs min-w-0">
                          <SelectValue placeholder="Choose option" />
                        </SelectTrigger>
                        <SelectContent>
                          {tOpts.map((o: any) => (
                            <SelectItem key={o.value ?? o.id ?? o.label} value={String(o.value ?? o.label)} className="text-xs">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        value={m.staticValue || ""}
                        placeholder="Fixed value"
                        onChange={e => updateMapping(i, { staticValue: e.target.value })}
                      />
                    )}

                    {/* Remove */}
                    <button onClick={() => removeMapping(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
            onClick={addMapping}
          >
            <Plus className="w-3 h-3" /> Add mapping
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tag Action Config ─────────────────────────────────────────────────────────

function TagActionConfig({ cfg, onChange }: { cfg: Record<string, any>; onChange: (cfg: Record<string, any>) => void }) {
  const [tagVal, setTagVal] = useState("");
  const recTags: string[] = cfg.tags || [];
  const addTag = () => {
    const t = tagVal.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !recTags.includes(t)) onChange({ ...cfg, tags: [...recTags, t] });
    setTagVal("");
  };
  return (
    <div className="mt-2 space-y-2">
      <Label className="text-xs">Tags to add to the record</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {recTags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
            <Tag className="w-2.5 h-2.5" />
            {t}
            <button type="button" onClick={() => onChange({ ...cfg, tags: recTags.filter(x => x !== t) })}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          className="h-8 text-xs flex-1"
          placeholder="Type a tag and press Enter"
          value={tagVal}
          onChange={e => setTagVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
        />
        <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={addTag}>Add</Button>
      </div>
      <p className="text-xs text-gray-400">Tags are merged into the record's existing tags array.</p>
    </div>
  );
}

// ── @Mention Field ────────────────────────────────────────────────────────────

function MentionField({
  value, onChange, fields, placeholder, multiline = false, className,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: { name: string; label: string }[];
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  const filtered = mention
    ? fields.filter(f =>
        !mention.query ||
        f.name.toLowerCase().startsWith(mention.query.toLowerCase()) ||
        f.label.toLowerCase().includes(mention.query.toLowerCase())
      )
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    onChange(val);
    const before = val.slice(0, pos);
    const m = before.match(/@([A-Za-z0-9_]*)$/);
    setMention(m ? { query: m[1], start: pos - m[0].length } : null);
  };

  const insert = (fieldName: string) => {
    if (!mention) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const next = `${before}@${fieldName}${after}`;
    onChange(next);
    setMention(null);
    const newPos = mention.start + 1 + fieldName.length;
    setTimeout(() => {
      if (ref.current) { ref.current.focus(); ref.current.setSelectionRange(newPos, newPos); }
    }, 0);
  };

  const sharedProps = {
    value,
    placeholder,
    onChange: handleChange,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Escape") setMention(null); },
    onBlur: () => setTimeout(() => setMention(null), 150),
  };

  return (
    <div className="relative">
      {multiline ? (
        <Textarea ref={ref as any} {...sharedProps} className={cn("text-xs mt-1 min-h-[70px]", className)} />
      ) : (
        <Input ref={ref as any} {...sharedProps} className={cn("h-8 text-xs mt-1", className)} />
      )}
      {mention && filtered.length > 0 && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl ring-1 ring-black/5">
          <div className="px-2 py-1.5 border-b border-gray-100">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Insert field</span>
          </div>
          {filtered.map(f => (
            <button
              key={f.name}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insert(f.name); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 text-left group transition-colors"
            >
              <span className="font-mono font-semibold text-blue-600 shrink-0">@{f.name}</span>
              <span className="text-gray-400 truncate">{f.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Action Config Editor ──────────────────────────────────────────────────────

function ActionConfigEditor({
  action, fields, modules, allWorkflows, orgUsers, orgDepts, onActionChange, onChange,
}: {
  action: WorkflowAction;
  fields: any[];
  modules: any[];
  allWorkflows: any[];
  orgUsers: any[];
  orgDepts: any[];
  onActionChange: (patch: Partial<WorkflowAction>) => void;
  onChange: (cfg: Record<string, any>) => void;
}) {
  const cfg = action.config;

  switch (action.type) {
    case "SET_FIELD":
      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={cfg.field || ""} onValueChange={(v) => onChange({ ...cfg, field: v, value: "" })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <div className="flex gap-1 mt-1">
              {isOptionField(fields, cfg.field) ? (
                <Select value={cfg.value || ""} onValueChange={(v) => onChange({ ...cfg, value: v })}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select value" /></SelectTrigger>
                  <SelectContent>
                    {fieldOptions(fields, cfg.field).map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="h-8 text-xs flex-1" value={cfg.value || ""}
                  onChange={(e) => onChange({ ...cfg, value: e.target.value })}
                  placeholder="Value or __NOW__ for current date" />
              )}
            </div>
          </div>
        </div>
      );

    case "UPDATE_RECORD": {
      const updates: { field: string; value: string }[] = cfg.updates || [{ field: "", value: "" }];
      return (
        <div className="mt-2 space-y-2">
          {updates.map((u, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 items-center">
              <Select value={u.field} onValueChange={(v) => {
                const next = [...updates]; next[i] = { field: v, value: "" };
                onChange({ ...cfg, updates: next });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-1">
                {isOptionField(fields, u.field) ? (
                  <Select value={u.value} onValueChange={(v) => {
                    const next = [...updates]; next[i] = { ...u, value: v };
                    onChange({ ...cfg, updates: next });
                  }}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select value" /></SelectTrigger>
                    <SelectContent>
                      {fieldOptions(fields, u.field).map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="h-8 text-xs flex-1" value={u.value} placeholder="Value"
                    onChange={(e) => { const next = [...updates]; next[i] = { ...u, value: e.target.value }; onChange({ ...cfg, updates: next }); }} />
                )}
                {updates.length > 1 && (
                  <button onClick={() => onChange({ ...cfg, updates: updates.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={() => onChange({ ...cfg, updates: [...updates, { field: "", value: "" }] })}>
            <Plus className="w-3 h-3" /> Add field
          </button>
        </div>
      );
    }

    case "SEND_NOTIFICATION": {
      const recUsers: string[] = action.recipientUsers || [];
      const recDepts: string[] = action.recipientDepts || [];
      return (
        <div className="mt-2 space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <MentionField
              value={cfg.title || ""}
              onChange={(v) => onChange({ ...cfg, title: v })}
              fields={fields}
              placeholder="e.g. New student @name enrolled"
            />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <MentionField
              multiline
              value={cfg.message || ""}
              onChange={(v) => onChange({ ...cfg, message: v })}
              fields={fields}
              placeholder="Type @ to insert a field value…"
            />
            <p className="text-[10px] text-gray-400 mt-1">Type <span className="font-mono bg-gray-100 px-1 rounded">@</span> to pick a field from a dropdown.</p>
          </div>
          {/* Recipients */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Send To</Label>
            <p className="text-[10px] text-gray-400 mb-1.5">Leave empty to notify all users, or select specific users/departments.</p>
            <div className="space-y-2">
              {/* Users */}
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Users</Label>
                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                  {recUsers.map(uid => {
                    const u = orgUsers.find(x => x.id === uid);
                    return (
                      <span key={uid} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {u ? getDisplayName(u) : uid}
                        <button type="button" onClick={() => onActionChange({ recipientUsers: recUsers.filter(x => x !== uid) })}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white"
                  value=""
                  onChange={e => {
                    if (!e.target.value || recUsers.includes(e.target.value)) return;
                    onActionChange({ recipientUsers: [...recUsers, e.target.value] });
                    e.target.value = "";
                  }}>
                  <option value="">+ Add user…</option>
                  {orgUsers.filter(u => !recUsers.includes(u.id)).map(u => (
                    <option key={u.id} value={u.id}>{getDisplayName(u)} ({u.email})</option>
                  ))}
                </select>
              </div>
              {/* Departments */}
              <div>
                <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Departments</Label>
                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                  {recDepts.map(did => {
                    const d = orgDepts.find(x => x.id === did);
                    return (
                      <span key={did} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs">
                        {d?.name ?? did}
                        <button type="button" onClick={() => onActionChange({ recipientDepts: recDepts.filter(x => x !== did) })}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 bg-white"
                  value=""
                  onChange={e => {
                    if (!e.target.value || recDepts.includes(e.target.value)) return;
                    onActionChange({ recipientDepts: [...recDepts, e.target.value] });
                    e.target.value = "";
                  }}>
                  <option value="">+ Add department…</option>
                  {orgDepts.filter(d => !recDepts.includes(d.id)).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "ASSIGN_USER":
      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={cfg.field || ""} onValueChange={(v) => onChange({ ...cfg, field: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Assignee field" /></SelectTrigger>
              <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">User ID</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.userId || ""} placeholder="User ID"
              onChange={(e) => onChange({ ...cfg, userId: e.target.value })} />
          </div>
        </div>
      );

    case "CREATE_RECORD":
      return (
        <CreateRecordConfig
          cfg={cfg}
          sourceFields={fields}
          modules={modules}
          onChange={onChange}
        />
      );

    case "SEND_EMAIL":
      return (
        <div className="mt-2 space-y-2">
          <div>
            <Label className="text-xs">To (field value or static email)</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.to || ""}
              placeholder="&#123;&#123;email&#125;&#125; or user@example.com"
              onChange={(e) => onChange({ ...cfg, to: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.subject || ""}
              placeholder="New record: &#123;&#123;name&#125;&#125;"
              onChange={(e) => onChange({ ...cfg, subject: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Body (HTML, use &#123;&#123;fieldName&#125;&#125; for variables)</Label>
            <Textarea className="text-xs mt-1 min-h-[80px]" value={cfg.body || ""}
              placeholder="<p>Hello &#123;&#123;name&#125;&#125;, your record has been updated.</p>"
              onChange={(e) => onChange({ ...cfg, body: e.target.value })} />
          </div>
          <p className="text-xs text-amber-600">Requires SMTP_HOST env variable on the server.</p>
        </div>
      );

    case "WEBHOOK": {
      const hdrs: Record<string, string> = cfg.headers || {};
      const hdrPairs = Object.entries(hdrs).map(([k, v]) => ({ key: k, value: v }));
      return (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">URL</Label>
              <Input className="h-8 text-xs mt-1" value={cfg.url || ""}
                placeholder="https://api.example.com/webhook"
                onChange={(e) => onChange({ ...cfg, url: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={cfg.method || "POST"} onValueChange={v => onChange({ ...cfg, method: v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map(m => (
                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">Headers</Label>
              <button className="text-xs text-blue-600 flex items-center gap-0.5"
                onClick={() => onChange({ ...cfg, headers: { ...hdrs, "": "" } })}>
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {hdrPairs.map((hp, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <Input className="h-7 text-xs flex-1" placeholder="Header name" value={hp.key}
                  onChange={e => {
                    const next: Record<string, string> = {};
                    hdrPairs.forEach((p, j) => { next[j === i ? e.target.value : p.key] = p.value; });
                    onChange({ ...cfg, headers: next });
                  }} />
                <Input className="h-7 text-xs flex-1" placeholder="Value" value={hp.value}
                  onChange={e => {
                    const next: Record<string, string> = {};
                    hdrPairs.forEach((p, j) => { next[p.key] = j === i ? e.target.value : p.value; });
                    onChange({ ...cfg, headers: next });
                  }} />
                <button onClick={() => {
                  const next = { ...hdrs }; delete next[hp.key];
                  onChange({ ...cfg, headers: next });
                }} className="text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs">Body JSON (use &#123;&#123;fieldName&#125;&#125;)</Label>
            <Textarea className="text-xs mt-1 min-h-[60px] font-mono" value={cfg.body || ""}
              placeholder={'{"id": "{{id}}", "name": "{{name}}"}'}
              onChange={(e) => onChange({ ...cfg, body: e.target.value })} />
          </div>
        </div>
      );
    }

    case "UPDATE_RELATED":
      return (
        <div className="mt-2 space-y-2">
          <div>
            <Label className="text-xs">Relation Field (link to related record)</Label>
            <Select value={cfg.relationField || ""} onValueChange={v => onChange({ ...cfg, relationField: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select relation field" /></SelectTrigger>
              <SelectContent>
                {fields.filter(f => ["LOOKUP", "RELATION"].includes(f.type?.toUpperCase())).map(f => (
                  <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Field to Update</Label>
              <Input className="h-8 text-xs mt-1" value={cfg.targetField || ""} placeholder="field_name"
                onChange={e => onChange({ ...cfg, targetField: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">New Value</Label>
              <Input className="h-8 text-xs mt-1" value={cfg.targetValue || ""}
                placeholder="Value or &#123;&#123;field&#125;&#125;"
                onChange={e => onChange({ ...cfg, targetValue: e.target.value })} />
            </div>
          </div>
        </div>
      );

    case "CREATE_TASK":
      return (
        <div className="mt-2 space-y-2">
          <div>
            <Label className="text-xs">Target Module</Label>
            <Select value={cfg.moduleId || ""} onValueChange={v => onChange({ ...cfg, moduleId: v })}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select module" /></SelectTrigger>
              <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id} className="text-xs">{m.icon} {m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Title (supports &#123;&#123;fieldName&#125;&#125;)</Label>
            <Input className="h-8 text-xs mt-1" value={cfg.title || ""}
              placeholder="Follow up on &#123;&#123;name&#125;&#125;"
              onChange={e => onChange({ ...cfg, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={cfg.priority || "MEDIUM"} onValueChange={v => onChange({ ...cfg, priority: v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => (
                    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assignee Field</Label>
              <Select value={cfg.assigneeField || "__none__"} onValueChange={v => onChange({ ...cfg, assigneeField: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">None</SelectItem>
                  {fields.filter(f => ["USER", "LOOKUP"].includes(f.type?.toUpperCase())).map(f => (
                    <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Textarea className="text-xs mt-1 min-h-[50px]" value={cfg.description || ""}
              placeholder="Task description..."
              onChange={e => onChange({ ...cfg, description: e.target.value })} />
          </div>
        </div>
      );

    case "DELAY":
      return (
        <div className="mt-2">
          <Label className="text-xs">Wait Duration</Label>
          <div className="flex gap-2 mt-1">
            <Input className="h-8 text-xs w-24" type="number" min={1}
              value={cfg.duration ?? 5}
              onChange={e => onChange({ ...cfg, duration: parseInt(e.target.value, 10) || 1 })} />
            <Select value={cfg.unit || "minutes"} onValueChange={v => onChange({ ...cfg, unit: v })}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["seconds", "Seconds"], ["minutes", "Minutes"], ["hours", "Hours"], ["days", "Days"]].map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-amber-600 mt-1.5">Delays &gt;30 s run asynchronously — next actions execute after the delay.</p>
        </div>
      );

    case "TRIGGER_WORKFLOW":
      return (
        <div className="mt-2 space-y-2">
          <Label className="text-xs">Target Workflow</Label>
          <Select value={cfg.workflowId || ""} onValueChange={v => onChange({ ...cfg, workflowId: v })}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select workflow" /></SelectTrigger>
            <SelectContent>
              {allWorkflows.map(wf => (
                <SelectItem key={wf.id} value={wf.id} className="text-xs">{wf.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-400">Circular chains are automatically prevented.</p>
        </div>
      );

    case "TAG":
      return <TagActionConfig cfg={cfg} onChange={onChange} />;

    default:
      return null;
  }
}

// ── Run History Panel ─────────────────────────────────────────────────────────

function RunHistoryPanel({
  workflowId, workflowName, onClose,
}: {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/workflows/${workflowId}/executions`)
      .then(({ data }) => { if (!cancelled) setExecutions(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workflowId]);

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" /> Run History
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">{workflowName}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No executions yet.</p>
            <p className="text-xs text-gray-300 mt-1">Trigger the workflow to see runs here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((exec, i) => {
              const isSuccess = exec.status === "SUCCESS";
              const isFailed = exec.status === "FAILED";
              const isRunning = exec.status === "RUNNING";
              const duration = exec.finishedAt && exec.startedAt
                ? Math.round((new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()) / 1000)
                : null;
              return (
                <div key={exec.id} className={cn(
                  "rounded-lg border p-3 transition-all",
                  isSuccess ? "border-green-200 bg-green-50" :
                  isFailed  ? "border-red-200 bg-red-50" :
                              "border-gray-200 bg-gray-50"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center",
                        isSuccess ? "bg-green-600 text-white" :
                        isFailed  ? "bg-red-600 text-white" :
                                    "bg-gray-400 text-white"
                      )}>
                        {i + 1}
                      </span>
                      <Badge className={cn(
                        "text-xs px-2 py-0",
                        isSuccess ? "bg-green-100 text-green-700 border-green-300" :
                        isFailed  ? "bg-red-100 text-red-700 border-red-300" :
                                    "bg-gray-100 text-gray-600 border-gray-300"
                      )}>
                        {isRunning ? "Running…" : exec.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      <p>{relativeTime(exec.startedAt)}</p>
                      {duration !== null && <p className="text-gray-300">{duration}s</p>}
                    </div>
                  </div>
                  {exec.startedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(exec.startedAt).toLocaleString()}
                    </p>
                  )}
                  {isFailed && exec.error && (
                    <div className="mt-1.5 p-2 bg-red-100 rounded text-xs text-red-700 font-mono break-all">
                      {exec.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Workflow Builder Dialog ───────────────────────────────────────────────────

function WorkflowBuilderDialog({
  open, onClose, onSave, modules, allWorkflows, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkflowDraft) => Promise<void>;
  modules: any[];
  allWorkflows: any[];
  initial?: any;
}) {
  const [openSection, setOpenSection] = useState<string>("setup");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conditionOptions, setConditionOptions] = useState<Record<string, { label: string; value: string }[]>>({});
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [orgDepts, setOrgDepts] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState("");
  // Track which workflow ID was last initialised so the draft is NOT wiped if
  // `initial` momentarily becomes null during the close animation (the parent
  // sets editingWorkflow=null before setShowBuilder=false, causing a render
  // where open=true but initial=null — this guard prevents that reset).
  const initializedForRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<WorkflowDraft>({
    name: "",
    description: "",
    trigger: "RECORD_CREATED",
    moduleId: "",
    tags: [],
    conditions: [],
    actions: [],
  });

  useEffect(() => {
    if (!open) {
      // Reset the guard so the next open will re-initialise correctly.
      initializedForRef.current = null;
      return;
    }

    // Identify this "session" by the workflow being edited (or "__new__" for create).
    // If initial becomes null while the dialog is still open (happens because the
    // parent sets editingWorkflow=null before showBuilder=false), we do NOT reset —
    // otherwise the user's in-flight edits are lost.
    const targetKey = initial?.id ?? "__new__";
    if (initializedForRef.current === targetKey) return;
    initializedForRef.current = targetKey;

    setOpenSection("setup");
    setSaveError("");
    Promise.all([
      api.get("/users").catch(() => ({ data: [] })),
      api.get("/departments").catch(() => ({ data: [] })),
    ]).then(([u, d]) => {
      setOrgUsers(Array.isArray(u.data) ? u.data : (u.data?.users ?? []));
      setOrgDepts(Array.isArray(d.data) ? d.data : (d.data?.departments ?? []));
    });

    if (initial) {
      const mappedConditions = (initial.conditions || []).map((c: any) => ({ ...c, id: c.id || uid() }));
      setDraft({
        name: initial.name || "",
        description: initial.description || "",
        trigger: initial.trigger || "RECORD_CREATED",
        moduleId: initial.moduleId || "",
        tags: Array.isArray(initial.tags) ? initial.tags : [],
        conditions: mappedConditions,
        actions: (initial.actions || []).map((a: any) => ({
          ...a,
          id: a.id || uid(),
          recipientUsers: a.recipientUsers || [],
          recipientDepts: a.recipientDepts || [],
        })),
      });
      mappedConditions.forEach(async (c: any) => {
        if (c.field) await loadCondOpts(c.id, c.field);
      });
    } else {
      setDraft({ name: "", description: "", trigger: "RECORD_CREATED", moduleId: "", tags: [], conditions: [], actions: [] });
    }
    setConditionOptions({});
  }, [open, initial]);

  const mod = modules.find(m => m.id === draft.moduleId);
  const fields: any[] = mod?.fields || [];

  const set = <K extends keyof WorkflowDraft>(k: K, v: WorkflowDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const addCondition = () =>
    set("conditions", [...draft.conditions, { id: uid(), field: fields[0]?.name || "", operator: "is", value: "", logic: "AND" }]);

  const updateCondition = (id: string, patch: Partial<WorkflowCondition>) =>
    set("conditions", draft.conditions.map(c => c.id === id ? { ...c, ...patch } : c));

  const removeCondition = (id: string) =>
    set("conditions", draft.conditions.filter(c => c.id !== id));

  const addAction = () =>
    set("actions", [...draft.actions, { id: uid(), type: "SET_FIELD", config: {}, order: draft.actions.length, recipientUsers: [], recipientDepts: [] }]);

  const updateAction = (id: string, patch: Partial<WorkflowAction>) =>
    set("actions", draft.actions.map(a => a.id === id ? { ...a, ...patch } : a));

  const removeAction = (id: string) =>
    set("actions", draft.actions.filter(a => a.id !== id));

  const loadCondOpts = async (condId: string, fieldName: string) => {
    const field = fields.find((f: any) => f.name === fieldName);
    if (!field) return;
    const opts: { label: string; value: string }[] = [];
    if (field.options?.length) {
      opts.push(...field.options.map((o: any) => ({ label: o.label, value: String(o.value || o.id || o.label) })));
    } else if (field.type === "LOOKUP") {
      try {
        const settings = typeof field.settings === "string" ? JSON.parse(field.settings || "{}") : (field.settings || {});
        if (settings.lookupModuleId) {
          const r = await api.get("/records/lookup?moduleId=" + settings.lookupModuleId + "&displayField=" + (settings.displayField || "name") + "&search=");
          opts.push(...(r.data ?? []).map((item: any) => ({ label: item.label, value: item.id })));
        }
      } catch {}
    }
    if (opts.length > 0) setConditionOptions(prev => ({ ...prev, [condId]: opts }));
  };

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.moduleId || !draft.trigger) return;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(draft);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save workflow. Please try again.";
      setSaveError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    } finally {
      setSaving(false);
    }
  };

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === draft.trigger);
  const canSave = !saving && !!draft.name.trim() && !!draft.moduleId && !!draft.trigger && draft.actions.length > 0;

  if (!open) return null;

  const setupSummary = draft.name
    ? `${draft.name}${mod ? ` · ${mod.name}` : ""}`
    : "Not configured";

  const trigSummary = selectedTrigger
    ? `${selectedTrigger.icon} ${selectedTrigger.label}${mod ? ` in ${mod.name}` : ""}`
    : "No trigger selected";

  const condSummary = draft.conditions.length === 0
    ? "No conditions — runs on every trigger"
    : draft.conditions.map((c, i) => {
        const fLabel = fields.find((f: any) => f.name === c.field)?.label ?? c.field;
        const oLabel = CONDITION_OPERATORS.find(o => o.value === c.operator)?.label ?? c.operator;
        return `${i > 0 ? (c.logic || "AND") + " " : ""}${fLabel} ${oLabel}${c.value ? ` "${c.value}"` : ""}`;
      }).join(" · ");

  const toggle = (sec: string) => setOpenSection(s => s === sec ? "" : sec);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">

      {/* ── Header ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{initial ? "Edit Workflow" : "New Workflow"}</p>
            <p className="text-xs text-gray-400">Configure trigger, conditions, and actions — all in one view</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 max-w-xs truncate">
              {saveError}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-8" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 gap-1.5" disabled={!canSave} onClick={handleSave}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {initial ? "Update" : "Save Workflow"}
          </Button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 pb-16 space-y-0">

          {/* ── SETUP CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => toggle("setup")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Setup</p>
                  {openSection !== "setup" && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{setupSummary}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {draft.name && openSection !== "setup" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Configured</span>
                )}
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", openSection === "setup" && "rotate-180")} />
              </div>
            </button>
            {openSection === "setup" && (
              <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Workflow Name *</Label>
                    <Input value={draft.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Auto-assign on create" className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Module *</Label>
                    <Select value={draft.moduleId} onValueChange={v => set("moduleId", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select module" /></SelectTrigger>
                      <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Description</Label>
                  <Input value={draft.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        #{tag}
                        <button type="button" onClick={() => set("tags", draft.tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input className="h-8 text-xs flex-1" placeholder="Add tag and press Enter"
                      value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                          e.preventDefault();
                          const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
                          if (!draft.tags.includes(t)) set("tags", [...draft.tags, t]);
                          setTagInput("");
                        }
                      }} />
                    <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs"
                      onClick={() => {
                        const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
                        if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
                        setTagInput("");
                      }}>Add</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flow connector */}
          <div className="flex flex-col items-center py-1">
            <div className="w-px h-5 bg-gray-300" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-gray-300" />
          </div>

          {/* ── TRIGGER CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => toggle("trigger")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Trigger <span className="text-[10px] text-red-400 font-normal">required</span>
                  </p>
                  {openSection !== "trigger" && (
                    <p className={cn("text-xs mt-0.5 truncate max-w-md", draft.trigger ? "text-gray-600" : "text-amber-500")}>{trigSummary}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {draft.trigger && openSection !== "trigger" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Configured</span>
                )}
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", openSection === "trigger" && "rotate-180")} />
              </div>
            </button>
            {openSection === "trigger" && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {TRIGGER_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => set("trigger", t.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        draft.trigger === t.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                      )}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{t.icon}</span>
                        <div>
                          <p className={cn("text-sm font-medium", draft.trigger === t.value ? "text-blue-700" : "text-gray-800")}>{t.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedTrigger && (
                  <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <strong>{selectedTrigger.label}</strong> — {selectedTrigger.description}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flow connector */}
          <div className="flex flex-col items-center py-1">
            <div className="w-px h-5 bg-gray-300" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-gray-300" />
          </div>

          {/* ── CONDITIONS CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <button type="button" onClick={() => toggle("conditions")}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Conditions
                    {draft.conditions.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">{draft.conditions.length}</span>
                    )}
                    <span className="ml-2 text-[10px] text-gray-400 font-normal">optional</span>
                  </p>
                  {openSection !== "conditions" && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{condSummary}</p>
                  )}
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform shrink-0", openSection === "conditions" && "rotate-180")} />
            </button>
            {openSection === "conditions" && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="flex items-center justify-between py-3">
                  <p className="text-xs text-gray-400">Filter when this workflow fires. Leave empty to run on all events.</p>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addCondition} disabled={!draft.moduleId}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                {!draft.moduleId && (
                  <div className="py-6 text-center text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                    Select a module in Setup first.
                  </div>
                )}
                {draft.moduleId && draft.conditions.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">No conditions — runs on every trigger event.</p>
                  </div>
                )}
                {draft.conditions.length > 0 && (
                  <div className="space-y-2">
                    {draft.conditions.map((cond, idx) => (
                      <div key={cond.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {idx > 0 && (
                            <Select value={cond.logic || "AND"} onValueChange={v => updateCondition(cond.id, { logic: v as "AND" | "OR" })}>
                              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND" className="text-xs">AND</SelectItem>
                                <SelectItem value="OR" className="text-xs">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Select value={cond.field} onValueChange={v => { updateCondition(cond.id, { field: v, value: "" }); loadCondOpts(cond.id, v); }}>
                            <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                            <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={cond.operator} onValueChange={v => updateCondition(cond.id, { operator: v, value: "" })}>
                            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>{CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                          {needsValue(cond.operator) && (
                            (() => {
                              const dynOpts = conditionOptions[cond.id];
                              const staticOpts = isOptionField(fields, cond.field) ? fieldOptions(fields, cond.field) : null;
                              const opts = dynOpts ?? staticOpts;
                              return opts && opts.length > 0 ? (
                                <Select value={cond.value} onValueChange={v => updateCondition(cond.id, { value: v })}>
                                  <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="Value" /></SelectTrigger>
                                  <SelectContent>{opts.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <Input className="h-8 text-xs w-32" value={cond.value} placeholder="Value"
                                  onChange={e => updateCondition(cond.id, { value: e.target.value })} />
                              );
                            })()
                          )}
                          <button onClick={() => removeCondition(cond.id)} className="ml-auto text-gray-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Flow connector */}
          <div className="flex flex-col items-center py-1">
            <div className="w-px h-5 bg-gray-300" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-gray-300" />
          </div>

          {/* ── ACTIONS CARD (always open) ── */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Actions
                    {draft.actions.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">{draft.actions.length}</span>
                    )}
                    <span className="ml-2 text-[10px] text-red-400 font-normal">required</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">What happens when this workflow fires</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={addAction} disabled={!draft.moduleId}>
                <Plus className="w-3 h-3" /> Add Action
              </Button>
            </div>
            <div className="px-5 py-4">
              {!draft.moduleId && (
                <div className="py-6 text-center text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                  Select a module in Setup first.
                </div>
              )}
              {draft.moduleId && draft.actions.length === 0 && (
                <div className="py-10 text-center">
                  <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No actions yet — click "Add Action" to get started.</p>
                </div>
              )}
              {draft.actions.length > 0 && (
                <div className="space-y-3">
                  {draft.actions.map((action, idx) => (
                    <div key={action.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-medium shrink-0">{idx + 1}</span>
                        <Select value={action.type} onValueChange={v => updateAction(action.id, { type: v, config: {} })}>
                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value} className="text-xs">{t.icon} {t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button onClick={() => removeAction(action.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <ActionConfigEditor
                        action={action}
                        fields={fields}
                        modules={modules}
                        allWorkflows={allWorkflows}
                        orgUsers={orgUsers}
                        orgDepts={orgDepts}
                        onActionChange={patch => updateAction(action.id, patch)}
                        onChange={cfg => updateAction(action.id, { config: cfg })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { modules } = useModulesStore();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [historyWfId, setHistoryWfId] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    try {
      const { data } = await api.get("/workflows");
      setWorkflows(data);
    } catch {
      setError("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const toggleWorkflow = async (id: string) => {
    try {
      const { data } = await api.patch(`/workflows/${id}/toggle`);
      setWorkflows(prev => prev.map(w => w.id === id ? data : w));
    } catch {}
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await api.delete(`/workflows/${id}`);
      setWorkflows(prev => prev.filter(w => w.id !== id));
    } catch {}
  };

  const handleSave = async (draft: WorkflowDraft) => {
    if (editingWorkflow) {
      const { data } = await api.patch(`/workflows/${editingWorkflow.id}`, draft);
      setWorkflows(prev => prev.map(w => w.id === editingWorkflow.id ? data : w));
    } else {
      const { data } = await api.post("/workflows", draft);
      setWorkflows(prev => [data, ...prev]);
    }
    // Do NOT call setEditingWorkflow(null) here — that's the onClose callback's job.
    // Calling it early (while showBuilder is still true) causes a render where
    // initial=null but open=true, which previously wiped the draft mid-save.
  };

  const historyWorkflow = workflows.find(w => w.id === historyWfId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 mt-1 text-sm">Automate actions when records change.</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingWorkflow(null); setShowBuilder(true); }}>
          <Plus className="w-4 h-4" />
          New Workflow
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
            Automate your processes with triggers, conditions, and actions.
          </p>
          <Button className="gap-2" onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4" />
            Create First Workflow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflows.map((wf) => {
            const TriggerIcon = TRIGGER_ICONS[wf.trigger] || Zap;
            const actions: any[] = wf.actions || [];
            const lastExec = wf.lastExecution;
            return (
              <Card key={wf.id} className={cn("transition-all hover:shadow-md", !wf.isActive && "opacity-60")}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        wf.isActive ? "bg-green-50" : "bg-gray-50"
                      )}>
                        <TriggerIcon className={cn("w-5 h-5", wf.isActive ? "text-green-600" : "text-gray-400")} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{wf.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {TRIGGER_OPTIONS.find(t => t.value === wf.trigger)?.label ?? wf.trigger}
                          {wf.moduleId && " · " + (modules.find(m => m.id === wf.moduleId)?.name || "Module")}
                        </p>
                        {wf.description && <p className="text-xs text-gray-400 mt-1 truncate">{wf.description}</p>}
                        {Array.isArray(wf.tags) && wf.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {wf.tags.map((tag: string) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Last run info */}
                        {lastExec ? (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              lastExec.status === "SUCCESS" ? "bg-green-500" :
                              lastExec.status === "FAILED"  ? "bg-red-500" : "bg-gray-400"
                            )} />
                            <span className="text-xs text-gray-400">
                              Last run: <span className={cn(
                                "font-medium",
                                lastExec.status === "SUCCESS" ? "text-green-600" :
                                lastExec.status === "FAILED"  ? "text-red-600" : "text-gray-500"
                              )}>{lastExec.status}</span>
                              {" "}· {relativeTime(lastExec.startedAt)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 mt-1">Never run</p>
                        )}
                      </div>
                    </div>
                    <Switch checked={wf.isActive} onCheckedChange={() => toggleWorkflow(wf.id)} />
                  </div>

                  {/* Conditions + Actions summary */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                    {(wf.conditions?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="text-xs gap-1 font-normal">
                        {wf.conditions.length} condition{wf.conditions.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    {actions.length > 0 ? (
                      actions.slice(0, 3).map((a: any, i: number) => (
                        <Badge key={i} className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                          {ACTION_TYPES.find(t => t.value === a.type)?.icon}{" "}
                          {ACTION_TYPES.find(t => t.value === a.type)?.label ?? a.type}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400">No actions</span>
                    )}
                    {actions.length > 3 && <span className="text-gray-400">+{actions.length - 3} more</span>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-600"
                      onClick={() => { setEditingWorkflow(wf); setShowBuilder(true); }}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-500 hover:text-blue-600"
                      onClick={() => setHistoryWfId(wf.id)}>
                      <History className="w-3 h-3" /> History
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-700"
                      onClick={() => deleteWorkflow(wf.id)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                    <Badge className={cn("ml-auto text-xs", wf.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500")}>
                      {wf.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <WorkflowBuilderDialog
        open={showBuilder}
        onClose={() => { setShowBuilder(false); setEditingWorkflow(null); }}
        onSave={handleSave}
        modules={modules}
        allWorkflows={workflows}
        initial={editingWorkflow}
      />

      {/* Run History Slide-over */}
      {historyWfId && historyWorkflow && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setHistoryWfId(null)} />
          <RunHistoryPanel
            workflowId={historyWfId}
            workflowName={historyWorkflow.name}
            onClose={() => setHistoryWfId(null)}
          />
        </>
      )}
    </div>
  );
}
