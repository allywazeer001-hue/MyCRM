"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send, Clock, CheckCircle2, Circle, X, AlertCircle, Paperclip, MessageSquare, User, Calendar, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDisplayName } from "@/lib/user";

interface Stage { id: string; name: string; order: number; stageType: string; color: string; }
interface Action { id: string; name: string; label: string; actionType: string; targetStageId: string | null; color: string; requiresNote: boolean; }
interface Comment { id: string; content: string; author: { id: string; firstName: string; lastName: string; avatar: string | null }; createdAt: string; }
interface Event { id: string; eventType: string; title: string; data: any; actor: { id: string; firstName: string; lastName: string; avatar: string | null } | null; createdAt: string; }
interface InstanceStep { id: string; stageName: string; stageId: string | null; actorId: string | null; actionLabel: string | null; note: string | null; stepStatus: string; enteredAt: string; completedAt: string | null; actor: { id: string; firstName: string; lastName: string } | null; stage: { id: string; name: string } | null; }
interface Req {
  id: string; requestNumber: string; title: string; description: string | null; status: string; priority: string; currentStage: string | null; currentStageId: string | null;
  type: { id: string; name: string; icon: string; color: string };
  requester: { id: string; firstName: string; lastName: string; avatar: string | null; email: string };
  assignedUser: { id: string; firstName: string; lastName: string; avatar: string | null } | null;
  assignedDept: { id: string; name: string } | null;
  currentStageRef: { id: string; name: string; actions: Action[] } | null;
  comments: Comment[]; attachments: any[]; events: Event[];
  instance: { id: string; blueprint: { stages: Stage[] }; steps: InstanceStep[] } | null;
  dueDate: string | null; createdAt: string; completedAt: string | null;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "#3b82f6" }, IN_PROGRESS: { label: "In Progress", color: "#f97316" },
  ON_HOLD: { label: "On Hold", color: "#eab308" }, COMPLETED: { label: "Completed", color: "#22c55e" },
  REJECTED: { label: "Rejected", color: "#ef4444" }, CANCELLED: { label: "Cancelled", color: "#6b7280" },
};

function fmtDate(d: string) { return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [req, setReq] = useState<Req | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get(`/requests/${id}`).then(r => { setReq(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try { await api.post(`/requests/${id}/comments`, { content: comment }); setComment(""); load(); }
    catch { alert("Failed"); }
    finally { setSubmittingComment(false); }
  };

  const executeAction = async (action: Action) => {
    if (action.requiresNote && !actionNote.trim()) { alert("A note is required for this action."); return; }
    setExecutingAction(action.id);
    try { await api.post(`/requests/${id}/actions`, { actionId: action.id, note: actionNote || undefined }); setActionNote(""); load(); }
    catch (e: any) { alert(e?.response?.data?.message ?? "Action failed"); }
    finally { setExecutingAction(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!req) return <div className="text-red-500 p-6">Request not found</div>;

  const sm = STATUS_META[req.status] ?? STATUS_META.OPEN;
  const actions = req.currentStageRef?.actions ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.push("/workspace/requests")} className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500 shrink-0"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-gray-400">{req.requestNumber}</span>
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: req.type.color + '18', color: req.type.color }}>{req.type.name}</span>
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sm.color + '18', color: sm.color }}>{sm.label}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">{req.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {req.description && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{req.description}</p>
            </div>
          )}

          {/* Action buttons */}
          {actions.length > 0 && !["COMPLETED","REJECTED","CANCELLED"].includes(req.status) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Actions</h3>
              <div className="flex flex-wrap gap-2">
                {actions.map(a => (
                  <Button key={a.id} onClick={() => executeAction(a)} disabled={executingAction === a.id} className="gap-2" style={{ backgroundColor: a.color, borderColor: a.color, color: '#fff' }}>
                    {executingAction === a.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {a.label}
                  </Button>
                ))}
              </div>
              {actions.some(a => a.requiresNote) && (
                <div className="mt-3">
                  <Input value={actionNote} onChange={e => setActionNote(e.target.value)} placeholder="Add a note (required for some actions)…" className="h-9" />
                </div>
              )}
            </div>
          )}

          {/* Workflow timeline */}
          {req.instance && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Workflow Timeline</h3>
              <div className="space-y-0">
                {req.instance.blueprint.stages.map((stage, idx) => {
                  const completedStep = req.instance!.steps.find(s => s.stageId === stage.id && s.stepStatus === 'completed');
                  const isCurrent = stage.id === req.currentStageId;
                  const isDone    = !!completedStep;
                  const isPending = isCurrent && !isDone;

                  return (
                    <div key={stage.id} className="flex gap-3">
                      {/* connector */}
                      <div className="flex flex-col items-center">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 mt-0.5",
                          isDone ? "bg-green-500" : isPending ? "border-2 border-blue-500 bg-white" : "border-2 border-slate-200 bg-white"
                        )}>
                          {isDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : isPending ? <Circle className="w-4 h-4 text-blue-500 fill-blue-500 opacity-60" /> : <Circle className="w-3 h-3 text-slate-300" />}
                        </div>
                        {idx < req.instance!.blueprint.stages.length - 1 && (
                          <div className={cn("w-0.5 flex-1 my-1", isDone ? "bg-green-300" : "bg-slate-200")} style={{ minHeight: 20 }} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className={cn("font-medium text-sm", isDone ? "text-green-700" : isPending ? "text-blue-700 font-semibold" : "text-gray-400")}>
                          {stage.name} {isPending && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full ml-1">Current</span>}
                        </div>
                        {completedStep && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {completedStep.actionLabel && <span className="font-medium text-green-600 mr-1">{completedStep.actionLabel}</span>}
                            {completedStep.actor && <span>by {getDisplayName(completedStep.actor)}</span>}
                            {completedStep.completedAt && <span className="ml-1">{fmtDate(completedStep.completedAt)}</span>}
                            {completedStep.note && <p className="mt-0.5 italic text-gray-500">&ldquo;{completedStep.note}&rdquo;</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" /> Comments ({req.comments.length})</h3>
            {req.comments.length === 0 && <p className="text-sm text-gray-400 italic mb-4">No comments yet</p>}
            <div className="space-y-3 mb-4">
              {req.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">{c.author.firstName[0]}</div>
                  <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">{getDisplayName(c.author)}</span>
                      <span className="text-xs text-gray-400">{fmtDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()} placeholder="Write a comment…" className="flex-1" />
              <Button onClick={submitComment} disabled={submittingComment || !comment.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Request Info</h3>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <div><p className="text-xs text-gray-400">Requester</p><p className="font-medium text-gray-700">{getDisplayName(req.requester)}</p></div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-gray-400 shrink-0" />
              <div><p className="text-xs text-gray-400">Priority</p><p className="font-medium text-gray-700">{req.priority}</p></div>
            </div>
            {req.assignedUser && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <div><p className="text-xs text-gray-400">Assigned to</p><p className="font-medium text-gray-700">{getDisplayName(req.assignedUser)}</p></div>
              </div>
            )}
            {req.assignedDept && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <div><p className="text-xs text-gray-400">Department</p><p className="font-medium text-gray-700">{req.assignedDept.name}</p></div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div><p className="text-xs text-gray-400">Submitted</p><p className="font-medium text-gray-700">{fmtDate(req.createdAt)}</p></div>
            </div>
            {req.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <div><p className="text-xs text-gray-400">Due</p><p className="font-medium text-amber-600">{fmtDate(req.dueDate)}</p></div>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Activity</h3>
            <div className="space-y-3">
              {req.events.slice(-10).map(e => (
                <div key={e.id} className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-700">{e.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {e.actor ? getDisplayName(e.actor) : "System"} · {fmtDate(e.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
