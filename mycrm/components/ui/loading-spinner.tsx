import { cn } from "@/lib/utils";

export function LoadingSpinner({
  size = "md",
  label,
  className,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const sizes = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-8", className)}>
      <div
        className={cn(
          sizes[size],
          "animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
        )}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
