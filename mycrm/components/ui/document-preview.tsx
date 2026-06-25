"use client";
import { useState, useEffect } from "react";
import {
  X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, FileText,
  Image as ImageIcon, File, ExternalLink, AlertTriangle,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type PreviewableFile = {
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
};

function detectType(file: PreviewableFile): "pdf" | "image" | "docx" | "unknown" {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return "image";
  if (mime.includes("wordprocessingml") || ["docx","doc"].includes(ext)) return "docx";
  return "unknown";
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── PDF Viewer ────────────────────────────────────────────────────────────────

function PdfPreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full bg-gray-700 flex flex-col">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-500 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm">Loading PDF…</span>
          </div>
        </div>
      )}
      <iframe
        src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
        className="w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        title="PDF Preview"
      />
    </div>
  );
}

// ── Image Viewer ──────────────────────────────────────────────────────────────

function ImagePreview({ url, name }: { url: string; name: string }) {
  const [zoom, setZoom]       = useState(1);
  const [rotate, setRotate]   = useState(0);
  const [loaded, setLoaded]   = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className="relative w-full h-full bg-gray-800 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
        <button
          onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
          className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white/70 text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(4, z + 0.25))}
          className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button
          onClick={() => setRotate(r => (r + 90) % 360)}
          className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
          title="Rotate"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition text-xs px-2"
          title="Reset"
        >
          1:1
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-8"
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
      >
        {!loaded && !errored && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-sm">Loading image…</span>
          </div>
        )}
        {errored ? (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <span className="text-sm">Could not load image</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={name}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(true); setErrored(true); }}
            className="max-w-none rounded shadow-2xl select-none transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotate}deg)`,
              opacity: loaded && !errored ? 1 : 0,
            }}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

// ── DOCX Viewer (Google Docs embed fallback) ───────────────────────────────────

function DocxPreview({ url, name }: { url: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const embedUrl   = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

  return (
    <div className="relative w-full h-full bg-gray-100 flex flex-col">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Loading document…</span>
            <span className="text-xs text-gray-400">Rendering via Google Docs Viewer</span>
          </div>
        </div>
      )}
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        title={`DOCX Preview: ${name}`}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

// ── Unknown / Fallback ────────────────────────────────────────────────────────

function UnknownPreview({ file }: { file: PreviewableFile }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-50 text-gray-500">
      <File className="w-16 h-16 text-gray-300" />
      <div className="text-center space-y-1">
        <p className="font-medium text-gray-700">{file.name}</p>
        <p className="text-sm">Preview not available for this file type</p>
        <p className="text-xs text-gray-400">{file.mimeType}</p>
      </div>
      <a
        href={file.url}
        download={file.name}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
      >
        <Download className="w-4 h-4" /> Download to view
      </a>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface DocumentPreviewProps {
  file: PreviewableFile | null;
  onClose: () => void;
}

export function DocumentPreview({ file, onClose }: DocumentPreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!file) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [file, onClose]);

  if (!file) return null;

  const type = detectType(file);

  const iconMap = {
    pdf:     <FileText className="w-4 h-4 text-red-500" />,
    image:   <ImageIcon className="w-4 h-4 text-green-500" />,
    docx:    <FileText className="w-4 h-4 text-blue-500" />,
    unknown: <File className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={cn(
          "bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
          fullscreen ? "fixed inset-2" : "w-full max-w-5xl h-[90vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm">
            {iconMap[type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {type === "unknown" ? (file.mimeType ?? "Unknown format") : type.toUpperCase()}
              {file.size ? ` · ${formatBytes(file.size)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={file.url}
              download={file.name}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? "Restore" : "Fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          {type === "pdf"     && <PdfPreview url={file.url} />}
          {type === "image"   && <ImagePreview url={file.url} name={file.name} />}
          {type === "docx"    && <DocxPreview url={file.url} name={file.name} />}
          {type === "unknown" && <UnknownPreview file={file} />}
        </div>
      </div>
    </div>
  );
}
