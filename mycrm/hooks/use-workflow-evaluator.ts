"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "@/lib/api";

export interface WFCondition { id: string; field: string; operator: string; value: any; logic?: "AND" | "OR"; }
export interface WFDef { id: string; name: string; trigger: string; moduleId: string; conditions: WFCondition[]; isActive: boolean; }
export interface WFExecLog { workflowId: string; workflowName: string; conditionResult: boolean; fieldChanged?: string; oldValue?: any; newValue?: any; actionsExecuted: number; }

function evalCond(cond: WFCondition, data: Record<string, any>, prev: Record<string, any>): boolean {
  const fv = data[cond.field];
  const cv = cond.value;
  const str = (v: any) => String(v ?? "").toLowerCase();
  const num = (v: any) => Number(v ?? 0);
  switch (cond.operator) {
    case "is": case "equals":      return str(fv) === str(cv);
    case "is_not": case "not_equals": return str(fv) !== str(cv);
    case "contains":               return str(fv).includes(str(cv));
    case "not_contains":           return !str(fv).includes(str(cv));
    case "empty":                  return !fv || fv === "" || (Array.isArray(fv) && fv.length === 0);
    case "not_empty":              return !!(fv && fv !== "" && !(Array.isArray(fv) && fv.length === 0));
    case "gt":  return num(fv) > num(cv);
    case "gte": return num(fv) >= num(cv);
    case "lt":  return num(fv) < num(cv);
    case "lte": return num(fv) <= num(cv);
    case "between": {
      const parts = String(cv || "").split(",");
      return num(fv) >= num(parts[0]?.trim()) && num(fv) <= num(parts[1]?.trim());
    }
    case "changed": return str(fv) !== str(prev[cond.field]);
    default: return false;
  }
}

function evalWorkflow(wf: WFDef, data: Record<string, any>, prev: Record<string, any>): boolean {
  if (!wf.conditions?.length) return true;
  let result = evalCond(wf.conditions[0], data, prev);
  for (let i = 1; i < wf.conditions.length; i++) {
    const c = wf.conditions[i];
    const r = evalCond(c, data, prev);
    result = (c.logic === "OR") ? result || r : result && r;
  }
  return result;
}

export function useWorkflowEvaluator(
  moduleId: string | undefined,
  recordId: string | undefined,
  formData: Record<string, any>,
  onFieldUpdate?: (fieldName: string, newValue: any) => void,
) {
  const [workflows, setWorkflows] = useState<WFDef[]>([]);
  const [execLog, setExecLog] = useState<WFExecLog[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const prevDataRef = useRef<Record<string, any>>({});
  const executingRef = useRef<Set<string>>(new Set());
  const loadedRef = useRef<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!moduleId || loadedRef.current === moduleId) return;
    loadedRef.current = moduleId;
    api.get("/workflows").then(r => {
      setWorkflows((r.data ?? []).filter((w: WFDef) =>
        w.isActive && w.moduleId === moduleId &&
        ["RECORD_UPDATED", "FIELD_CHANGED"].includes(w.trigger)
      ));
    }).catch(() => {});
  }, [moduleId]);

  // Initialize prev snapshot on mount
  useEffect(() => { prevDataRef.current = { ...formData }; }, []); // eslint-disable-line

  useEffect(() => {
    if (!moduleId || !recordId || workflows.length === 0) return;

    const changedFields: string[] = [];
    for (const key of Object.keys(formData)) {
      if (String(formData[key] ?? "") !== String(prevDataRef.current[key] ?? "")) changedFields.push(key);
    }
    if (changedFields.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const prev = { ...prevDataRef.current };
      prevDataRef.current = { ...formData };

      for (const wf of workflows) {
        if (executingRef.current.has(wf.id)) continue;
        const matches = evalWorkflow(wf, formData, prev);
        const logEntry: WFExecLog = {
          workflowId: wf.id, workflowName: wf.name, conditionResult: matches,
          fieldChanged: changedFields[0], oldValue: prev[changedFields[0]], newValue: formData[changedFields[0]],
          actionsExecuted: 0,
        };
        if (matches) {
          executingRef.current.add(wf.id);
          try {
            const res = await api.post("/workflows/" + wf.id + "/execute-on-record", {
              recordId, trigger: wf.trigger, data: formData, previousData: prev,
            }).catch(() => null);
            logEntry.actionsExecuted = res?.data?.actionsExecuted ?? 0;
            if (res?.data?.fieldUpdates && onFieldUpdate) {
              for (const [f, v] of Object.entries(res.data.fieldUpdates as Record<string, any>)) onFieldUpdate(f, v);
            }
          } finally { executingRef.current.delete(wf.id); }
        }
        setExecLog(p => [logEntry, ...p].slice(0, 50));
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [formData, workflows, moduleId, recordId, onFieldUpdate]);

  return { execLog, showDebug, setShowDebug };
}
