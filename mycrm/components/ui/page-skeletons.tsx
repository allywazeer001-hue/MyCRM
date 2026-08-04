import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Reusable, shape-mimicking loading placeholders — the same shimmer style
// established on the Data Quality page, just refined for more realistic
// proportions (varied line widths, avatar/icon circles, badge-shaped
// trailing elements) instead of uniform gray rectangles. These only ever
// render while a page's actual data fetch is genuinely in flight (the same
// `if (loading)` gate that used to render a spinner) — no artificial delay
// is added anywhere, so a fast/cached response still never shows one.

// A handful of varied percentages so repeated rows don't look identically
// blocky — cycles rather than random so server/client render the same markup.
const LINE_WIDTHS = ["92%", "68%", "84%", "56%", "97%", "74%"];
function lineWidth(i: number) {
  return LINE_WIDTHS[i % LINE_WIDTHS.length];
}

/** Icon square + title/subtitle stack + optional right-side action button. */
export function PageHeaderSkeleton({ withAction = false, withIcon = true }: { withAction?: boolean; withIcon?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {withIcon && <Skeleton className="w-9 h-9 rounded-xl shrink-0" />}
        <div className="space-y-2">
          <Skeleton className="h-4.5 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      {withAction && <Skeleton className="h-9 w-32 rounded-lg shrink-0" />}
    </div>
  );
}

/** Row of stat/metric cards — Dashboard, Campaigns, Data Quality, admin overviews. */
export function StatCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-2.5" style={{ width: lineWidth(i + 2) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A list/table — header row + N rows shaped like a real record row: leading
 *  icon, a title/subtitle stack of varied width, and a trailing badge. */
export function TableSkeleton({ rows = 6, columns = 4, showAvatar = true }: { rows?: number; columns?: number; showAvatar?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/40">
        {showAvatar && <div className="w-8 shrink-0" />}
        <Skeleton className="h-3 w-28" />
        <div className="flex-1" />
        {Array.from({ length: Math.max(columns - 1, 0) }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-14 shrink-0 hidden sm:block" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 px-4 py-3.5">
            {showAvatar && <Skeleton className="w-8 h-8 rounded-lg shrink-0" />}
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-3.5" style={{ width: lineWidth(r) }} />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            {columns > 2 && <Skeleton className="h-3 w-10 shrink-0 hidden sm:block" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Record-detail / settings-form shape — a wide main card plus a narrower sidebar card. */
export function DetailPageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <Skeleton className="w-5 h-5 rounded shrink-0" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4 items-center">
            <Skeleton className="h-2.5" style={{ width: lineWidth(i + 3) }} />
            <div className="col-span-2 space-y-1">
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
          <Skeleton className="h-2.5 w-3/5" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
          <Skeleton className="h-3.5 w-24" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <Skeleton className="h-2.5 flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full page: header + stat cards + a table — the shape most dashboards/list pages share. */
export function DashboardPageSkeleton({ statCount = 4, tableRows = 6 }: { statCount?: number; tableRows?: number }) {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withAction />
      <StatCardsSkeleton count={statCount} />
      <TableSkeleton rows={tableRows} />
    </div>
  );
}
