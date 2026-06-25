"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { generateId } from "@/lib/utils";

interface Module {
  id: string;
  name: string;
}

interface Stage {
  id: string;
  name: string;
  assigneeType: string;
  assigneeValue: string;
  actions: { approve: boolean; reject: boolean; requestInfo: boolean };
  slaDays: number | "";
  onApprove: string;
  onReject: string;
  onRequestInfo: string;
}

const ASSIGNEE_TYPE_LABELS: Record<string, string> = {
  Role: "Role Name",
  "Specific User": "User ID or Name",
  "Record Field": "Field Key",
  Manager: "Manager Level",
};

function createDefaultStage(): Stage {
  return {
    id: generateId(),
    name: "",
    assigneeType: "Role",
    assigneeValue: "",
    actions: { approve: true, reject: false, requestInfo: false },
    slaDays: "",
    onApprove: "END",
    onReject: "END",
    onRequestInfo: "",
  };
}

export default function NewBlueprintPage() {
  const router = useRouter();

  const [modules, setModules] = useState<Module[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [triggerField, setTriggerField] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [stages, setStages] = useState<Stage[]>([createDefaultStage()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get("/modules")
      .then((res: { data: Module[] }) => setModules(res.data ?? []))
      .catch((err: unknown) => console.error("Failed to fetch modules", err));
  }, []);

  function updateStage(id: string, patch: Partial<Stage>) {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  function addStage() {
    setStages((prev) => [...prev, createDefaultStage()]);
  }

  function removeStage(id: string) {
    setStages((prev) => prev.filter((s) => s.id !== id));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    stages.forEach((stage, idx) => {
      if (!stage.name.trim()) errs[`stage_name_${idx}`] = "Stage name is required.";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post("/process/blueprints", {
        name,
        description,
        moduleId: moduleId || null,
        triggerField,
        triggerValue,
        isActive,
        stages: stages.map((s, idx) => ({
          name: s.name,
          assigneeType: s.assigneeType,
          assigneeValue: s.assigneeValue,
          actions: s.actions,
          slaDays: s.slaDays === "" ? null : Number(s.slaDays),
          onApprove: s.onApprove,
          onReject: s.onReject,
          onRequestInfo: s.onRequestInfo,
          order: idx + 1,
        })),
      });
      router.push("/settings/processes");
    } catch (err) {
      console.error("Failed to create blueprint", err);
    } finally {
      setSaving(false);
    }
  }

  const otherStageOptions = (currentId: string) =>
    stages.filter((s) => s.id !== currentId && s.name.trim());

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Process Blueprint</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/settings/processes")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Blueprint
          </Button>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Left Panel */}
        <div className="w-1/3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Blueprint Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Leave Approval Process"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this blueprint..."
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="module">Module</Label>
                <Select value={moduleId} onValueChange={setModuleId}>
                  <SelectTrigger id="module">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="triggerField">Trigger Field</Label>
                <Input
                  id="triggerField"
                  value={triggerField}
                  onChange={(e) => setTriggerField(e.target.value)}
                  placeholder="e.g. status"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="triggerValue">Trigger Value</Label>
                <Input
                  id="triggerValue"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="e.g. submitted"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="w-2/3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Stages</h2>
            <Button variant="outline" size="sm" onClick={addStage}>
              <Plus className="w-4 h-4 mr-1" />
              Add Stage
            </Button>
          </div>

          {stages.map((stage, idx) => (
            <Card key={stage.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Stage {idx + 1}
                </CardTitle>
                {stages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStage(stage.id)}
                    title="Remove stage"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Stage Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={stage.name}
                    onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                    placeholder="e.g. Manager Review"
                  />
                  {errors[`stage_name_${idx}`] && (
                    <p className="text-xs text-destructive">
                      {errors[`stage_name_${idx}`]}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Assignee Type</Label>
                    <Select
                      value={stage.assigneeType}
                      onValueChange={(val) =>
                        updateStage(stage.id, { assigneeType: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Role">Role</SelectItem>
                        <SelectItem value="Specific User">Specific User</SelectItem>
                        <SelectItem value="Record Field">Record Field</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>
                      {ASSIGNEE_TYPE_LABELS[stage.assigneeType] ?? "Assignee Value"}
                    </Label>
                    <Input
                      value={stage.assigneeValue}
                      onChange={(e) =>
                        updateStage(stage.id, { assigneeValue: e.target.value })
                      }
                      placeholder="Enter value..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Actions</Label>
                  <div className="flex gap-6 pt-1">
                    {(["approve", "reject", "requestInfo"] as const).map((action) => (
                      <div key={action} className="flex items-center gap-2">
                        <Checkbox
                          id={`${stage.id}-${action}`}
                          checked={stage.actions[action]}
                          onCheckedChange={(checked) =>
                            updateStage(stage.id, {
                              actions: { ...stage.actions, [action]: !!checked },
                            })
                          }
                        />
                        <Label htmlFor={`${stage.id}-${action}`} className="font-normal cursor-pointer">
                          {action === "requestInfo"
                            ? "Request Info"
                            : action.charAt(0).toUpperCase() + action.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>SLA Days</Label>
                  <Input
                    type="number"
                    min={0}
                    value={stage.slaDays}
                    onChange={(e) =>
                      updateStage(stage.id, { slaDays: e.target.value === "" ? "" : Number(e.target.value) })
                    }
                    placeholder="e.g. 3"
                    className="w-32"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>On Approve</Label>
                    <Select
                      value={stage.onApprove}
                      onValueChange={(val) =>
                        updateStage(stage.id, { onApprove: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="END">Complete</SelectItem>
                        {otherStageOptions(stage.id).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>On Reject</Label>
                    <Select
                      value={stage.onReject}
                      onValueChange={(val) =>
                        updateStage(stage.id, { onReject: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="END">End / Reject</SelectItem>
                        {otherStageOptions(stage.id).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>On Request Info</Label>
                    <Select
                      value={stage.onRequestInfo}
                      onValueChange={(val) =>
                        updateStage(stage.id, { onRequestInfo: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherStageOptions(stage.id).length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-gray-400">No other stages</div>
                        ) : (
                          otherStageOptions(stage.id).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={addStage}>
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>
      </div>
    </div>
  );
}
