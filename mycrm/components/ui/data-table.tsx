"use client";
/**
 * DataTable — enterprise table component.
 * Features: column sorting, column visibility toggle, column reorder (drag),
 *           client-side pagination, sticky header, and empty/loading states.
 *
 * Usage:
 *   const cols: Column<MyRow>[] = [
 *     { key: "name",  header: "Name",   render: r => r.name, sortable: true },
 *     { key: "email", header: "Email",  render: r => r.email },
 *   ];
 *   <DataTable columns={cols} data={rows} pageSize={20} />
 */

import { useState, useCallback, useRef } from "react";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
  Eye, EyeOff, GripVertical, Settings2,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  /** Raw value extractor for sorting (defaults to render output) */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Minimum pixel width */
  minWidth?: number;
  /** Hide this column by default */
  defaultHidden?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pageSize?: number;
  rowKey?: (row: T) => string | number;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
}

type SortDir = "asc" | "desc" | null;

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc")  return <ChevronUp   className="w-3.5 h-3.5 shrink-0" />;
  if (dir === "desc") return <ChevronDown className="w-3.5 h-3.5 shrink-0" />;
  return <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-gray-300" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  pageSize = 25,
  rowKey,
  emptyMessage = "No records found",
  className,
  stickyHeader = true,
  onRowClick,
}: DataTableProps<T>) {

  // ── Column order (stores keys in display order) ──────────────────────────
  const [colOrder, setColOrder] = useState<string[]>(columns.map(c => c.key));

  // ── Column visibility ────────────────────────────────────────────────────
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter(c => c.defaultHidden).map(c => c.key))
  );

  // ── Sorting ──────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  function handleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey !== col.key) { setSortKey(col.key); setSortDir("asc"); return; }
    if (sortDir === "asc")   { setSortDir("desc"); return; }
    setSortKey(null); setSortDir(null);
  }

  // ── Pagination ───────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Column visibility panel ──────────────────────────────────────────────
  const [visPanel, setVisPanel] = useState(false);

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const dragKey = useRef<string | null>(null);

  function onDragStart(key: string) { dragKey.current = key; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(targetKey: string) {
    if (!dragKey.current || dragKey.current === targetKey) return;
    setColOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragKey.current!);
      const to   = next.indexOf(targetKey);
      next.splice(from, 1);
      next.splice(to, 0, dragKey.current!);
      return next;
    });
    dragKey.current = null;
  }

  // ── Sorted + ordered columns ─────────────────────────────────────────────
  const orderedCols = colOrder
    .map(k => columns.find(c => c.key === k)!)
    .filter(Boolean)
    .filter(c => !hidden.has(c.key));

  // ── Sorted data ──────────────────────────────────────────────────────────
  const sorted = useCallback((): T[] => {
    if (!sortKey || !sortDir) return data;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;
    return [...data].sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : String(col.render(a, 0) ?? "");
      const bv = col.sortValue ? col.sortValue(b) : String(col.render(b, 0) ?? "");
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  // ── Paginated data ───────────────────────────────────────────────────────
  const sortedData  = sorted();
  const totalPages  = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage    = Math.min(page, totalPages);
  const pageData    = sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageRange = (() => {
    const pages: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) pages.push(i);
      else if (pages[pages.length - 1] !== "…") pages.push("…");
    }
    return pages;
  })();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">
          {loading ? "Loading…" : `${sortedData.length} record${sortedData.length !== 1 ? "s" : ""}`}
        </span>

        {/* Column visibility toggle */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setVisPanel(p => !p)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Columns
            {hidden.size > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                {hidden.size} hidden
              </span>
            )}
          </Button>
          {visPanel && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-xl p-3 min-w-[180px]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Columns</p>
              <div className="space-y-1">
                {colOrder.map(k => {
                  const col = columns.find(c => c.key === k);
                  if (!col) return null;
                  const isHidden = hidden.has(k);
                  return (
                    <button
                      key={k}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left hover:bg-gray-50 transition"
                      onClick={() => {
                        setHidden(prev => {
                          const next = new Set(prev);
                          if (next.has(k)) next.delete(k); else next.add(k);
                          return next;
                        });
                      }}
                    >
                      {isHidden
                        ? <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                        : <Eye    className="w-3.5 h-3.5 text-blue-500" />}
                      <span className={cn("flex-1 truncate", isHidden && "text-gray-400")}>{col.header}</span>
                    </button>
                  );
                })}
              </div>
              <button
                className="mt-2 w-full text-xs text-blue-600 hover:underline text-center"
                onClick={() => setHidden(new Set())}
              >
                Show all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={cn("bg-gray-50 border-b border-gray-200", stickyHeader && "sticky top-0 z-10")}>
              <tr>
                {orderedCols.map(col => {
                  const dir = sortKey === col.key ? sortDir : null;
                  return (
                    <th
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap select-none",
                        col.sortable && "cursor-pointer hover:bg-gray-100 transition",
                      )}
                      style={{ minWidth: col.minWidth }}
                      draggable
                      onDragStart={() => onDragStart(col.key)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(col.key)}
                      onClick={() => handleSort(col)}
                    >
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-gray-300 cursor-grab shrink-0" />
                        {col.header}
                        {col.sortable && <SortIcon dir={dir} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {orderedCols.map(col => (
                      <td key={col.key} className="px-3 py-3">
                        <div className="h-4 rounded bg-gray-100 animate-pulse" style={{ width: `${40 + (i * 17 + col.key.length * 7) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={orderedCols.length} className="px-3 py-12 text-center text-sm text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageData.map((row, i) => {
                  const key = rowKey ? rowKey(row) : (safePage - 1) * pageSize + i;
                  return (
                    <tr
                      key={key}
                      className={cn(
                        "hover:bg-gray-50/70 transition-colors",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {orderedCols.map(col => (
                        <td key={col.key} className="px-3 py-2.5 text-gray-800">
                          {col.render(row, (safePage - 1) * pageSize + i)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-gray-500">
            Page {safePage} of {totalPages} · {sortedData.length} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon"
              className="w-7 h-7"
              disabled={safePage === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {pageRange.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={cn(
                    "w-7 h-7 rounded-lg text-xs font-medium transition",
                    p === safePage
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {p}
                </button>
              )
            )}
            <Button
              variant="outline" size="icon"
              className="w-7 h-7"
              disabled={safePage === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
