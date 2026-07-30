// Pure mapping engine for Integration Fields — shared logic, no I/O. Mirrored
// from backend/src/records/integration-mapping.ts (same dual-copy pattern
// already used for condition-tree.ts / formula-engine.ts, since backend and
// frontend aren't a shared workspace) — keep both copies in sync.
//
// Mappings are resolved to field *names* by the caller before reaching here —
// this function only ever touches the two plain data objects it's given.

export type IntegrationMappingBehavior = "UPDATE_EXISTING" | "FILL_IF_EMPTY";

export interface ResolvedIntegrationMapping {
  sourceFieldName: string;
  destinationFieldName: string;
  behavior: IntegrationMappingBehavior;
}

function isEmptyValue(value: any): boolean {
  return value === null || value === undefined || value === "";
}

export interface ApplyIntegrationMappingResult {
  data: Record<string, any>;
  /** Pass back in as `previouslyAutoFilled` on the next call — see below. */
  autoFilled: Record<string, any>;
}

/**
 * Returns a NEW object — only the mapped destination keys are touched, every
 * other key in currentValues is passed through unchanged.
 *
 * `previouslyAutoFilled` distinguishes "this FILL_IF_EMPTY field is empty
 * because the visitor never touched it" from "it's empty/filled because a
 * user manually typed something" — without it, re-selecting a different
 * search result would never update a FILL_IF_EMPTY field once the FIRST
 * selection had already filled it, since it would no longer look "empty" to
 * later calls. Any field whose current value still matches what WE set it
 * to last time is fair game to overwrite again; anything the visitor typed
 * over it themselves is left alone, same as before.
 */
export function applyIntegrationMapping(
  currentValues: Record<string, any>,
  sourceRecordData: Record<string, any>,
  mappings: ResolvedIntegrationMapping[],
  previouslyAutoFilled: Record<string, any> = {},
): ApplyIntegrationMappingResult {
  const next = { ...currentValues };
  const autoFilled = { ...previouslyAutoFilled };
  for (const m of mappings) {
    if (!m.sourceFieldName || !m.destinationFieldName) continue;
    const sourceValue = sourceRecordData?.[m.sourceFieldName];
    if (sourceValue === undefined) continue;
    const key = m.destinationFieldName;

    if (m.behavior === "UPDATE_EXISTING") {
      next[key] = sourceValue;
    } else {
      const current = next[key];
      const stillHoldsOurLastFill = key in autoFilled && current === autoFilled[key];
      if (isEmptyValue(current) || stillHoldsOurLastFill) {
        next[key] = sourceValue;
        autoFilled[key] = sourceValue;
      }
    }
  }
  return { data: next, autoFilled };
}
