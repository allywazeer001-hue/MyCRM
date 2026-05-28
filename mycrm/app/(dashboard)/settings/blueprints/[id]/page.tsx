"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  GitBranch, ArrowLeft, Save, Plus, Trash2, X,
  CheckCircle2, AlertCircle, Loader2, Zap,
  ZoomIn, ZoomOut, Maximize2, Settings, ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── uid ───────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cond {
  id: string; fieldName: string; operator: string; value: string;
}
interface BpAction {
  id: string;
  type: "set_field" | "lock_field" | "unlock_field" | "notify";
  fieldName?: string; value?: string; message?: string;
}
interface TreeNode {
  id: string;
  type: "phase" | "condition" | "action";
  parentId: string | null;
  // phase
  phaseLabel?: string; phaseColor?: string; isRoot?: boolean;
  // condition
  branchType?: "if" | "else_if" | "else";
  conditions?: Cond[]; conditionsLogic?: "AND" | "OR";
  // action
  actions?: BpAction[];
}
interface ModuleField {
  id: string; name: string; label: string; type: string;
  options?: { value: string; label: string; color?: string }[];
}
interface BpDetail {
  id: string; name: string; moduleId: string; statusFieldName: string;
  phases: any[]; treeData?: { nodes: TreeNode[] } | null; isActive: boolean;
  module?: { id: string; name: string; slug: string; icon?: string; fields: ModuleField[] };
}
type AddType = { type: "condition"; branchType: "if" | "else_if" | "else" } | { type: "action" };

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W    = 248;
const PHASE_H   = 84;
const COND_BH   = 98;   // base condition height
const COND_RH   = 30;   // per extra condition row
const ACT_BH    = 88;   // base action height
const ACT_RH    = 28;   // per extra action row
const H_GAP     = 44;
const V_GAP     = 64;
const PAD       = 100;

const OPTION_BEARING = ["STATUS", "DROPDOWN", "RADIO", "MULTI_SELECT"];
const OPS = [
  { v: "equals",    l: "equals" }, { v: "not_equals", l: "≠" },
  { v: "contains",  l: "contains" }, { v: "gt", l: ">" },
  { v: "lt",        l: "<" }, { v: "gte", l: "≥" }, { v: "lte", l: "≤" },
  { v: "is_empty",  l: "is empty" }, { v: "not_empty", l: "not empty" },
];
const NO_VAL = ["is_empty", "not_empty"];

const BR = {
  if:      { label: "IF",      cls: "bg-blue-600",  line: "#3b82f6", light: "bg-blue-50 border-blue-200 text-blue-700" },
  else_if: { label: "ELSE IF", cls: "bg-amber-500", line: "#f59e0b", light: "bg-amber-50 border-amber-200 text-amber-700" },
  else:    { label: "ELSE",    cls: "bg-slate-500", line: "#64748b", light: "bg-slate-50 border-slate-200 text-slate-600" },
} as const;

// ── Layout engine ─────────────────────────────────────────────────────────────
function nodeH(n: TreeNode): number {
  if (n.type === "phase") return PHASE_H;
  if (n.type === "condition") {
    if (n.branchType === "else") return COND_BH - 32;
    return COND_BH + Math.max(0, (n.conditions?.length ?? 1) - 1) * COND_RH;
  }
  return ACT_BH + Math.max(0, (n.actions?.length ?? 1) - 1) * ACT_RH;
}

function computeLayout(nodes: TreeNode[]): Record<string, { x: number; y: number }> {
  if (!nodes.length) return {};
  const childOf = new Map<string | null, TreeNode[]>();
  for (const n of nodes) {
    const pid = n.parentId ?? null;
    if (!childOf.has(pid)) childOf.set(pid, []);
    childOf.get(pid)!.push(n);
  }
  function subW(id: string): number {
    const ch = childOf.get(id) ?? [];
    if (!ch.length) return NODE_W;
    return Math.max(NODE_W, ch.reduce((s, c) => s + subW(c.id), 0) + H_GAP * (ch.length - 1));
  }
  const pos: Record<string, { x: number; y: number }> = {};
  const byId = new Map(nodes.map(n => [n.id, n]));
  function lay(id: string, cx: number, y: number) {
    pos[id] = { x: cx - NODE_W / 2, y };
    const ch = childOf.get(id) ?? [];
    if (!ch.length) return;
    const total = ch.reduce((s, c) => s + subW(c.id), 0) + H_GAP * (ch.length - 1);
    let lx = cx - total / 2;
    const cy = y + nodeH(byId.get(id)!) + V_GAP;
    for (const c of ch) { const sw = subW(c.id); lay(c.id, lx + sw / 2, cy); lx += sw + H_GAP; }
  }
  const roots = nodes.filter(n => !n.parentId);
  if (roots.length) lay(roots[0].id, 0, 0);
  return pos;
}

// ── SVG Edges ─────────────────────────────────────────────────────────────────
function TreeEdges({ nodes, pos }: { nodes: TreeNode[]; pos: Record<string, { x: number; y: number }> }) {
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  return (
    <>
      {nodes.map(n => {
        if (!n.parentId) return null;
        const from = pos[n.parentId]; const to = pos[n.id];
        const par = byId.get(n.parentId);
        if (!from || !to || !par) return null;
        const x1 = from.x + NODE_W / 2; const y1 = from.y + nodeH(par);
        const x2 = to.x + NODE_W / 2;   const y2 = to.y;
        const mid = y1 + (y2 - y1) * 0.55;
        const d = `M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}`;
        const color = n.type === "condition" ? BR[n.branchType ?? "if"].line : "#6366f1";
        return (
          <path key={n.id} d={d} stroke={color} strokeWidth={2.5} fill="none"
            strokeDasharray={n.branchType === "else" ? "7 5" : undefined}
            opacity={0.65} markerEnd="url(#arr)" />
        );
      })}
    </>
  );
}

// ── Condition Row ─────────────────────────────────────────────────────────────
function CondRow({ cond, fields, onChange, onRemove }: {
  cond: Cond; fields: ModuleField[];
  onChange: (c: Cond) => void; onRemove: () => void;
}) {
  const sf = fields.find(f => f.name === cond.fieldName);
  const isOB = sf && OPTION_BEARING.includes(sf.type);
  const showV = !NO_VAL.includes(cond.operator);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Select value={cond.fieldName || ""} onValueChange={v => onChange({ ...cond, fieldName: v, value: "" })}>
        <SelectTrigger className="h-7 text-xs w-36 shrink-0"><SelectValue placeholder="Field…" /></SelectTrigger>
        <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={cond.operator || "equals"} onValueChange={v => onChange({ ...cond, operator: v, value: "" })}>
        <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue /></SelectTrigger>
        <SelectContent>{OPS.map(o => <SelectItem key={o.v} value={o.v} className="text-xs">{o.l}</SelectItem>)}</SelectContent>
      </Select>
      {showV && (isOB && (sf?.options?.length ?? 0) > 0
        ? <Select value={cond.value || ""} onValueChange={v => onChange({ ...cond, value: v })}>
            <SelectTrigger className="h-7 text-xs w-28 shrink-0"><SelectValue placeholder="Value…" /></SelectTrigger>
            <SelectContent>{(sf?.options ?? []).map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
          </Select>
        : <Input value={cond.value || ""} onChange={e => onChange({ ...cond, value: e.target.value })} placeholder="Value…" className="h-7 text-xs w-24 shrink-0" />
      )}
      <button onClick={onRemove} className="text-gray-300 hover:text-red-400 ml-auto shrink-0 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ── Add-child menu ─────────────────────────────────────────────────────────────
function AddMenu({ onAdd }: { onAdd: (t: AddType) => void }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 min-w-[200px]"
      onMouseDown={e => e.stopPropagation()}>
      <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condition Branch</p>
      {(["if", "else_if", "else"] as const).map(bt => (
        <button key={bt} onMouseDown={e => { e.stopPropagation(); onAdd({ type: "condition", branchType: bt }); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors">
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold text-white", BR[bt].cls)}>{BR[bt].label}</span>
          <span className="text-xs text-gray-700">{bt === "if" ? "IF condition" : bt === "else_if" ? "ELSE IF condition" : "ELSE (fallback)"}</span>
        </button>
      ))}
      <div className="my-1 border-t border-gray-100" />
      <p className="px-3 pt-0.5 pb-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</p>
      <button onMouseDown={e => { e.stopPropagation(); onAdd({ type: "action" }); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors">
        <Zap className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-xs text-gray-700">Action node</span>
      </button>
    </div>
  );
}

// ── Preview helpers ────────────────────────────────────────────────────────────
function condText(c: Cond) {
  if (!c.fieldName) return "—";
  const op = OPS.find(o => o.v === c.operator)?.l ?? c.operator;
  return NO_VAL.includes(c.operator) ? `${c.fieldName} ${op}` : `${c.fieldName} ${op} ${c.value}`;
}
function actText(a: BpAction) {
  if (a.type === "set_field")   return `Set ${a.fieldName || "?"} = ${a.value || "?"}`;
  if (a.type === "lock_field")  return `Lock: ${a.fieldName || "?"}`;
  if (a.type === "unlock_field") return `Unlock: ${a.fieldName || "?"}`;
  return `Notify: ${(a.message || "—").slice(0, 22)}`;
}

// ── Phase Node Card ────────────────────────────────────────────────────────────
function PhaseCard({ node, selected, onSelect, menuOpen, onToggleMenu, onAdd }: {
  node: TreeNode; selected: boolean; onSelect: () => void;
  menuOpen: boolean; onToggleMenu: () => void; onAdd: (t: AddType) => void;
}) {
  const color = node.phaseColor || "#6366f1";
  return (
    <div data-node={node.id} style={{ width: NODE_W }}
      className={cn("rounded-2xl border-2 overflow-visible select-none cursor-pointer transition-all bg-white shadow-sm hover:shadow-lg",
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200 hover:border-gray-300")}
      onClick={e => { e.stopPropagation(); onSelect(); }}>
      {/* Colored top strip */}
      <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: color }} />
      <div className="px-4 py-3" style={{ backgroundColor: color + "12" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {node.isRoot && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: color }}>ROOT</span>
            )}
          </div>
          {selected && <Settings className="w-3.5 h-3.5 opacity-50" style={{ color }} />}
        </div>
        <p className="text-sm font-bold text-gray-900 truncate">{node.phaseLabel || "Phase"}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Entry point · Click to configure</p>
      </div>
      {/* Add button */}
      <div className="relative flex justify-center py-2 border-t border-gray-100 bg-white rounded-b-2xl">
        <button onClick={e => { e.stopPropagation(); onToggleMenu(); }}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add branch / action
        </button>
        {menuOpen && <AddMenu onAdd={onAdd} />}
      </div>
    </div>
  );
}

// ── Condition Node Card ────────────────────────────────────────────────────────
function CondCard({ node, selected, onSelect, onDelete, menuOpen, onToggleMenu, onAdd }: {
  node: TreeNode; selected: boolean; onSelect: () => void; onDelete: () => void;
  menuOpen: boolean; onToggleMenu: () => void; onAdd: (t: AddType) => void;
}) {
  const meta = BR[node.branchType ?? "if"];
  const conds = node.conditions ?? [];
  return (
    <div data-node={node.id} style={{ width: NODE_W }}
      className={cn("rounded-2xl border-2 overflow-visible select-none cursor-pointer transition-all bg-white shadow-sm hover:shadow-lg",
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200 hover:border-gray-300")}
      onClick={e => { e.stopPropagation(); onSelect(); }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold text-white", meta.cls)}>{meta.label}</span>
        <div className="flex items-center gap-1">
          {selected && <Settings className="w-3.5 h-3.5 text-gray-400" />}
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-gray-300 hover:text-red-400 transition-colors p-0.5 ml-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* Conditions preview */}
      <div className="px-3 py-2.5 min-h-[38px] space-y-1">
        {node.branchType === "else"
          ? <p className="text-xs text-gray-400 italic">Fallback — runs when nothing else matches</p>
          : conds.length === 0
            ? <p className="text-xs text-gray-400 italic">No conditions — click to add</p>
            : <>
                {conds.slice(0, 2).map((c, i) => (
                  <p key={c.id} className="text-xs text-gray-700 truncate">
                    {i > 0 && <span className="text-[10px] font-semibold text-gray-400 mr-1">{node.conditionsLogic ?? "AND"}</span>}
                    {condText(c)}
                  </p>
                ))}
                {conds.length > 2 && <p className="text-[10px] text-gray-400">+{conds.length - 2} more…</p>}
              </>
        }
      </div>
      {/* Add button */}
      <div className="relative flex justify-center py-1.5 border-t border-gray-100 rounded-b-2xl">
        <button onClick={e => { e.stopPropagation(); onToggleMenu(); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 px-2.5 py-0.5 rounded hover:bg-indigo-50 transition-colors font-medium">
          <Plus className="w-3 h-3" /> Add
        </button>
        {menuOpen && <AddMenu onAdd={onAdd} />}
      </div>
    </div>
  );
}

// ── Action Node Card ───────────────────────────────────────────────────────────
function ActCard({ node, selected, onSelect, onDelete }: {
  node: TreeNode; selected: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const acts = node.actions ?? [];
  return (
    <div data-node={node.id} style={{ width: NODE_W }}
      className={cn("rounded-2xl border-2 overflow-hidden select-none cursor-pointer transition-all bg-white shadow-sm hover:shadow-lg",
        selected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200 hover:border-gray-300")}
      onClick={e => { e.stopPropagation(); onSelect(); }}>
      <div className="flex items-center justify-between px-3 py-2.5 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-700">ACTIONS{acts.length > 0 ? ` (${acts.length})` : ""}</span>
        </div>
        <div className="flex items-center gap-1">
          {selected && <Settings className="w-3.5 h-3.5 text-indigo-400" />}
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-indigo-300 hover:text-red-400 transition-colors p-0.5 ml-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="px-3 py-2.5 min-h-[38px] space-y-1">
        {acts.length === 0
          ? <p className="text-xs text-gray-400 italic">No actions — click to add</p>
          : <>
              {acts.slice(0, 3).map(a => (
                <p key={a.id} className="text-xs text-gray-700 truncate">
                  <span className="text-indigo-400 mr-1">→</span>{actText(a)}
                </p>
              ))}
              {acts.length > 3 && <p className="text-[10px] text-gray-400">+{acts.length - 3} more…</p>}
            </>
        }
      </div>
    </div>
  );
}

// ── Node Editor Panel ──────────────────────────────────────────────────────────
function EditorPanel({ node, fields, onChange, onDelete, onClose }: {
  node: TreeNode; fields: ModuleField[];
  onChange: (c: Partial<TreeNode>) => void;
  onDelete: () => void; onClose: () => void;
}) {
  const addCond = () => onChange({ conditions: [...(node.conditions ?? []), { id: uid(), fieldName: "", operator: "equals", value: "" }] });
  const updCond = (i: number, c: Cond) => { const n = [...(node.conditions ?? [])]; n[i] = c; onChange({ conditions: n }); };
  const remCond = (i: number) => onChange({ conditions: (node.conditions ?? []).filter((_, j) => j !== i) });

  const addAct = () => onChange({ actions: [...(node.actions ?? []), { id: uid(), type: "set_field", fieldName: "", value: "" }] });
  const updAct = (i: number, a: BpAction) => { const n = [...(node.actions ?? [])]; n[i] = a; onChange({ actions: n }); };
  const remAct = (i: number) => onChange({ actions: (node.actions ?? []).filter((_, j) => j !== i) });

  function valInput(a: BpAction, i: number) {
    const tf = fields.find(f => f.name === a.fieldName);
    if (tf && OPTION_BEARING.includes(tf.type) && (tf.options?.length ?? 0) > 0) {
      return (
        <Select value={a.value || ""} onValueChange={v => updAct(i, { ...a, value: v })}>
          <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Value…" /></SelectTrigger>
          <SelectContent>{(tf.options ?? []).map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
        </Select>
      );
    }
    return <Input value={a.value || ""} onChange={e => updAct(i, { ...a, value: e.target.value })} placeholder="Value…" className="h-7 text-xs flex-1" />;
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          {node.type === "phase" && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.phaseColor || "#6366f1" }} />}
          {node.type === "condition" && <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold text-white", BR[node.branchType ?? "if"].cls)}>{BR[node.branchType ?? "if"].label}</span>}
          {node.type === "action" && <Zap className="w-3.5 h-3.5 text-indigo-600" />}
          <span className="text-sm font-semibold text-gray-900">
            {node.type === "phase" ? (node.phaseLabel || "Phase") : node.type === "condition" ? "Condition Branch" : "Action Node"}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* ── Phase node ── */}
        {node.type === "phase" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: node.phaseColor || "#6366f1" }} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{node.phaseLabel}</p>
                <p className="text-xs text-gray-400">{node.isRoot ? "Root / entry phase" : "Phase node"}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              This is the entry node of the Blueprint tree. Add <strong>IF / ELSE IF / ELSE</strong> condition branches below to define logic, or <strong>Action</strong> nodes to run actions unconditionally.
            </p>
          </div>
        )}

        {/* ── Condition node ── */}
        {node.type === "condition" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Branch Type</Label>
              <div className="flex gap-1.5">
                {(["if", "else_if", "else"] as const).map(bt => (
                  <button key={bt} onClick={() => onChange({ branchType: bt })}
                    className={cn("flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                      node.branchType === bt ? cn("text-white border-transparent", BR[bt].cls) : "border-gray-200 text-gray-400 hover:border-gray-300 bg-white")}>
                    {BR[bt].label}
                  </button>
                ))}
              </div>
            </div>

            {node.branchType !== "else" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Conditions</Label>
                  {(node.conditions?.length ?? 0) > 1 && (
                    <div className="flex gap-1">
                      {(["AND", "OR"] as const).map(l => (
                        <button key={l} onClick={() => onChange({ conditionsLogic: l })}
                          className={cn("px-2 py-0.5 rounded text-xs font-semibold border transition-all",
                            node.conditionsLogic === l ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-400")}>
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {(node.conditions ?? []).map((c, i) => (
                    <CondRow key={c.id} cond={c} fields={fields} onChange={uc => updCond(i, uc)} onRemove={() => remCond(i)} />
                  ))}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={addCond}>
                    <Plus className="w-3 h-3" /> Add Condition
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-600 leading-relaxed">
                  The <strong>ELSE</strong> branch runs when no IF or ELSE IF branch matched. No conditions needed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Action node ── */}
        {node.type === "action" && (
          <div className="space-y-3">
            <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</Label>
            <div className="space-y-2.5">
              {(node.actions ?? []).map((a, i) => (
                <div key={a.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                  <Select value={a.type} onValueChange={v => updAct(i, { ...a, type: v as BpAction["type"], fieldName: "", value: "", message: "" })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set_field" className="text-xs">Set field value</SelectItem>
                      <SelectItem value="lock_field" className="text-xs">Lock field</SelectItem>
                      <SelectItem value="unlock_field" className="text-xs">Unlock field</SelectItem>
                      <SelectItem value="notify" className="text-xs">Send notification</SelectItem>
                    </SelectContent>
                  </Select>
                  {a.type === "set_field" && (
                    <div className="flex items-center gap-1.5">
                      <Select value={a.fieldName || ""} onValueChange={v => updAct(i, { ...a, fieldName: v, value: "" })}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Field…" /></SelectTrigger>
                        <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <span className="text-xs text-gray-400 shrink-0">=</span>
                      {valInput(a, i)}
                    </div>
                  )}
                  {(a.type === "lock_field" || a.type === "unlock_field") && (
                    <Select value={a.fieldName || ""} onValueChange={v => updAct(i, { ...a, fieldName: v })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select field…" /></SelectTrigger>
                      <SelectContent>{fields.map(f => <SelectItem key={f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {a.type === "notify" && (
                    <Input value={a.message || ""} onChange={e => updAct(i, { ...a, message: e.target.value })}
                      placeholder="Notification message…" className="h-7 text-xs" />
                  )}
                  <button onClick={() => remAct(i)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 w-full" onClick={addAct}>
                <Plus className="w-3.5 h-3.5" /> Add Action
              </Button>
            </div>
          </div>
        )}
      </div>

      {node.type !== "phase" && (
        <div className="p-4 border-t border-gray-100 shrink-0">
          <Button variant="ghost" size="sm" onClick={onDelete}
            className="w-full gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 h-8 text-xs">
            <Trash2 className="w-3.5 h-3.5" /> Delete Node &amp; Subtree
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium",
      type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BlueprintBuilderPage() {
  const params = useParams();
  const id = params.id as string;

  const [blueprint, setBlueprint] = useState<BpDetail | null>(null);
  const [name, setName]           = useState("");
  const [nodes, setNodes]         = useState<TreeNode[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Canvas state
  const [zoom, setZoom]     = useState(0.9);
  const [pan, setPan]       = useState({ x: 160, y: 80 });
  const panRef = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Selection & menus
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [addMenuFor, setAddMenuFor]   = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200);
  };

  // Load
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/blueprints/${id}`);
      setBlueprint(data);
      setName(data.name || "");
      if (data.treeData?.nodes?.length) {
        setNodes(data.treeData.nodes);
      } else {
        // Bootstrap root node from first phase
        const phases = (data.phases || []) as any[];
        if (phases.length) {
          setNodes([{
            id: "root_" + phases[0].id,
            type: "phase", parentId: null,
            phaseLabel: phases[0].label || phases[0].name,
            phaseColor: phases[0].color || "#6366f1",
            isRoot: true,
          }]);
        }
      }
    } catch { showToast("Failed to load blueprint", "error"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Computed
  const allFields = useMemo(() => blueprint?.module?.fields || [], [blueprint]);
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId]);

  // Layout
  const { layoutMap, canvasW, canvasH } = useMemo(() => {
    const raw = computeLayout(nodes);
    if (!Object.keys(raw).length) return { layoutMap: {} as Record<string, { x: number; y: number }>, canvasW: 600, canvasH: 500 };
    const xs = Object.values(raw).map(p => p.x);
    const ys = Object.values(raw).map(p => p.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs) + NODE_W;
    const maxY = Math.max(...ys) + 200;
    const offX = -minX + PAD; const offY = PAD;
    const shifted: Record<string, { x: number; y: number }> = {};
    for (const [nid, p] of Object.entries(raw)) shifted[nid] = { x: p.x + offX, y: p.y + offY };
    return {
      layoutMap: shifted,
      canvasW: Math.max(700, maxX - minX + 2 * PAD),
      canvasH: Math.max(500, maxY + 2 * PAD),
    };
  }, [nodes]);

  // Node ops
  const updateNode = useCallback((nid: string, changes: Partial<TreeNode>) =>
    setNodes(prev => prev.map(n => n.id === nid ? { ...n, ...changes } : n)), []);

  const deleteSubtree = useCallback((nid: string) => {
    setNodes(prev => {
      const del = new Set<string>();
      const collect = (x: string) => { del.add(x); prev.filter(n => n.parentId === x).forEach(c => collect(c.id)); };
      collect(nid);
      return prev.filter(n => !del.has(n.id));
    });
    setSelectedId(cur => (cur === nid ? null : cur));
  }, []);

  const addChild = useCallback((parentId: string, t: AddType) => {
    const nn: TreeNode = t.type === "condition"
      ? { id: uid(), type: "condition", parentId, branchType: t.branchType, conditions: [], conditionsLogic: "AND" }
      : { id: uid(), type: "action", parentId, actions: [] };
    setNodes(prev => [...prev, nn]);
    setSelectedId(nn.id);
    setAddMenuFor(null);
  }, []);

  // Canvas interaction
  const handleBgMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setSelectedId(null); setAddMenuFor(null);
    panRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
  };
  const handleBgMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panRef.current.active) return;
    setPan({ x: panRef.current.ox + (e.clientX - panRef.current.sx), y: panRef.current.oy + (e.clientY - panRef.current.sy) });
  };
  const handleBgMouseUp = () => { panRef.current.active = false; };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.2, Math.min(2.5, z * (e.deltaY > 0 ? 0.92 : 1 / 0.92))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => { setZoom(0.9); setPan({ x: 160, y: 80 }); };

  // Save
  const handleSave = async () => {
    if (!name.trim()) { showToast("Blueprint name is required", "error"); return; }
    setSaving(true);
    try {
      await api.patch(`/blueprints/${id}`, { name: name.trim(), treeData: { nodes } });
      showToast("Blueprint saved");
    } catch { showToast("Failed to save", "error"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
    </div>
  );
  if (!blueprint) return (
    <div className="text-center py-16 space-y-3">
      <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
      <p className="text-sm text-gray-500">Blueprint not found.</p>
      <Link href="/settings/blueprints"><Button variant="outline" size="sm">Back</Button></Link>
    </div>
  );

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 64px)", margin: "-24px", padding: 0 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/settings/blueprints">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <GitBranch className="w-4 h-4 text-indigo-600 shrink-0" />
          <input value={name} onChange={e => setName(e.target.value)}
            className="text-base font-bold text-gray-900 bg-transparent border-none outline-none min-w-0 max-w-xs" />
          <span className="text-xs text-gray-400 shrink-0 hidden lg:block">
            {blueprint.module?.icon || "📋"} {blueprint.module?.name} · {nodes.length} nodes
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-1">
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-0.5 text-gray-500 hover:text-gray-800 transition-colors">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-0.5 text-gray-500 hover:text-gray-800 transition-colors">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetView} className="p-0.5 text-gray-500 hover:text-gray-800 border-l border-gray-200 pl-1.5 ml-0.5 transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 h-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-5 py-2 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Legend:</span>
          {(["if", "else_if", "else"] as const).map(bt => (
            <div key={bt} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: BR[bt].line }} />
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", BR[bt].light)}>{BR[bt].label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-indigo-400" />
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-500" />
              <span className="text-[10px] text-indigo-600 font-semibold">Action</span>
            </div>
          </div>
        </div>
        <div className="ml-auto text-[10px] text-gray-400 hidden md:block">
          Scroll to zoom · Drag canvas to pan · Click node to edit
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden"
          style={{
            cursor: panRef.current.active ? "grabbing" : "grab",
            backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            backgroundColor: "#f8fafc",
          }}
          onMouseDown={handleBgMouseDown}
          onMouseMove={handleBgMouseMove}
          onMouseUp={handleBgMouseUp}
          onMouseLeave={handleBgMouseUp}
        >
          {/* Zoomable/pannable layer */}
          <div style={{
            position: "absolute",
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: canvasW,
            height: canvasH,
          }}>
            {/* SVG edges */}
            <svg style={{ position: "absolute", left: 0, top: 0, width: canvasW, height: canvasH, pointerEvents: "none", overflow: "visible" }}>
              <defs>
                <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                  <polygon points="0 0, 8 4, 0 8" fill="#9ca3af" />
                </marker>
              </defs>
              <TreeEdges nodes={nodes} pos={layoutMap} />
            </svg>

            {/* Nodes */}
            {nodes.map(node => {
              const p = layoutMap[node.id];
              if (!p) return null;
              const sel = selectedId === node.id;
              const mOpen = addMenuFor === node.id;
              const handlers = {
                onSelect: () => { setSelectedId(node.id); setAddMenuFor(null); },
                menuOpen: mOpen,
                onToggleMenu: () => setAddMenuFor(mOpen ? null : node.id),
                onAdd: (t: AddType) => addChild(node.id, t),
              };
              return (
                <div key={node.id} style={{ position: "absolute", left: p.x, top: p.y, zIndex: sel ? 20 : 1 }}>
                  {node.type === "phase" && (
                    <PhaseCard node={node} selected={sel} {...handlers} />
                  )}
                  {node.type === "condition" && (
                    <CondCard node={node} selected={sel} onDelete={() => deleteSubtree(node.id)} {...handlers} />
                  )}
                  {node.type === "action" && (
                    <ActCard node={node} selected={sel}
                      onSelect={() => { setSelectedId(node.id); setAddMenuFor(null); }}
                      onDelete={() => deleteSubtree(node.id)} />
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-3 opacity-60">
                  <GitBranch className="w-14 h-14 text-gray-300 mx-auto" />
                  <p className="text-sm font-medium text-gray-400">No tree nodes yet</p>
                  <p className="text-xs text-gray-400 max-w-xs">Blueprint has no phases. Go back and configure phases first.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        {selectedNode && (
          <EditorPanel
            node={selectedNode}
            fields={allFields}
            onChange={c => updateNode(selectedNode.id, c)}
            onDelete={() => deleteSubtree(selectedNode.id)}
            onClose={() => setSelectedId(null)}
          />
        )}

        {/* "No selection" hint panel */}
        {!selectedNode && (
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col items-center justify-center gap-3 p-8 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <ChevronsRight className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-1">Decision Tree Builder</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Click any node on the canvas to edit it. Use <strong>+ Add branch / action</strong> to build your automation logic.
              </p>
            </div>
            <div className="w-full mt-2 space-y-2 text-[10px] text-gray-400">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-200 shrink-0" />
                <span><strong>Phase node</strong> — root entry point</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded shrink-0">IF</span>
                <span><strong>Condition</strong> — evaluates rules</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
                <Zap className="w-3 h-3 text-indigo-500 shrink-0" />
                <span><strong>Action node</strong> — executes changes</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
