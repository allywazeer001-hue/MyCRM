import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Reusable, shape-mimicking loading placeholders — the same style already
// established on the Data Quality page (gray pulsing blocks laid out like
// the real content, not a spinner). These only ever render while a page's
// actual data fetch is genuinely in flight (the same `if (loading)` gate
// that used to render a spinner) — no artificial delay/minimum-display-time
// is added anywhere, so a fast/cached response still never shows one.

/** Header title/subtitle + optional right-side action button. */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      {withAction && <Skeleton className="h-9 w-28 rounded-lg" />}
    </div>
  );
}

/** Row of stat/metric cards — Dashboard, Campaigns, Data Quality, admin overviews. */
export function StatCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A table/list — header row + N shimmer rows, each with a few "columns". */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === 0 ? "w-32" : "w-16")} />
        ))}
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-3.5", c === 0 ? "flex-1 max-w-[160px]" : "w-16 shrink-0")} />
            ))}
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
      <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-4 items-center">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full col-span-2 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-full" />
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
