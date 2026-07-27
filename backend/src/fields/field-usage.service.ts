import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FieldUsageRef {
  type: 'blueprint' | 'workflow';
  id: string;
  name: string;
  isActive: boolean;
}

// Keys under which config JSON stores a single field reference (module Fields are
// referenced by NAME everywhere in this codebase — Blueprints and Workflows alike —
// never by id).
const FIELD_KEYS = new Set(['field', 'fieldName', 'statusFieldName']);
// Keys under which config JSON stores an array of field-name references.
const FIELD_ARRAY_KEYS = new Set(['fields', 'requiredFields']);

/**
 * Recursively walks an arbitrary Json blob (blueprint transitions/fieldLocks, workflow
 * conditions/actions, etc.) looking for any reference to `fieldName`. Deliberately generic
 * rather than shape-specific: the various condition-tree/action/lock shapes across
 * Blueprints and Workflows use inconsistent key names (`field` vs `fieldName`) for the same
 * concept, and new action types keep adding their own config shape. A single permissive
 * walker catches all of them without needing a bespoke parser per shape — erring toward
 * over-matching is the safe direction for a delete-blocking check.
 */
export function deepContainsFieldRef(value: unknown, fieldName: string): boolean {
  if (value == null || !fieldName) return false;
  if (typeof value === 'string') {
    if (value === fieldName) return true;
    // Message/template token references, e.g. "@camp_name" or "{{camp_name}}"
    return value.includes(`@${fieldName}`) || value.includes(`{{${fieldName}}}`);
  }
  if (Array.isArray(value)) {
    return value.some((v) => deepContainsFieldRef(v, fieldName));
  }
  if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (FIELD_KEYS.has(key) && val === fieldName) return true;
      if (FIELD_ARRAY_KEYS.has(key) && Array.isArray(val) && (val as unknown[]).includes(fieldName)) return true;
      if (deepContainsFieldRef(val, fieldName)) return true;
    }
    return false;
  }
  return false;
}

@Injectable()
export class FieldUsageService {
  constructor(private prisma: PrismaService) {}

  /** Every Blueprint/Workflow in this module that references `fieldName`, active or not. */
  async findUsages(moduleId: string, fieldName: string): Promise<FieldUsageRef[]> {
    const [blueprints, workflows] = await Promise.all([
      this.prisma.blueprint.findMany({ where: { moduleId } }),
      this.prisma.workflow.findMany({
        where: { moduleId },
        include: { actions: true, ruleGroups: true },
      }),
    ]);

    const refs: FieldUsageRef[] = [];

    for (const bp of blueprints) {
      const used =
        bp.statusFieldName === fieldName ||
        deepContainsFieldRef(bp.transitions, fieldName) ||
        deepContainsFieldRef(bp.fieldLocks, fieldName);
      if (used) refs.push({ type: 'blueprint', id: bp.id, name: bp.name, isActive: bp.isActive });
    }

    for (const wf of workflows) {
      const used =
        deepContainsFieldRef(wf.conditions, fieldName) ||
        deepContainsFieldRef(wf.triggerConfig, fieldName) ||
        wf.actions.some((a) => deepContainsFieldRef(a.config, fieldName)) ||
        wf.ruleGroups.some(
          (rg) => deepContainsFieldRef(rg.conditions, fieldName) || deepContainsFieldRef(rg.actions, fieldName),
        );
      if (used) refs.push({ type: 'workflow', id: wf.id, name: wf.name, isActive: wf.isActive });
    }

    return refs;
  }
}
