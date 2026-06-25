"use client";
/**
 * FileUploadInput — a proper <input type="file"> wrapper with:
 * - Drag-and-drop onto the drop zone
 * - Click-to-browse fallback
 * - Preview for images
 * - File name + size display for documents
 * - Remove button to clear
 * - Uploads to backend on selection, stores the returned URL as the field value
 */
import { useRef, useState, useCallback } from "react";
import { Upload, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface FileUploadInputProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  accept?: string;
  fieldType?: "FILE" | "IMAGE" | "SIGNATURE" | string;
  label?: string;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

export function FileUploadInput({
  value,
  onChange,
  accept,
  fieldType = "FILE",
  label,
  disabled = false,
}: FileUploadInputProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const isImage = fieldType === "IMAGE" || (value && isImageUrl(value));
  const acceptAttr = accept ?? (fieldType === "IMAGE" ? "image/*" : undefined);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url ?? data.path ?? data.filename ?? null);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    upload(file);
  };

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        disabled={disabled || uploading}
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Current file preview */}
      {value && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="preview"
              className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {value.split("/").pop() || value}
            </p>
            <p className="text-xs text-gray-400">Uploaded</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 px-4 text-center cursor-pointer transition-all select-none",
          dragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-gray-200 bg-gray-50/60 hover:border-blue-400 hover:bg-blue-50/40",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          uploading && "pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm text-blue-600 font-medium">Uploading…</p>
          </div>
        ) : (
          <>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              dragging ? "bg-blue-100" : "bg-gray-100"
            )}>
              {fieldType === "IMAGE"
                ? <ImageIcon className={cn("w-5 h-5", dragging ? "text-blue-600" : "text-gray-400")} />
                : <Upload    className={cn("w-5 h-5", dragging ? "text-blue-600" : "text-gray-400")} />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {dragging ? "Drop to upload" : "Drag & drop here or"}{" "}
                {!dragging && <span className="text-blue-600 underline underline-offset-2">browse</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fieldType === "IMAGE"
                  ? "PNG, JPG, GIF, WebP up to 10 MB"
                  : "Any file type up to 25 MB"}
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
