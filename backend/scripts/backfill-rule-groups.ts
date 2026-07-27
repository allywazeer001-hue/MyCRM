/**
 * One-time, opt-in backfill: wraps every Workflow that has zero WorkflowRuleGroup
 * rows into an explicit "Rule 1" rule group carrying its existing conditions/actions.
 *
 * Not required for correctness — workflows.service.ts already falls back to the
 * legacy conditions/actions path when no rule groups exist. This is only useful if
 * you want every workflow to have an explicit rule group for consistency/reporting.
 *
 * Usage:
 *   npx ts-node scripts/backfill-rule-groups.ts            # dry run (default, no writes)
 *   npx ts-node scripts/backfill-rule-groups.ts --apply     # actually writes rows
 *
 * Run against a copy of the database first.
 */
import { PrismaClient } from '@prisma/client';
import { normalizeConditionTree } from '../src/workflows/condition-tree';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const workflows = await prisma.workflow.findMany({
    include: {
      actions: { orderBy: { order: 'asc' } },
      ruleGroups: true,
    },
  });

  const toBackfill = workflows.filter(wf => wf.ruleGroups.length === 0);
  console.log(`Found ${workflows.length} workflows, ${toBackfill.length} need backfill.`);

  for (const wf of toBackfill) {
    const conditions = normalizeConditionTree(wf.conditions);
    const actions = wf.actions.map((a, i) => ({
      type: a.type,
      config: a.config,
      order: a.order ?? i,
    }));

    console.log(`${apply ? 'Creating' : '[dry-run] Would create'} Rule 1 for workflow ${wf.id} ("${wf.name}") — ${actions.length} action(s).`);

    if (apply) {
      await prisma.workflowRuleGroup.create({
        data: {
          workflowId: wf.id,
          name: 'Rule 1',
          order: 0,
          isActive: true,
          conditions: conditions as any,
          actions: actions as any,
        },
      });
    }
  }

  if (!apply) {
    console.log('\nDry run only — re-run with --apply to write these rows.');
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
