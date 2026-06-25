"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  CheckCircle2, Circle, Clock, AlertTriangle, StickyNote,
  Plus, ChevronLeft, ChevronRight, Loader2, X, Trash2,
  Pin, Edit2, Check, CalendarDays, Users, ArrowRight,
  MoreHorizontal, CheckCheck, Building2, BellRing,
  Inbox, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth.store";
import { getDisplayName } from "@/lib/user";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WUser {
  id: string; firstName: string; lastName: string;
  avatar?: string; jobTitle?: string;
}
interface WDept { id: string; name: string; color: string }
interface Task {
  id: string; title: string; description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  pinned: boolean;
  dueDate?: string; reminderAt?: string;
  assignedTo?: WUser; assignedBy: WUser;
  department?: WDept;
  createdAt: string;
}
interface Note { id: string; content: string; color: string; pinned: boolean; updatedAt: string }
interface Summary {
  todayTasks: number; pendingTasks: number;
  overdueTasks: number; assignedToMe: number; notes: number;
}
type TaskFilter = "pending" | "today" | "scheduled" | "overdue";

// ── Static config ──────────────────────────────────────────────────────────────

const PRIORITY: Record<string, { label: string; badge: string; dot: string; accent: string }> = {
  critical: { label: "Critical", badge: "bg-red-100 text-red-700 border border-red-200",          dot: "bg-red-500",    accent: "bg-red-400"    },
  high:     { label: "High",     badge: "bg-orange-100 text-orange-700 border border-orange-200", dot: "bg-orange-500", accent: "bg-orange-400" },
  medium:   { label: "Medium",   badge: "bg-yellow-100 text-yellow-700 border border-yellow-200", dot: "bg-yellow-500", accent: "bg-yellow-400" },
  low:      { label: "Low",      badge: "bg-gray-100 text-gray-500 border border-gray-200",       dot: "bg-gray-400",   accent: "bg-gray-300"   },
};

const NOTE_COLORS = [
  { key: "yellow", bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-900",  dot: "bg-amber-400",  toolbar: "bg-amber-100"  },
  { key: "blue",   bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-900",   dot: "bg-blue-400",   toolbar: "bg-blue-100"   },
  { key: "green",  bg: "bg-green-50",  border: "border-green-200",  text: "text-green-900",  dot: "bg-green-400",  toolbar: "bg-green-100"  },
  { key: "pink",   bg: "bg-pink-50",   border: "border-pink-200",   text: "text-pink-900",   dot: "bg-pink-400",   toolbar: "bg-pink-100"   },
  { key: "purple", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", dot: "bg-purple-400", toolbar: "bg-purple-100" },
];
const noteStyle = (c: string) => NOTE_COLORS.find(n => n.key === c) ?? NOTE_COLORS[0];

const FILTERS: { key: TaskFilter; label: string; badgeKey?: "pendingTasks" | "todayTasks" | "overdueTasks" }[] = [
  { key: "pending",   label: "Pending Tasks", badgeKey: "pendingTasks"  },
  { key: "today",     label: "Today Tasks",   badgeKey: "todayTasks"    },
  { key: "scheduled", label: "Scheduled"                                 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDue(d?: string): { label: string; red: boolean } {
  if (!d) return { label: "No due date", red: false };
  const date = new Date(d);
  const now = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const due      = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (due < today)                          return { label: `Overdue · ${date.toLocaleDateString("en", { month: "short", day: "numeric" })}`, red: true };
  if (due.getTime() === today.getTime())    return { label: "Due today",    red: false };
  if (due.getTime() === tomorrow.getTime()) return { label: "Due tomorrow", red: false };
  return { label: date.toLocaleDateString("en", { month: "short", day: "numeric" }), red: false };
}

function UserAvatar({ user, size = "sm" }: { user?: WUser; size?: "xs" | "sm" | "md" }) {
  if (!user) return null;
  const initials = `${user.firstName[0]}${user.lastName[0]}`;
  const cls = size === "xs" ? "w-5 h-5 text-[9px]" : size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";
  if (user.avatar)
    return <img src={user.avatar} alt={initials} className={cn("rounded-full object-cover shrink-0 border border-white", cls)} />;
  return (
    <span className={cn("rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold flex items-center justify-center shrink-0", cls)}>
      {initials}
    </span>
  );
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDate, onSelect, dots,
}: { selectedDate: Date; onSelect: (d: Date) => void; dots: Record<string, string[]> }) {
  const [view, setView] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const offset      = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {view.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
          const hasDots     = dots[key];
          const isToday     = day.getTime() === today.getTime();
          const isSel       = day.toDateString() === selectedDate.toDateString();
          const hasHighPri  = hasDots?.some(p => p === "critical" || p === "high");
          return (
            <button key={key} onClick={() => onSelect(day)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                isSel   ? "bg-blue-600 text-white shadow-sm" :
                isToday ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" :
                          "hover:bg-gray-100 text-gray-600",
              )}>
              {day.getDate()}
              {hasDots && !isSel && (
                <span className={cn("absolute bottom-0.5 w-1 h-1 rounded-full",
                  hasHighPri ? "bg-red-500" : "bg-blue-400")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────

function CalSyncBadge({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "synced")  return <span title="Synced with Google Calendar" className="flex items-center gap-0.5 text-[9px] text-green-600 bg-green-50 rounded-full px-1.5 py-px font-semibold shrink-0">🟢 Synced</span>;
  if (status === "pending") return <span title="Sync pending" className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 rounded-full px-1.5 py-px font-semibold shrink-0">🟡 Pending</span>;
  if (status === "failed")  return <span title="Sync failed" className="flex items-center gap-0.5 text-[9px] text-red-600 bg-red-50 rounded-full px-1.5 py-px font-semibold shrink-0">🔴 Failed</span>;
  return null;
}

function TaskCard({
  task, currentUserId, onClick, onToggleDone, calSyncStatus,
}: {
  task: Task; currentUserId: string;
  onClick: () => void;
  onToggleDone: (e: React.MouseEvent) => void;
  calSyncStatus?: string;
}) {
  const due            = formatDue(task.dueDate);
  const isDone         = task.status === "done";
  const isAssignedToMe = task.assignedTo?.id === currentUserId;
  const isDeptTask     = !!task.department && !task.assignedTo;
  const pri            = PRIORITY[task.priority] ?? PRIORITY.medium;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group flex flex-col bg-white rounded-2xl border border-gray-100 cursor-pointer",
        "shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200",
        "h-[172px]",
        isDone && "opacity-55 bg-gray-50",
      )}>
      <div className="flex flex-col flex-1 min-h-0 p-4 gap-2.5">

        {/* Row 1: state badges + priority */}
        <div className="flex items-center gap-1.5 min-h-[18px]">
          {task.pinned && !isDone && (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 rounded-full px-1.5 py-px font-semibold shrink-0">
              <Pin className="w-2 h-2" /> Pinned
            </span>
          )}
          {isAssignedToMe && !isDone && (
            <span className="text-[9px] text-blue-600 bg-blue-50 rounded-full px-1.5 py-px font-semibold shrink-0">
              For you
            </span>
          )}
          {isDeptTask && !isDone && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-gray-600 bg-gray-100 rounded-full px-1.5 py-px font-medium shrink-0 max-w-[80px] truncate">
              <Building2 className="w-2 h-2 shrink-0" />{task.department!.name}
            </span>
          )}
          <CalSyncBadge status={calSyncStatus} />
          <span className="text-[9px] text-gray-400 bg-gray-50 rounded-full px-1.5 py-px font-medium ml-auto shrink-0">
            {pri.label}
          </span>
        </div>

        {/* Row 2: checkbox + title */}
        <div className="flex items-start gap-2.5 flex-1 min-h-0">
          <button
            onClick={onToggleDone}
            className={cn("mt-px shrink-0 transition-colors z-10",
              isDone ? "text-green-500" : "text-gray-300 hover:text-green-400")}
          >
            {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2",
              isDone && "line-through text-gray-400",
            )}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 leading-snug">{task.description}</p>
            )}
          </div>
        </div>

        {/* Row 3: footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1 text-[10px] text-gray-400 min-w-0 flex-1 overflow-hidden">
            <UserAvatar user={task.assignedBy} size="xs" />
            <span className="truncate max-w-[44px]">{task.assignedBy.firstName}</span>
            {task.assignedTo && (
              <>
                <ArrowRight className="w-2 h-2 text-gray-300 shrink-0" />
                <UserAvatar user={task.assignedTo} size="xs" />
                <span className={cn("truncate max-w-[44px]",
                  isAssignedToMe ? "text-blue-500 font-medium" : "text-gray-400")}>
                  {isAssignedToMe ? "You" : task.assignedTo.firstName}
                </span>
              </>
            )}
          </div>
          {task.dueDate ? (
            <span className={cn("flex items-center gap-0.5 text-[10px] shrink-0",
              due.red ? "text-red-400 font-medium" : "text-gray-400")}>
              <CalendarDays className="w-2.5 h-2.5" />
              {due.label.replace("Overdue · ", "⚠ ")}
            </span>
          ) : task.reminderAt && !isDone ? (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 shrink-0">
              <BellRing className="w-2.5 h-2.5" />
              {new Date(task.reminderAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Task Detail Modal ──────────────────────────────────────────────────────────

function TaskDetailModal({ task, currentUserId, onClose, onToggleDone, onTogglePin, onDelete }: {
  task: Task; currentUserId: string;
  onClose: () => void;
  onToggleDone: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const due            = formatDue(task.dueDate);
  const isDone         = task.status === "done";
  const isAssignedToMe = task.assignedTo?.id === currentUserId;
  const pri            = PRIORITY[task.priority] ?? PRIORITY.medium;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const topAccent =
    task.pinned    ? "bg-amber-400"  :
    isAssignedToMe ? "bg-blue-500"   :
    pri.accent;

  const statusLabel =
    task.status === "done"        ? "Done"        :
    task.status === "in_progress" ? "In progress" : "To do";
  const statusClass =
    task.status === "done"        ? "bg-green-100 text-green-700"  :
    task.status === "in_progress" ? "bg-blue-100 text-blue-700"    :
                                    "bg-gray-100 text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden z-10
                      animate-in fade-in zoom-in-95 duration-150">
        {/* Top accent */}
        <div className={cn("h-1 w-full shrink-0", topAccent)} />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <button
                onClick={onToggleDone}
                className={cn("mt-1 shrink-0 transition-colors",
                  isDone ? "text-green-500" : "text-gray-300 hover:text-green-500")}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <h2 className={cn(
                "flex-1 text-lg font-bold text-gray-900 leading-snug",
                isDone && "line-through text-gray-400",
              )}>
                {task.title}
              </h2>
              <button onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status + priority badges */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", statusClass)}>
                {statusLabel}
              </span>
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", pri.badge)}>
                {pri.label} priority
              </span>
              {task.pinned && (
                <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 font-semibold">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="mb-5 bg-gray-50 rounded-xl p-3.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Detail rows */}
            <div className="space-y-3.5">
              {/* From */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0">From</span>
                <div className="flex items-center gap-2">
                  <UserAvatar user={task.assignedBy} size="sm" />
                  <span className="text-sm font-medium text-gray-800">
                    {getDisplayName(task.assignedBy)}
                  </span>
                  {task.assignedBy.jobTitle && (
                    <span className="text-xs text-gray-400">· {task.assignedBy.jobTitle}</span>
                  )}
                </div>
              </div>

              {/* Assigned to */}
              {task.assignedTo && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 shrink-0">Assigned to</span>
                  <div className="flex items-center gap-2">
                    <UserAvatar user={task.assignedTo} size="sm" />
                    <span className={cn("text-sm font-medium", isAssignedToMe ? "text-blue-600" : "text-gray-800")}>
                      {isAssignedToMe ? "You" : getDisplayName(task.assignedTo)}
                    </span>
                    {task.assignedTo.jobTitle && !isAssignedToMe && (
                      <span className="text-xs text-gray-400">· {task.assignedTo.jobTitle}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Department */}
              {task.department && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 shrink-0">Department</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1">
                    <Building2 className="w-3 h-3" />{task.department.name}
                  </span>
                </div>
              )}

              {/* Due date */}
              {task.dueDate && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 shrink-0">Due date</span>
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium",
                    due.red ? "text-red-600" : "text-gray-700")}>
                    <CalendarDays className="w-4 h-4" />
                    {new Date(task.dueDate).toLocaleDateString("en", {
                      weekday: "short", month: "long", day: "numeric", year: "numeric",
                    })}
                    {due.red && <span className="text-xs font-semibold text-red-400 ml-1">Overdue</span>}
                  </span>
                </div>
              )}

              {/* Reminder */}
              {task.reminderAt && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 shrink-0">Reminder</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                    <BellRing className="w-4 h-4" />
                    {new Date(task.reminderAt).toLocaleDateString("en", { month: "long", day: "numeric" })}
                    {" at "}
                    {new Date(task.reminderAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}

              {/* Created */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0">Created</span>
                <span className="text-sm text-gray-500">
                  {new Date(task.createdAt).toLocaleDateString("en", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0 flex items-center gap-2.5">
          <button
            onClick={() => { onToggleDone(); onClose(); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              isDone
                ? "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                : "bg-gray-900 text-white hover:bg-gray-800",
            )}>
            {isDone
              ? <><Circle className="w-4 h-4" /> Reopen</>
              : <><CheckCircle2 className="w-4 h-4" /> Mark as done</>}
          </button>
          <button
            onClick={onTogglePin}
            title={task.pinned ? "Unpin" : "Pin"}
            className={cn(
              "p-2.5 rounded-xl border transition-colors",
              task.pinned
                ? "bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-100",
            )}>
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            title="Delete"
            className="p-2.5 rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Task Form ──────────────────────────────────────────────────────────────

function NewTaskForm({
  users, departments, onSave, onCancel,
}: {
  users: WUser[]; departments: WDept[];
  onSave: (data: any) => Promise<void>; onCancel: () => void;
}) {
  const [title, setTitle]          = useState("");
  const [priority, setPriority]    = useState("medium");
  const [dueDate, setDueDate]      = useState("");
  const [reminderAt, setReminder]  = useState("");
  const [assignTo, setAssignTo]    = useState("");
  const [deptId, setDeptId]        = useState("");
  const [description, setDesc]     = useState("");
  const [showMore, setShowMore]    = useState(false);
  const [saving, setSaving]        = useState(false);
  const [assignMode, setAssignMode] = useState<"user" | "dept">("user");

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate:      dueDate     || null,
      reminderAt:   reminderAt  || null,
      assignedToId: assignMode === "user" ? (assignTo || null) : null,
      departmentId: assignMode === "dept" ? (deptId   || null) : null,
    });
    setSaving(false);
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-3.5 mb-3 space-y-3 shadow-sm">
      <Input autoFocus value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Task title…"
        className="h-8 text-sm font-medium border-gray-200"
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSave(); if (e.key === "Escape") onCancel(); }}
      />

      {/* Row 1: priority + due date */}
      <div className="flex gap-2 flex-wrap">
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
          <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1" />
        </div>
      </div>

      {/* Row 2: reminder */}
      <div className="flex items-center gap-1.5">
        <BellRing className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <input type="datetime-local" value={reminderAt} onChange={e => setReminder(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1" />
        <span className="text-[10px] text-gray-400 shrink-0">Reminder</span>
      </div>

      {/* Row 3: assign to user OR department toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
          <button onClick={() => setAssignMode("user")}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              assignMode === "user" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}>
            <Users className="w-3 h-3 inline mr-1" />Person
          </button>
          <button onClick={() => setAssignMode("dept")}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              assignMode === "dept" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}>
            <Building2 className="w-3 h-3 inline mr-1" />Department
          </button>
        </div>

        {assignMode === "user" ? (
          <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
            className="w-full h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Assign to person…</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}{u.jobTitle ? ` · ${u.jobTitle}` : ""}</option>
            ))}
          </select>
        ) : (
          <select value={deptId} onChange={e => setDeptId(e.target.value)}
            className="w-full h-7 text-xs border border-gray-200 rounded-lg px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="">Assign to department…</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Optional description */}
      <button onClick={() => setShowMore(v => !v)}
        className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
        {showMore ? "− Hide" : "+ Add"} description
      </button>
      {showMore && (
        <textarea value={description} onChange={e => setDesc(e.target.value)}
          placeholder="Optional description…"
          rows={2}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs px-3" onClick={handleSave} disabled={!title.trim() || saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
          Add task
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Note Card ──────────────────────────────────────────────────────────────────

function NoteCard({ note, onUpdate, onDelete }: {
  note: Note; onUpdate: (p: Partial<Note>) => Promise<void>; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(note.content);
  const s = noteStyle(note.color);

  const save = async () => {
    if (draft.trim() !== note.content) await onUpdate({ content: draft.trim() });
    setEditing(false);
  };

  return (
    <div className={cn("rounded-xl border p-3 group relative transition-shadow hover:shadow-sm", s.bg, s.border)}>
      <div className={cn("absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg px-1 py-0.5", s.toolbar)}>
        <button onClick={() => onUpdate({ pinned: !note.pinned })}
          className={cn("p-1 rounded transition-colors hover:opacity-70", note.pinned ? s.text : "text-gray-400")}>
          <Pin className="w-3 h-3" />
        </button>
        {NOTE_COLORS.map(c => (
          <button key={c.key} onClick={() => onUpdate({ color: c.key })}
            className={cn("w-3 h-3 rounded-full transition-transform hover:scale-125", c.dot,
              note.color === c.key && "ring-1 ring-offset-1 ring-gray-400")} />
        ))}
        <button onClick={() => setEditing(true)} className={cn("p-1 rounded transition-colors", s.text)}>
          <Edit2 className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      {note.pinned && <Pin className={cn("w-3 h-3 mb-1", s.text)} />}

      {editing ? (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === "Escape") { setDraft(note.content); setEditing(false); } }}
          className={cn("w-full text-xs resize-none bg-transparent border-none outline-none leading-relaxed min-h-[60px]", s.text)} />
      ) : (
        <p className={cn("text-xs leading-relaxed whitespace-pre-wrap break-words pr-4 cursor-text", s.text)}
          onClick={() => setEditing(true)}>
          {note.content}
        </p>
      )}

      <p className="text-[10px] text-gray-400 mt-2">
        {new Date(note.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

// ── Pinned Task Card (grid) ────────────────────────────────────────────────────

const PIN_HEAD: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-amber-400",
  low:      "bg-gray-400",
};
const PIN_NOTE: Record<string, string> = {
  yellow: "bg-amber-400", blue: "bg-blue-400",
  green:  "bg-green-400", pink: "bg-pink-400", purple: "bg-purple-400",
};

function PinnedTaskCard({
  task, currentUserId, onToggleDone, onUnpin,
}: { task: Task; currentUserId: string; onToggleDone: () => void; onUnpin: () => void }) {
  const due  = formatDue(task.dueDate);
  const isDone         = task.status === "done";
  const isAssignedToMe = task.assignedTo?.id === currentUserId;
  const isDeptTask     = !!task.department && !task.assignedTo;
  const pri            = PRIORITY[task.priority] ?? PRIORITY.medium;
  const pinHead        = PIN_HEAD[task.priority] ?? "bg-amber-400";

  return (
    <div className={cn(
      "flex flex-col rounded-2xl border bg-white",
      "shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.13)] hover:-translate-y-1 transition-all duration-200",
      isAssignedToMe ? "border-blue-200" : isDeptTask ? "border-violet-200" : "border-gray-200/80",
      isDone && "opacity-55",
    )}>
      {/* Thumbtack */}
      <div className="flex justify-center pt-4 pb-1.5">
        <div className="flex flex-col items-center">
          <div className={cn("w-6 h-6 rounded-full border-[3px] border-white shadow-[0_3px_8px_rgba(0,0,0,0.25)]", pinHead)} />
          <div className="w-px h-3 bg-gray-300/60" />
        </div>
      </div>

      <div className="px-3.5 pb-3.5 flex flex-col gap-2.5 flex-1">
        {/* Badges row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {isAssignedToMe && (
              <span className="text-[9px] bg-blue-600 text-white rounded-full px-1.5 py-px font-bold">
                For you
              </span>
            )}
            {isDeptTask && (
              <span className="text-[9px] bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-1.5 py-px font-bold flex items-center gap-0.5">
                <Building2 className="w-2 h-2" />{task.department!.name}
              </span>
            )}
          </div>
          <button onClick={onUnpin} title="Unpin"
            className="p-1 text-amber-400 hover:text-gray-400 transition-colors shrink-0 rounded-lg hover:bg-gray-100">
            <Pin className="w-3 h-3" />
          </button>
        </div>

        {/* Title */}
        <p className={cn("text-xs font-semibold text-gray-800 leading-snug line-clamp-3 flex-1", isDone && "line-through text-gray-400")}>
          {task.title}
        </p>

        {/* Priority + due */}
        <div className="flex items-center justify-between gap-1">
          <span className={cn("text-[9px] px-1.5 py-px rounded-full font-bold", pri.badge)}>
            {pri.label}
          </span>
          {task.dueDate && (
            <span className={cn("text-[10px] font-medium tabular-nums shrink-0", due.red ? "text-red-500" : "text-gray-400")}>
              {due.red ? "⚠ " : ""}{due.label.replace("Overdue · ", "")}
            </span>
          )}
        </div>

        {/* Assignee chain */}
        <div className="flex items-center gap-1">
          <UserAvatar user={task.assignedBy} size="xs" />
          {task.assignedTo && (
            <>
              <ArrowRight className="w-2.5 h-2.5 text-gray-300 shrink-0" />
              <UserAvatar user={task.assignedTo} size="xs" />
            </>
          )}
        </div>

        {/* Done toggle */}
        <button onClick={onToggleDone}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-colors",
            isDone
              ? "bg-green-100 text-green-700"
              : "bg-gray-50 border border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-200 hover:text-green-700",
          )}>
          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
          {isDone ? "Done" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

// ── Pinned Note Card (grid) ────────────────────────────────────────────────────

function PinnedNoteCard({ note, onUnpin }: { note: Note; onUnpin: () => void }) {
  const s       = noteStyle(note.color);
  const pinHead = PIN_NOTE[note.color] ?? "bg-amber-400";

  return (
    <div className={cn(
      "flex flex-col rounded-2xl border",
      "shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.13)] hover:-translate-y-1 transition-all duration-200",
      s.bg, s.border,
    )}>
      {/* Thumbtack */}
      <div className="flex justify-center pt-4 pb-1.5">
        <div className="flex flex-col items-center">
          <div className={cn("w-6 h-6 rounded-full border-[3px] border-white/80 shadow-[0_3px_8px_rgba(0,0,0,0.20)]", pinHead)} />
          <div className="w-px h-3 bg-gray-500/25" />
        </div>
      </div>

      <div className="px-3.5 pb-3.5 flex flex-col gap-2.5 flex-1">
        <p className={cn("text-xs leading-relaxed whitespace-pre-wrap break-words line-clamp-5 flex-1", s.text)}>
          {note.content}
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-black/5">
          <span className={cn("text-[10px] opacity-60", s.text)}>
            {new Date(note.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
          <button onClick={onUnpin} title="Unpin"
            className={cn("p-1 rounded-lg transition-colors hover:bg-black/10", s.text)}>
            <Pin className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact Note (left panel) ──────────────────────────────────────────────────

function CompactNoteItem({ note, onUpdate, onDelete }: {
  note: Note;
  onUpdate: (p: Partial<Note>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(note.content);
  const s = noteStyle(note.color);

  const save = async () => {
    if (draft.trim() && draft.trim() !== note.content) await onUpdate({ content: draft.trim() });
    setEditing(false);
  };

  return (
    <div className={cn(
      "group relative rounded-xl border overflow-hidden transition-all hover:shadow-sm",
      s.bg, s.border,
    )}>
      <div className="flex items-stretch gap-0">
        {/* Left color strip */}
        <div className={cn("w-[3px] shrink-0", s.dot)} />

        {/* Content area */}
        <div className="flex-1 px-3 py-2.5 min-w-0">
          {note.pinned && !editing && (
            <Pin className={cn("w-2.5 h-2.5 mb-1", s.text)} />
          )}
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={e => {
                if (e.key === "Escape") { setDraft(note.content); setEditing(false); }
                if (e.key === "Enter" && e.metaKey) save();
              }}
              rows={2}
              className={cn("w-full text-xs resize-none bg-transparent border-none outline-none leading-relaxed", s.text)}
            />
          ) : (
            <p
              onClick={() => setEditing(true)}
              className={cn("text-xs leading-relaxed line-clamp-2 cursor-text", s.text)}>
              {note.content}
            </p>
          )}
        </div>

        {/* Hover actions */}
        <div className="flex flex-col items-center justify-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onUpdate({ pinned: !note.pinned })}
            className={cn("p-1 rounded-md transition-colors", note.pinned ? s.text : "text-gray-400 hover:text-gray-600")}>
            <Pin className="w-3 h-3" />
          </button>
          <div className="flex gap-0.5">
            {NOTE_COLORS.map(c => (
              <button key={c.key} onClick={() => onUpdate({ color: c.key })}
                className={cn("w-2.5 h-2.5 rounded-full transition-transform hover:scale-125", c.dot,
                  note.color === c.key && "ring-1 ring-offset-1 ring-gray-400")} />
            ))}
          </div>
          <button onClick={onDelete} className="p-1 rounded-md text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assigned Item (right panel) ────────────────────────────────────────────────

function AssignedItem({ task, onToggleDone }: { task: Task; onToggleDone: () => void }) {
  const due        = formatDue(task.dueDate);
  const isDone     = task.status === "done";
  const isDeptTask = !!task.department && !task.assignedTo;
  const pri        = PRIORITY[task.priority] ?? PRIORITY.medium;

  const accentBar =
    isDone        ? "bg-gray-300" :
    task.pinned   ? "bg-amber-400" :
    isDeptTask    ? "bg-violet-400" :
                    "bg-blue-400";

  return (
    <div className={cn(
      "relative group bg-white rounded-xl border overflow-hidden transition-all hover:shadow-sm",
      isDone        ? "border-gray-100 opacity-60"  :
      task.pinned   ? "border-amber-200"             :
      isDeptTask    ? "border-violet-200"            :
                      "border-blue-100",
    )}>
      {/* Priority accent bar */}
      <div className={cn("absolute left-0 inset-y-0 w-[3px]", accentBar)} />

      <div className="pl-4 pr-3 py-3 flex items-start gap-2.5">
        <button onClick={onToggleDone}
          className={cn("mt-0.5 shrink-0 transition-colors",
            isDone ? "text-green-500" : "text-blue-400 hover:text-green-500")}>
          {isDone ? <CheckCircle2 className="w-[18px] h-[18px]" /> : <Circle className="w-[18px] h-[18px]" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold text-gray-800 leading-snug mb-1.5", isDone && "line-through text-gray-400")}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <UserAvatar user={task.assignedBy} size="xs" />
              <span className="font-medium">{task.assignedBy.firstName}</span>
            </span>
            {task.dueDate && (
              <span className={cn("flex items-center gap-0.5 text-[10px]",
                due.red ? "text-red-500 font-semibold" : "text-gray-400")}>
                <CalendarDays className="w-2.5 h-2.5 shrink-0" />
                {due.label.replace("Overdue · ", "⚠ ")}
              </span>
            )}
            {isDeptTask && task.department && (
              <span className="flex items-center gap-0.5 text-[10px] text-violet-600 bg-violet-50 border border-violet-200 rounded px-1 py-px">
                <Building2 className="w-2 h-2" />{task.department.name}
              </span>
            )}
            {task.pinned && !isDone && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                <Pin className="w-2 h-2" />pinned
              </span>
            )}
          </div>
        </div>
        <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full mt-1.5", pri.dot)} title={pri.label} />
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accent, onClick, active, alert }: {
  label: string; value: number | undefined; icon: any; accent: string;
  onClick?: () => void; active?: boolean; alert?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        "relative min-w-0 flex items-center gap-3 sm:gap-4 bg-white border rounded-2xl px-3 sm:px-5 py-3 sm:py-4 text-left transition-all hover:shadow-md hover:-translate-y-px",
        active ? "border-blue-400 ring-1 ring-blue-200 shadow-sm" : "border-gray-200 hover:border-gray-300",
      )}>
      {alert && (value ?? 0) > 0 && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-4.5 h-4.5" />
      </span>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {value !== undefined
            ? value
            : <span className="inline-block w-7 h-5 bg-gray-100 rounded animate-pulse" />}
        </p>
        <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      </div>
    </button>
  );
}

// ── Requests Queue Strip ───────────────────────────────────────────────────────

const REQ_STATUS: Record<string, { label: string; color: string }> = {
  OPEN:        { label: "Open",        color: "#3b82f6" },
  IN_PROGRESS: { label: "In Progress", color: "#f97316" },
  ON_HOLD:     { label: "On Hold",     color: "#eab308" },
  COMPLETED:   { label: "Completed",   color: "#22c55e" },
  REJECTED:    { label: "Rejected",    color: "#ef4444" },
};

function RequestsQueueStrip() {
  const [queue, setQueue] = useState<{ myRequests: any[]; assignedToMe: any[]; teamQueue: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/requests/queue").then(r => setQueue(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!queue) return null;

  const total = queue.myRequests.length + queue.assignedToMe.length + queue.teamQueue.length;
  if (total === 0) return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 flex items-center gap-3">
      <Inbox className="w-4 h-4 text-slate-300 shrink-0" />
      <span className="text-sm text-slate-400">No active requests. </span>
      <Link href="/workspace/requests/new" className="text-sm text-blue-600 hover:underline font-medium">Submit one →</Link>
    </div>
  );

  const sections = [
    { label: "My Requests",   items: queue.myRequests,   color: "#3b82f6" },
    { label: "Assigned to Me",items: queue.assignedToMe, color: "#f97316" },
    { label: "Team Queue",    items: queue.teamQueue,     color: "#8b5cf6" },
  ].filter(s => s.items.length > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-700">Requests Queue</span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-px rounded-full font-bold">{total}</span>
        </div>
        <Link href="/workspace/requests" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 font-medium">
          View all <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex divide-x divide-slate-100">
        {sections.map(sec => (
          <div key={sec.label} className="flex-1 min-w-0 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{sec.label}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{sec.items.length}</span>
            </div>
            <div className="space-y-1.5">
              {sec.items.slice(0, 3).map((r: any) => {
                const sm = REQ_STATUS[r.status] ?? REQ_STATUS.OPEN;
                return (
                  <Link key={r.id} href={`/workspace/requests/${r.id}`} className="block group">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: sm.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-700 truncate group-hover:text-blue-600 transition-colors">{r.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-300">{r.requestNumber}</span>
                          {r.type && <span className="text-[10px] px-1 rounded-full font-medium" style={{ backgroundColor: r.type.color + '18', color: r.type.color }}>{r.type.name}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {sec.items.length > 3 && (
                <Link href="/workspace/requests" className="text-[10px] text-blue-500 hover:underline pl-3">+{sec.items.length - 3} more</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const toast       = useToast();
  const currentUser = useAuthStore(s => s.user);

  const [summary, setSummary]           = useState<Summary>();
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [assignedTasks, setAssigned]    = useState<Task[]>([]);
  const [loadingAssigned, setLdAssigned]= useState(false);
  const [notes, setNotes]               = useState<Note[]>([]);
  const [users, setUsers]               = useState<WUser[]>([]);
  const [departments, setDepts]         = useState<WDept[]>([]);
  const [dots, setDots]                 = useState<Record<string, string[]>>({});
  const [calSyncStatus, setCalSyncStatus] = useState<Record<string, string>>({});

  const [filter, setFilter]             = useState<TaskFilter>("pending");
  const [selectedDate, setSelectedDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [dateFilter, setDateFilter]     = useState<Date | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showNewTask, setShowNewTask]   = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newNoteText, setNewNoteText]   = useState("");
  const [addingNote, setAddingNote]     = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    try { const { data } = await api.get("/workspace/summary"); setSummary(data); } catch {}
  }, []);

  const loadTasks = useCallback(async (f: TaskFilter, date?: Date | null) => {
    setLoadingTasks(true);
    try {
      const params: Record<string, string> = {};
      if (date) {
        params.date = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      } else {
        params.filter = f;
      }
      const { data } = await api.get("/workspace/tasks", { params });
      setTasks(data);
      // Load calendar sync status for these tasks (fire-and-forget)
      if (data?.length) {
        api.post("/calendar-sync/status/tasks", { taskIds: data.map((t: Task) => t.id) })
          .then(r => setCalSyncStatus(r.data ?? {}))
          .catch(() => null);
      }
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoadingTasks(false); }
  }, []);

  const loadNotes = useCallback(async () => {
    try { const { data } = await api.get("/workspace/notes"); setNotes(data); } catch {}
  }, []);

  const loadCalendar = useCallback(async (year: number, month: number) => {
    try {
      const { data } = await api.get("/workspace/calendar", { params: { year, month } });
      setDots(data);
    } catch {}
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const loadDepts = useCallback(async () => {
    try {
      const { data } = await api.get("/departments");
      setDepts(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const loadAssigned = useCallback(async () => {
    setLdAssigned(true);
    try {
      const { data } = await api.get("/workspace/tasks", { params: { filter: "assigned_to_me" } });
      setAssigned(data);
    } catch {}
    finally { setLdAssigned(false); }
  }, []);

  useEffect(() => { loadSummary(); loadNotes(); loadUsers(); loadDepts(); loadAssigned(); }, []);
  useEffect(() => { loadTasks(filter, dateFilter); }, [filter, dateFilter]);
  useEffect(() => { loadCalendar(selectedDate.getFullYear(), selectedDate.getMonth() + 1); }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // ── Task actions ──────────────────────────────────────────────────────────────

  const createTask = async (body: any) => {
    try {
      const { data } = await api.post("/workspace/tasks", body);
      setTasks(prev => [data, ...prev]);
      setShowNewTask(false);
      loadSummary();
      loadAssigned();
      loadCalendar(selectedDate.getFullYear(), selectedDate.getMonth() + 1);
      toast.success("Task added");
    } catch { toast.error("Failed to add task"); }
  };

  const toggleDone = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const { data } = await api.patch(`/workspace/tasks/${task.id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? data : t));
      setAssigned(prev => prev.map(t => t.id === task.id ? data : t));
      loadSummary();
    } catch { toast.error("Failed to update task"); }
  };

  const togglePin = async (task: Task) => {
    try {
      const { data } = await api.patch(`/workspace/tasks/${task.id}`, { pinned: !task.pinned });
      setTasks(prev => {
        const updated = prev.map(t => t.id === task.id ? data : t);
        return [...updated.filter(t => t.pinned), ...updated.filter(t => !t.pinned)];
      });
      setAssigned(prev => prev.map(t => t.id === task.id ? data : t));
    } catch { toast.error("Failed to pin task"); }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.delete(`/workspace/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      setAssigned(prev => prev.filter(t => t.id !== id));
      loadSummary();
    } catch { toast.error("Failed to delete task"); }
  };

  // ── Note actions ──────────────────────────────────────────────────────────────

  const createNote = async () => {
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const { data } = await api.post("/workspace/notes", { content: newNoteText.trim(), color: "yellow" });
      setNotes(prev => [data, ...prev]);
      setNewNoteText("");
      loadSummary();
    } catch { toast.error("Failed to add note"); }
    finally { setAddingNote(false); }
  };

  const updateNote = async (id: string, patch: Partial<Note>) => {
    try {
      const { data } = await api.patch(`/workspace/notes/${id}`, patch);
      setNotes(prev => prev.map(n => n.id === id ? data : n));
    } catch { toast.error("Failed to update note"); }
  };

  const deleteNote = async (id: string) => {
    try {
      await api.delete(`/workspace/notes/${id}`);
      setNotes(prev => prev.filter(n => n.id !== id));
      loadSummary();
    } catch { toast.error("Failed to delete note"); }
  };

  // ── Calendar interaction ──────────────────────────────────────────────────────

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
    setDateFilter(prev => prev?.toDateString() === d.toDateString() ? null : d);
  };

  const today       = new Date(); today.setHours(0, 0, 0, 0);
  const pinnedTasks = tasks.filter(t => t.pinned && t.status !== "done");
  const pinnedNotes = notes.filter(n => n.pinned);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="flex flex-col gap-4 p-3 sm:p-6 h-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Workspace
            <span className="flex items-center gap-1 text-xs font-normal text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {today.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNewTask(true)}>
          <Plus className="w-3.5 h-3.5" /> New Task
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Due today"      value={summary?.todayTasks}   icon={Clock}         accent="bg-blue-100 text-blue-600"
          onClick={() => { setDateFilter(null); setFilter("today"); }}
          active={!dateFilter && filter === "today"} />
        <StatCard label="Pending"        value={summary?.pendingTasks}  icon={Circle}        accent="bg-gray-100 text-gray-500"
          onClick={() => { setDateFilter(null); setFilter("pending"); }}
          active={!dateFilter && filter === "pending"} />
        <StatCard label="Overdue"        value={summary?.overdueTasks}  icon={AlertTriangle} accent="bg-red-100 text-red-600" alert
          onClick={() => { setDateFilter(null); setFilter("overdue"); }}
          active={!dateFilter && filter === "overdue"} />
        <StatCard label="Assigned to me" value={summary?.assignedToMe} icon={Users}         accent="bg-violet-100 text-violet-600" />
        <StatCard label="Notes"          value={summary?.notes}         icon={StickyNote}    accent="bg-amber-100 text-amber-600" />
      </div>

      {/* Requests queue */}
      <RequestsQueueStrip />

      {/* ── Pinned Board ──────────────────────────────────────────────────────── */}
      {(pinnedTasks.length > 0 || pinnedNotes.length > 0) && (
        <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-100 to-amber-50/60 px-5 pt-3 pb-5">
          {/* Board header */}
          <div className="flex items-center gap-2 mb-1">
            <Pin className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">Pinned</span>
            <span className="text-[11px] text-gray-400 font-normal ml-0.5">
              {pinnedTasks.length + pinnedNotes.length}
            </span>
          </div>

          {/* Cork-board texture hint (thin dashed border inside) */}
          <div className="rounded-xl border border-dashed border-stone-300/80 p-4 pt-6">
            <div
              className="grid gap-x-5 gap-y-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" }}
            >
              {pinnedTasks.map(t => (
                <PinnedTaskCard
                  key={t.id}
                  task={t}
                  currentUserId={currentUser?.id ?? ""}
                  onToggleDone={() => toggleDone(t)}
                  onUnpin={() => togglePin(t)}
                />
              ))}
              {pinnedNotes.map(n => (
                <PinnedNoteCard
                  key={n.id}
                  note={n}
                  onUnpin={() => updateNote(n.id, { pinned: false })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3-column body */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* LEFT: calendar + notes */}
        <div className="lg:w-60 shrink-0 flex flex-col gap-3 min-h-0">
          {/* Calendar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shrink-0">
            <MiniCalendar selectedDate={selectedDate} onSelect={handleDateSelect} dots={dots} />
            {dateFilter && (
              <div className="mt-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="font-semibold text-blue-700 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {dateFilter.toLocaleDateString("en", { month: "short", day: "numeric" })}
                  <span className="font-normal text-blue-500 ml-1">· {tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
                </span>
                <button onClick={() => setDateFilter(null)} className="text-blue-400 hover:text-blue-700 ml-2">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Notes panel */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header + quick add */}
            <div className="px-3 pt-3 pb-2.5 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Notes
                </span>
                <span className="text-[11px] text-gray-400">{notes.length}</span>
              </div>
              <div className="flex gap-1.5">
                <Input value={newNoteText} onChange={e => setNewNoteText(e.target.value)}
                  placeholder="Quick note…"
                  className="h-7 text-[11px] flex-1"
                  onKeyDown={e => { if (e.key === "Enter") createNote(); }}
                />
                <Button size="icon" className="h-7 w-7 shrink-0" onClick={createNote}
                  disabled={!newNoteText.trim() || addingNote}>
                  {addingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <StickyNote className="w-7 h-7 text-amber-200 mb-2" />
                  <p className="text-[11px] text-gray-400">No notes yet</p>
                </div>
              ) : (
                notes.map(n => (
                  <CompactNoteItem key={n.id} note={n}
                    onUpdate={patch => updateNote(n.id, patch)}
                    onDelete={() => deleteNote(n.id)} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE: tasks */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">

            {/* Filter tabs */}
            <div className="flex items-center gap-0.5 px-4 pt-1 border-b border-gray-100 shrink-0 overflow-x-auto">
              {FILTERS.map(f => {
                const isActive = !dateFilter && filter === f.key;
                const badge    = f.badgeKey ? summary?.[f.badgeKey] : undefined;
                return (
                  <button key={f.key}
                    onClick={() => { setDateFilter(null); setFilter(f.key); }}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                      isActive ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700",
                    )}>
                    {f.label}
                    {(badge ?? 0) > 0 && (
                      <span className={cn(
                        "text-[9px] rounded-full px-1.5 py-px font-bold leading-none",
                        isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500",
                      )}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {!dateFilter && filter === "overdue" && (
                <span className="flex items-center gap-1 ml-2 px-2.5 py-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full font-semibold">
                  <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                </span>
              )}

              {dateFilter && (
                <span className="ml-auto flex items-center gap-1 px-2.5 py-1 text-[11px] bg-blue-50 text-blue-600 rounded-lg border border-blue-200 mr-1 shrink-0">
                  <CalendarDays className="w-3 h-3" />
                  {dateFilter.toLocaleDateString("en", { month: "short", day: "numeric" })}
                  <button onClick={() => setDateFilter(null)} className="ml-1 hover:text-red-500">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>

            {/* Task grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* New task form spans full width */}
              {showNewTask && (
                <div className="mb-3">
                  <NewTaskForm users={users} departments={departments} onSave={createTask} onCancel={() => setShowNewTask(false)} />
                </div>
              )}

              {!showNewTask && (
                <button onClick={() => setShowNewTask(true)}
                  className="w-full flex items-center gap-2 p-3.5 mb-3 rounded-2xl border border-dashed border-gray-200 text-xs font-medium text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all">
                  <Plus className="w-4 h-4" /> Add a task…
                </button>
              )}

              {loadingTasks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCheck className="w-10 h-10 text-green-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">All clear!</p>
                  <p className="text-xs text-gray-400 mt-1">No tasks for this view</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tasks.map(t => (
                    <TaskCard key={t.id} task={t} currentUserId={currentUser?.id ?? ""}
                      onClick={() => setSelectedTask(t)}
                      onToggleDone={e => { e.stopPropagation(); toggleDone(t); }}
                      calSyncStatus={calSyncStatus[t.id]} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: assigned to me */}
        <div className="lg:w-72 shrink-0 flex flex-col min-h-0">
          <div className="bg-white border border-blue-100 rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="px-3.5 py-3 border-b border-blue-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-gray-700">Assigned to me</span>
                {assignedTasks.length > 0 && (
                  <span className="ml-auto text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-px font-bold leading-none">
                    {assignedTasks.filter(t => t.status !== "done").length}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5 ml-4">Tasks & dept tasks visible to you</p>
            </div>

            {/* Assigned task list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {loadingAssigned ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
                </div>
              ) : assignedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <CheckCheck className="w-8 h-8 text-blue-100 mb-2" />
                  <p className="text-xs font-medium text-gray-400">Nothing assigned to you</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">You're all caught up!</p>
                </div>
              ) : (
                <>
                  {/* Active */}
                  {assignedTasks.filter(t => t.status !== "done").map(t => (
                    <AssignedItem key={t.id} task={t} onToggleDone={() => toggleDone(t)} />
                  ))}
                  {/* Done separator */}
                  {assignedTasks.some(t => t.status === "done") && (
                    <>
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 border-t border-gray-100" />
                        <span className="text-[10px] text-gray-400 font-medium">Completed</span>
                        <div className="flex-1 border-t border-gray-100" />
                      </div>
                      {assignedTasks.filter(t => t.status === "done").map(t => (
                        <AssignedItem key={t.id} task={t} onToggleDone={() => toggleDone(t)} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* Task detail modal */}
    {selectedTask && (
      <TaskDetailModal
        task={selectedTask}
        currentUserId={currentUser?.id ?? ""}
        onClose={() => setSelectedTask(null)}
        onToggleDone={() => {
          toggleDone(selectedTask);
          setSelectedTask(prev => prev ? { ...prev, status: prev.status === "done" ? "todo" : "done" } : null);
        }}
        onTogglePin={() => {
          togglePin(selectedTask);
          setSelectedTask(prev => prev ? { ...prev, pinned: !prev.pinned } : null);
        }}
        onDelete={() => {
          deleteTask(selectedTask.id);
          setSelectedTask(null);
        }}
      />
    )}
    </>
  );
}
