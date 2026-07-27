import { api } from "@/lib/api";

export interface BlueprintWorkflowLink {
  blueprintId: string;
  blueprintName: string;
  transitionId: string;
  transitionName: string;
}

// Blueprint transitions can link to a centrally-managed Workflow (see
// backend/src/blueprints/blueprints.service.ts `linkWorkflowToTransition`) — the
// link is stored on the transition, not the workflow, so anything that needs to
// know "is this workflow linked to a blueprint?" has to scan blueprints for it.
export async function findBlueprintLinksForWorkflows(): Promise<Map<string, BlueprintWorkflowLink>> {
  const map = new Map<string, BlueprintWorkflowLink>();
  try {
    const { data } = await api.get("/blueprints");
    const blueprints: any[] = Array.isArray(data) ? data : [];
    for (const bp of blueprints) {
      const transitions: any[] = bp.transitions ?? [];
      for (const t of transitions) {
        if (t.workflowId) {
          map.set(t.workflowId, {
            blueprintId: bp.id,
            blueprintName: bp.name,
            transitionId: t.id,
            transitionName: t.name,
          });
        }
      }
    }
  } catch {}
  return map;
}
