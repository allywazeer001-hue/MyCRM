"use client";
import { LUCIDE_MAP } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

const EMOJI_FALLBACK: Record<string, string> = {
  patients:  "🏥",
  employees: "👥",
  projects:  "📋",
  assets:    "🔧",
  inventory: "📦",
  donors:    "💝",
  cases:     "📁",
};

interface ModuleIconProps {
  icon?: string | null;
  slug?: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function ModuleIcon({ icon, slug = "", className, size, style: extraStyle }: ModuleIconProps) {
  const LIcon = icon ? LUCIDE_MAP[icon] : null;
  const sizeStyle = size ? { width: size, height: size } : undefined;
  const mergedStyle = { ...sizeStyle, ...extraStyle };

  if (LIcon) {
    return <LIcon className={cn(!size && "w-[18px] h-[18px]", className)} style={mergedStyle} />;
  }

  const fallback = icon || EMOJI_FALLBACK[slug] || "📦";
  return (
    <span
      className={cn("leading-none select-none", className)}
      style={{ fontSize: size ? size * 0.7 : 15, ...mergedStyle }}
    >
      {fallback}
    </span>
  );
}
