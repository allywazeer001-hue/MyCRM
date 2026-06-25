"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus, ChevronRight, ChevronDown, Trash2, Edit2, X, Save,
  Loader2, List, TreePine, Layers, LayoutGrid, Settings,
  GripVertical, Tag, ChevronUp, Upload, Search, Copy,
  EyeOff, Eye, ChevronsUpDown, FolderOpen, Folder,
  Globe, Link2, Unlink, Lock, ExternalLink, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Combobox } from "@/components/ui/combobox";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// ── Types ──────────────────────────────────────────────────────────────────

interface LevelDef {
  level: number;
  label: string;
  key: string;
  displayName: string;
}

interface TreeItemType {
  id: string;
  label: string;
  value: string;
  isActive: boolean;
  parentId: string | null;
  childList?: { id: string; name: string } | null;
  children?: TreeItemType[];
}

// ── Level Definitions Editor ───────────────────────────────────────────────

function LevelDefinitionsEditor({
  listId, initialDefs, onSaved, open, onOpenChange,
}: { listId: string; initialDefs: LevelDef[]; onSaved: (defs: LevelDef[]) => void; open: boolean; onOpenChange: (v: boolean) => void; }) {
  const [defs, setDefs] = useState<LevelDef[]>(initialDefs.length > 0 ? initialDefs : []);
  const [saving, setSaving] = useState(false);

  const updateDef = (idx: number, k: keyof LevelDef, v: string) => {
    setDefs(prev => {
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
    setDefs(prev => [...prev, { level: prev.length, label: "Level " + prev.length, key: "level_" + prev.length, displayName: "Level " + prev.length }]);
  };

  const removeLevel = (idx: number) => {
    setDefs(prev => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, level: i })));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/global-lists/" + listId, { levelDefinitions: defs });
      onSaved(defs);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Level Definitions</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">Define labels for each level (e.g. Region → District → Ward).</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto py-2">
            {defs.map((def, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Level {def.level}</span>
                  <button onClick={() => removeLevel(idx)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label *</Label>
                    <Input value={def.label} onChange={e => updateDef(idx, "label", e.target.value)} placeholder="e.g. Region" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Key (auto)</Label>
                    <Input value={def.key} onChange={e => updateDef(idx, "key", e.target.value)} placeholder="e.g. region" className="h-8 text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Placeholder in Form</Label>
                  <Input value={def.displayName} onChange={e => updateDef(idx, "displayName", e.target.value)} placeholder="e.g. Select Region..." className="h-8 text-xs" />
                </div>
              </div>
            ))}
            {defs.length === 0 && <div className="text-center py-6 text-sm text-gray-400">No level definitions. Add them to improve form UX.</div>}
          </div>
          <div className="pt-1"><Button variant="outline" size="sm" className="gap-2" onClick={addLevel}><Plus className="w-3.5 h-3.5" /> Add Level</Button></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save Definitions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

// ── Linked (cross-list) items view ────────────────────────────────────────

function LinkedItemRow({ item, listId, onRefresh }: { item: any; listId: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/global-lists/${listId}/items/${item.id}`, { label: label.trim() });
      setEditing(false);
      onRefresh();
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete "${item.label}"?`)) return;
    setDeleting(true);
    try { await api.delete(`/global-lists/${listId}/items/${item.id}`); onRefresh(); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group border-b border-gray-50">
      {editing ? (
        <>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="h-7 flex-1 text-sm"
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setEditing(false); setLabel(item.label); }
            }}
          />
          <button onClick={save} disabled={saving} className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setEditing(false); setLabel(item.label); }} className="p-1.5 rounded text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-800">{item.label}</span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={del} disabled={deleting} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function LinkedItemsList({ items, loading, listId, linkedParentItemId, onRefresh }: {
  items: any[]; loading: boolean; listId: string; linkedParentItemId: string; onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <Layers className="w-8 h-8" />
            <p className="text-sm">No items linked to this parent yet</p>
            <p className="text-xs">Use the button below to add the first one</p>
          </div>
        ) : (
          items.map(item => (
            <LinkedItemRow key={item.id} item={item} listId={listId} onRefresh={onRefresh} />
          ))
        )}
      </div>
      <AddItemButton
        listId={listId}
        parentId={null}
        onAdded={onRefresh}
        linkedParentItemId={linkedParentItemId}
        small
      />
    </div>
  );
}

// ── Tree utilities ─────────────────────────────────────────────────────────

function flattenTree(items: TreeItemType[], depth = 0): { item: TreeItemType; depth: number }[] {
  const result: { item: TreeItemType; depth: number }[] = [];
  for (const item of items) {
    result.push({ item, depth });
    if (item.children?.length) result.push(...flattenTree(item.children, depth + 1));
  }
  return result;
}

function collectAllIds(items: TreeItemType[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.id);
    if (item.children?.length) ids.push(...collectAllIds(item.children));
  }
  return ids;
}

function searchTree(items: TreeItemType[], query: string): { matchIds: Set<string>; expandIds: Set<string> } {
  const matchIds = new Set<string>();
  const expandIds = new Set<string>();
  const q = query.toLowerCase();

  function walk(nodes: TreeItemType[], parentPath: string[]): boolean {
    let anyMatch = false;
    for (const node of nodes) {
      const isMatch = node.label.toLowerCase().includes(q);
      const childMatch = node.children?.length ? walk(node.children, [...parentPath, node.id]) : false;
      if (isMatch) {
        matchIds.add(node.id);
        parentPath.forEach(pid => expandIds.add(pid));
        anyMatch = true;
      }
      if (childMatch) {
        expandIds.add(node.id);
        anyMatch = true;
      }
    }
    return anyMatch;
  }

  walk(items, []);
  return { matchIds, expandIds };
}

// ── AddItemButton (unchanged) ──────────────────────────────────────────────

function AddItemButton({ listId, parentId, onAdded, small, linkedParentItemId }: {
  listId: string; parentId: string | null; onAdded: () => void; small?: boolean; linkedParentItemId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const add = async () => {
    if (!label.trim()) return;
    setSaving(true); setErr("");
    try {
      await api.post("/global-lists/" + listId + "/items", {
        label: label.trim(),
        value: label.trim().toLowerCase().replace(/\s+/g, "_"),
        parentId,
        ...(linkedParentItemId ? { linkedParentItemId } : {}),
      });
      setLabel(""); setOpen(false); onAdded();
    } catch { setErr("Failed to add item. Try again."); } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={cn(
        "flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors font-medium",
        small
          ? "px-3 py-2 text-sm w-full border-t border-gray-100 hover:bg-blue-50/60 justify-center"
          : "px-3 py-1.5 text-xs border border-blue-200 rounded-md hover:bg-blue-50"
      )}>
        <Plus className={small ? "w-4 h-4" : "w-3.5 h-3.5"} />Add Item
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", small ? "p-3 border-t border-gray-100" : "ml-1")}>
      <div className="flex items-center gap-1.5">
        <Input value={label} onChange={e => { setLabel(e.target.value); setErr(""); }}
          onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") { setOpen(false); setLabel(""); setErr(""); } }}
          placeholder="Item label…" className="h-7 text-xs flex-1" autoFocus />
        <button onClick={add} disabled={saving || !label.trim()} className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors shrink-0">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
        </button>
        <button onClick={() => { setOpen(false); setLabel(""); setErr(""); }} className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0"><X className="w-3.5 h-3.5" /></button>
      </div>
      {err && <p className="text-[10px] text-red-500">{err}</p>}
    </div>
  );
}

// ── Professional TreeItem ──────────────────────────────────────────────────

function TreeItem({
  item, depth, listId, lists, onRefresh, onNavigateToList,
  expandedIds, toggleExpand, isLast, searchQuery, matchIds, expandSearchIds, showAll,
}: {
  item: TreeItemType;
  depth: number;
  listId: string;
  lists: any[];
  onRefresh: () => void;
  onNavigateToList: (listId: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  isLast: boolean;
  searchQuery: string;
  matchIds: Set<string>;
  expandSearchIds: Set<string>;
  showAll: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [saving, setSaving] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [addChildMode, setAddChildMode] = useState<"item" | "list">("item");
  const [newChildLabel, setNewChildLabel] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const [linkListId, setLinkListId] = useState("");
  const [addingSibling, setAddingSibling] = useState(false);
  const [newSiblingLabel, setNewSiblingLabel] = useState("");
  const [siblingSaving, setSiblingSaving] = useState(false);

  const hasChildren = !!(item.children?.length);
  const hasChildList = !!item.childList;
  const canExpand = hasChildren || hasChildList;
  const isExpanded = expandedIds.has(item.id);
  const isHighlighted = searchQuery && matchIds.has(item.id);
  const isHidden = searchQuery && !matchIds.has(item.id) && !expandSearchIds.has(item.id) && !showAll;

  const saveEdit = async () => {
    if (!editLabel.trim()) return;
    setSaving(true);
    try {
      await api.patch("/global-lists/" + listId + "/items/" + item.id, {
        label: editLabel.trim(),
        value: editLabel.trim().toLowerCase().replace(/\s+/g, "_"),
      });
      setEditing(false); onRefresh();
    } finally { setSaving(false); }
  };

  const deleteItem = async () => {
    if (!confirm("Delete \"" + item.label + "\" and all its children?")) return;
    await api.delete("/global-lists/" + listId + "/items/" + item.id);
    onRefresh();
  };

  const duplicateItem = async () => {
    await api.post("/global-lists/" + listId + "/items", {
      label: item.label + " (copy)",
      value: (item.value || item.label.toLowerCase().replace(/\s+/g, "_")) + "_copy",
      parentId: item.parentId || null,
    });
    onRefresh();
  };

  const toggleVisible = async () => {
    await api.patch("/global-lists/" + listId + "/items/" + item.id, { isActive: !item.isActive });
    onRefresh();
  };

  const addChild = async () => {
    if (!newChildLabel.trim()) return;
    setAddingSaving(true);
    try {
      await api.post("/global-lists/" + listId + "/items", {
        label: newChildLabel.trim(),
        value: newChildLabel.trim().toLowerCase().replace(/\s+/g, "_"),
        parentId: item.id,
      });
      setNewChildLabel(""); setAddingChild(false);
      if (!isExpanded) toggleExpand(item.id);
      onRefresh();
    } finally { setAddingSaving(false); }
  };

  const linkChildList = async () => {
    if (!linkListId) return;
    setAddingSaving(true);
    try {
      await api.patch(`/global-lists/${listId}/items/${item.id}/link-child-list`, { childListId: linkListId });
      setLinkListId(""); setAddingChild(false);
      onRefresh();
    } finally { setAddingSaving(false); }
  };

  const unlinkChildList = async () => {
    await api.patch(`/global-lists/${listId}/items/${item.id}/link-child-list`, { childListId: null });
    onRefresh();
  };

  const addSibling = async () => {
    if (!newSiblingLabel.trim()) return;
    setSiblingSaving(true);
    try {
      await api.post("/global-lists/" + listId + "/items", {
        label: newSiblingLabel.trim(),
        value: newSiblingLabel.trim().toLowerCase().replace(/\s+/g, "_"),
        parentId: item.parentId || null,
      });
      setNewSiblingLabel(""); setAddingSibling(false);
      onRefresh();
    } finally { setSiblingSaving(false); }
  };

  if (isHidden) return null;

  const INDENT = 20;
  // Available lists for child linking (exclude current list and already-linked ones)
  const linkableListOptions = lists
    .filter(l => l.id !== listId)
    .map((l: any) => ({ value: l.id, label: l.name }));

  return (
    <div className="select-none">
      {/* Row */}
      <div
        className={cn(
          "relative flex items-center group py-1 rounded-md transition-colors",
          isHighlighted ? "bg-amber-50 border border-amber-200" : "hover:bg-gray-50/80"
        )}
        style={{ paddingLeft: depth * INDENT + 4 }}
      >
        {/* Tree connector lines */}
        {depth > 0 && Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            className="absolute border-l border-dashed border-gray-200"
            style={{ left: i * INDENT + 12, top: 0, bottom: isLast && i === depth - 1 ? "50%" : 0, width: 1 }}
          />
        ))}
        {depth > 0 && (
          <div
            className="absolute border-t border-dashed border-gray-200"
            style={{ left: (depth - 1) * INDENT + 12, top: "50%", width: 8 }}
          />
        )}

        {/* Expand toggle */}
        <button
          onClick={() => {
            if (hasChildList && !hasChildren) { onNavigateToList(item.childList!.id); }
            else if (canExpand) { toggleExpand(item.id); }
          }}
          className={cn(
            "w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors relative z-10",
            canExpand ? "text-gray-400 hover:text-gray-700 hover:bg-gray-100" : "invisible"
          )}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Folder icon */}
        <span className="w-4 h-4 shrink-0 flex items-center justify-center relative z-10 mr-1">
          {hasChildList
            ? <Layers className="w-3.5 h-3.5 text-purple-400" />
            : hasChildren
              ? (isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> : <Folder className="w-3.5 h-3.5 text-amber-400" />)
              : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
        </span>

        {/* Label + inline actions (all grouped together, not at far end) */}
        {editing ? (
          <div className="flex items-center gap-1 flex-1 relative z-10">
            <Input value={editLabel} onChange={e => setEditLabel(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="h-6 text-xs flex-1" autoFocus />
            <button onClick={saveEdit} disabled={saving} className="text-green-600 hover:text-green-700 p-0.5 shrink-0">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 p-0.5 shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 relative z-10">
            {/* Label */}
            <span
              onDoubleClick={() => { setEditing(true); setEditLabel(item.label); }}
              title="Double-click to edit"
              className={cn(
                "text-sm truncate cursor-text",
                !item.isActive ? "line-through text-gray-400" : isHighlighted ? "text-amber-800 font-medium" : "text-gray-800"
              )}
            >{item.label}</span>

            {/* Child list badge — shows linked list name, click to navigate */}
            {hasChildList && (
              <button
                onClick={() => onNavigateToList(item.childList!.id)}
                title={`Open "${item.childList!.name}" list`}
                className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 rounded-full px-1.5 py-px transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {item.childList!.name}
              </button>
            )}

            {/* Counts */}
            {hasChildren && (
              <span className="shrink-0 text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-px">
                {item.children!.length}
              </span>
            )}
            {!item.isActive && <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 text-gray-400">hidden</Badge>}

            {/* Action buttons — appear on hover, right after label */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 shrink-0">
              {/* +child item */}
              <button
                onClick={() => { setAddingChild(true); setAddChildMode("item"); setAddingSibling(false); if (!isExpanded && hasChildren) toggleExpand(item.id); }}
                title="Add child item"
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 bg-green-100 hover:bg-green-200 border border-green-200 rounded-full transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />child
              </button>
              {/* Link child list */}
              {!hasChildList && (
                <button
                  onClick={() => { setAddingChild(true); setAddChildMode("list"); setAddingSibling(false); }}
                  title="Link a list as child content"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 rounded-full transition-colors"
                >
                  <Link2 className="w-2.5 h-2.5" />list
                </button>
              )}
              {/* Unlink child list */}
              {hasChildList && (
                <button
                  onClick={unlinkChildList}
                  title="Remove linked child list"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full transition-colors"
                >
                  <Unlink className="w-2.5 h-2.5" />unlink
                </button>
              )}
              {/* +sibling */}
              <button
                onClick={() => { setAddingSibling(true); setAddingChild(false); }}
                title="Add item at same level"
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 rounded-full transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />level
              </button>
              {/* Separator */}
              <span className="w-px h-3 bg-gray-200 mx-0.5" />
              {/* Edit */}
              <button onClick={() => setEditing(true)} title="Edit" className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-3 h-3" /></button>
              {/* Duplicate */}
              <button onClick={duplicateItem} title="Duplicate" className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"><Copy className="w-3 h-3" /></button>
              {/* Hide/Show */}
              <button onClick={toggleVisible} title={item.isActive ? "Hide" : "Show"} className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors">
                {item.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              {/* Delete */}
              <button onClick={deleteItem} title="Delete" className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add child panel */}
      {addingChild && (
        <div className="mx-2 mb-1 rounded-lg border border-gray-200 bg-gray-50/80 p-2.5 space-y-2" style={{ marginLeft: (depth + 1) * INDENT + 24 }}>
          {/* Mode tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setAddChildMode("item")}
              className={cn("px-2.5 py-1 text-xs font-medium rounded-md transition-colors", addChildMode === "item" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}
            >
              <Plus className="w-3 h-3 inline-block mr-1" />New item
            </button>
            <button
              onClick={() => setAddChildMode("list")}
              className={cn("px-2.5 py-1 text-xs font-medium rounded-md transition-colors", addChildMode === "list" ? "bg-purple-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}
            >
              <Link2 className="w-3 h-3 inline-block mr-1" />Link existing list
            </button>
          </div>

          {addChildMode === "item" ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={newChildLabel}
                onChange={e => setNewChildLabel(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addChild(); if (e.key === "Escape") { setAddingChild(false); setNewChildLabel(""); } }}
                placeholder={`Child of "${item.label}"…`}
                className="h-7 text-xs flex-1" autoFocus
              />
              <button onClick={addChild} disabled={addingSaving || !newChildLabel.trim()} className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded shrink-0">
                {addingSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
              </button>
              <button onClick={() => { setAddingChild(false); setNewChildLabel(""); }} className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <Combobox
                  options={linkableListOptions}
                  value={linkListId}
                  onChange={setLinkListId}
                  placeholder="Select a list to link…"
                  searchPlaceholder="Search lists…"
                />
              </div>
              <button onClick={linkChildList} disabled={addingSaving || !linkListId} className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded shrink-0">
                {addingSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}Link
              </button>
              <button onClick={() => { setAddingChild(false); setLinkListId(""); }} className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      )}

      {/* Inline add sibling form (same level) */}
      {addingSibling && (
        <div className="flex items-center gap-1.5 py-1" style={{ paddingLeft: depth * INDENT + 28 }}>
          <Input value={newSiblingLabel} onChange={e => setNewSiblingLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addSibling(); if (e.key === "Escape") { setAddingSibling(false); setNewSiblingLabel(""); } }} placeholder={"New item at same level…"} className="h-7 text-xs w-48" autoFocus />
          <button onClick={addSibling} disabled={siblingSaving || !newSiblingLabel.trim()} className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded">
            {siblingSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
          </button>
          <button onClick={() => { setAddingSibling(false); setNewSiblingLabel(""); }} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Empty children placeholder */}
      {isExpanded && !hasChildren && !hasChildList && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-1 italic" style={{ paddingLeft: (depth + 1) * INDENT + 28 }}>
          No child items —
          <button onClick={() => { setAddingChild(true); setAddChildMode("item"); }} className="text-blue-500 hover:text-blue-700 not-italic font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" />Add child
          </button>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {item.children!.map((child, idx) => (
            <TreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              listId={listId}
              lists={lists}
              onRefresh={onRefresh}
              onNavigateToList={onNavigateToList}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              isLast={idx === item.children!.length - 1}
              searchQuery={searchQuery}
              matchIds={matchIds}
              expandSearchIds={expandSearchIds}
              showAll={showAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Professional Tree View ─────────────────────────────────────────────────

function TreeView({ tree, listId, lists, onRefresh, onNavigateToList, persistKey }: {
  tree: TreeItemType[]; listId: string; lists: any[];
  onRefresh: () => void; onNavigateToList: (listId: string) => void; persistKey: string;
}) {
  const STORAGE_KEY = "gl-expanded-" + persistKey;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    // Default: expand first 2 levels
    const ids = new Set<string>();
    function walkDefault(nodes: TreeItemType[], depth: number) {
      if (depth >= 2) return;
      for (const n of nodes) { ids.add(n.id); if (n.children) walkDefault(n.children, depth + 1); }
    }
    walkDefault(tree, 0);
    return ids;
  });

  const [searchQuery, setSearchQuery] = useState("");

  const { matchIds, expandIds: expandSearchIds } = useMemo(() => {
    if (!searchQuery.trim()) return { matchIds: new Set<string>(), expandIds: new Set<string>() };
    return searchTree(tree, searchQuery.trim());
  }, [tree, searchQuery]);

  // Persist expanded state
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds])); } catch {}
  }, [expandedIds, STORAGE_KEY]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => setExpandedIds(new Set(collectAllIds(tree)));
  const collapseAll = () => setExpandedIds(new Set());

  // When search is active, auto-expand matching nodes
  useEffect(() => {
    if (expandSearchIds.size > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        expandSearchIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [expandSearchIds]);

  const totalNodes = useMemo(() => flattenTree(tree).length, [tree]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50/50">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={"Search " + totalNodes + " items…"}
            className="h-7 pl-8 pr-7 text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {/* Expand/Collapse All */}
        <button onClick={expandAll} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap">
          <ChevronDown className="w-3 h-3" />Expand All
        </button>
        <button onClick={collapseAll} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors whitespace-nowrap">
          <ChevronRight className="w-3 h-3" />Collapse All
        </button>
      </div>

      {/* Search result count */}
      {searchQuery && (
        <div className="px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
          <Search className="w-3 h-3" />
          {matchIds.size > 0 ? matchIds.size + " result" + (matchIds.size !== 1 ? "s" : "") + " for \"" + searchQuery + "\"" : "No results for \"" + searchQuery + "\""}
        </div>
      )}

      {/* Tree content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {tree.length === 0 ? (
            <div className="text-center py-12">
              <TreePine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No items yet. Add the first item above.</p>
            </div>
          ) : (
            tree.map((item, idx) => (
              <TreeItem
                key={item.id}
                item={item}
                depth={0}
                listId={listId}
                lists={lists}
                onRefresh={onRefresh}
                onNavigateToList={onNavigateToList}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                isLast={idx === tree.length - 1}
                searchQuery={searchQuery}
                matchIds={matchIds}
                expandSearchIds={expandSearchIds}
                showAll={!searchQuery}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Card View — Miller Columns (Finder-style) ─────────────────────────────

const LEVEL_COLORS = [
  { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-800",   sel: "bg-blue-600 text-white border-blue-600",   header: "bg-blue-600"   },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", sel: "bg-violet-600 text-white border-violet-600", header: "bg-violet-600" },
  { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-800",sel: "bg-emerald-600 text-white border-emerald-600",header: "bg-emerald-600"},
  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-800",  sel: "bg-amber-600 text-white border-amber-600",  header: "bg-amber-600"  },
  { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-800",   sel: "bg-rose-600 text-white border-rose-600",    header: "bg-rose-600"   },
];

function getLevelColor(depth: number) {
  return LEVEL_COLORS[depth % LEVEL_COLORS.length];
}

function CardView({ tree, levelDefs, listId, onRefresh, onLevelDefsChange }: {
  tree: any[]; levelDefs: LevelDef[]; listId: string;
  onRefresh: () => void; onLevelDefsChange?: (defs: LevelDef[]) => void;
}) {
  const [selectedPath, setSelectedPath] = useState<(string | null)[]>([null]);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [editingLevelText, setEditingLevelText] = useState("");

  // Local copy of level defs so edits reflect immediately
  const [localDefs, setLocalDefs] = useState<LevelDef[]>(levelDefs);
  useEffect(() => { setLocalDefs(levelDefs); }, [levelDefs]);

  const getLevelLabel = (depth: number) => localDefs[depth]?.label || "Level " + depth;

  const startEditLevel = (depth: number) => {
    setEditingLevel(depth);
    setEditingLevelText(getLevelLabel(depth));
  };

  const saveLevelLabel = async () => {
    if (editingLevel === null) return;
    const text = editingLevelText.trim() || ("Level " + editingLevel);
    const updated = [...localDefs];
    if (updated[editingLevel]) {
      updated[editingLevel] = { ...updated[editingLevel], label: text, displayName: text };
    } else {
      // Create new entry for this level
      for (let i = updated.length; i <= editingLevel; i++) {
        updated[i] = { level: i, label: "Level " + i, key: "level_" + i, displayName: "Level " + i };
      }
      updated[editingLevel] = { level: editingLevel, label: text, key: text.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""), displayName: text };
    }
    setLocalDefs(updated);
    setEditingLevel(null);
    try {
      await api.patch("/global-lists/" + listId, { levelDefinitions: updated });
      onLevelDefsChange?.(updated);
    } catch { /* silent */ }
  };

  // Build columns: column 0 = root items, column N = children of selectedPath[N-1]
  function getColumnItems(colIdx: number): any[] {
    if (colIdx === 0) return tree;
    const parentId = selectedPath[colIdx - 1];
    if (!parentId) return [];
    function findById(nodes: any[]): any | null {
      for (const n of nodes) {
        if (n.id === parentId) return n;
        if (n.children?.length) { const found = findById(n.children); if (found) return found; }
      }
      return null;
    }
    const parent = findById(tree);
    return parent?.children ?? [];
  }

  const handleSelect = (colIdx: number, itemId: string, hasChildren: boolean) => {
    const newPath = [...selectedPath.slice(0, colIdx + 1)];
    newPath[colIdx] = itemId;
    // Add a next column slot if item has children
    if (hasChildren) newPath[colIdx + 1] = null;
    setSelectedPath(newPath);
  };

  // Determine how many columns to show
  const numColumns = selectedPath.length + (
    selectedPath[selectedPath.length - 1] !== null &&
    (() => { const items = getColumnItems(selectedPath.length); return items.length > 0; })()
      ? 0 : 0
  );

  // Always show at least 1 column, add extra if selected item has children
  const columns: number[] = [];
  for (let i = 0; i <= selectedPath.length; i++) {
    const items = getColumnItems(i);
    if (items.length > 0 || i === 0) columns.push(i);
    else break;
  }

  // Breadcrumb
  const breadcrumb: string[] = [];
  for (let i = 0; i < selectedPath.length; i++) {
    const selId = selectedPath[i];
    if (!selId) break;
    const items = getColumnItems(i);
    const item = items.find((x: any) => x.id === selId);
    if (item) breadcrumb.push(item.label);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b bg-gray-50 text-xs text-gray-500 min-h-[36px]">
        <span className="font-medium text-gray-700">All</span>
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <button
              onClick={() => setSelectedPath(selectedPath.slice(0, i + 1))}
              className={cn("font-medium hover:underline", i === breadcrumb.length - 1 ? "text-blue-700" : "text-gray-700")}
            >{crumb}</button>
          </span>
        ))}
        {breadcrumb.length > 0 && (
          <button onClick={() => setSelectedPath([null])} className="ml-auto text-gray-400 hover:text-gray-600 text-[10px]">
            Clear
          </button>
        )}
      </div>

      {/* Miller Columns */}
      <div className="flex-1 flex overflow-x-auto">
        {columns.map((colIdx) => {
          const items = getColumnItems(colIdx);
          const colors = getLevelColor(colIdx);
          const levelLabel = getLevelLabel(colIdx);
          const selectedId = selectedPath[colIdx] ?? null;

          return (
            <div key={colIdx} className="flex-shrink-0 w-52 border-r border-gray-200 flex flex-col">
              {/* Column header — click to rename */}
              <div className={cn("px-3 py-2 flex items-center justify-between gap-2", colors.header)}>
                {editingLevel === colIdx ? (
                  <input
                    value={editingLevelText}
                    onChange={e => setEditingLevelText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveLevelLabel(); if (e.key === "Escape") setEditingLevel(null); }}
                    onBlur={saveLevelLabel}
                    autoFocus
                    className="text-xs font-semibold tracking-wide uppercase bg-white/20 text-white placeholder-white/60 border border-white/40 rounded px-1.5 py-0.5 w-full focus:outline-none focus:bg-white/30"
                    placeholder={"Level " + colIdx}
                  />
                ) : (
                  <button
                    onClick={() => startEditLevel(colIdx)}
                    title="Click to rename this level"
                    className="text-xs font-semibold text-white tracking-wide uppercase text-left flex-1 hover:bg-white/10 rounded px-0.5 transition-colors"
                  >
                    {levelLabel}
                    <span className="ml-1 text-white/50 text-[9px] normal-case font-normal">✎</span>
                  </button>
                )}
                <span className="text-[10px] text-white/70 font-medium shrink-0">{items.length}</span>
              </div>

              {/* Items */}
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">No items</p>
                  ) : (
                    items.map((item: any) => {
                      const isSelected = item.id === selectedId;
                      const hasKids = !!(item.children?.length);
                      return (
                        <ColumnCard
                          key={item.id}
                          item={item}
                          depth={colIdx}
                          isSelected={isSelected}
                          hasChildren={hasKids}
                          colors={colors}
                          listId={listId}
                          onSelect={() => handleSelect(colIdx, item.id, hasKids)}
                          onRefresh={onRefresh}
                        />
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}

        {/* Empty state hint when no tree */}
        {tree.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <TreePine className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No items yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnCard({ item, depth, isSelected, hasChildren, colors, listId, onSelect, onRefresh }: {
  item: any; depth: number; isSelected: boolean; hasChildren: boolean;
  colors: typeof LEVEL_COLORS[0]; listId: string;
  onSelect: () => void; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);

  const saveEdit = async () => {
    if (!label.trim()) return;
    await api.patch("/global-lists/" + listId + "/items/" + item.id, {
      label: label.trim(), value: label.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    setEditing(false); onRefresh();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 p-1.5 rounded-lg border border-gray-300 bg-white">
        <Input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }} className="h-6 text-xs flex-1" autoFocus />
        <button onClick={saveEdit} className="text-green-600 shrink-0"><Save className="w-3 h-3" /></button>
        <button onClick={() => { setEditing(false); setLabel(item.label); }} className="text-gray-400 shrink-0"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
      title="Click to explore children · Double-click to edit"
      className={cn(
        "flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer group transition-all",
        isSelected
          ? colors.sel + " shadow-sm"
          : cn(colors.bg, colors.border, colors.text, "hover:shadow-sm hover:border-opacity-70")
      )}
    >
      {/* Icon */}
      <span className="shrink-0 text-base leading-none">
        {hasChildren
          ? (isSelected ? "📂" : "📁")
          : "📄"}
      </span>

      {/* Label */}
      <span className={cn("text-xs font-medium flex-1 truncate", isSelected ? "text-white" : "")}>{item.label}</span>

      {/* Children count + arrow */}
      {hasChildren && (
        <span className={cn("text-[10px] shrink-0 flex items-center gap-0.5", isSelected ? "text-white/80" : colors.text)}>
          {item.children.length}
          <ChevronRight className="w-3 h-3" />
        </span>
      )}

      {/* Edit/Delete on hover (only when not selected) */}
      {!isSelected && (
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button onClick={e => { e.stopPropagation(); setEditing(true); }} className="p-0.5 text-gray-400 hover:text-blue-600"><Edit2 className="w-2.5 h-2.5" /></button>
          <button onClick={async e => { e.stopPropagation(); if (!confirm("Delete \"" + item.label + "\"?")) return; await api.delete("/global-lists/" + listId + "/items/" + item.id); onRefresh(); }} className="p-0.5 text-gray-400 hover:text-red-500"><Trash2 className="w-2.5 h-2.5" /></button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function GlobalListsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [lists, setLists] = useState<any[]>([]);
  const [activeList, setActiveList] = useState<any | null>(null);
  const [tree, setTree] = useState<TreeItemType[]>([]);
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
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkParentId, setBulkParentId] = useState("");
  // Inline dataset name editing
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  // Cross-list linking
  const [showLinkParent, setShowLinkParent] = useState(false);
  const [linkParentId, setLinkParentId] = useState<string>("none");
  const [linkingSaving, setLinkingSaving] = useState(false);
  // Publish
  const [publishSaving, setPublishSaving] = useState(false);
  // Level definitions dialog
  const [showLevelDefs, setShowLevelDefs] = useState(false);
  // Cross-list parent-item filter
  const [parentListItems, setParentListItems] = useState<any[]>([]);
  const [loadingParentItems, setLoadingParentItems] = useState(false);
  const [selectedParentItemId, setSelectedParentItemId] = useState("");
  const [filteredByParentItems, setFilteredByParentItems] = useState<any[]>([]);
  const [loadingFilteredItems, setLoadingFilteredItems] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg); setToastType(type); setTimeout(() => setToastMsg(""), 3000);
  };

  const startEditListName = (l: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingListId(l.id);
    setEditingListName(l.name);
  };

  const saveListName = async (listId: string) => {
    const name = editingListName.trim();
    if (!name) { setEditingListId(null); return; }
    try {
      await api.patch(`/global-lists/${listId}`, { name });
      setLists(prev => prev.map(l => l.id === listId ? { ...l, name } : l));
      if (activeList?.id === listId) setActiveList((prev: any) => prev ? { ...prev, name } : prev);
      showToast("Dataset renamed");
    } catch { showToast("Failed to rename dataset", "error"); }
    setEditingListId(null);
  };

  const loadLists = () => {
    setLoadError(""); setLoading(true);
    api.get("/global-lists").then(r => setLists(r.data || [])).catch(() => setLoadError("Failed to load Global Lists. Please retry.")).finally(() => setLoading(false));
  };

  useEffect(() => { loadLists(); }, []);

  // Load parent list items (for cross-list filter) when the active list changes
  useEffect(() => {
    if (!activeList?.linkedParentList?.id) {
      setParentListItems([]);
      setSelectedParentItemId("");
      setFilteredByParentItems([]);
      return;
    }
    setLoadingParentItems(true);
    api.get(`/global-lists/${activeList.linkedParentList.id}/tree`)
      .then(r => setParentListItems(flattenTree(r.data || []).map(({ item }) => item)))
      .catch(() => setParentListItems([]))
      .finally(() => setLoadingParentItems(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList?.id, activeList?.linkedParentList?.id]);

  // Load filtered child items when a parent item is selected
  useEffect(() => {
    if (!activeList?.id || !selectedParentItemId) { setFilteredByParentItems([]); return; }
    setLoadingFilteredItems(true);
    api.get(`/global-lists/${activeList.id}/by-parent/${selectedParentItemId}`)
      .then(r => setFilteredByParentItems(r.data || []))
      .catch(() => setFilteredByParentItems([]))
      .finally(() => setLoadingFilteredItems(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList?.id, selectedParentItemId]);

  const refreshFilteredItems = () => {
    if (!activeList?.id || !selectedParentItemId) return;
    setLoadingFilteredItems(true);
    api.get(`/global-lists/${activeList.id}/by-parent/${selectedParentItemId}`)
      .then(r => setFilteredByParentItems(r.data || []))
      .catch(() => setFilteredByParentItems([]))
      .finally(() => setLoadingFilteredItems(false));
  };

  const selectList = async (list: any) => {
    setSelectedParentItemId("");
    setFilteredByParentItems([]);
    setActiveList(list); setTreeError(""); setLoadingTree(true);
    try { const r = await api.get("/global-lists/" + list.id + "/tree"); setTree(r.data || []); }
    catch { setTreeError("Failed to load list items. Please retry."); setTree([]); }
    finally { setLoadingTree(false); }
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/v1/global-lists", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ name: newListName.trim(), description: newListDesc.trim() || undefined }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "HTTP " + res.status);
      setLists(prev => [...prev, body]); setShowCreateList(false); setNewListName(""); setNewListDesc(""); selectList(body); showToast('"' + body.name + '" created');
    } catch (err: any) { showToast("Failed to create dataset: " + (err?.message || "Unknown error"), "error"); }
  };

  const deleteList = async (id: string) => {
    if (!confirm("Delete this list and all its items?")) return;
    try { await api.delete("/global-lists/" + id); setLists(prev => prev.filter(l => l.id !== id)); if (activeList?.id === id) { setActiveList(null); setTree([]); } showToast("Dataset deleted"); }
    catch { showToast("Failed to delete dataset.", "error"); }
  };

  const refreshTree = async () => {
    if (!activeList) return;
    try { const r = await api.get("/global-lists/" + activeList.id + "/tree"); setTree(r.data || []); }
    catch { setTreeError("Failed to refresh. Please retry."); }
  };

  const updateActiveListDefs = (defs: LevelDef[]) => {
    if (!activeList) return;
    const updated = { ...activeList, levelDefinitions: defs };
    setActiveList(updated); setLists(prev => prev.map(l => l.id === activeList.id ? updated : l));
  };

  const openLinkParent = () => {
    setLinkParentId(activeList?.linkedParentListId ?? "none");
    setShowLinkParent(true);
  };

  const saveLinkParent = async () => {
    if (!activeList) return;
    setLinkingSaving(true);
    try {
      const parentListId = linkParentId === "none" ? null : linkParentId;
      await api.patch(`/global-lists/${activeList.id}/link-parent`, { parentListId });
      const parentList = lists.find(l => l.id === parentListId) || null;
      const updated = { ...activeList, linkedParentListId: parentListId, linkedParentList: parentList ? { id: parentList.id, name: parentList.name } : null };
      setActiveList(updated);
      setLists(prev => prev.map(l => l.id === activeList.id ? updated : l));
      setShowLinkParent(false);
      showToast(parentListId ? `Linked to "${parentList?.name}"` : "Parent link removed");
    } catch { showToast("Failed to update link", "error"); }
    finally { setLinkingSaving(false); }
  };

  const togglePublish = async () => {
    if (!activeList) return;
    setPublishSaving(true);
    try {
      const next = !activeList.isPublished;
      await api.patch(`/global-lists/${activeList.id}`, { isPublished: next });
      const updated = { ...activeList, isPublished: next };
      setActiveList(updated);
      setLists(prev => prev.map(l => l.id === activeList.id ? updated : l));
      showToast(next ? "List published — visible to all organizations" : "List set to private");
    } catch { showToast("Failed to update publish status", "error"); }
    finally { setPublishSaving(false); }
  };

  const flatItems = flattenTree(tree);
  const bulkLines = bulkText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const closeBulkImport = () => { setShowBulkImport(false); setBulkText(""); setBulkParentId(""); };

  const runBulkImport = async () => {
    if (!activeList || bulkLines.length === 0) return;
    setBulkImporting(true);
    try {
      await api.post("/global-lists/" + activeList.id + "/items/bulk", { items: bulkLines.map(l => ({ label: l, parentId: bulkParentId || null })) });
      closeBulkImport(); await refreshTree(); showToast(bulkLines.length + " item" + (bulkLines.length !== 1 ? "s" : "") + " imported successfully");
    } catch { showToast("Bulk import failed. Please try again.", "error"); } finally { setBulkImporting(false); }
  };

  const levelDefs: LevelDef[] = activeList?.levelDefinitions || [];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-4xl">⚠️</div>
      <p className="text-gray-600 font-medium">{loadError}</p>
      <Button onClick={loadLists} variant="outline" className="gap-2"><Loader2 className="w-4 h-4" /> Retry</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className={cn("fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2", toastType === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
          {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Lists</h1>
          <p className="text-sm text-gray-500 mt-1">Reusable hierarchical datasets — locations, departments, categories, and more</p>
        </div>
        <Button onClick={() => setShowCreateList(true)} className="gap-2"><Plus className="w-4 h-4" />New Dataset</Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* List Panel */}
        <div className="w-64 bg-white rounded-xl border flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b"><p className="text-xs font-semibold text-gray-500 uppercase">Datasets ({lists.length})</p></div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {lists.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No datasets yet</p>
              ) : (
                lists.map(l => (
                  <div
                    key={l.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => editingListId !== l.id && selectList(l)}
                    onKeyDown={e => e.key === "Enter" && selectList(l)}
                    onDoubleClick={e => startEditListName(l, e)}
                    title="Click to open · Double-click to rename"
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer group",
                      activeList?.id === l.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      {editingListId === l.id ? (
                        <input
                          autoFocus
                          value={editingListName}
                          onChange={e => setEditingListName(e.target.value)}
                          onBlur={() => saveListName(l.id)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveListName(l.id);
                            if (e.key === "Escape") setEditingListId(null);
                            e.stopPropagation();
                          }}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-sm font-medium text-gray-900 bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-medium truncate">{l.name}</p>
                            <button
                              type="button"
                              onClick={e => startEditListName(l, e)}
                              title="Rename dataset"
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 p-0.5 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400">{l._count?.items ?? 0} items</span>
                            {l.isPublished && (
                              <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-px flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" />Global
                              </span>
                            )}
                            {!l.isOwn && (
                              <span className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-1.5 py-px flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />Shared
                              </span>
                            )}
                          </div>
                          {l.linkedParentList && (
                            <p className="text-[10px] text-purple-600 flex items-center gap-0.5 mt-0.5">
                              <Link2 className="w-2.5 h-2.5 shrink-0" />
                              child of {l.linkedParentList.name}
                            </p>
                          )}
                          {(l.levelDefinitions?.length || 0) > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {l.levelDefinitions.slice(0, 3).map((d: LevelDef) => (
                                <span key={d.level} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1">{d.label}</span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {editingListId !== l.id && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteList(l.id); }}
                        className="text-gray-400 hover:text-red-500 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Panel */}
        <div className="flex-1 bg-white rounded-xl border flex flex-col overflow-hidden">
          {activeList ? (
            <>
              <div className="px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{activeList.name}</h2>
                    {activeList.isPublished && (
                      <span className="shrink-0 text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-px flex items-center gap-0.5 font-medium">
                        <Globe className="w-2.5 h-2.5" />Published
                      </span>
                    )}
                    {activeList.linkedParentList && (
                      <span className="shrink-0 text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-px flex items-center gap-0.5 font-medium">
                        <Link2 className="w-2.5 h-2.5" />{activeList.linkedParentList.name}
                      </span>
                    )}
                  </div>
                  {activeList.description && <p className="text-xs text-gray-400 mt-0.5">{activeList.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* View mode toggle */}
                  <div className="flex rounded-md border border-gray-200 overflow-hidden">
                    <button onClick={() => setViewMode("tree")} className={cn("px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors", viewMode === "tree" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
                      <List className="w-3.5 h-3.5" />Tree
                    </button>
                    <button onClick={() => setViewMode("cards")} className={cn("px-2.5 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors border-l border-gray-200", viewMode === "cards" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
                      <LayoutGrid className="w-3.5 h-3.5" />Cards
                    </button>
                  </div>
                  {/* Settings dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => setShowLevelDefs(true)}>
                        <Tag className="w-3.5 h-3.5 mr-2" />Level Labels
                        {levelDefs.length > 0 && <span className="ml-auto text-xs text-gray-400">{levelDefs.length} defined</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={openLinkParent}>
                        <Link2 className="w-3.5 h-3.5 mr-2" />
                        {activeList.linkedParentList ? "Change Parent List" : "Link Parent List"}
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={togglePublish} disabled={publishSaving}>
                          <Globe className="w-3.5 h-3.5 mr-2" />
                          {activeList.isPublished ? "Make Private" : "Publish Globally"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setBulkText(""); setBulkParentId(""); setShowBulkImport(true); }}>
                        <Upload className="w-3.5 h-3.5 mr-2" />Bulk Import
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* Primary: Add item (tree mode, no parent filter active) */}
                  {viewMode === "tree" && !selectedParentItemId && (
                    <AddItemButton listId={activeList.id} parentId={null} onAdded={refreshTree} />
                  )}
                </div>
              </div>
              {/* Level definitions dialog */}
              <LevelDefinitionsEditor
                listId={activeList.id}
                initialDefs={levelDefs}
                onSaved={defs => { updateActiveListDefs(defs); setShowLevelDefs(false); }}
                open={showLevelDefs}
                onOpenChange={setShowLevelDefs}
              />

              {/* Parent-item filter bar — shown only for child lists */}
              {activeList.linkedParentList && (
                <div className="px-4 py-2.5 border-b bg-purple-50/50 flex items-center gap-3 shrink-0 flex-wrap">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link2 className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700">
                      Browse by {activeList.linkedParentList.name}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[200px] max-w-xs">
                    <Combobox
                      options={parentListItems.map((i: any) => ({ value: i.id, label: i.label }))}
                      value={selectedParentItemId}
                      onChange={setSelectedParentItemId}
                      placeholder={loadingParentItems ? "Loading…" : `Show all ${activeList.name}`}
                      searchPlaceholder={`Search ${activeList.linkedParentList.name}…`}
                      clearable
                      loading={loadingParentItems}
                    />
                  </div>
                  {selectedParentItemId && !loadingFilteredItems && (
                    <span className="text-xs text-purple-600 shrink-0 font-medium">
                      {filteredByParentItems.length} item{filteredByParentItems.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {selectedParentItemId ? (
                <LinkedItemsList
                  items={filteredByParentItems}
                  loading={loadingFilteredItems}
                  listId={activeList.id}
                  linkedParentItemId={selectedParentItemId}
                  onRefresh={refreshFilteredItems}
                />
              ) : loadingTree ? (
                <div className="flex items-center justify-center py-12 flex-1"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
              ) : treeError ? (
                <div className="flex flex-col items-center justify-center py-12 flex-1 gap-3">
                  <p className="text-sm text-red-500">{treeError}</p>
                  <Button variant="outline" size="sm" onClick={() => selectList(activeList)} className="gap-2"><RefreshCw className="w-3.5 h-3.5" /> Retry</Button>
                </div>
              ) : viewMode === "cards" ? (
                <CardView tree={tree} levelDefs={levelDefs} listId={activeList.id} onRefresh={refreshTree} onLevelDefsChange={updateActiveListDefs} />
              ) : (
                <TreeView
                  tree={tree}
                  listId={activeList.id}
                  lists={lists}
                  onRefresh={refreshTree}
                  onNavigateToList={id => { const l = lists.find(x => x.id === id); if (l) selectList(l); }}
                  persistKey={activeList.id}
                />
              )}
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
            <div className="space-y-1.5"><Label>Dataset Name *</Label><Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="e.g. Tanzania Locations" autoFocus onKeyDown={e => e.key === "Enter" && createList()} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={newListDesc} onChange={e => setNewListDesc(e.target.value)} placeholder="Optional description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>Cancel</Button>
            <Button onClick={createList} disabled={!newListName.trim()}>Create Dataset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={v => { if (!v) closeBulkImport(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Bulk Import Items</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">Paste one label per line. Each line becomes a separate item in <span className="font-medium text-gray-700">{activeList?.name}</span>.</p>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Items (one per line) *</Label>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={"Dar es Salaam\nMwanza\nDodoma\nArusha"} rows={8} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-mono" />
            </div>
            {flatItems.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Parent Item (optional)</Label>
                <Combobox
                  options={[
                    { value: "", label: "— No parent (top level)" },
                    ...flatItems.map(({ item, depth }) => ({
                      value: item.id,
                      label: " ".repeat(depth * 3) + (depth > 0 ? "└ " : "") + item.label,
                    })),
                  ]}
                  value={bulkParentId}
                  onChange={setBulkParentId}
                  placeholder="— No parent (top level)"
                  searchPlaceholder="Search items…"
                  clearable
                />
              </div>
            )}
            {bulkLines.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md border border-blue-100">
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">{bulkLines.length} item{bulkLines.length !== 1 ? "s" : ""} to import</Badge>
                <span className="text-xs text-blue-600">{bulkParentId ? 'under "' + (flatItems.find(f => f.item.id === bulkParentId)?.item.label ?? "selected parent") + '"' : "at top level"}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkImport} disabled={bulkImporting}>Cancel</Button>
            <Button onClick={runBulkImport} disabled={bulkLines.length === 0 || bulkImporting} className="gap-2">
              {bulkImporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Import {bulkLines.length > 0 ? bulkLines.length + " Item" + (bulkLines.length !== 1 ? "s" : "") : "Items"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Parent List Dialog */}
      <Dialog open={showLinkParent} onOpenChange={setShowLinkParent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-purple-600" />
              Link Parent List
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <p className="text-sm text-gray-500">
              Link <strong>{activeList?.name}</strong> as a child of another list.
              Items in this list can then reference items from the parent list,
              enabling cascading dropdowns (e.g. select Country → show Regions).
            </p>
            <div className="space-y-1.5">
              <Label>Parent List</Label>
              <Combobox
                options={[
                  { value: "none", label: "— No parent (standalone list)" },
                  ...lists
                    .filter(l => l.id !== activeList?.id && l.isOwn !== false)
                    .map(l => ({ value: l.id, label: l.name })),
                ]}
                value={linkParentId}
                onChange={setLinkParentId}
                placeholder="Select parent list…"
                searchPlaceholder="Search lists…"
              />
            </div>
            {linkParentId && linkParentId !== "none" && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-700">
                <p className="font-semibold mb-0.5">What this means</p>
                <p>When users add items to <em>{activeList?.name}</em>, they can assign each item a parent from <em>{lists.find(l => l.id === linkParentId)?.name}</em>. Forms can then filter {activeList?.name} items by the selected {lists.find(l => l.id === linkParentId)?.name} value.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkParent(false)} disabled={linkingSaving}>Cancel</Button>
            <Button onClick={saveLinkParent} disabled={linkingSaving} className="gap-2">
              {linkingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
