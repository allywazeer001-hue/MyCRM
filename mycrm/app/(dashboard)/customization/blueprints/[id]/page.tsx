"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Save, Zap, X, Info } from "lucide-react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType,
  BackgroundVariant,
  type Node, type Edge, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_TYPES = [
  { value: "start",    label: "Start",    color: "#22c55e", icon: "▶" },
  { value: "normal",   label: "Normal",   color: "#3b82f6", icon: "◆" },
  { value: "end",      label: "End",      color: "#8b5cf6", icon: "■" },
  { value: "rejected", label: "Rejected", color: "#ef4444", icon: "✕" },
];
const ACTION_TYPES = [
  { value: "approve",  label: "Approve",  color: "#22c55e" },
  { value: "reject",   label: "Reject",   color: "#ef4444" },
  { value: "return",   label: "Return",   color: "#f97316" },
  { value: "escalate", label: "Escalate", color: "#8b5cf6" },
  { value: "assign",   label: "Assign",   color: "#3b82f6" },
  { value: "complete", label: "Complete", color: "#14b8a6" },
  { value: "custom",   label: "Custom",   color: "#6b7280" },
];
const COLORS = ["#3b82f6","#22c55e","#f97316","#8b5cf6","#ef4444","#14b8a6","#eab308","#6b7280"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface BAction { id: string; name: string; label: string; actionType: string; targetStageId: string | null; color: string; requiresNote: boolean; order: number; }
interface BStage  { id: string; name: string; description: string | null; order: number; stageType: string; color: string; responsibleRole: string | null; slaDuration: number | null; actions: BAction[]; }
interface Blueprint { id: string; name: string; description: string | null; isActive: boolean; stages: BStage[]; }

// ── Auto-layout (BFS top-down tree) ──────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 130;
const H_GAP  = 90;
const V_GAP  = 80;

function computeLayout(stages: BStage[]): Record<string, { x: number; y: number }> {
  if (stages.length === 0) return {};
  const start = stages.find(s => s.stageType === "start") || stages[0];
  const levels: Record<string, number> = { [start.id]: 0 };
  const queue = [start.id];
  const visited = new Set([start.id]);
  while (queue.length) {
    const curr = queue.shift()!;
    const stage = stages.find(s => s.id === curr);
    stage?.actions.forEach(a => {
      if (a.targetStageId && !visited.has(a.targetStageId)) {
        visited.add(a.targetStageId);
        levels[a.targetStageId] = (levels[curr] ?? 0) + 1;
        queue.push(a.targetStageId);
      }
    });
  }
  stages.forEach(s => { if (levels[s.id] === undefined) levels[s.id] = s.order || 0; });

  const byLevel: Record<number, string[]> = {};
  Object.entries(levels).forEach(([id, lvl]) => {
    byLevel[lvl] = byLevel[lvl] ? [...byLevel[lvl], id] : [id];
  });

  const maxCols = Math.max(...Object.values(byLevel).map(ids => ids.length));
  const canvasW = maxCols * (NODE_W + H_GAP) - H_GAP;
  const positions: Record<string, { x: number; y: number }> = {};

  Object.entries(byLevel).forEach(([lvl, ids]) => {
    const level = parseInt(lvl);
    const rowW = ids.length * (NODE_W + H_GAP) - H_GAP;
    const startX = (canvasW - rowW) / 2;
    ids.forEach((id, i) => {
      positions[id] = { x: startX + i * (NODE_W + H_GAP), y: 60 + level * (NODE_H + V_GAP) };
    });
  });
  return positions;
}

// ── Custom Stage Node ─────────────────────────────────────────────────────────

function StageNode({ data, selected }: { data: any; selected: boolean }) {
  const stage: BStage = data.stage;
  const tc = STAGE_TYPES.find(t => t.value === stage.stageType) || STAGE_TYPES[1];

  return (
    <div className={cn(
      "rounded-xl border-2 bg-white shadow-sm transition-shadow w-56 select-none",
      selected ? "border-blue-500 shadow-lg shadow-blue-100/60" : "border-gray-200 hover:border-gray-300"
    )}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !rounded-full !border-2 !border-white"
        style={{ backgroundColor: "#94a3b8" }}
      />

      {/* Coloured header */}
      <div className="px-3 py-2.5 rounded-t-[10px]" style={{ backgroundColor: stage.color + "1a" }}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: stage.color }} />
          <p className="text-sm font-bold text-gray-900 truncate flex-1 leading-tight">{stage.name}</p>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: tc.color + "22", color: tc.color }}>
            {tc.label}
          </span>
        </div>
        {stage.description && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{stage.description}</p>}
      </div>

      {/* Meta */}
      <div className="px-3 py-2 space-y-1 min-h-[36px]">
        {(stage.responsibleRole || stage.slaDuration != null) && (
          <div className="flex flex-wrap gap-1">
            {stage.responsibleRole && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{stage.responsibleRole}</span>}
            {stage.slaDuration != null && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">{stage.slaDuration}h SLA</span>}
          </div>
        )}
        <p className="text-[10px] text-gray-400">
          {stage.actions.length === 0 ? "No transitions yet" : `${stage.actions.length} transition${stage.actions.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !rounded-full !border-2 !border-white"
        style={{ backgroundColor: "#3b82f6" }}
      />
    </div>
  );
}

const NODE_TYPES = { stageNode: StageNode };

// ── Helpers: stages → nodes / edges ──────────────────────────────────────────

function stagesToNodes(stages: BStage[], positions: Record<string, { x: number; y: number }>): Node[] {
  return stages.map(stage => ({
    id: stage.id,
    type: "stageNode",
    position: positions[stage.id] || { x: stage.order * (NODE_W + H_GAP), y: 60 },
    data: { stage },
  }));
}

function stagesToEdges(stages: BStage[]): Edge[] {
  const edges: Edge[] = [];
  stages.forEach(stage => {
    stage.actions.forEach(action => {
      if (!action.targetStageId) return;
      edges.push({
        id: action.id,
        source: stage.id,
        target: action.targetStageId,
        label: action.label,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: action.color },
        style: { stroke: action.color, strokeWidth: 2 },
        labelStyle: { fill: action.color, fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: "#fff", fillOpacity: 0.85 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
        data: { action, stageId: stage.id },
      });
    });
  });
  return edges;
}

// ── Right panel ───────────────────────────────────────────────────────────────

type PanelMode = "bp" | "stage" | "edge" | "new-action";

function RightPanel({
  mode, bp, stage, edge, stages, pendingConn,
  onBpChange, onSaveStage, onDeleteStage,
  onSaveAction, onDeleteAction, onSaveNewAction, onCancelNewAction,
}: {
  mode: PanelMode;
  bp: Blueprint | null;
  stage: BStage | null;
  edge: Edge | null;
  stages: BStage[];
  pendingConn: Connection | null;
  onBpChange: (ch: Partial<Blueprint>) => void;
  onSaveStage: (stageId: string, data: any) => Promise<void>;
  onDeleteStage: (stageId: string) => void;
  onSaveAction: (stageId: string, action: BAction | null, data: any) => Promise<void>;
  onDeleteAction: (actionId: string, stageId: string) => void;
  onSaveNewAction: (data: any) => Promise<void>;
  onCancelNewAction: () => void;
}) {
  const [sf, setSf] = useState<any>(null);
  const [af, setAf] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stage) {
      setSf({ name: stage.name, description: stage.description ?? "", stageType: stage.stageType, color: stage.color, responsibleRole: stage.responsibleRole ?? "", slaDuration: stage.slaDuration != null ? String(stage.slaDuration) : "" });
    } else setSf(null);
    setAf(null);
  }, [stage?.id]); // eslint-disable-line

  useEffect(() => {
    if (mode === "new-action") {
      setAf({ name: "", label: "", actionType: "approve", color: "#22c55e", requiresNote: false });
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "edge" && edge?.data?.action) {
      const a = edge.data.action as BAction;
      setAf({ name: a.name, label: a.label, actionType: a.actionType, color: a.color, requiresNote: a.requiresNote });
    }
  }, [mode, edge?.id]); // eslint-disable-line

  const doSaveStage = async () => {
    if (!stage || !sf) return;
    setSaving(true);
    try { await onSaveStage(stage.id, { ...sf, slaDuration: sf.slaDuration ? parseInt(sf.slaDuration) : null, responsibleRole: sf.responsibleRole || null }); }
    finally { setSaving(false); }
  };

  const doSaveAction = async () => {
    if (!af) return;
    setSaving(true);
    try {
      if (mode === "new-action") {
        await onSaveNewAction(af);
      } else if (mode === "edge" && edge?.data) {
        const { action, stageId } = edge.data as any;
        await onSaveAction(stageId, action as BAction, af);
      }
      setAf(null);
    } finally { setSaving(false); }
  };

  if (!bp) return <div className="w-64 shrink-0 border-l border-gray-200 bg-white" />;

  // ── Blueprint info ──
  if (mode === "bp") return (
    <div className="w-64 shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Blueprint</p>
      <div className="space-y-3">
        <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={bp.name} onChange={e => onBpChange({ name: e.target.value })} className="h-8 text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={bp.description ?? ""} onChange={e => onBpChange({ description: e.target.value })} className="h-8 text-sm" placeholder="Optional" /></div>
      </div>
      <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-400 leading-relaxed space-y-1">
        <p>• Click a stage type in the library to add it.</p>
        <p>• Drag the <span className="text-blue-400 font-semibold">blue handle</span> on a stage to a <span className="text-gray-400 font-semibold">grey handle</span> of another stage to create a transition.</p>
        <p>• Click any stage or transition to edit it.</p>
        <p>• Drag stages freely to rearrange.</p>
      </div>
    </div>
  );

  // ── Stage properties ──
  if (mode === "stage" && stage && sf) return (
    <div className="w-64 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-1">Stage</p>
          <button onClick={() => onDeleteStage(stage.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={sf.name} onChange={e => setSf((f: any) => ({ ...f, name: e.target.value }))} className="h-8 text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={sf.description} onChange={e => setSf((f: any) => ({ ...f, description: e.target.value }))} className="h-8 text-xs" placeholder="Optional" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <select value={sf.stageType} onChange={e => { const t = STAGE_TYPES.find(x => x.value === e.target.value)!; setSf((f: any) => ({ ...f, stageType: e.target.value, color: t.color })); }} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
            {STAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-xs">Role</Label><Input value={sf.responsibleRole} onChange={e => setSf((f: any) => ({ ...f, responsibleRole: e.target.value }))} className="h-8 text-xs" placeholder="Manager" /></div>
          <div className="space-y-1"><Label className="text-xs">SLA (hrs)</Label><Input type="number" min={0} value={sf.slaDuration} onChange={e => setSf((f: any) => ({ ...f, slaDuration: e.target.value }))} className="h-8 text-xs" placeholder="48" /></div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Color</Label>
          <div className="flex gap-1.5 flex-wrap">{COLORS.map(c => <button key={c} onClick={() => setSf((f: any) => ({ ...f, color: c }))} className={cn("w-5 h-5 rounded-full border-2 transition-all", sf.color === c ? "border-gray-700 scale-110" : "border-transparent")} style={{ backgroundColor: c }} />)}</div>
        </div>
        <Button size="sm" className="h-7 text-xs w-full" onClick={doSaveStage} disabled={saving}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Save Stage
        </Button>
      </div>

      {/* Actions list for selected stage */}
      <div className="p-4 space-y-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Transitions out of this stage</p>
        {stage.actions.length === 0
          ? <p className="text-[10px] text-gray-400 italic">Drag the blue handle to another stage to add a transition.</p>
          : stage.actions.map(a => {
              const target = stages.find(s => s.id === a.targetStageId);
              return (
                <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:border-gray-200 group">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{a.label}</p>
                    {target && <p className="text-[10px] text-gray-400">→ {target.name}</p>}
                    {a.requiresNote && <p className="text-[10px] text-amber-500">Requires note</p>}
                  </div>
                  <button onClick={() => onDeleteAction(a.id, stage.id)} className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
        }
      </div>
    </div>
  );

  // ── Edge / action ──
  if ((mode === "edge" || mode === "new-action") && af) return (
    <div className="w-64 shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{mode === "new-action" ? "New Transition" : "Edit Transition"}</p>
        {mode === "new-action" && <button onClick={onCancelNewAction} className="text-gray-400 hover:text-gray-700"><X className="w-3.5 h-3.5" /></button>}
        {mode === "edge" && edge?.data && <button onClick={() => { const { action, stageId } = edge.data as any; onDeleteAction(action.id, stageId); }} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>

      {mode === "new-action" && pendingConn && (
        <div className="px-2 py-1.5 bg-blue-50 rounded-lg text-[10px] text-blue-600 border border-blue-100">
          Connecting <strong>{stages.find(s => s.id === pendingConn.source)?.name}</strong> → <strong>{stages.find(s => s.id === pendingConn.target)?.name}</strong>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-1"><Label className="text-[10px]">Key</Label><Input value={af.name} onChange={e => setAf((f: any) => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} className="h-7 text-xs font-mono" placeholder="approve" /></div>
        <div className="space-y-1"><Label className="text-[10px]">Label</Label><Input value={af.label} onChange={e => setAf((f: any) => ({ ...f, label: e.target.value }))} className="h-7 text-xs" placeholder="Approve" /></div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Action Type</Label>
        <select value={af.actionType} onChange={e => { const t = ACTION_TYPES.find(x => x.value === e.target.value)!; setAf((f: any) => ({ ...f, actionType: e.target.value, color: t.color })); }} className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
          {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Color</Label>
        <div className="flex gap-1.5 flex-wrap">{COLORS.map(c => <button key={c} onClick={() => setAf((f: any) => ({ ...f, color: c }))} className={cn("w-4 h-4 rounded-full border-2 transition-all", af.color === c ? "border-gray-700 scale-110" : "border-transparent")} style={{ backgroundColor: c }} />)}</div>
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={af.requiresNote} onChange={e => setAf((f: any) => ({ ...f, requiresNote: e.target.checked }))} className="w-3 h-3 accent-blue-600" />
        <span className="text-[10px] text-gray-700">Require a note when taken</span>
      </label>
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs flex-1" onClick={doSaveAction} disabled={saving || !af.name.trim() || !af.label.trim()}>
          {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}{mode === "new-action" ? "Create" : "Update"}
        </Button>
        {mode === "new-action" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelNewAction}>Cancel</Button>}
      </div>
    </div>
  );

  return <div className="w-64 shrink-0 border-l border-gray-200 bg-white" />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BlueprintEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [bp, setBp]           = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId]   = useState<string | null>(null);
  const [pendingConn, setPendingConn]         = useState<Connection | null>(null);
  const [panelMode, setPanelMode]             = useState<PanelMode>("bp");

  const posKey = `bp-pos-${id}`;

  const buildGraph = useCallback((blueprint: Blueprint) => {
    const stored: Record<string, { x: number; y: number }> = JSON.parse(localStorage.getItem(posKey) || "{}");
    const auto = computeLayout(blueprint.stages);
    const positions: Record<string, { x: number; y: number }> = {};
    blueprint.stages.forEach(s => { positions[s.id] = stored[s.id] || auto[s.id] || { x: 0, y: 0 }; });
    setNodes(stagesToNodes(blueprint.stages, positions));
    setEdges(stagesToEdges(blueprint.stages));
  }, [posKey, setNodes, setEdges]);

  const load = useCallback(() => {
    api.get(`/request-blueprints/${id}`)
      .then(r => { setBp(r.data); buildGraph(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, buildGraph]);

  useEffect(() => { load(); }, [load]);

  // Derive selection context
  const stages   = bp?.stages ?? [];
  const selStage = stages.find(s => s.id === selectedStageId) ?? null;
  const selEdge  = edges.find(e => e.id === selectedEdgeId) ?? null;

  const saveBp = async () => {
    if (!bp) return;
    setSaving(true);
    try { await api.patch(`/request-blueprints/${id}`, { name: bp.name, description: bp.description }); }
    catch { alert("Failed"); }
    finally { setSaving(false); }
  };

  const addStage = async (type: string) => {
    const t = STAGE_TYPES.find(x => x.value === type)!;
    try {
      const { data: newStage } = await api.post(`/request-blueprints/${id}/stages`, {
        name: t.label, description: "", stageType: type, color: t.color, responsibleRole: null, slaDuration: null,
      });
      const stored: Record<string, { x: number; y: number }> = JSON.parse(localStorage.getItem(posKey) || "{}");
      stored[newStage.id] = { x: 80 + (stages.length % 4) * (NODE_W + H_GAP), y: 80 + Math.floor(stages.length / 4) * (NODE_H + V_GAP) };
      localStorage.setItem(posKey, JSON.stringify(stored));
      load();
      setSelectedStageId(newStage.id);
      setPanelMode("stage");
    } catch { alert("Failed to add stage"); }
  };

  const saveStage = async (stageId: string, data: any) => {
    await api.patch(`/request-blueprints/stages/${stageId}`, data);
    load();
  };

  const deleteStage = async (stageId: string) => {
    if (!confirm("Delete this stage and all its transitions?")) return;
    await api.delete(`/request-blueprints/stages/${stageId}`).catch(() => alert("Failed"));
    setSelectedStageId(null); setPanelMode("bp");
    load();
  };

  const saveAction = async (stageId: string, action: BAction | null, data: any) => {
    if (action) await api.patch(`/request-blueprints/actions/${action.id}`, data);
    else await api.post(`/request-blueprints/stages/${stageId}/actions`, data);
    load();
  };

  const deleteAction = async (actionId: string, _stageId: string) => {
    await api.delete(`/request-blueprints/actions/${actionId}`).catch(() => alert("Failed"));
    setSelectedEdgeId(null); setPanelMode(selectedStageId ? "stage" : "bp");
    load();
  };

  // ReactFlow callbacks
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    setPendingConn(conn);
    setPanelMode("new-action");
    setSelectedEdgeId(null);
    setSelectedStageId(null);
  }, []);

  const saveNewAction = async (data: any) => {
    if (!pendingConn?.source) return;
    await api.post(`/request-blueprints/stages/${pendingConn.source}/actions`, { ...data, targetStageId: pendingConn.target || null });
    setPendingConn(null);
    setPanelMode("bp");
    load();
  };

  const cancelNewAction = () => { setPendingConn(null); setPanelMode("bp"); };

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedStageId(node.id);
    setSelectedEdgeId(null);
    setPendingConn(null);
    setPanelMode("stage");
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedStageId(null);
    setPendingConn(null);
    setPanelMode("edge");
  }, []);

  const onPaneClick = useCallback(() => {
    if (panelMode === "new-action") return;
    setSelectedStageId(null);
    setSelectedEdgeId(null);
    setPanelMode("bp");
  }, [panelMode]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    const stored: Record<string, { x: number; y: number }> = JSON.parse(localStorage.getItem(posKey) || "{}");
    stored[node.id] = node.position;
    localStorage.setItem(posKey, JSON.stringify(stored));
  }, [posKey]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach(n => deleteStage(n.id));
  }, [stages]); // eslint-disable-line

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    deleted.forEach(e => { if (e.data?.action) deleteAction((e.data.action as BAction).id, (e.data as any).stageId); });
  }, []); // eslint-disable-line

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!bp)    return <div className="text-red-500 p-6">Blueprint not found</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -mx-6 -my-6">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 z-10">
        <button onClick={() => router.push("/customization/blueprints")} className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={bp.name}
            onChange={e => setBp(prev => prev ? { ...prev, name: e.target.value } : prev)}
            className="text-lg font-bold text-gray-900 bg-transparent focus:outline-none w-full"
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">{stages.length} stage{stages.length !== 1 ? "s" : ""}</span>
        <Button onClick={saveBp} disabled={saving} size="sm" className="h-8 gap-1.5 shrink-0">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
        </Button>
      </div>

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0">

        {/* Library */}
        <div className="shrink-0 w-48 border-r border-gray-200 bg-gray-50/80 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-gray-200/60">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Step Library</p>
          </div>
          <div className="p-2.5 space-y-1.5 flex-1">
            {STAGE_TYPES.map(t => (
              <button key={t.value} onClick={() => addStage(t.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all text-left group">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: t.color }}>{t.icon}</div>
                <p className="text-xs font-semibold text-gray-700 group-hover:text-blue-700 flex-1">{t.label}</p>
                <Plus className="w-3 h-3 text-gray-300 group-hover:text-blue-400 shrink-0" />
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200/60 space-y-1 text-[10px] text-gray-400 leading-relaxed">
            <p>Drag <span className="font-semibold text-blue-400">blue handle</span> → grey handle to connect stages.</p>
            <p>Press <kbd className="bg-gray-200 px-1 rounded text-[9px]">Del</kbd> to remove selected.</p>
          </div>
        </div>

        {/* React Flow canvas */}
        <div className="flex-1 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Shift"
            defaultEdgeOptions={{ type: "smoothstep" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
            <Controls />
            <MiniMap
              nodeColor={n => {
                const stage = stages.find(s => s.id === n.id);
                return stage?.color || "#94a3b8";
              }}
              maskColor="rgba(241,245,249,0.8)"
              style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
            />
          </ReactFlow>
        </div>

        {/* Right panel */}
        <RightPanel
          mode={panelMode}
          bp={bp}
          stage={selStage}
          edge={selEdge}
          stages={stages}
          pendingConn={pendingConn}
          onBpChange={ch => setBp(prev => prev ? { ...prev, ...ch } : prev)}
          onSaveStage={saveStage}
          onDeleteStage={deleteStage}
          onSaveAction={saveAction}
          onDeleteAction={deleteAction}
          onSaveNewAction={saveNewAction}
          onCancelNewAction={cancelNewAction}
        />
      </div>
    </div>
  );
}
