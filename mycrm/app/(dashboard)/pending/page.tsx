"use client";

import { useState, useEffect } from "react";
import { useProcessStore, ProcessTask } from "@/store/process.store";
import { Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Task Card ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: ProcessTask;
  onAction: (taskId: string, action: string, comment: string) => Promise<void>;
}

function TaskCard({ task, onAction }: TaskCardProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordRef = `${task.instance.recordModule}#${task.instance.recordId.slice(0, 8)}`;

  const now = new Date();
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const isOverdue = dueDate !== null && dueDate < now;

  function handleActionClick(action: string) {
    setPendingAction(action);
    setComment("");
  }

  function handleCancel() {
    setPendingAction(null);
    setComment("");
  }

  async function handleConfirm() {
    if (!pendingAction) return;
    setIsSubmitting(true);
    try {
      await onAction(task.id, pendingAction, comment);
      setPendingAction(null);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {task.instance.blueprint.name}
            </p>
            <p className="text-sm text-gray-500 truncate">{task.stage.name}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs font-mono">
            {recordRef}
          </Badge>
        </div>

        {/* Due date */}
        {dueDate ? (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              isOverdue ? "text-red-600" : "text-amber-600"
            )}
          >
            {isOverdue ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            {isOverdue
              ? `Overdue since ${dueDate.toLocaleDateString()}`
              : `Due ${dueDate.toLocaleDateString()}`}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No due date</p>
        )}

        {/* Action buttons */}
        {pendingAction === null && (
          <div className="flex flex-wrap gap-2 pt-1">
            {task.stage.actions.map((action) => {
              if (action === "approve") {
                return (
                  <Button
                    key={action}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSubmitting}
                    onClick={() => handleActionClick(action)}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                );
              }
              if (action === "reject") {
                return (
                  <Button
                    key={action}
                    size="sm"
                    variant="destructive"
                    disabled={isSubmitting}
                    onClick={() => handleActionClick(action)}
                  >
                    Reject
                  </Button>
                );
              }
              if (action === "request_info") {
                return (
                  <Button
                    key={action}
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleActionClick(action)}
                  >
                    Request Info
                  </Button>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Inline confirm panel */}
        {pendingAction !== null && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Add a comment{" "}
              <span className="text-gray-400">(optional)</span>
            </p>
            <textarea
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Enter a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className={cn(
                  pendingAction === "approve" &&
                    "bg-green-600 hover:bg-green-700 text-white",
                  pendingAction === "reject" &&
                    "bg-red-500 hover:bg-red-600 text-white",
                  pendingAction === "request_info" && ""
                )}
              >
                {isSubmitting && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isSubmitting}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

interface SectionProps {
  label: string;
  count: number;
  colorClass: string;
  icon: React.ReactNode;
  tasks: ProcessTask[];
  onAction: (taskId: string, action: string, comment: string) => Promise<void>;
}

function TaskSection({ label, count, colorClass, icon, tasks, onAction }: SectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className={cn("flex items-center gap-2 font-semibold text-sm", colorClass)}>
        {icon}
        <span>{label}</span>
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-current/10 text-current">
          {count}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PendingTasksPage() {
  const { tasks, stats, isLoading, fetchMyTasks, executeAction } =
    useProcessStore();

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Categorise tasks
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const overdueList = tasks.filter(
    (t) => t.dueAt != null && new Date(t.dueAt) < todayStart
  );
  const dueTodayList = tasks.filter(
    (t) =>
      t.dueAt != null &&
      new Date(t.dueAt) >= todayStart &&
      new Date(t.dueAt) < todayEnd
  );
  const upcomingList = tasks.filter(
    (t) => t.dueAt == null || new Date(t.dueAt) >= todayEnd
  );

  async function handleAction(
    taskId: string,
    action: string,
    comment: string
  ) {
    await executeAction(taskId, action, comment || undefined);
    await fetchMyTasks();
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <CheckCircle className="w-12 h-12 text-green-400" />
        <p className="text-lg font-semibold text-gray-700">
          All caught up!
        </p>
        <p className="text-sm text-gray-400">
          You have no pending tasks at the moment.
        </p>
      </div>
    );
  }

  // ── Task lists ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          {stats.total} task{stats.total !== 1 ? "s" : ""} awaiting your action
        </p>
      </div>

      <TaskSection
        label="Overdue"
        count={overdueList.length}
        colorClass="text-red-600"
        icon={<AlertCircle className="w-4 h-4" />}
        tasks={overdueList}
        onAction={handleAction}
      />

      <TaskSection
        label="Due Today"
        count={dueTodayList.length}
        colorClass="text-amber-600"
        icon={<Clock className="w-4 h-4" />}
        tasks={dueTodayList}
        onAction={handleAction}
      />

      <TaskSection
        label="Upcoming"
        count={upcomingList.length}
        colorClass="text-blue-600"
        icon={<Clock className="w-4 h-4" />}
        tasks={upcomingList}
        onAction={handleAction}
      />
    </div>
  );
}
