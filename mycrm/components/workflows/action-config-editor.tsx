"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/user";
import { ModuleIcon } from "@/components/ui/module-icon";
import { isOptionField, fieldOptions } from "./condition-operators";

export interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, any>;
  order: number;
  recipientUsers: string[];
  recipientDepts: string[];
}

// ── Create Record Config (field mapping) ──────────────────────────────────────
// Extracted verbatim from app/(dashboard)/workflows/page.tsx.

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
            {modules.map(m => <SelectItem key={m.id} value={m.id}><ModuleIcon icon={m.icon} slug={m.slug} className="w-4 h-4 inline-block mr-1 -mt-0.5" /> {m.name}</SelectItem>)}
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
                <div key={f.id ?? f.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
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
                          <SelectItem key={tf.id ?? tf.name} value={tf.name} className="text-xs">{tf.label}</SelectItem>
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
                            <SelectItem key={sf.id ?? sf.name} value={sf.name} className="text-xs">{sf.label}</SelectItem>
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

// ── Tag Action Config (single flat tag string list) ───────────────────────────
// Extracted verbatim from app/(dashboard)/workflows/page.tsx — used by the "TAG" action type.

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

// ── Colored tag editor (name + color) ─────────────────────────────────────────
// Extracted verbatim from app/(dashboard)/settings/workflows/[id]/page.tsx — used by
// ADD_TAG / REPLACE_TAGS, which store richer `{name, color}` tag objects.

function TagActionEditor({ tags, onChange, label }: {
  tags: { name: string; color: string }[];
  onChange: (t: { name: string; color: string }[]) => void;
  label: string;
}) {
  const [input, setInput] = useState("");
  const [color, setColor] = useState("#4f46e5");

  const add = () => {
    const name = input.trim();
    if (!name) return;
    if (!tags.find(t => t.name === name)) onChange([...tags, { name, color }]);
    setInput("");
  };

  return (
    <div className="mt-3 space-y-2">
      <Label className="text-xs text-gray-500 block">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
        />
        <Input
          className="h-9 text-sm flex-1"
          value={input}
          placeholder="Tag name"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-9 px-3 shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}
              <button
                type="button"
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="opacity-70 hover:opacity-100 ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── @Mention Field ────────────────────────────────────────────────────────────
// Extracted verbatim from app/(dashboard)/workflows/page.tsx.

function MentionField({
  value, onChange, fields, placeholder, multiline = false, className,
}: {
  value: string;
  onChange: (v: string) => void;
  fields: { id?: string; name: string; label: string }[];
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
              key={f.id ?? f.name}
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
// Pure extraction of ActionConfigEditor from app/(dashboard)/workflows/page.tsx, plus
// four cases (ADD_TAG/REMOVE_TAG/REPLACE_TAGS/CLEAR_TAGS) ported verbatim from
// app/(dashboard)/settings/workflows/[id]/page.tsx so the merged ACTION_TYPES list
// (see condition-operators.ts) doesn't silently drop what either page supported.

export function ActionConfigEditor({
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
              <SelectContent>{fields.map(f => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
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
                <SelectContent>{fields.map(f => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
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
              <SelectContent>{fields.map(f => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
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
                  <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
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
              <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id} className="text-xs"><ModuleIcon icon={m.icon} slug={m.slug} className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" /> {m.name}</SelectItem>)}</SelectContent>
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
                    <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>
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

    case "ADD_TAG":
      return (
        <TagActionEditor
          tags={cfg.tags || []}
          onChange={tags => onChange({ ...cfg, tags })}
          label="Tags to add"
        />
      );

    case "REPLACE_TAGS":
      return (
        <TagActionEditor
          tags={cfg.tags || []}
          onChange={tags => onChange({ ...cfg, tags })}
          label="Replace all tags with"
        />
      );

    case "REMOVE_TAG":
      return (
        <div className="mt-2 space-y-1.5">
          <Label className="text-xs text-gray-500 block">Tag names to remove</Label>
          <Input
            className="h-9 text-sm"
            value={(cfg.tagNames || []).join(", ")}
            placeholder="e.g. Pending Review, Draft"
            onChange={e => onChange({ ...cfg, tagNames: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
          />
          <p className="text-[10px] text-gray-400">Comma-separated tag names</p>
        </div>
      );

    case "CLEAR_TAGS":
      return (
        <div className="mt-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
          This action removes every tag from the record. No further configuration needed.
        </div>
      );

    default:
      return null;
  }
}
