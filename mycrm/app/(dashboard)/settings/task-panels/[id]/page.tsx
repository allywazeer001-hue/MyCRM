"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutList, ArrowLeft, Loader2, Plus, X,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Module {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { value: "is",        label: "is" },
  { value: "is_not",    label: "is not" },
  { value: "contains",  label: "contains" },
  { value: "empty",     label: "is empty" },
  { value: "not_empty", label: "is not empty" },
] as const;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium",
      type === "success"
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-red-50 border-red-200 text-red-700",
    )}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EditTaskPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Panel settings
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon]               = useState("");
  const [color, setColor]             = useState("#3b82f6");
  const [moduleId, setModuleId]       = useState("");
  const [roleInput, setRoleInput]     = useState("");
  const [roles, setRoles]             = useState<string[]>([]);
  const [displayLimit, setDisplayLimit]           = useState(50);
  const [highlightNew, setHighlightNew]           = useState(false);
  const [newThresholdHours, setNewThresholdHours] = useState(24);
  const [isActive, setIsActive]       = useState(true);

  // Filter conditions
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [logic, setLogic]           = useState<"AND" | "OR">("AND");

  // Sort
  const [sortField, setSortField]         = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Meta
  const [modules, setModules]   = useState<Module[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load modules + find panel by id
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [modsRes, panelsRes] = await Promise.all([
          api.get("/modules"),
          api.get("/task-panels/admin"),
        ]);

        const allMods: Module[] = (modsRes.data || []).filter((m: any) => m.isActive);
        setModules(allMods);

        const panel = (panelsRes.data || []).find((p: any) => p.id === id);
        if (!panel) {
          showToast("Panel not found", "error");
          return;
        }

        // Populate fields
        setName(panel.name || "");
        setDescription(panel.description || "");
        setIcon(panel.icon || "");
        setColor(panel.color || "#3b82f6");
        setModuleId(panel.moduleId || "");
        setRoles(panel.assigneeRoles || []);
        setDisplayLimit(panel.displayLimit ?? 50);
        setHighlightNew(panel.highlightNew ?? false);
        setNewThresholdHours(panel.newThresholdHours ?? 24);
        setIsActive(panel.isActive ?? true);
        setSortField(panel.sortField || "");
        setSortDirection(panel.sortDirection || "asc");

        if (panel.filterGroup) {
          setLogic(panel.filterGroup.logic === "OR" ? "OR" : "AND");
          setConditions(
            (panel.filterGroup.conditions || []).map((c: any) => ({
              id: uid(),
              field: c.field || "",
              operator: c.operator || "is",
              value: c.value || "",
            }))
          );
        }
      } catch {
        showToast("Failed to load panel", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Role tags ────────────────────────────────────────────────────────────────

  const addRole = (raw: string) => {
    const trimmed = raw.trim().replace(/,$/, "").trim();
    if (trimmed && !roles.includes(trimmed)) {
      setRoles(prev => [...prev, trimmed]);
    }
    setRoleInput("");
  };

  const handleRoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRole(roleInput);
    } else if (e.key === "Backspace" && roleInput === "" && roles.length > 0) {
      setRoles(prev => prev.slice(0, -1));
    }
  };

  const removeRole = (role: string) => setRoles(prev => prev.filter(r => r !== role));

  // ── Filter conditions ────────────────────────────────────────────────────────

  const addCondition = () => {
    setConditions(prev => [...prev, { id: uid(), field: "", operator: "is", value: "" }]);
  };

  const updateCondition = (condId: string, patch: Partial<FilterCondition>) => {
    setConditions(prev => prev.map(c => c.id === condId ? { ...c, ...patch } : c));
  };

  const removeCondition = (condId: string) => {
    setConditions(prev => prev.filter(c => c.id !== condId));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("Panel name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        color,
        moduleId: (moduleId && moduleId !== "__none__") ? moduleId : undefined,
        assigneeRoles: roles,
        displayLimit,
        highlightNew,
        newThresholdHours,
        isActive,
        sortField: sortField.trim() || undefined,
        sortDirection,
      };

      if (conditions.length > 0) {
        payload.filterGroup = {
          logic,
          conditions: conditions.map(({ id: _id, ...rest }) => rest),
        };
      } else {
        payload.filterGroup = null;
      }

      await api.patch(`/task-panels/${id}`, payload);
      showToast("Panel updated successfully");
      router.push("/settings/task-panels");
    } catch {
      showToast("Failed to save panel", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings/task-panels">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-blue-600" />
            Edit Task Panel
          </h1>
          <p className="text-sm text-gray-500">Update panel settings and filter conditions.</p>
        </div>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutList className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LEFT: Panel settings */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Panel Settings</h2>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name <span className="text-red-500">*</span></Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. My Open Tasks"
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Icon + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Icon</Label>
                <Input
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                  placeholder="e.g. 📋 or task-icon"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="h-9 w-12 rounded border border-gray-200 p-0.5 cursor-pointer bg-white"
                  />
                  <span className="text-xs text-gray-500 font-mono">{color}</span>
                </div>
              </div>
            </div>

            {/* Module */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Module</Label>
              <Select value={moduleId || "__none__"} onValueChange={v => setModuleId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a module…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.icon && <span className="mr-1.5">{m.icon}</span>}
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Roles */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assignee Roles</Label>
              <div className={cn(
                "min-h-[38px] flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent",
              )}>
                {roles.map(role => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="flex items-center gap-1 pr-1 text-xs font-normal"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRole(role)}
                      className="ml-0.5 text-gray-400 hover:text-red-500 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="text"
                  value={roleInput}
                  onChange={e => setRoleInput(e.target.value)}
                  onKeyDown={handleRoleKeyDown}
                  onBlur={() => { if (roleInput.trim()) addRole(roleInput); }}
                  placeholder={roles.length === 0 ? "Type a role and press Enter…" : ""}
                  className="flex-1 min-w-[140px] outline-none text-sm bg-transparent placeholder:text-gray-400"
                />
              </div>
              <p className="text-[11px] text-gray-400">Press Enter or comma to add a role. Leave empty for all roles.</p>
            </div>

            {/* Display Limit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Display Limit</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={displayLimit}
                onChange={e => setDisplayLimit(Number(e.target.value))}
                className="h-9 w-32"
              />
            </div>

            {/* Highlight New */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Highlight New</p>
                <p className="text-xs text-gray-500">Visually highlight recently added records</p>
              </div>
              <Switch checked={highlightNew} onCheckedChange={setHighlightNew} />
            </div>

            {/* New Threshold Hours */}
            {highlightNew && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">New Threshold (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newThresholdHours}
                  onChange={e => setNewThresholdHours(Number(e.target.value))}
                  className="h-9 w-32"
                />
              </div>
            )}

            {/* Active */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Active</p>
                <p className="text-xs text-gray-500">Panel is visible to users when active</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Filter Conditions */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Filter Conditions</h2>
                {conditions.length > 1 && (
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                    {(["AND", "OR"] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => setLogic(l)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                          logic === l
                            ? "bg-blue-600 text-white"
                            : "text-gray-500 hover:text-gray-700",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {conditions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No conditions — panel will show all records from the module.
                </p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((cond, idx) => (
                    <div key={cond.id} className="flex items-center gap-2 flex-wrap">
                      {idx > 0 && (
                        <span className="text-[10px] font-bold text-gray-400 w-7 text-center shrink-0">
                          {logic}
                        </span>
                      )}
                      {idx === 0 && <span className="w-7 shrink-0" />}

                      <Input
                        value={cond.field}
                        onChange={e => updateCondition(cond.id, { field: e.target.value })}
                        placeholder="Field name"
                        className="h-8 text-xs flex-1 min-w-[100px]"
                      />

                      <Select
                        value={cond.operator}
                        onValueChange={v => updateCondition(cond.id, { operator: v })}
                      >
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value} className="text-xs">
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {!["empty", "not_empty"].includes(cond.operator) && (
                        <Input
                          value={cond.value}
                          onChange={e => updateCondition(cond.id, { value: e.target.value })}
                          placeholder="Value"
                          className="h-8 text-xs flex-1 min-w-[80px]"
                        />
                      )}

                      <button
                        onClick={() => removeCondition(cond.id)}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={addCondition}
                className="gap-1.5 text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </Button>
            </CardContent>
          </Card>

          {/* Sort settings */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800">Sort Settings</h2>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sort Field</Label>
                <Input
                  value={sortField}
                  onChange={e => setSortField(e.target.value)}
                  placeholder="e.g. createdAt, dueDate"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Sort Direction</Label>
                <Select value={sortDirection} onValueChange={v => setSortDirection(v as "asc" | "desc")}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutList className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
