"use client";
import { useEffect, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, GripVertical, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ConditionGroup, ConditionNode, summarizeTree, uid } from "@/lib/condition-tree";
import { ConditionTreeBuilder } from "./ConditionTreeBuilder";
import { ActionConfigEditor, WorkflowAction } from "./action-config-editor";
import { ACTION_TYPES } from "./condition-operators";

export interface RuleGroup {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  conditions: ConditionGroup;
  actions: WorkflowAction[];
  collapsed?: boolean;
}

export function emptyRuleGroup(index: number): RuleGroup {
  return {
    id: uid(),
    name: `Rule ${index + 1}`,
    order: index,
    isActive: true,
    conditions: { type: "group", operator: "AND", children: [] },
    actions: [],
  };
}

function cloneConditionTree(node: ConditionNode): ConditionNode {
  if (node.type === "group") {
    return { ...node, id: uid(), children: node.children.map(cloneConditionTree) };
  }
  return { ...node, id: uid() };
}

function walkLeaves(node: ConditionNode, fn: (leaf: ConditionNode & { type: "condition" }) => void) {
  if (node.type === "condition") { fn(node); return; }
  if (node.type === "group") node.children.forEach(c => walkLeaves(c, fn));
}

export function RuleGroupsEditor({
  ruleGroups, onChange, fields, modules, allWorkflows, orgUsers, orgDepts,
}: {
  ruleGroups: RuleGroup[];
  onChange: (next: RuleGroup[]) => void;
  fields: any[];
  modules: any[];
  allWorkflows: any[];
  orgUsers: any[];
  orgDepts: any[];
}) {
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string; value: string }[]>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadDynamicOptions = async (nodeId: string, fieldName: string) => {
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
    if (opts.length > 0) setDynamicOptions(prev => ({ ...prev, [nodeId]: opts }));
  };

  // Preload LOOKUP-field value labels for pre-existing conditions once, mirroring the
  // original loadCondOpts preloading in app/(dashboard)/workflows/page.tsx.
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;
    ruleGroups.forEach(rg => {
      walkLeaves(rg.conditions, leaf => { if (leaf.field) loadDynamicOptions(leaf.id!, leaf.field); });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ruleGroups.findIndex(rg => rg.id === active.id);
    const newIndex = ruleGroups.findIndex(rg => rg.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(ruleGroups, oldIndex, newIndex).map((rg, i) => ({ ...rg, order: i })));
  };

  const updateGroup = (id: string, patch: Partial<RuleGroup>) =>
    onChange(ruleGroups.map(rg => rg.id === id ? { ...rg, ...patch } : rg));

  const duplicateGroup = (id: string) => {
    const idx = ruleGroups.findIndex(rg => rg.id === id);
    if (idx === -1) return;
    const original = ruleGroups[idx];
    const clone: RuleGroup = {
      ...original,
      id: uid(),
      name: `${original.name} (copy)`,
      conditions: cloneConditionTree(original.conditions) as ConditionGroup,
      actions: original.actions.map(a => ({ ...a, id: uid() })),
    };
    const next = [...ruleGroups];
    next.splice(idx + 1, 0, clone);
    onChange(next.map((rg, i) => ({ ...rg, order: i })));
  };

  const removeGroup = (id: string) => {
    if (ruleGroups.length <= 1) {
      // Never let the workflow end up with zero rule groups — reset in place instead.
      onChange([emptyRuleGroup(0)]);
      return;
    }
    onChange(ruleGroups.filter(rg => rg.id !== id).map((rg, i) => ({ ...rg, order: i })));
  };

  const addGroupCard = () => onChange([...ruleGroups, emptyRuleGroup(ruleGroups.length)]);

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ruleGroups.map(rg => rg.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {ruleGroups.map((rg, idx) => (
              <RuleGroupCard
                key={rg.id}
                ruleGroup={rg}
                index={idx}
                onUpdate={patch => updateGroup(rg.id, patch)}
                onDuplicate={() => duplicateGroup(rg.id)}
                onRemove={() => removeGroup(rg.id)}
                fields={fields}
                modules={modules}
                allWorkflows={allWorkflows}
                orgUsers={orgUsers}
                orgDepts={orgDepts}
                loadDynamicOptions={loadDynamicOptions}
                dynamicOptions={dynamicOptions}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addGroupCard}>
        <Plus className="w-3.5 h-3.5" /> Add Rule Group
      </Button>
    </div>
  );
}

function RuleGroupCard({
  ruleGroup, index, onUpdate, onDuplicate, onRemove,
  fields, modules, allWorkflows, orgUsers, orgDepts,
  loadDynamicOptions, dynamicOptions,
}: {
  ruleGroup: RuleGroup;
  index: number;
  onUpdate: (patch: Partial<RuleGroup>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  fields: any[];
  modules: any[];
  allWorkflows: any[];
  orgUsers: any[];
  orgDepts: any[];
  loadDynamicOptions: (nodeId: string, fieldName: string) => void;
  dynamicOptions: Record<string, { label: string; value: string }[]>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ruleGroup.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const addAction = () =>
    onUpdate({ actions: [...ruleGroup.actions, { id: uid(), type: "SET_FIELD", config: {}, order: ruleGroup.actions.length, recipientUsers: [], recipientDepts: [] }] });

  const updateAction = (id: string, patch: Partial<WorkflowAction>) =>
    onUpdate({ actions: ruleGroup.actions.map(a => a.id === id ? { ...a, ...patch } : a) });

  const removeAction = (id: string) =>
    onUpdate({ actions: ruleGroup.actions.filter(a => a.id !== id) });

  const collapsed = !!ruleGroup.collapsed;
  const hasNoActions = ruleGroup.actions.length === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm", isDragging && "opacity-50")}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <button type="button" {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 touch-none shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-medium shrink-0">{index + 1}</span>
        <Input
          value={ruleGroup.name}
          onChange={e => onUpdate({ name: e.target.value })}
          className="h-8 text-sm font-medium max-w-[220px]"
        />
        {hasNoActions && (
          <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Needs at least one action</span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Switch checked={ruleGroup.isActive} onCheckedChange={v => onUpdate({ isActive: v })} />
          <button type="button" className="text-gray-400 hover:text-gray-600"
            onClick={() => onUpdate({ collapsed: !collapsed })}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button type="button" className="text-gray-400 hover:text-indigo-600" title="Duplicate rule group" onClick={onDuplicate}>
            <Copy className="w-4 h-4" />
          </button>
          <button type="button" className="text-gray-400 hover:text-red-500" title="Delete rule group" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {collapsed ? (
        <div className="px-4 py-3 text-xs text-gray-500 truncate">
          {summarizeTree(ruleGroup.conditions, fields)}
          {" → "}
          {ruleGroup.actions.length > 0
            ? ruleGroup.actions.map(a => ACTION_TYPES.find(t => t.value === a.type)?.label ?? a.type).join(", ")
            : "No actions"}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Conditions</p>
            <ConditionTreeBuilder
              group={ruleGroup.conditions}
              root={ruleGroup.conditions}
              onChange={next => onUpdate({ conditions: next })}
              fields={fields}
              isRoot
              loadDynamicOptions={loadDynamicOptions}
              dynamicOptions={dynamicOptions}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actions</p>
            {ruleGroup.actions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl mb-3">
                No actions yet — click &quot;Add Action&quot; below.
              </div>
            ) : (
              <div className="space-y-3 mb-3">
                {ruleGroup.actions.map((action, idx) => (
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
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addAction}>
              <Plus className="w-3 h-3" /> Add Action
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
