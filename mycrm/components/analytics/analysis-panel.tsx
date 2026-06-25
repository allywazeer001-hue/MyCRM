"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Maximize2, Minimize2, Download, Send, Loader2,
  BrainCircuit, Copy, Check, RefreshCw, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalysisContext {
  type: "visualization" | "dashboard" | "module";
  title: string;
  contextSummary: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Lightweight markdown renderer ─────────────────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  const inlineFormat = (text: string) => {
    // Bold **text** and __text__
    text = text.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    text = text.replace(/__(.+?)__/g, (_, t) => `<strong>${t}</strong>`);
    // Italic *text*
    text = text.replace(/\*(.+?)\*/g, (_, t) => `<em>${t}</em>`);
    // Inline code `text`
    text = text.replace(/`([^`]+)`/g, (_, t) => `<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">${t}</code>`);
    return text;
  };

  while (i < lines.length) {
    const line = lines[i];

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
      // Collect list items
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
      // Numbered list
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
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const runAnalysis = useCallback(
    async (msgs: Message[]) => {
      if (!context) return;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setStreaming(true);
      setError(null);

      // Append empty assistant message that we stream into
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: context.title,
            type: context.type,
            contextSummary: context.contextSummary,
            messages: msgs,
          }),
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
        // If stream ended with no content, remove the empty placeholder
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

  // Auto-start when panel opens
  useEffect(() => {
    if (open && context && messages.length === 0) {
      runAnalysis([]);
    }
  }, [open, context]); // eslint-disable-line

  // Reset on close
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setMessages([]);
      setInput("");
      setError(null);
      setFullscreen(false);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    scrollToBottom();
    await runAnalysis(updated);
  };

  const handleDownload = () => {
    if (!context || messages.length === 0) return;
    const md = [
      `# AI Analysis Report: ${context.title}`,
      `Generated by Cloudbox Analytics`,
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
      {/* Backdrop (non-fullscreen only) */}
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
          {/* Initial loading state */}
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

          {/* Error state */}
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

          {/* Message list */}
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-md px-3.5 py-2.5 text-xs leading-relaxed shadow-sm">
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
                  {/* streaming cursor */}
                  {streaming && idx === messages.length - 1 && msg.content && (
                    <span className="inline-block w-0.5 h-3.5 bg-purple-400 animate-pulse ml-0.5 align-text-bottom rounded-full" />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Chat input ───────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-3 py-3 shrink-0 bg-white">
          <div className="flex gap-2 items-center">
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
              placeholder={streaming ? "Analyzing…" : "Ask a follow-up question…"}
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
            Powered by Claude AI · Cloudbox Analytics
          </p>
        </div>
      </div>
    </>
  );
}
