import { Skeleton } from "@/components/ui/skeleton";

export default function ModuleRecordsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <Skeleton className="h-10 w-full max-w-md rounded-lg" />

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <Skeleton className="h-9 w-full rounded-none" />
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
