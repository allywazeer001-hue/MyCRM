"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FileText, Copy, Check, Printer } from "lucide-react";

interface FieldLike {
  id: string;
  name: string;
  label: string;
}

// ── Gallery — grid of IMAGE-type field values on this record ────────────────

export function RecordGalleryTab({ fields, data }: { fields: FieldLike[]; data: Record<string, any> }) {
  const [preview, setPreview] = useState<string | null>(null);
  const images = fields
    .map(f => ({ field: f, url: data[f.name] }))
    .filter((x): x is { field: FieldLike; url: string } => typeof x.url === "string" && !!x.url);

  if (images.length === 0) {
    return <p className="text-sm text-gray-400">No images on this record.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {images.map(({ field, url }) => (
          <button
            key={field.id}
            type="button"
            onClick={() => setPreview(url)}
            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={field.label} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
            <span className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] font-medium text-white bg-black/50 truncate">
              {field.label}
            </span>
          </button>
        ))}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}

// ── Documents — list of FILE-type field values as downloadable rows ─────────

export function RecordDocumentsTab({ fields, data }: { fields: FieldLike[]; data: Record<string, any> }) {
  const docs = fields
    .map(f => ({ field: f, url: data[f.name] }))
    .filter((x): x is { field: FieldLike; url: string } => typeof x.url === "string" && !!x.url);

  if (docs.length === 0) {
    return <p className="text-sm text-gray-400">No documents on this record.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {docs.map(({ field, url }) => (
        <a
          key={field.id}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
        >
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{url.split("/").pop() || field.label}</p>
            <p className="text-xs text-gray-400">{field.label}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

// ── QR Code — scannable link back to this record ─────────────────────────────

export function RecordQrCodeTab({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <QRCodeSVG value={url} size={176} />
      </div>
      <p className="text-xs text-gray-400 text-center max-w-xs break-all">{url}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy Link"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>
    </div>
  );
}
