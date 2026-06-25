"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  GitBranch, ArrowLeft, Save, Plus, Trash2, X,
  CheckCircle2, AlertCircle, Loader2, Zap,
  Settings, ChevronsRight,
  ArrowRight, Workflow, Layers, Shield, Bell,
  ChevronDown, Check,
  ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, useReactFlow,
  Handle, Position, MarkerType, BackgroundVariant,
  type Node, type Edge, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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
  phases: any[]; transitions: any[]; treeData?: { nodes: TreeNode[] } | null; isActive: boolean;
  module?: { id: string; name: string; slug: string; icon?: string; fields: ModuleField[] };
}
type AddType = { type: "condition"; branchType: "if" | "else_if" | "else" } | { type: "action" };

// ── Flow Designer Types ────────────────────────────────────────────────────────
interface FlowPhase {
  id: string;
  name: string;
  color: string;
  order: number;
  x: number;
  y: number;
}
interface FlowTransition {
  id: string;
  name: string;
  fromPhaseId: string;
  toPhaseId: string;
  isCommon?: boolean; // true = available from any stage
  description?: string;
  buttonColor: string;
  requiredFields: string[];
  allowedRoles: string[];
  allowedUsers: string[];
  conditions: any[];
  conditionsLogic: "AND" | "OR";
  requiresApproval: boolean;
  approvalRoles: string[];
  notifyRoles: string[];
  notifyUsers: string[];
  confirmMessage?: string;
}

const ROLE_OPTIONS = ["ADMIN", "MANAGER", "STAFF", "VIEWER", "USER"];
const FLOW_COLORS  = ["#3b82f6","#22c55e","#f97316","#8b5cf6","#ef4444","#14b8a6","#eab308","#6b7280","#ec4899"];
const DRAG_TYPE    = "application/x-blueprint-stage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initTransitionsFromBlueprint(blueprint: BpDetail): FlowTransition[] {
  return ((blueprint.transitions || []) as any[]).map((t: any) => ({
    id: t.id || uid(), name: t.name || "Transition",
    fromPhaseId: t.fromPhaseId || "", toPhaseId: t.toPhaseId || "",
    isCommon: t.isCommon === true || t.fromPhaseId === "*",
    description: t.description || "", buttonColor: t.buttonColor || "#3b82f6",
    requiredFields: t.requiredFields || [], allowedRoles: t.allowedRoles || [],
    allowedUsers: t.allowedUsers || [], conditions: t.conditions || [],
    conditionsLogic: t.conditionsLogic || "AND", requiresApproval: t.requiresApproval || false,
    approvalRoles: t.approvalRoles || [], notifyRoles: t.notifyRoles || [],
    notifyUsers: t.notifyUsers || [], confirmMessage: t.confirmMessage || "",
  }));
}

function buildEdges(transitions: FlowTransition[]): Edge[] {
  return transitions
    .filter(t => !t.isCommon && t.fromPhaseId !== "*" && t.fromPhaseId && t.toPhaseId)
    .map(t => {
      const c = t.buttonColor || "#3b82f6";
      return {
        id: t.id, source: t.fromPhaseId, target: t.toPhaseId, label: t.name,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: c },
        style: { stroke: c, strokeWidth: 2 },
        labelStyle: { fill: c, fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
        data: { transition: t },
      };
    });
}

// ── Custom Phase Node ─────────────────────────────────────────────────────────

function PhaseNode({ data, selected }: { data: any; selected: boolean }) {
  const phase: FlowPhase = data.phase;
  return (
    <div className={cn(
      "rounded-xl border-2 bg-white shadow-sm w-52 select-none transition-all",
      selected ? "border-blue-500 shadow-lg shadow-blue-100/60" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
    )}>
      <Handle type="target" position={Position.Top}
        className="!w-3.5 !h-3.5 !rounded-full !border-2 !border-white" style={{ backgroundColor: "#94a3b8" }} />
      <div className="h-2 rounded-t-[10px] w-full" style={{ backgroundColor: phase.color }} />
      <div className="px-3 py-2.5">
        <p className="text-sm font-bold text-gray-900 leading-tight truncate">{phase.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
          <span className="font-medium text-gray-500">{data.outCount ?? 0}</span> out
          &middot; <span className="font-medium text-gray-500">{data.inCount ?? 0}</span> in
        </p>
      </div>
      <Handle type="source" position={Position.Bottom}
        className="!w-4 !h-4 !rounded-full !border-2 !border-white" style={{ backgroundColor: "#3b82f6" }} />
    </div>
  );
}

const PHASE_NODE_TYPES = { phaseNode: PhaseNode };

// ── FlowDesigner — public wrapper (adds ReactFlowProvider) ────────────────────

function FlowDesigner({
  blueprint, onSave,
}: {
  blueprint: BpDetail;
  onSave: (phases: FlowPhase[], transitions: FlowTransition[]) => Promise<void>;
}) {
  return (
    <ReactFlowProvider>
      <FlowDesignerInner blueprint={blueprint} onSave={onSave} />
    </ReactFlowProvider>
  );
}

// ── FlowDesignerInner — 3-panel editor ───────────────────────────────────────

type RightMode = "none" | "stage" | "edge" | "common-list";

function FlowDesignerInner({
  blueprint, onSave,
}: {
  blueprint: BpDetail;
  onSave: (phases: FlowPhase[], transitions: FlowTransition[]) => Promise<void>;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const allFields: ModuleField[] = blueprint.module?.fields || [];

  // ── All stages from the status field (library source) ─────────────────────
  const libraryStages = useMemo((): FlowPhase[] => {
    const statusField = blueprint.module?.fields.find(f => f.name === blueprint.statusFieldName);
    const opts = statusField?.options || [];
    return opts.map((opt, i) => ({
      id: opt.value, name: opt.label,
      color: (opt as any).color || FLOW_COLORS[i % FLOW_COLORS.length],
      order: i, x: 0, y: 0,
    }));
  }, [blueprint]);

  // ── Canvas phases (previously saved blueprint.phases) ─────────────────────
  const initCanvasPhases = (): FlowPhase[] => {
    const saved = (blueprint.phases || []) as any[];
    if (!saved.length) return [];
    return saved.map((p: any, i: number) => ({
      id:    p.id ?? p.value ?? String(i),
      name:  p.name ?? p.label ?? String(p.id),
      color: p.color ?? FLOW_COLORS[i % FLOW_COLORS.length],
      order: p.order ?? i,
      x: p.x ?? (i % 4) * 260 + 80,
      y: p.y ?? Math.floor(i / 4) * 160 + 80,
    }));
  };

  const [phases, setPhases]             = useState<FlowPhase[]>(initCanvasPhases);
  const [transitions, setTransitions]   = useState<FlowTransition[]>(() => initTransitionsFromBlueprint(blueprint));
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [saving, setSaving]             = useState(false);
  const [dirty,  setDirty]              = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [rightMode,      setRightMode]       = useState<RightMode>("none");

  const mark = () => setDirty(true);

  // ── Sync graph ────────────────────────────────────────────────────────────
  const syncGraph = useCallback((ph: FlowPhase[], tr: FlowTransition[]) => {
    const outMap: Record<string, number> = {};
    const inMap:  Record<string, number> = {};
    tr.filter(t => !t.isCommon).forEach(t => {
      outMap[t.fromPhaseId] = (outMap[t.fromPhaseId] || 0) + 1;
      inMap[t.toPhaseId]    = (inMap[t.toPhaseId]    || 0) + 1;
    });
    setNodes(ph.map(p => ({
      id: p.id, type: "phaseNode",
      position: { x: p.x, y: p.y },
      data: { phase: p, outCount: outMap[p.id] || 0, inCount: inMap[p.id] || 0 },
    })));
    setEdges(buildEdges(tr));
  }, [setNodes, setEdges]);

  useEffect(() => { syncGraph(phases, transitions); }, []); // eslint-disable-line

  // ── Library drag→canvas drop ──────────────────────────────────────────────
  const placedIds = useMemo(() => new Set(phases.map(p => p.id)), [phases]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    const stage: FlowPhase = JSON.parse(raw);
    if (placedIds.has(stage.id)) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newPhase: FlowPhase = { ...stage, x: pos.x, y: pos.y };
    const next = [...phases, newPhase];
    setPhases(next);
    syncGraph(next, transitions);
    setSelectedNodeId(newPhase.id);
    setRightMode("stage");
    mark();
  }, [phases, transitions, placedIds, screenToFlowPosition, syncGraph]); // eslint-disable-line

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ── Stage CRUD ────────────────────────────────────────────────────────────
  const addCustomStage = () => {
    const newP: FlowPhase = {
      id: uid(), name: "New Stage", color: "#6366f1", order: phases.length,
      x: 100 + (phases.length % 4) * 280,
      y: 100 + Math.floor(phases.length / 4) * 180,
    };
    const next = [...phases, newP];
    setPhases(next); syncGraph(next, transitions);
    setSelectedNodeId(newP.id); setRightMode("stage"); mark();
  };

  const updatePhase = (id: string, patch: Partial<FlowPhase>) => {
    const next = phases.map(p => p.id === id ? { ...p, ...patch } : p);
    setPhases(next); syncGraph(next, transitions); mark();
  };

  const deletePhase = (id: string) => {
    if (!confirm("Remove this stage from the canvas? It will return to the Stage Library. Its transitions will be removed.")) return;
    const nextPh = phases.filter(p => p.id !== id);
    const nextTr = transitions.filter(t => t.fromPhaseId !== id && t.toPhaseId !== id);
    setPhases(nextPh); setTransitions(nextTr); syncGraph(nextPh, nextTr);
    setSelectedNodeId(null); setRightMode("none"); mark();
  };

  // ── Transition CRUD ───────────────────────────────────────────────────────
  const updateTransition = (id: string, patch: Partial<FlowTransition>) => {
    const next = transitions.map(t => t.id === id ? { ...t, ...patch } : t);
    setTransitions(next); syncGraph(phases, next); mark();
  };

  const deleteTransition = (id: string) => {
    const next = transitions.filter(t => t.id !== id);
    setTransitions(next); syncGraph(phases, next);
    setSelectedEdgeId(null); setRightMode("none"); mark();
  };

  const createTransition = (src: string, tgt: string, isCommonT = false) => {
    const newT: FlowTransition = {
      id: uid(), name: "Transition",
      fromPhaseId: isCommonT ? "*" : src,
      toPhaseId: tgt,
      isCommon: isCommonT, description: "", buttonColor: "#3b82f6",
      requiredFields: [], allowedRoles: [], allowedUsers: [], conditions: [],
      conditionsLogic: "AND", requiresApproval: false, approvalRoles: [],
      notifyRoles: [], notifyUsers: [], confirmMessage: "",
    };
    const next = [...transitions, newT];
    setTransitions(next); syncGraph(phases, next);
    setSelectedEdgeId(newT.id); setSelectedNodeId(null);
    setRightMode("edge");
    mark();
    return newT;
  };

  // ── React Flow callbacks ──────────────────────────────────────────────────
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    // Check if connection already exists
    const exists = transitions.some(t => t.fromPhaseId === conn.source && t.toPhaseId === conn.target);
    if (exists) return;
    createTransition(conn.source, conn.target);
  }, [transitions]); // eslint-disable-line

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id); setSelectedEdgeId(null); setRightMode("stage");
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id); setSelectedNodeId(null); setRightMode("edge");
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null); setSelectedEdgeId(null); setRightMode("none");
  }, []);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    setPhases(prev => prev.map(p => p.id === node.id ? { ...p, x: node.position.x, y: node.position.y } : p));
    mark();
  }, []); // eslint-disable-line

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(phases, transitions); setDirty(false); }
    finally { setSaving(false); }
  };

  // Derived
  const selPhase = phases.find(p => p.id === selectedNodeId) ?? null;
  const selTrans = transitions.find(t => t.id === selectedEdgeId) ?? null;
  const commonTransitions = transitions.filter(t => t.isCommon);

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── LEFT: Stage Library ── */}
      <div className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Stage Library</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Drag stages onto the canvas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {/* Available stages — only unplaced ones */}
          {(() => {
            const available = libraryStages.filter(s => !placedIds.has(s.id));
            if (available.length === 0 && libraryStages.length > 0) {
              return (
                <p className="text-[11px] text-gray-400 italic text-center py-4 px-2">
                  All stages are on the canvas.<br />Delete a stage to return it here.
                </p>
              );
            }
            return available.map(stage => (
              <div key={stage.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(stage));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 cursor-grab hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm active:scale-95 active:opacity-75 transition-all select-none"
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="flex-1 truncate">{stage.name}</span>
                <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
              </div>
            ));
          })()}

          {/* Custom stage creator */}
          <div className="pt-3">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">Custom Stage</p>
            <button onClick={addCustomStage}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-blue-300 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors">
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Stage</span>
            </button>
          </div>

          {/* Common transitions shortcut */}
          <div className="pt-2">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">Global</p>
            <button
              onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); setPendingConn(null); setRightMode("common-list"); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                rightMode === "common-list"
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-violet-700 border-violet-200 hover:bg-violet-50"
              )}
            >
              <ChevronsRight className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">Common Transitions</span>
              {commonTransitions.length > 0 && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  rightMode === "common-list" ? "bg-white/20 text-white" : "bg-violet-100 text-violet-600")}>
                  {commonTransitions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Library footer — save */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <Button size="sm" className="w-full gap-1.5" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : dirty ? "Save Flow" : "Saved"}
          </Button>
          {dirty && <p className="text-[10px] text-amber-500 text-center mt-1.5">Unsaved changes</p>}
        </div>
      </div>

      {/* ── CENTER: Canvas ── */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          onDrop={handleDrop} onDragOver={handleDragOver}
          nodeTypes={PHASE_NODE_TYPES}
          deleteKeyCode="Delete"
          fitView fitViewOptions={{ padding: 0.4 }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          <Controls
            style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,.08)" }}
            showInteractive={false}
          />

          {/* Empty canvas hint */}
          {phases.length === 0 && (
            <Panel position="top-center">
              <div className="mt-20 bg-white border border-gray-200 rounded-2xl px-8 py-7 shadow-xl text-center max-w-xs">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Workflow className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Canvas is empty</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Drag a stage from the <strong className="text-gray-600">Stage Library</strong> on the left onto here to get started.
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* ── RIGHT: Properties panel ── */}
      <div className="w-96 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">

        {rightMode === "stage" && selPhase && (
          <StagePanel
            stage={selPhase} transitions={transitions} phases={phases} fields={allFields}
            onUpdatePhase={patch => updatePhase(selPhase.id, patch)}
            onDeletePhase={() => deletePhase(selPhase.id)}
            onUpdateTransition={updateTransition}
            onDeleteTransition={deleteTransition}
            onClose={() => { setSelectedNodeId(null); setRightMode("none"); }}
          />
        )}

        {rightMode === "edge" && selTrans && (
          <TransitionPanel
            transition={selTrans} phases={phases} fields={allFields}
            onChange={patch => updateTransition(selTrans.id, patch)}
            onDelete={() => deleteTransition(selTrans.id)}
            onClose={() => { setSelectedEdgeId(null); setRightMode("none"); }}
          />
        )}

        {rightMode === "common-list" && (
          <CommonTransitionsPanel
            commonTransitions={commonTransitions} phases={phases} fields={allFields}
            onAdd={tgtId => createTransition("*", tgtId, true)}
            onUpdate={updateTransition} onDelete={deleteTransition}
            onClose={() => setRightMode("none")}
          />
        )}

        {rightMode === "none" && (
          <div className="flex flex-col items-center justify-center gap-5 p-6 h-full text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Workflow className="w-6 h-6 text-gray-300" />
            </div>
            <div className="space-y-3 w-full">
              <p className="text-xs font-semibold text-gray-500">How to build your flow</p>
              <div className="text-left space-y-2 text-[11px] text-gray-500">
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-300 font-bold text-base leading-none mt-0.5">1</span>
                  <span>Drag a stage from the <strong className="text-gray-700">Stage Library</strong> on the left onto the canvas</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-300 font-bold text-base leading-none mt-0.5">2</span>
                  <span>Drag the <strong className="text-blue-500">blue dot</strong> at the bottom of a stage to another stage to create a transition</span>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-300 font-bold text-base leading-none mt-0.5">3</span>
                  <span>Click any stage or arrow to configure its settings here</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CommonTransitionsPanel ────────────────────────────────────────────────────

function CommonTransitionsPanel({
  commonTransitions, phases, fields, onAdd, onUpdate, onDelete, onClose,
}: {
  commonTransitions: FlowTransition[];
  phases: FlowPhase[];
  fields: ModuleField[];
  onAdd: (tgtId: string) => void;
  onUpdate: (id: string, patch: Partial<FlowTransition>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addTargetId, setAddTargetId] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="h-[3px] bg-gradient-to-r from-violet-500 to-violet-300 rounded-t" />
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Global Transitions</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Reachable from any stage</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2">
          <select value={addTargetId} onChange={e => setAddTargetId(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="">— Select target stage —</option>
            {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button size="sm" disabled={!addTargetId} onClick={() => { onAdd(addTargetId); setAddTargetId(""); }}
            className="gap-1 bg-violet-600 hover:bg-violet-700 text-white border-0">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">Common transitions appear as action buttons on a record regardless of its current stage.</p>
        {commonTransitions.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-4">No common transitions yet.</p>
        )}
        {commonTransitions.map(t => {
          const target = phases.find(p => p.id === t.toPhaseId);
          const isOpen = expandedId === t.id;
          return (
            <div key={t.id} className="rounded-xl border border-violet-200 overflow-hidden">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
                onClick={() => setExpandedId(isOpen ? null : t.id)}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.buttonColor }} />
                <span className="text-sm font-semibold text-violet-900 flex-1 truncate">{t.name}</span>
                {target && <span className="text-[10px] text-violet-500 shrink-0">→ {target.name}</span>}
                <ChevronDown className={cn("w-3.5 h-3.5 text-violet-400 shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="p-3 border-t border-violet-100 space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-semibold">Label</label>
                    <Input value={t.name} className="h-7 text-xs" onChange={e => onUpdate(t.id, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-semibold">Color</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {FLOW_COLORS.map(c => (
                        <button key={c} onClick={() => onUpdate(t.id, { buttonColor: c })}
                          className={cn("w-5 h-5 rounded-full border-2 transition-all", t.buttonColor === c ? "border-gray-700 scale-110" : "border-white shadow-sm")}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs gap-1"
                    onClick={() => { onDelete(t.id); setExpandedId(null); }}>
                    <Trash2 className="w-3 h-3" /> Delete Transition
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Stage info panel ──────────────────────────────────────────────────────────
function StagePanel({
  stage, transitions, phases, fields,
  onUpdatePhase, onDeletePhase, onUpdateTransition, onDeleteTransition, onClose,
}: {
  stage: FlowPhase;
  transitions: FlowTransition[];
  phases: FlowPhase[];
  fields: ModuleField[];
  onUpdatePhase: (patch: Partial<FlowPhase>) => void;
  onDeletePhase: () => void;
  onUpdateTransition: (id: string, patch: Partial<FlowTransition>) => void;
  onDeleteTransition: (id: string) => void;
  onClose: () => void;
}) {
  const outgoing = transitions.filter(t => !t.isCommon && t.fromPhaseId === stage.id);
  const incoming = transitions.filter(t => t.toPhaseId === stage.id);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-[3px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${stage.color}, ${stage.color}55)` }} />
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: stage.color + "20" }}>
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: stage.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{stage.name}</p>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{stage.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Stage Name</label>
          <Input value={stage.name} className="h-9"
            onChange={e => onUpdatePhase({ name: e.target.value })} />
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {FLOW_COLORS.map(c => (
              <button key={c} onClick={() => onUpdatePhase({ color: c })}
                className={cn("w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                  stage.color === c ? "border-gray-700 scale-110" : "border-white shadow-sm")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Transitions summary */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Connections</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-center">
              <p className="text-lg font-bold text-blue-700">{outgoing.length}</p>
              <p className="text-[10px] text-blue-500 font-semibold">Outgoing</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-700">{incoming.length}</p>
              <p className="text-[10px] text-emerald-500 font-semibold">Incoming</p>
            </div>
          </div>
          {outgoing.length > 0 && (
            <div className="space-y-1">
              {outgoing.map(t => {
                const tgt = phases.find(p => p.id === t.toPhaseId);
                return (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-gray-600 px-2 py-1.5 rounded-lg bg-gray-50">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.buttonColor }} />
                    <span className="font-semibold flex-1 truncate">{t.name}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                    {tgt && <span className="text-gray-400 truncate max-w-[90px]">{tgt.name}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 leading-relaxed">
          Drag the <strong>blue handle</strong> at the bottom of this node to another node to add a transition.
        </p>

        <Button variant="ghost" size="sm"
          className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 border border-dashed border-red-200"
          onClick={onDeletePhase}>
          <Trash2 className="w-3.5 h-3.5" /> Remove from canvas
        </Button>
      </div>
    </div>
  );
}

// ── Transition config panel ───────────────────────────────────────────────────
const COLOR_PRESETS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

function SectionHeader({
  icon, label, badge, open, onToggle,
}: {
  icon: React.ReactNode; label: string; badge?: React.ReactNode; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/80 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        {badge}
      </div>
      <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
    </button>
  );
}

function RolePills({
  selected, onChange, color,
}: {
  selected: string[]; onChange: (v: string[]) => void; color: "blue" | "emerald" | "rose";
}) {
  const toggle = (r: string) =>
    selected.includes(r) ? onChange(selected.filter(x => x !== r)) : onChange([...selected, r]);
  const cls = {
    blue:    { on: "bg-blue-600 text-white border-blue-600", off: "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50" },
    emerald: { on: "bg-emerald-600 text-white border-emerald-600", off: "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50" },
    rose:    { on: "bg-rose-500 text-white border-rose-500", off: "bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:bg-rose-50" },
  }[color];
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLE_OPTIONS.map(role => (
        <button key={role} type="button" onClick={() => toggle(role)}
          className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all", selected.includes(role) ? cls.on : cls.off)}>
          {selected.includes(role) && "✓ "}{role}
        </button>
      ))}
    </div>
  );
}

function TransitionPanel({
  transition, phases, fields, onChange, onDelete, onClose,
}: {
  transition: FlowTransition;
  phases: FlowPhase[];
  fields: ModuleField[];
  onChange: (patch: Partial<FlowTransition>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const from = phases.find(p => p.id === transition.fromPhaseId);
  const to   = phases.find(p => p.id === transition.toPhaseId);
  const isCommon = !!transition.isCommon;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const color = transition.buttonColor || "#3b82f6";
  const nonTextFields = fields.filter(f => !["FORMULA", "AUTO_NUMBER", "INLINE_SUBFORM"].includes(f.type));
  const toggleArr = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const hasAdvanced =
    transition.requiredFields.length > 0 ||
    transition.allowedRoles.length > 0 ||
    transition.requiresApproval ||
    transition.notifyRoles.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Color bar */}
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: color }} />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            {isCommon ? "Global Transition" : "Transition"}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            {isCommon
              ? <span className="font-medium text-violet-600">Any stage</span>
              : <span className="font-medium truncate" style={{ color: from?.color }}>{from?.name || "?"}</span>}
            <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
            <span className="font-medium truncate" style={{ color: to?.color }}>{to?.name || "?"}</span>
          </div>
        </div>
        <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Button label */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-gray-500">Button Label</label>
          <Input
            value={transition.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="e.g. Submit, Approve, Reject"
            className="h-9 text-sm"
          />
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-gray-500">Button Color</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_PRESETS.map(c => (
              <button key={c} type="button" onClick={() => onChange({ buttonColor: c })}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                  color === c ? "border-gray-700 scale-110 shadow" : "border-white shadow-sm"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="cursor-pointer" title="Custom color">
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors relative">
                <input type="color" value={color} onChange={e => onChange({ buttonColor: e.target.value })}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                <Plus className="w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </label>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm" style={{ backgroundColor: color }}>
              <ArrowRight className="w-3 h-3" />
              {transition.name || "Button Preview"}
            </span>
          </div>
        </div>

        {/* Confirm message */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-gray-500">Confirmation Message <span className="font-normal text-gray-400">(optional)</span></label>
          <Input
            value={transition.confirmMessage || ""}
            onChange={e => onChange({ confirmMessage: e.target.value })}
            placeholder="Are you sure?"
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-gray-400">Shown as a popup before the transition runs.</p>
        </div>

        {/* ── Advanced toggle ── */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              Advanced Settings
              {hasAdvanced && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvanced && "rotate-180")} />
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-5">

            {/* Required Fields */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" />
                <label className="text-[11px] font-semibold text-gray-600">Required Fields</label>
                {transition.requiredFields.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{transition.requiredFields.length}</span>
                )}
              </div>
              <p className="text-[10px] text-gray-400">Must be filled before this transition runs.</p>
              {nonTextFields.length === 0
                ? <p className="text-[11px] text-gray-400 italic">No fields available</p>
                : <div className="flex flex-wrap gap-1.5">
                    {nonTextFields.map(f => {
                      const on = transition.requiredFields.includes(f.name);
                      return (
                        <button key={f.id} type="button"
                          onClick={() => onChange({ requiredFields: toggleArr(transition.requiredFields, f.name) })}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1.5 rounded-md border text-[11px] font-medium transition-all",
                            on ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-gray-200 text-gray-500 hover:border-amber-200"
                          )}>
                          {on && <Check className="w-3 h-3 text-amber-500 shrink-0" />}
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
              }
            </div>

            {/* Who can trigger */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-blue-500" />
                <label className="text-[11px] font-semibold text-gray-600">Who Can Trigger</label>
                {transition.allowedRoles.length === 0
                  ? <span className="text-[10px] bg-green-50 text-green-600 font-medium px-1.5 py-0.5 rounded-full border border-green-200">All roles</span>
                  : null}
              </div>
              <RolePills selected={transition.allowedRoles} onChange={v => onChange({ allowedRoles: v })} color="blue" />
              {transition.allowedRoles.length > 0 && (
                <button type="button" onClick={() => onChange({ allowedRoles: [] })}
                  className="text-[10px] text-gray-400 hover:text-red-500 underline transition-colors">
                  Clear selection (allow all)
                </button>
              )}
            </div>

            {/* Approval */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <label className="text-[11px] font-semibold text-gray-600">Requires Approval</label>
                </div>
                <Switch checked={transition.requiresApproval} onCheckedChange={v => onChange({ requiresApproval: v })} />
              </div>
              {transition.requiresApproval && (
                <div className="pl-4 space-y-1.5 border-l-2 border-emerald-200">
                  <p className="text-[10px] text-gray-400">Approver roles</p>
                  <RolePills selected={transition.approvalRoles || []} onChange={v => onChange({ approvalRoles: v })} color="emerald" />
                </div>
              )}
            </div>

            {/* Notify */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3 h-3 text-rose-500" />
                <label className="text-[11px] font-semibold text-gray-600">Notify on Execute</label>
              </div>
              <RolePills selected={transition.notifyRoles || []} onChange={v => onChange({ notifyRoles: v })} color="rose" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

  // "flow" | "groups" | "tree"
  const [activeTab, setActiveTab] = useState<"flow" | "groups" | "tree">("flow");

  // Phase groups state
  const [phaseGroups, setPhaseGroups] = useState<{ id: string; name: string; color: string; order: number }[]>([]);
  const [phaseAssignments, setPhaseAssignments] = useState<Record<string, string>>({}); // phaseId → groupId

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
      // Load phase groups from treeData
      if (data.treeData?.phaseGroups) {
        setPhaseGroups(data.treeData.phaseGroups);
        const assignments: Record<string, string> = {};
        ((data.phases || []) as any[]).forEach((p: any) => { if (p.groupId) assignments[p.id] = p.groupId; });
        setPhaseAssignments(assignments);
      }
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

  // Save process flow
  const handleSaveFlow = async (newPhases: FlowPhase[], newTransitions: FlowTransition[]) => {
    const phasesWithGroups = newPhases.map(p => ({ ...p, groupId: phaseAssignments[p.id] || undefined }));
    const prevTreeData = blueprint?.treeData as any;
    await api.patch(`/blueprints/${id}`, {
      name: name.trim() || blueprint!.name,
      phases: phasesWithGroups,
      transitions: newTransitions,
      treeData: { ...(prevTreeData ?? {}), phaseGroups },
    });
    showToast("Process flow saved");
  };

  // Save phase groups
  const handleSaveGroups = async () => {
    if (!blueprint) return;
    setSaving(true);
    try {
      const phases = ((blueprint.phases || []) as any[]).map((p: any) => ({
        ...p, groupId: phaseAssignments[p.id] || undefined,
      }));
      const prevTreeData = blueprint.treeData as any;
      await api.patch(`/blueprints/${id}`, {
        phases,
        treeData: { ...(prevTreeData ?? {}), phaseGroups },
      });
      showToast("Phase groups saved");
    } catch { showToast("Failed to save", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white overflow-hidden">
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
            {blueprint.module?.icon || "📋"} {blueprint.module?.name}
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 mx-4">
          <button
            onClick={() => setActiveTab("flow")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTab === "flow"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Workflow className="w-3.5 h-3.5" /> Process Flow
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTab === "groups"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Layers className="w-3.5 h-3.5" /> Phase Groups
          </button>
          <button
            onClick={() => setActiveTab("tree")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTab === "tree"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Zap className="w-3.5 h-3.5" /> Automation Tree
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "groups" && (
            <Button onClick={handleSaveGroups} disabled={saving} className="gap-2 h-8">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Groups
            </Button>
          )}
          {activeTab === "tree" && (
            <>
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
                Save Tree
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Process Flow tab ── */}
      {activeTab === "flow" && (
        <FlowDesigner blueprint={blueprint} onSave={handleSaveFlow} />
      )}

      {/* ── Phase Groups tab ── */}
      {activeTab === "groups" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Group list */}
          <div className="w-80 shrink-0 border-r border-gray-100 bg-gray-50/40 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Phase Groups</p>
              <button
                onClick={() => setPhaseGroups(prev => [...prev, { id: uid(), name: "New Phase", color: "#3b82f6", order: prev.length }])}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-3 h-3" /> Add Group
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Groups help visually organize stages in the process flow shown on records (e.g. Application → Review → Admission). Groups appear as labelled columns above the stage timeline.
            </p>
            {phaseGroups.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400 italic">No groups yet. Click "Add Group" to create one.</div>
            )}
            {[...phaseGroups].sort((a, b) => a.order - b.order).map((group, gi) => (
              <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                  <Input value={group.name} className="h-7 text-sm flex-1 font-semibold"
                    onChange={e => setPhaseGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))} />
                  <button onClick={() => {
                    setPhaseGroups(prev => prev.filter(g => g.id !== group.id));
                    setPhaseAssignments(prev => {
                      const next = { ...prev };
                      Object.keys(next).forEach(k => { if (next[k] === group.id) delete next[k]; });
                      return next;
                    });
                  }} className="text-gray-300 hover:text-red-500 shrink-0 p-0.5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Color picker */}
                <div className="flex gap-1.5 flex-wrap">
                  {["#3b82f6","#22c55e","#f97316","#8b5cf6","#ef4444","#14b8a6","#eab308","#6b7280"].map(c => (
                    <button key={c} onClick={() => setPhaseGroups(prev => prev.map(g => g.id === group.id ? { ...g, color: c } : g))}
                      className={cn("w-5 h-5 rounded-full border-2 transition-all", group.color === c ? "border-gray-700 scale-110" : "border-white shadow-sm hover:scale-105")}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Stage assignment */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Assign Stages to Groups</p>
              <p className="text-[10px] text-gray-400">Choose which group each stage belongs to. Stages without a group are shown ungrouped.</p>
            </div>
            {((blueprint.phases || []) as any[]).length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 italic">No stages found. Add stages in the Process Flow tab first.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...((blueprint.phases || []) as any[])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((phase: any) => {
                  const assignedGroup = phaseGroups.find(g => g.id === phaseAssignments[phase.id]);
                  return (
                    <div key={phase.id} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: phase.color || "#6366f1" }} />
                        <p className="text-sm font-semibold text-gray-800 truncate flex-1">{phase.name}</p>
                      </div>
                      <select
                        value={phaseAssignments[phase.id] || ""}
                        onChange={e => setPhaseAssignments(prev => {
                          const next = { ...prev };
                          if (e.target.value) next[phase.id] = e.target.value;
                          else delete next[phase.id];
                          return next;
                        })}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">— No group —</option>
                        {[...phaseGroups].sort((a, b) => a.order - b.order).map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {assignedGroup && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                          style={{ backgroundColor: assignedGroup.color + "15", color: assignedGroup.color }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedGroup.color }} />
                          {assignedGroup.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Preview */}
            {phaseGroups.length > 0 && (blueprint.phases as any[])?.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Preview</p>
                <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
                  <div className="flex items-start gap-6 min-w-max">
                    {[...phaseGroups].sort((a, b) => a.order - b.order).map((group, gi) => {
                      const groupStages = ((blueprint.phases || []) as any[])
                        .filter((p: any) => phaseAssignments[p.id] === group.id)
                        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
                      if (!groupStages.length) return null;
                      return (
                        <div key={group.id} className="flex flex-col items-center gap-2 shrink-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: group.color }}>{group.name}</p>
                          <div className="h-[3px] w-full rounded-full" style={{ backgroundColor: group.color + "30" }} />
                          <div className="flex items-start gap-0">
                            {groupStages.map((stage: any, si: number) => (
                              <div key={stage.id} className="flex items-center">
                                <div className="flex flex-col items-center gap-1 w-24">
                                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center bg-white">
                                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                                  </div>
                                  <p className="text-[10px] text-gray-500 text-center leading-tight px-1">{stage.name}</p>
                                </div>
                                {si < groupStages.length - 1 && <div className="w-4 h-[2px] bg-gray-200 -mt-4" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Automation Tree tab ── */}
      {activeTab === "tree" && <>
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
      </>}
    </div>
  );
}
