/**
 * One-time cleanup: strips any "activity_feed" ("Recent Activity") widget out
 * of every Dashboard's config.widgets — that widget was part of the default
 * seed given to brand-new dashboards and is no longer wanted, but dashboards
 * created before this change already have it persisted in their config.
 *
 * Usage:
 *   npx ts-node scripts/remove-activity-feed-widget.ts            # dry run (default, no writes)
 *   npx ts-node scripts/remove-activity-feed-widget.ts --apply     # actually writes rows
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const dashboards = await prisma.dashboard.findMany({
    select: { id: true, name: true, config: true },
  });

  const toFix = dashboards.filter(d => {
    const widgets = (d.config as any)?.widgets;
    return Array.isArray(widgets) && widgets.some((w: any) => w?.type === 'activity_feed');
  });

  console.log(`Found ${dashboards.length} dashboards, ${toFix.length} contain an activity_feed widget.`);

  for (const d of toFix) {
    const config = d.config as any;
    const widgets = config.widgets.filter((w: any) => w?.type !== 'activity_feed');

    console.log(`${apply ? 'Updating' : '[dry-run] Would update'} dashboard ${d.id} ("${d.name}") — removing ${config.widgets.length - widgets.length} widget(s).`);

    if (apply) {
      await prisma.dashboard.update({
        where: { id: d.id },
        data: { config: { ...config, widgets } },
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
