"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link2, X, Copy, Check, Mail, Loader2 } from "lucide-react";

interface Candidate {
  formId: string;
  formName: string;
  integrationFieldId: string;
}

interface SendFormLinkModalProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  recordId: string;
  recordLabel?: string;
  /** Pre-filled recipient email, used only for the "Email this link" mailto shortcut */
  recordEmail?: string;
}

export function SendFormLinkModal({ open, onClose, moduleId, recordId, recordLabel, recordEmail }: SendFormLinkModalProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLink(""); setError(""); setCopied(false); setSelectedFormId("");
    setLoadingCandidates(true);
    api.get("/forms/prefill-candidates", { params: { moduleId } })
      .then(r => {
        const list: Candidate[] = r.data || [];
        setCandidates(list);
        if (list.length === 1) setSelectedFormId(list[0].formId);
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false));
  }, [open, moduleId]);

  if (!open) return null;

  const selected = candidates.find(c => c.formId === selectedFormId);

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    setError("");
    try {
      const { data } = await api.post(`/forms/${selected.formId}/generate-prefill-link`, {
        integrationFieldId: selected.integrationFieldId,
        recordId,
      });
      setLink(data.url);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to generate link. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">Send Form Link</p>
            {recordLabel && <p className="text-xs text-slate-400 truncate">for: {recordLabel}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loadingCandidates ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-slate-500">
              No forms have an Integration Field pointing at this module yet. Add one in the Form Builder, then come back here.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Form</label>
                <select
                  value={selectedFormId}
                  onChange={e => { setSelectedFormId(e.target.value); setLink(""); }}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
                >
                  <option value="">Select a form...</option>
                  {candidates.map(c => (
                    <option key={c.formId} value={c.formId}>{c.formName}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  Opening this link will prefill the mapped fields from this record. Submitting it updates this record.
                </p>
              </div>

              {!link ? (
                <button
                  onClick={generate}
                  disabled={!selectedFormId || generating}
                  className="w-full h-9 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Generate Link
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input readOnly value={link} className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-600 bg-slate-50" onFocus={e => e.target.select()} />
                    <button onClick={copy} className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs shrink-0">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {recordEmail && (
                    <a
                      href={`mailto:${recordEmail}?subject=${encodeURIComponent("Please complete this form")}&body=${encodeURIComponent(link)}`}
                      className="w-full h-9 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" /> Email this link to {recordEmail}
                    </a>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
