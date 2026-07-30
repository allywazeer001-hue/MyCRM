"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Maximize2, Minimize2, Download, Send, Loader2,
  BrainCircuit, Copy, Check, RefreshCw, FileText, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/core-brand";

export interface AnalysisContext {
  type: "visualization" | "dashboard" | "module";
  title: string;
  contextSummary: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachmentName?: string;
}

interface DocAttachment {
  name: string;
  base64: string;
  mediaType: string;
}

// ── Inline bar/line chart renderer ───────────────────────────────────────────
function InlineChart({ type, json }: { type: "bar" | "line"; json: string }) {
  let data: { title?: string; labels?: string[]; values?: number[] } = {};
  try { data = JSON.parse(json); } catch { return null; }
  const { title, labels = [], values = [] } = data;
  if (!labels.length || !values.length) return null;

  const max = Math.max(...values, 1);
  const W = 260, H = 120, PAD = 32, BAR_GAP = 4;
  const n = labels.length;
  const barW = Math.max(4, Math.floor((W - PAD * 2 - BAR_GAP * (n - 1)) / n));
  const chartH = H - 28;
  const COLORS = ["#6366f1","#8b5cf6","#3b82f6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"];

  if (type === "bar") {
    return (
      <div className="my-3 p-3 bg-white border border-gray-100 rounded-xl">
        {title && <p className="text-[11px] font-semibold text-gray-600 mb-2">{title}</p>}
        <svg width={W} height={H} className="overflow-visible">
          {values.map((v, i) => {
            const bh = Math.max(2, (v / max) * chartH);
            const x = PAD + i * (barW + BAR_GAP);
            const y = chartH - bh + 4;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={bh} rx={2} fill={COLORS[i % COLORS.length]} opacity={0.85} />
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#6b7280">{v}</text>
                <text x={x + barW / 2} y={H - 2} textAnchor="middle" fontSize={8} fill="#9ca3af"
                  style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {labels[i]?.slice(0, 6)}
                </text>
              </g>
            );
          })}
          <line x1={PAD - 2} y1={4} x2={PAD - 2} y2={chartH + 4} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={PAD - 2} y1={chartH + 4} x2={W - PAD + 8} y2={chartH + 4} stroke="#e5e7eb" strokeWidth={1} />
        </svg>
      </div>
    );
  }

  // Line chart
  const pts = values.map((v, i) => {
    const x = PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2);
    const y = 4 + chartH - (v / max) * chartH;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="my-3 p-3 bg-white border border-gray-100 rounded-xl">
      {title && <p className="text-[11px] font-semibold text-gray-600 mb-2">{title}</p>}
      <svg width={W} height={H} className="overflow-visible">
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = PAD + (i / Math.max(n - 1, 1)) * (W - PAD * 2);
          const y = 4 + chartH - (v / max) * chartH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill="#6366f1" />
              <text x={x} y={y - 5} textAnchor="middle" fontSize={9} fill="#6b7280">{v}</text>
              <text x={x} y={H - 2} textAnchor="middle" fontSize={8} fill="#9ca3af">{labels[i]?.slice(0, 6)}</text>
            </g>
          );
        })}
        <line x1={PAD - 2} y1={4} x2={PAD - 2} y2={chartH + 4} stroke="#e5e7eb" strokeWidth={1} />
        <line x1={PAD - 2} y1={chartH + 4} x2={W - PAD + 8} y2={chartH + 4} stroke="#e5e7eb" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ── Lightweight markdown renderer ─────────────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (text: string) => {
    text = text.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    text = text.replace(/__(.+?)__/g, (_, t) => `<strong>${t}</strong>`);
    text = text.replace(/\*(.+?)\*/g, (_, t) => `<em>${t}</em>`);
    text = text.replace(/`([^`]+)`/g, (_, t) => `<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">${t}</code>`);
    return text;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Chart code blocks
    if (line.startsWith("```chart-bar") || line.startsWith("```chart-line")) {
      const chartType = line.startsWith("```chart-bar") ? "bar" : "line";
      const jsonLines: string[] = [];
      i++;
      while (i < lines.length && lines[i] !== "```") {
        jsonLines.push(lines[i]);
        i++;
      }
      elements.push(<InlineChart key={`chart-${i}`} type={chartType} json={jsonLines.join("")} />);
      i++; // skip closing ```
      continue;
    }

    // Generic code blocks — skip gracefully
    if (line.startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) i++;
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-gray-900 mt-4 mb-2 first:mt-0 pb-1 border-b border-gray-100">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xs font-semibold text-gray-800 mt-3 mb-1.5">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-base font-bold text-gray-900 mt-3 mb-2 first:mt-0">
          {line.slice(2)}
        </h1>
      );
    } else if (line.match(/^[\*\-] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\*\-] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-xs text-gray-700">
              <span className="text-blue-400 mt-0.5 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-2 list-decimal list-inside">
          {items.map((item, j) => (
            <li key={j} className="text-xs text-gray-700"
              dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ol>
      );
      continue;
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(<hr key={i} className="my-3 border-gray-100" />);
    } else if (line.trim() === "") {
      // skip blank
    } else {
      elements.push(
        <p key={i} className="text-xs text-gray-700 leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Analysis panel ────────────────────────────────────────────────────────────
export function AnalysisPanel({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: AnalysisContext | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attachment, setAttachment] = useState<DocAttachment | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const runAnalysis = useCallback(
    async (msgs: Message[], doc?: DocAttachment | null) => {
      if (!context) return;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setStreaming(true);
      setError(null);

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        // Convert Message[] to Anthropic-compatible format (strip attachmentName)
        const apiMessages = msgs.map(m => ({ role: m.role, content: m.content }));

        const body: any = {
          title: context.title,
          type: context.type,
          contextSummary: context.contextSummary,
          messages: apiMessages,
        };

        if (doc) {
          body.documentBase64 = doc.base64;
          body.documentMediaType = doc.mediaType;
          body.documentName = doc.name;
        }

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snap = accumulated;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: snap };
            return copy;
          });
          scrollToBottom();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Analysis failed");
          setMessages((prev) => prev.slice(0, -1));
        }
      } finally {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
          return prev;
        });
        setStreaming(false);
        scrollToBottom();
      }
    },
    [context, scrollToBottom]
  );

  useEffect(() => {
    if (open && context && messages.length === 0) {
      runAnalysis([]);
    }
  }, [open, context]); // eslint-disable-line

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setMessages([]);
      setInput("");
      setError(null);
      setFullscreen(false);
      setAttachment(null);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Message = {
      role: "user",
      content: text,
      attachmentName: attachment?.name,
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    const doc = attachment;
    setAttachment(null);
    scrollToBottom();
    await runAnalysis(updated, doc);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setAttachment({ name: file.name, base64, mediaType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDownload = () => {
    if (!context || messages.length === 0) return;
    const md = [
      `# AI Analysis Report: ${context.title}`,
      `Generated by ${BRAND.name} Analytics`,
      `---`,
      ...messages.map((m) =>
        m.role === "user"
          ? `### Follow-up Question\n\n${m.content}`
          : `### Analysis\n\n${m.content}`
      ),
    ].join("\n\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${context.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const last = messages.filter((m) => m.role === "assistant").at(-1);
    if (!last) return;
    navigator.clipboard.writeText(last.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRerun = () => {
    setMessages([]);
    setError(null);
    runAnalysis([]);
  };

  if (!open) return null;

  return (
    <>
      {!fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed z-50 bg-white flex flex-col",
          fullscreen
            ? "inset-0"
            : "inset-y-0 right-0 w-[520px] border-l border-gray-200 shadow-2xl"
        )}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0 bg-white">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">AI Analytics</p>
            <p className="text-xs text-gray-400 truncate">{context?.title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && !streaming && (
              <>
                <button
                  onClick={handleCopy}
                  title="Copy last response"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleRerun}
                  title="Re-run analysis"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  title="Download report as Markdown"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => setFullscreen((f) => !f)}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Context badge */}
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 shrink-0 flex items-center gap-2">
          <FileText className="w-3 h-3 text-purple-500 shrink-0" />
          <span className="text-xs text-purple-700 font-medium capitalize">{context?.type}</span>
          <span className="text-xs text-purple-400">·</span>
          <span className="text-xs text-purple-600 truncate">{context?.title}</span>
        </div>

        {/* ── Messages area ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && streaming && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Analyzing data...</p>
                <p className="text-xs text-gray-400 mt-0.5">This may take a few seconds</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="font-medium">Analysis failed</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
                <button
                  onClick={handleRerun}
                  className="mt-2 text-xs text-red-600 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-md px-3.5 py-2.5 text-xs leading-relaxed shadow-sm">
                    {msg.attachmentName && (
                      <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
                        <Paperclip className="w-3 h-3" />
                        <span className="text-[10px] truncate max-w-[160px]">{msg.attachmentName}</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl rounded-tl-md p-4 border border-gray-100">
                  {msg.content ? (
                    <MarkdownContent content={msg.content} />
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                  {streaming && idx === messages.length - 1 && msg.content && (
                    <span className="inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse ml-0.5 align-text-bottom rounded-full" />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Attachment preview ───────────────────────────────────────── */}
        {attachment && (
          <div className="px-3 pb-1 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <Paperclip className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="text-xs text-purple-700 flex-1 truncate">{attachment.name}</span>
              <button
                onClick={() => setAttachment(null)}
                className="text-purple-400 hover:text-purple-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── Chat input ───────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-3 py-3 shrink-0 bg-white">
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              title="Attach document or image for context"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 border border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={streaming ? "Analyzing…" : "Ask a question, request a chart…"}
              disabled={streaming}
              className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-sm"
            >
              {streaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center mt-1.5">
            Powered by Claude AI · Attach documents or ask for charts
          </p>
        </div>
      </div>
    </>
  );
}
