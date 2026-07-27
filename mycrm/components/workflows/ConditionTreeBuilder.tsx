"use client";
import { useEffect, useRef, useState } from "react";
import {
  DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronDown, ChevronRight, Copy, GripVertical, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ConditionGroup, ConditionLeaf, FormulaNode,
  addCondition, addGroup, canRemove, duplicateNode, moveWithinParent,
  removeNode, summarizeTree, updateNode,
  lockGroup, unlockGroup, isConsecutiveSelection, previewStructure,
} from "@/lib/condition-tree";
import { CONDITION_OPERATORS, fieldOptions, isOptionField } from "./condition-operators";
import { filterOperatorsForFieldType, type CategorizedOperator } from "@/lib/field-type-operators";

// Operators whose value is conceptually "matches any of these" rather than a
// single value — get a multi-select picker instead of one dropdown/text input.
const MULTI_VALUE_OPERATORS = ["is_one_of", "not_in", "contains", "contains_any", "contains_all"];

// Compact multi-select popover: stores selections as the same comma-separated
// string format the evaluators already expect for `is_one_of`/`contains`.
function MultiValuePicker({ value, options, onChange }: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v];
    onChange(next.join(","));
  };

  const label = selected.length === 0
    ? "Select values…"
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative flex-1 min-w-[8rem]">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-8 px-2 text-xs border border-gray-200 rounded-md bg-white flex items-center justify-between gap-1 hover:border-gray-300 transition-colors"
      >
        <span className={cn("truncate", selected.length === 0 && "text-gray-400")}>{label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 min-w-[180px] max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {options.map(o => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn("w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors", checked && "bg-indigo-50")}
              >
                <span className={cn(
                  "w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center",
                  checked ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                )}>
                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface ConditionTreeBuilderProps {
  group: ConditionGroup;
  root: ConditionGroup;
  onChange: (nextRoot: ConditionGroup) => void;
  fields: any[];
  isRoot?: boolean;
  loadDynamicOptions: (nodeId: string, fieldName: string) => void;
  dynamicOptions: Record<string, { label: string; value: string }[]>;
  // Override the operator vocabulary/value-requirement rules — lets other modules
  // (e.g. Blueprint transitions) reuse this same tree UI with their own operator set
  // instead of forking the component. Defaults to the Workflow engine's operators.
  operators?: CategorizedOperator[];
  noValueOperators?: string[];
}

export function ConditionTreeBuilder({
  group, root, onChange, fields, isRoot = false, loadDynamicOptions, dynamicOptions,
  operators = CONDITION_OPERATORS, noValueOperators,
}: ConditionTreeBuilderProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  // Always call useSortable (rules of hooks) — disabled for the root group, which has no
  // drag handle of its own since it's never reordered relative to a sibling.
  const sortable = useSortable({ id: group.id ?? "root", disabled: isRoot });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const dragStyle = isRoot ? undefined : { transform: CSS.Transform.toString(transform), transition };
  const groupId = group.id!;

  // Multi-select is scoped to this group's own direct children — Lock Group only
  // ever wraps consecutive items from the same parent, so selection never needs
  // to span across groups or be threaded through the whole tree.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectedArray = Array.from(selectedIds);
  const canLock = selectedArray.length > 0 && isConsecutiveSelection(root, groupId, selectedArray);
  const handleLockGroup = () => {
    if (!canLock) return;
    onChange(lockGroup(root, groupId, selectedArray));
    setSelectedIds(new Set());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.children.findIndex(c => c.id === active.id);
    const newIndex = group.children.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(moveWithinParent(root, groupId, oldIndex, newIndex));
  };

  const toggleOperator = () =>
    onChange(updateNode(root, groupId, { operator: group.operator === "OR" ? "AND" : "OR" }));

  if (!isRoot && group.collapsed) {
    return (
      <div ref={setNodeRef} style={dragStyle} className={cn(
        "border border-gray-200 bg-gray-50/60 rounded-xl px-3 py-2.5",
        isDragging && "opacity-50"
      )}>
        <GroupHeader
          group={group} root={root} onChange={onChange} fields={fields}
          dragAttributes={attributes} dragListeners={listeners}
          operators={operators} noValueOperators={noValueOperators}
        />
      </div>
    );
  }

  return (
    <div
      ref={isRoot ? undefined : setNodeRef}
      style={dragStyle}
      className={cn(!isRoot && "border border-gray-200 bg-gray-50/60 rounded-xl p-3", isDragging && "opacity-50")}
    >
      {!isRoot && (
        <GroupHeader
          group={group} root={root} onChange={onChange} fields={fields}
          dragAttributes={attributes} dragListeners={listeners}
          operators={operators} noValueOperators={noValueOperators}
        />
      )}

      {isRoot && group.children.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">Structure</span>
          <code className="text-xs font-mono text-gray-700 truncate">{previewStructure(group)}</code>
          <span className="text-[10px] text-gray-400 ml-auto shrink-0" title="A, B, C… stand for your conditions in the order shown below, so you can see how they're grouped at a glance.">
            (A, B, C… = your conditions in order)
          </span>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={group.children.map(c => c.id!)} strategy={verticalListSortingStrategy}>
          <div className={cn("space-y-0", !isRoot && "mt-2")}>
            {group.children.map((child, idx) => (
              <div key={child.id}>
                {/* On its own row, left-indented to roughly the checkbox's position
                    below — not centered across the row, and not sharing a column
                    with the checkbox, so it never cramps or shifts anything. */}
                {idx > 0 && (
                  <div className="pl-0.5 pb-1">
                    <button
                      type="button"
                      onClick={isRoot ? toggleOperator : undefined}
                      disabled={!isRoot}
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600",
                        isRoot && "hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer"
                      )}
                    >
                      {group.operator === "OR" ? "OR" : "AND"}
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(child.id!)}
                    onChange={() => toggleSelected(child.id!)}
                    title="Select for Lock Group"
                    className="mt-2.5 w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    {child.type === "condition" ? (
                      <ConditionLeafRow
                        node={child}
                        root={root}
                        onChange={onChange}
                        fields={fields}
                        loadDynamicOptions={loadDynamicOptions}
                        dynamicOptions={dynamicOptions}
                        operators={operators}
                        noValueOperators={noValueOperators}
                      />
                    ) : child.type === "group" ? (
                      <ConditionTreeBuilder
                        group={child}
                        root={root}
                        onChange={onChange}
                        fields={fields}
                        loadDynamicOptions={loadDynamicOptions}
                        dynamicOptions={dynamicOptions}
                        operators={operators}
                        noValueOperators={noValueOperators}
                      />
                    ) : (
                      <UnsupportedNodeRow node={child} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {group.children.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2">No conditions — matches everything.</p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
          onClick={() => onChange(addCondition(root, groupId, fields[0]?.name || "", operators[0]?.value))}>
          <Plus className="w-3 h-3" /> Add Condition
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"
          onClick={() => onChange(addGroup(root, groupId, fields[0]?.name || "", operators[0]?.value))}>
          <Plus className="w-3 h-3" /> Add Group
        </Button>
        {selectedIds.size > 0 && (
          <>
            <Button
              variant="outline" size="sm"
              className={cn("h-7 gap-1 text-xs", canLock ? "border-indigo-300 text-indigo-700 hover:bg-indigo-50" : "opacity-50 cursor-not-allowed")}
              disabled={!canLock}
              title={canLock ? "Wrap the selected conditions in a group — like parentheses" : "Select consecutive conditions to lock into a group"}
              onClick={handleLockGroup}
            >
              <Lock className="w-3 h-3" /> Lock Group ({selectedIds.size})
            </Button>
            {!canLock && (
              <span className="text-[10px] text-amber-600">Select consecutive conditions to lock</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Group header (drag handle, AND/OR toggle, collapse, duplicate, delete) ────

function GroupHeader({
  group, root, onChange, fields, dragAttributes, dragListeners, operators, noValueOperators,
}: {
  group: ConditionGroup;
  root: ConditionGroup;
  onChange: (next: ConditionGroup) => void;
  fields: any[];
  dragAttributes: any;
  dragListeners: any;
  operators: { value: string; label: string }[];
  noValueOperators?: string[];
}) {
  const removable = canRemove(root, group.id!);
  return (
    <div className="flex items-center gap-2">
      <button type="button" {...dragAttributes} {...dragListeners} className="cursor-grab text-gray-400 hover:text-gray-600 touch-none shrink-0">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
        {(["AND", "OR"] as const).map(op => (
          <button
            key={op}
            type="button"
            onClick={() => onChange(updateNode(root, group.id!, { operator: op }))}
            className={cn(
              "px-2 py-1 text-[10px] font-semibold transition-colors",
              group.operator === op ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            )}
          >
            {op}
          </button>
        ))}
      </div>
      <button type="button" className="text-gray-400 hover:text-gray-600 shrink-0"
        onClick={() => onChange(updateNode(root, group.id!, { collapsed: !group.collapsed }))}>
        {group.collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {group.collapsed && (
        <span className="text-xs text-gray-500 truncate flex-1">
          {summarizeTree(group, fields, { operators, noValueOperators })}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button type="button" className="text-gray-400 hover:text-indigo-600" title="Unlock group — keep all its conditions, remove the grouping"
          onClick={() => onChange(unlockGroup(root, group.id!))}>
          <LockOpen className="w-3.5 h-3.5" />
        </button>
        <button type="button" className="text-gray-400 hover:text-indigo-600" title="Duplicate group"
          onClick={() => onChange(duplicateNode(root, group.id!))}>
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={!removable}
          title="Delete group"
          className={cn("text-gray-400", removable ? "hover:text-red-500" : "opacity-30 cursor-not-allowed")}
          onClick={() => removable && onChange(removeNode(root, group.id!))}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Date-aware condition value input ──────────────────────────────────────────
// For before/after/on/on_or_before/on_or_after this is a single native date(-time)
// picker instead of a raw text box the user would otherwise have to hand-type an
// ISO string into. For "between" it's two pickers (from/to), joined into the
// same "a,b" string the evaluator already expects.

function DateConditionValueInput({
  operator,
  fieldType,
  value,
  onChange,
}: {
  operator: string;
  fieldType: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputType = fieldType === "DATETIME" ? "datetime-local" : "date";

  if (operator === "between") {
    const [from, to] = value.split(",");
    return (
      <div className="flex items-center gap-1.5">
        <input
          type={inputType}
          value={from ?? ""}
          onChange={e => onChange(`${e.target.value},${to ?? ""}`)}
          className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">and</span>
        <input
          type={inputType}
          value={to ?? ""}
          onChange={e => onChange(`${from ?? ""},${e.target.value}`)}
          className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <input
      type={inputType}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}

// ── Leaf condition row ─────────────────────────────────────────────────────────

function ConditionLeafRow({
  node, root, onChange, fields, loadDynamicOptions, dynamicOptions, operators, noValueOperators,
}: {
  node: ConditionLeaf;
  root: ConditionGroup;
  onChange: (next: ConditionGroup) => void;
  fields: any[];
  loadDynamicOptions: (nodeId: string, fieldName: string) => void;
  dynamicOptions: Record<string, { label: string; value: string }[]>;
  operators: CategorizedOperator[];
  noValueOperators?: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id! });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const removable = canRemove(root, node.id!);
  const requiresValue = !(noValueOperators ?? ["empty", "not_empty"]).includes(node.operator);

  const fieldType = fields.find(f => f.name === node.field)?.type;
  const availableOperators = filterOperatorsForFieldType(operators, fieldType);

  const dynOpts = dynamicOptions[node.id!];
  const staticOpts = isOptionField(fields, node.field) ? fieldOptions(fields, node.field) : null;
  const opts = dynOpts ?? staticOpts;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 flex-wrap bg-white border border-gray-200 rounded-xl p-2.5",
        isDragging && "opacity-50"
      )}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 touch-none shrink-0">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Select
        value={node.field}
        onValueChange={v => {
          // Changing the field can invalidate the current operator (e.g. switching
          // from a text field to a number field) — reset it to the first operator
          // valid for the new field's type so the condition never has an operator
          // that doesn't apply to the selected field.
          const newType = fields.find(f => f.name === v)?.type;
          const stillValid = filterOperatorsForFieldType(operators, newType);
          const nextOperator = stillValid.some(o => o.value === node.operator) ? node.operator : (stillValid[0]?.value ?? node.operator);
          onChange(updateNode(root, node.id!, { field: v, operator: nextOperator, value: "" }));
          loadDynamicOptions(node.id!, v);
        }}
      >
        <SelectTrigger className="h-8 text-xs w-48 min-w-0 overflow-hidden" title={fields.find(f => f.name === node.field)?.label}>
          <span className="truncate block flex-1 min-w-0 text-left"><SelectValue placeholder="Field" /></span>
        </SelectTrigger>
        <SelectContent>{fields.map(f => <SelectItem key={f.id ?? f.name} value={f.name} className="text-xs">{f.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={node.operator} onValueChange={v => onChange(updateNode(root, node.id!, { operator: v, value: "" }))}>
        <SelectTrigger className="h-8 text-xs w-44 min-w-0 overflow-hidden" title={availableOperators.find(o => o.value === node.operator)?.label}>
          <span className="truncate block flex-1 min-w-0 text-left"><SelectValue /></span>
        </SelectTrigger>
        <SelectContent>{availableOperators.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
      </Select>
      {requiresValue && (
        opts && opts.length > 0 && MULTI_VALUE_OPERATORS.includes(node.operator) ? (
          <MultiValuePicker
            value={node.value ?? ""}
            options={opts}
            onChange={v => onChange(updateNode(root, node.id!, { value: v }))}
          />
        ) : opts && opts.length > 0 ? (
          <Select value={node.value ?? ""} onValueChange={v => onChange(updateNode(root, node.id!, { value: v }))}>
            <SelectTrigger className="h-8 text-xs w-40 min-w-0 overflow-hidden" title={opts.find(o => o.value === node.value)?.label}>
              <span className="truncate block flex-1 min-w-0 text-left"><SelectValue placeholder="Value" /></span>
            </SelectTrigger>
            <SelectContent>{opts.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}</SelectContent>
          </Select>
        ) : (fieldType === "DATE" || fieldType === "DATETIME") ? (
          <DateConditionValueInput
            operator={node.operator}
            fieldType={fieldType}
            value={node.value ?? ""}
            onChange={v => onChange(updateNode(root, node.id!, { value: v }))}
          />
        ) : (
          <Input className="h-8 text-xs flex-1 min-w-[6rem]" value={node.value ?? ""} placeholder="Value"
            onChange={e => onChange(updateNode(root, node.id!, { value: e.target.value }))} />
        )
      )}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button type="button" className="text-gray-400 hover:text-indigo-600" title="Duplicate condition"
          onClick={() => onChange(duplicateNode(root, node.id!))}>
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={!removable}
          title="Delete condition"
          className={cn("text-gray-400", removable ? "hover:text-red-500" : "opacity-30 cursor-not-allowed")}
          onClick={() => removable && onChange(removeNode(root, node.id!))}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Reserved node types (formula/expression) — not editable yet ───────────────

function UnsupportedNodeRow({ node }: { node: FormulaNode }) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 border border-dashed border-gray-300 rounded-xl p-2.5 text-xs text-gray-400 italic">
      {node.type === "formula" ? "Formula" : "Expression"} conditions are not yet supported in this editor.
    </div>
  );
}
