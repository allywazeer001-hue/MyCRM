"use client";
import { useEffect, useState } from "react";
import {
  Plus, ChevronRight, ChevronDown, Trash2, Edit2, X, Save,
  Loader2, List, TreePine, Layers, LayoutGrid, Settings,
  GripVertical, Tag, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Level Definition Types ─────────────────────────────────────────────────

interface LevelDef {
  level: number;
  label: string;
  key: string;
  displayName: string;
}

// ── Level Definitions Editor ───────────────────────────────────────────────

function LevelDefinitionsEditor({
  listId,
  initialDefs,
  onSaved,
}: {
  listId: string;
  initialDefs: LevelDef[];
  onSaved: (defs: LevelDef[]) => void;
}) {
  const [defs, setDefs] = useState<LevelDef[]>(initialDefs.length > 0 ? initialDefs : []);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const updateDef = (idx: number, k: keyof LevelDef, v: string) => {
    setDefs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [k]: v };
      if (k === "label") {
        next[idx].key = v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        if (!next[idx].displayName) next[idx].displayName = v;
      }
      return next;
    });
  };

  const addLevel = () => {
    setDefs((prev) => [
      ...prev,
      { level: prev.length, label: `Level ${prev.length}`, key: `level_${prev.length}`, displayName: `Level ${prev.length}` },
    ]);
  };

  const removeLevel = (idx: number) => {
    setDefs((prev) => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, level: i })));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/global-lists/${listId}`, { levelDefinitions: defs });
      onSaved(defs);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Tag className="w-3.5 h-3.5" />
        Level Labels
        {defs.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{defs.length}</Badge>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" /> Level Definitions
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Define labels for each level of this hierarchy (e.g., Region → District → Ward).
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {defs.map((def, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Level {def.level}</span>
                  <button onClick={() => removeLevel(idx)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label *</Label>
                    <Input
                      value={def.label}
                      onChange={(e) => updateDef(idx, "label", e.target.value)}
                      placeholder="e.g. Region"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Key (auto)</Label>
                    <Input
                      value={def.key}
                      onChange={(e) => updateDef(idx, "key", e.target.value)}
                      placeholder="e.g. region"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Placeholder in Form</Label>
                  <Input
                    value={def.displayName}
                    onChange={(e) => updateDef(idx, "displayName", e.target.value)}
                    placeholder="e.g. Select Region..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}

            {defs.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400">
                No level definitions. Add them to improve form UX.
              </div>
            )}
          </div>
          <div className="pt-1">
            <Button variant="outline" size="sm" className="gap-2" onClick={addLevel}>
              <Plus className="w-3.5 h-3.5" /> Add Level
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Definitions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────

function flattenTree(items: any[], depth = 0): { item: any; depth: number }[] {
  const result: { item: any; depth: number }[] = [];
  for (const item of items) {
    result.push({ item, depth });
    if (item.children?.length) {
      result.push(...flattenTree(item.children, depth + 1));
    }
  }
  return result;
}

function CardView({
  tree, levelDefs, listId, onRefresh,
}: {
  tree: any[];
  levelDefs: LevelDef[];
  listId: string;
  onRefresh: () => void;
}) {
  const flat = flattenTree(tree);
  const maxDepth = flat.reduce((m, { depth }) => Math.max(m, depth), 0);

  const getLevelLabel = (depth: number) => levelDefs[depth]?.label || `Level ${depth}`;

  const byDepth: Record<number, { item: any; depth: number }[]> = {};
  for (let d = 0; d <= maxDepth; d++) {
    byDepth[d] = flat.filter((x) => x.depth === d);
  }

  return (
    <div className="space-y-6 p-4">
      {Array.from({ length: maxDepth + 1 }, (_, d) => (
        <div key={d}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-6 rounded-full"
              style={{ backgroundColor: `hsl(${(d * 60) % 360}, 70%, 60%)` }}
            />
            <h3 className="text-sm font-semibold text-gray-700">{getLevelLabel(d)}</h3>
            <Badge variant="secondary" className="text-xs">{byDepth[d]?.length ?? 0}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {byDepth[d]?.map(({ item }) => (
              <CardItem key={item.id} item={item} depth={d} listId={listId} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardItem({
  item, depth, listId, onRefresh,
}: {
  item: any;
  depth: number;
  listId: string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);

  const bg = `hsl(${(depth * 60) % 360}, 80%, 96%)`;
  const border = `hsl(${(depth * 60) % 360}, 60%, 85%)`;
  const text = `hsl(${(depth * 60) % 360}, 60%, 35%)`;

  const saveEdit = async () => {
    if (!label.trim()) return;
    await api.patch(`/global-lists/${listId}/items/${item.id}`, {
      label: label.trim(),
      value: label.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    setEditing(false);
    onRefresh();
  };

  const deleteItem = async () => {
    if (!confirm(`Delete "${item.label}"?`)) return;
    await api.delete(`/global-lists/${listId}/items/${item.id}`);
    onRefresh();
  };

  return (
    <div
      className="rounded-lg border p-2.5 group relative"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
            className="h-6 text-xs flex-1"
            autoFocus
          />
          <button onClick={saveEdit} className="text-green-600">
            <Save className="w-3 h-3" />
          </button>
          <button onClick={() => setEditing(false)} className="text-gray-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium truncate pr-8" style={{ color: text }}>{item.label}</p>
          {item.children?.length > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: text, opacity: 0.7 }}>
              {item.children.length} child{item.children.length !== 1 ? "ren" : ""}
            </p>
          )}
          <div className="absolute top-1.5 right-1.5 hidden group-hover:flex gap-0.5">
            <button onClick={() => setEditing(true)} className="p-0.5 hover:text-blue-600 text-gray-500">
              <Edit2 className="w-2.5 h-2.5" />
            </button>
            <button onClick={deleteItem} className="p-0.5 hover:text-red-500 text-gray-500">
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tree Node ──────────────────────────────────────────────────────────────

function TreeNode({
  items, depth, listId, onRefresh,
}: {
  items: any[]; depth: number; listId: string; onRefresh: () => void;
}) {
  return (
    <div className={cn("space-y-1", depth > 0 ? "ml-5 pl-3 border-l border-gray-100" : "")}>
      {items.map((item) => (
        <TreeItem key={item.id} item={item} depth={depth} listId={listId} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

function TreeItem({
  item, depth, listId, onRefresh,
}: {
  item: any; depth: number; listId: string; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [saving, setSaving] = useState(false);

  const hasChildren = item.children && item.children.length > 0;

  const saveEdit = async () => {
    if (!editLabel.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/global-lists/${listId}/items/${item.id}`, {
        label: editLabel.trim(),
        value: editLabel.trim().toLowerCase().replace(/\s+/g, "_"),
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!confirm(`Delete "${item.label}" and all its children?`)) return;
    await api.delete(`/global-lists/${listId}/items/${item.id}`);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center gap-1 group py-0.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0",
            !hasChildren && "invisible"
          )}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="h-6 text-xs flex-1"
              autoFocus
            />
            <button onClick={saveEdit} disabled={saving} className="text-green-600 hover:text-green-700">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-gray-800 flex-1">{item.label}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 hidden group-hover:flex">
              L{depth}
            </Badge>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-blue-600">
                <Edit2 className="w-3 h-3" />
              </button>
              <AddItemButton listId={listId} parentId={item.id} onAdded={onRefresh} small />
              <button onClick={deleteItem} className="p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
      {expanded && hasChildren && (
        <TreeNode items={item.children} depth={depth + 1} listId={listId} onRefresh={onRefresh} />
      )}
    </div>
  );
}

function AddItemButton({
  listId, parentId, onAdded, small,
}: {
  listId: string; parentId: string | null; onAdded: () => void; small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const add = async () => {
    if (!label.trim()) return;
    setSaving(true);
    setErr("");
    try {
      await api.post(`/global-lists/${listId}/items`, {
        label: label.trim(),
        value: label.trim().toLowerCase().replace(/\s+/g, "_"),
        parentId,
      });
      setLabel("");
      setOpen(false);
      onAdded();
    } catch {
      setErr("Failed to add item. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors",
          small ? "p-1" : "px-3 py-1.5 text-xs border border-blue-200 rounded-md hover:bg-blue-50"
        )}
      >
        <Plus className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {!small && "Add Item"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1 ml-1">
      <div className="flex items-center gap-1">
        <Input
          value={label}
          onChange={(e) => { setLabel(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") { setOpen(false); setLabel(""); setErr(""); } }}
          placeholder="Item label"
          className="h-6 text-xs w-32"
          autoFocus
        />
        <button onClick={add} disabled={saving} className="text-green-600 hover:text-green-700">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => { setOpen(false); setLabel(""); setErr(""); }} className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {err && <p className="text-[10px] text-red-500">{err}</p>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function GlobalListsPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [activeList, setActiveList] = useState<any | null>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [treeError, setTreeError] = useState("");
  const [loadingTree, setLoadingTree] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "cards">("tree");
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const loadLists = () => {
    setLoadError("");
    setLoading(true);
    api.get("/global-lists")
      .then((r) => setLists(r.data || []))
      .catch(() => setLoadError("Failed to load Global Lists. Please retry."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLists(); }, []);

  const selectList = async (list: any) => {
    setActiveList(list);
    setTreeError("");
    setLoadingTree(true);
    try {
      const r = await api.get(`/global-lists/${list.id}/tree`);
      setTree(r.data || []);
    } catch {
      setTreeError("Failed to load list items. Please retry.");
      setTree([]);
    } finally {
      setLoadingTree(false);
    }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      const { data } = await api.post("/global-lists", { name: newListName.trim(), description: newListDesc.trim() });
      setLists((prev) => [...prev, data]);
      setShowCreateList(false);
      setNewListName("");
      setNewListDesc("");
      selectList(data);
      showToast(`"${data.name}" created`);
    } catch {
      showToast("Failed to create dataset. Please try again.", "error");
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm("Delete this list and all its items?")) return;
    try {
      await api.delete(`/global-lists/${id}`);
      setLists((prev) => prev.filter((l) => l.id !== id));
      if (activeList?.id === id) { setActiveList(null); setTree([]); }
      showToast("Dataset deleted");
    } catch {
      showToast("Failed to delete dataset.", "error");
    }
  };

  const refreshTree = async () => {
    if (!activeList) return;
    setTreeError("");
    try {
      const r = await api.get(`/global-lists/${activeList.id}/tree`);
      setTree(r.data || []);
    } catch {
      setTreeError("Failed to refresh. Please retry.");
    }
  };

  const updateActiveListDefs = (defs: LevelDef[]) => {
    if (!activeList) return;
    const updated = { ...activeList, levelDefinitions: defs };
    setActiveList(updated);
    setLists((prev) => prev.map((l) => l.id === activeList.id ? updated : l));
  };

  const levelDefs: LevelDef[] = activeList?.levelDefinitions || [];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-4xl">⚠️</div>
        <p className="text-gray-600 font-medium">{loadError}</p>
        <Button onClick={loadLists} variant="outline" className="gap-2">
          <Loader2 className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={cn(
          "fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2",
          toastType === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Lists</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reusable hierarchical datasets — locations, departments, categories, and more
          </p>
        </div>
        <Button onClick={() => setShowCreateList(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Dataset
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* List Panel */}
        <div className="w-64 bg-white rounded-xl border flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b">
            <p className="text-xs font-semibold text-gray-500 uppercase">Datasets ({lists.length})</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {lists.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No datasets yet</p>
              ) : (
                lists.map((l) => (
                  <div
                    key={l.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectList(l)}
                    onKeyDown={(e) => e.key === "Enter" && selectList(l)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer",
                      activeList?.id === l.id
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{l.name}</p>
                      <p className="text-xs text-gray-400">{l._count?.items ?? 0} items</p>
                      {(l.levelDefinitions?.length || 0) > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {l.levelDefinitions.slice(0, 3).map((d: LevelDef) => (
                            <span key={d.level} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1">{d.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteList(l.id); }}
                      className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Panel */}
        <div className="flex-1 bg-white rounded-xl border flex flex-col">
          {activeList ? (
            <>
              <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">{activeList.name}</h2>
                  {activeList.description && (
                    <p className="text-xs text-gray-400">{activeList.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Level Definitions Editor */}
                  <LevelDefinitionsEditor
                    listId={activeList.id}
                    initialDefs={levelDefs}
                    onSaved={updateActiveListDefs}
                  />

                  {/* View toggle */}
                  <div className="flex rounded-md border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setViewMode("tree")}
                      className={cn(
                        "px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors",
                        viewMode === "tree" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <List className="w-3.5 h-3.5" />
                      Tree
                    </button>
                    <button
                      onClick={() => setViewMode("cards")}
                      className={cn(
                        "px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors border-l border-gray-200",
                        viewMode === "cards" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Cards
                    </button>
                  </div>

                  {viewMode === "tree" && (
                    <AddItemButton listId={activeList.id} parentId={null} onAdded={refreshTree} />
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loadingTree ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : treeError ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <p className="text-sm text-red-500">{treeError}</p>
                    <Button variant="outline" size="sm" onClick={() => selectList(activeList)} className="gap-2">
                      <Loader2 className="w-3.5 h-3.5" /> Retry
                    </Button>
                  </div>
                ) : tree.length === 0 ? (
                  <div className="text-center py-12">
                    <TreePine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">No items yet. Add the first item above.</p>
                  </div>
                ) : viewMode === "cards" ? (
                  <CardView tree={tree} levelDefs={levelDefs} listId={activeList.id} onRefresh={refreshTree} />
                ) : (
                  <div className="p-4">
                    <TreeNode items={tree} depth={0} listId={activeList.id} onRefresh={refreshTree} />
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Layers className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-500">Select a dataset</p>
              <p className="text-xs text-gray-400 mt-1">Choose a dataset from the left to manage its hierarchy</p>
            </div>
          )}
        </div>
      </div>

      {/* Create List Dialog */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Dataset</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Dataset Name *</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Tanzania Locations"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && createList()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>Cancel</Button>
            <Button onClick={createList} disabled={!newListName.trim()}>Create Dataset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
