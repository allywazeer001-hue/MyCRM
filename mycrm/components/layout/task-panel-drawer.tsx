"use client";

import { useState } from "react";
import Link from "next/link";
import { useTaskPanelsStore } from "@/store/task-panels.store";
import {
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
  Plus,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Keys to probe in record.data to find a human-readable name/title
const NAME_KEYS = ["name", "title", "fullName", "firstName", "subject", "reference"];

function getRecordDisplayName(data: Record<string, any>): string {
  for (const key of NAME_KEYS) {
    const val = data[key];
    if (val != null && String(val).trim() !== "") {
      return String(val);
    }
  }
  return "Untitled record";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TaskPanelDrawer() {
  const {
    isOpen,
    panels,
    results,
    isLoadingPanels,
    loadingPanelId,
    openDrawer,
    closeDrawer,
  } = useTaskPanelsStore();

  // Track which panels are collapsed; all start expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (panelId: string) => {
    setCollapsed((prev) => ({ ...prev, [panelId]: !prev[panelId] }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col bg-white shadow-2xl",
          "w-full sm:w-[400px]"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Task Panels"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Task Panels</h2>

          <div className="flex items-center gap-1">
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
              onClick={() => openDrawer()}
              disabled={isLoadingPanels}
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoadingPanels && "animate-spin")}
              />
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
              onClick={closeDrawer}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingPanels ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : panels.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Clock className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                No task panels configured for your role.
              </p>
              <Link href="/settings/task-panels" onClick={closeDrawer}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Configure Task Panels
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {panels.map((panel) => {
                const result = results[panel.id];
                const isCollapsed = collapsed[panel.id] ?? false;
                const isPanelLoading = loadingPanelId === panel.id;
                const records = result?.records ?? [];
                const total = result?.total ?? 0;
                const newCount = result?.newCount ?? 0;

                return (
                  <div key={panel.id} className="px-4 py-3">
                    {/* Panel header */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 text-left group"
                      onClick={() => toggleCollapse(panel.id)}
                    >
                      {/* Color dot */}
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: panel.color || "#6B7280" }}
                      />

                      {/* Panel name */}
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                        {panel.name}
                      </span>

                      {/* Count badge */}
                      {total > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0 h-5"
                        >
                          {total}
                        </Badge>
                      )}

                      {/* New badge */}
                      {newCount > 0 && (
                        <Badge
                          variant="default"
                          className="text-xs px-1.5 py-0 h-5 bg-green-600"
                        >
                          {newCount} New
                        </Badge>
                      )}

                      {/* Expand/collapse chevron */}
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-gray-400 transition-transform shrink-0",
                          !isCollapsed && "rotate-90"
                        )}
                      />
                    </button>

                    {/* Records list */}
                    {!isCollapsed && (
                      <div className="mt-2 space-y-1">
                        {isPanelLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          </div>
                        ) : records.length === 0 ? (
                          <p className="py-3 text-center text-xs text-gray-400">
                            No records found.
                          </p>
                        ) : (
                          records.map((record) => {
                            const displayName = getRecordDisplayName(record.data);
                            const creatorName =
                              record.createdBy
                                ? `${record.createdBy.firstName} ${record.createdBy.lastName}`.trim()
                                : null;
                            const moduleSlug = result?.module?.slug;

                            const rowContent = (
                              <div className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-gray-50 transition-colors group/row">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm text-gray-800 truncate font-medium">
                                      {displayName}
                                    </span>
                                    {record.isNew && (
                                      <Badge
                                        variant="success"
                                        className="text-[10px] px-1 py-0 h-4 shrink-0"
                                      >
                                        NEW
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                                    {creatorName && (
                                      <span className="truncate max-w-[120px]">
                                        {creatorName}
                                      </span>
                                    )}
                                    {creatorName && (
                                      <span className="text-gray-300">·</span>
                                    )}
                                    <span className="flex items-center gap-0.5 shrink-0">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(record.createdAt)}
                                    </span>
                                  </div>
                                </div>

                                <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover/row:text-gray-500 transition-colors shrink-0 mt-0.5" />
                              </div>
                            );

                            return moduleSlug ? (
                              <Link
                                key={record.id}
                                href={`/m/${moduleSlug}/${record.id}`}
                                onClick={closeDrawer}
                                className="block"
                              >
                                {rowContent}
                              </Link>
                            ) : (
                              <div key={record.id}>{rowContent}</div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
