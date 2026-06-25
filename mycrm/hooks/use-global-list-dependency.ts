"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "@/lib/api";

export interface FieldWithSettings {
  id: string;
  name: string;
  type: string;
  settings?: any; // may be string (JSON) or object
}

/** Parse field settings — handles both JSON string and object */
function getSettings(field: FieldWithSettings): Record<string, any> {
  const raw = field.settings;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

/** Get the global list ID from either GLOBAL_RELATION or DROPDOWN with globalListSource */
function getListId(field: FieldWithSettings): string | undefined {
  const s = getSettings(field);
  return s.globalListId || s.globalListSource?.listId;
}

/**
 * useGlobalListDependency
 *
 * Manages cross-field dependencies for Global List fields.
 *
 * When a "primary" field value changes, all "dependent" fields that
 * reference it via dependsOnFieldId automatically:
 *  1. Have their options reloaded from the global list children
 *  2. Have their current value cleared (if the parent changed)
 *
 * Usage:
 *   const { fieldOptions, onDependencyFieldChange } = useGlobalListDependency(fields, formData, setFormData);
 *   // Pass fieldOptions[field.id] as externalOptions to DynamicFieldInput
 *   // Call onDependencyFieldChange(fieldName, value) instead of direct setFormData for global list fields
 */
export function useGlobalListDependency(
  fields: FieldWithSettings[],
  formData: Record<string, any>,
  setFormData: (updater: (prev: Record<string, any>) => Record<string, any>) => void
) {
  const [fieldOptions, setFieldOptions] = useState<Record<string, any[]>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  // Load primary/independent field options on mount
  useEffect(() => {
    fields.forEach(field => {
      const s = getSettings(field);
      const listId = getListId(field);
      if (!listId) return;
      const role = s.fieldRole ?? "independent";
      if (role === "primary" || role === "independent") {
        const key = field.id + ":root";
        if (loadedRef.current.has(key)) return;
        loadedRef.current.add(key);
        api.get("/global-lists/" + listId + "/items")
          .then(r => setFieldOptions(prev => ({ ...prev, [field.id]: r.data ?? [] })))
          .catch(() => {});
      }
    });
  }, [fields]);

  // Pre-load dependent field options when parent already has a value (Edit mode init)
  useEffect(() => {
    fields.forEach(field => {
      const s = getSettings(field);
      const listId = getListId(field);
      if (!listId || s.fieldRole !== "dependent") return;

      const parentField = fields.find(f => f.id === s.dependsOnFieldId);
      if (!parentField) return;

      const parentValue = formData[parentField.name];
      if (!parentValue) return;

      // Unique key per field+parentValue combination — prevents re-loading same data
      const key = field.id + ":dep:" + String(parentValue);
      if (loadedRef.current.has(key)) return;
      loadedRef.current.add(key);

      api.get("/global-lists/" + listId + "/items/" + parentValue + "/children")
        .then(r => setFieldOptions(prev => ({ ...prev, [field.id]: r.data ?? [] })))
        .catch(() => {});
    });
  }, [fields, formData]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a parent field value changes, reload child field options
  const onDependencyFieldChange = useCallback((fieldName: string, newValue: any) => {
    const changedField = fields.find(f => f.name === fieldName);
    if (!changedField) return;

    // Find all fields that depend on this field (parse settings to check)
    const dependents = fields.filter(f => {
      const s = getSettings(f);
      return s.fieldRole === "dependent" && s.dependsOnFieldId === changedField.id;
    });

    if (dependents.length === 0) return;

    setFormData(prev => {
      const updated = { ...prev };
      dependents.forEach(dep => { updated[dep.name] = null; });
      return updated;
    });

    dependents.forEach(dep => {
      const depListId = getListId(dep);
      if (!depListId || !newValue) {
        setFieldOptions(prev => ({ ...prev, [dep.id]: [] }));
        return;
      }
      api.get("/global-lists/" + depListId + "/items/" + newValue + "/children")
        .then(r => {
          setFieldOptions(prev => ({ ...prev, [dep.id]: r.data ?? [] }));
          // Recursively clear grandchildren
          const grandchildren = fields.filter(f => {
            const s = getSettings(f);
            return s.fieldRole === "dependent" && s.dependsOnFieldId === dep.id;
          });
          if (grandchildren.length > 0) {
            setFormData(prev2 => {
              const u = { ...prev2 };
              grandchildren.forEach(gc => { u[gc.name] = null; });
              return u;
            });
            grandchildren.forEach(gc => {
              setFieldOptions(prev => ({ ...prev, [gc.id]: [] }));
            });
          }
        })
        .catch(() => setFieldOptions(prev => ({ ...prev, [dep.id]: [] })));
    });
  }, [fields, setFormData]);

  /**
   * bootstrapDependencies — call once after loading existing record data in edit mode.
   * Loads child options for all dependent fields whose parent already has a value,
   * WITHOUT clearing any existing values.
   */
  const bootstrapDependencies = useCallback((initialData: Record<string, any>) => {
    fields.forEach(field => {
      const s = getSettings(field);
      const listId = getListId(field);
      if (!listId || s.fieldRole !== "dependent") return;

      const parentField = fields.find(f => f.id === s.dependsOnFieldId);
      if (!parentField) return;

      const parentValue = initialData[parentField.name];
      if (!parentValue) return;

      api.get("/global-lists/" + listId + "/items/" + parentValue + "/children")
        .then(r => setFieldOptions(prev => ({ ...prev, [field.id]: r.data ?? [] })))
        .catch(() => {});
    });
  }, [fields]);

  return { fieldOptions, onDependencyFieldChange, bootstrapDependencies };
}
