"use client";
import { useEffect, useState, useRef } from "react";
import {
  Upload, Plus, Trash2, LinkIcon, Paperclip, Loader2, Image as ImageIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Attachment { fileId?: string; fileName: string; fileUrl: string; fileSize?: number; mimeType?: string; label?: string; }
interface ExternalLink { label: string; url: string; }

interface Props {
  initialData?: any;
  publicationId?: string;
  onSaved: (id: string) => void;
}

const AUDIENCE_TYPES = [
  { value: "ALL",      label: "All Portal Users" },
  { value: "GROUPS",   label: "Specific User Groups" },
  { value: "PROGRAMS", label: "Specific Programs" },
  { value: "COHORTS",  label: "Specific Cohorts" },
];

const inputClass = "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-rose-500";
const labelClass = "text-xs font-semibold text-gray-600";

const WEB_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const WEB_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

export default function AdminPublicationForm({ initialData, publicationId, onSaved }: Props) {
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const coverInputRef  = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", excerpt: "", content: "",
    coverImageUrl: "", coverFileId: "",
    audienceType: "ALL", audienceConfig: {} as any,
    isEvent: false, eventDate: "", eventCtaLabel: "", eventCtaUrl: "",
    categories: [] as string[], tags: "",
  });
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [attachments, setAttachments]     = useState<Attachment[]>([]);
  const [coverPreview, setCoverPreview]   = useState("");
  const [galleryFiles, setGalleryFiles]   = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [showGallery, setShowGallery]     = useState<"cover" | "attach" | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? "",
        excerpt: initialData.excerpt ?? "",
        content: initialData.content ?? "",
        coverImageUrl: initialData.coverImageUrl ?? "",
        coverFileId: initialData.coverFileId ?? "",
        audienceType: initialData.audienceType ?? "ALL",
        audienceConfig: initialData.audienceConfig ?? {},
        isEvent: initialData.isEvent ?? false,
        eventDate: initialData.eventDate ? initialData.eventDate.slice(0, 10) : "",
        eventCtaLabel: initialData.eventCtaLabel ?? "",
        eventCtaUrl: initialData.eventCtaUrl ?? "",
        categories: Array.isArray(initialData.categories) ? initialData.categories : [],
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(", ") : "",
      });
      setExternalLinks(Array.isArray(initialData.externalLinks) ? initialData.externalLinks : []);
      setAttachments(initialData.attachments ?? []);
      setCoverPreview(initialData.coverFile?.fileUrl ?? initialData.coverImageUrl ?? "");
    }
  }, [initialData?.id]); // eslint-disable-line

  const loadGallery = () => {
    setGalleryLoading(true);
    api.get("/gallery", { params: { archived: "false" } })
      .then(r => setGalleryFiles(r.data))
      .catch(() => {})
      .finally(() => setGalleryLoading(false));
  };

  useEffect(() => {
    if (showGallery) loadGallery();
  }, [showGallery]); // eslint-disable-line

  const set = (key: string, val: any) => setForm(s => ({ ...s, [key]: val }));

  const uploadFile = async (file: File, type: "cover" | "attach") => {
    setUploadError("");
    if (type === "cover" && !WEB_IMAGE_TYPES.includes(file.type)) {
      setUploadError(`"${file.name}" is not a supported image format. Please use JPEG, PNG, WebP, or GIF.`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "Publications");
      if (type === "cover") fd.append("name", `Cover: ${form.title || file.name}`);
      const { data } = await api.post("/gallery/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (type === "cover") {
        set("coverFileId", data.id);
        set("coverImageUrl", data.fileUrl);
        setCoverPreview(data.fileUrl);
      } else {
        setAttachments(a => [...a, { fileId: data.id, fileName: data.name, fileUrl: data.fileUrl, fileSize: data.fileSize, mimeType: data.mimeType }]);
      }
    } catch (e: any) {
      setUploadError(e?.response?.data?.message ?? "Upload failed — check your connection and try again.");
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        externalLinks,
        attachments,
        eventDate: form.eventDate || undefined,
      };
      let id = publicationId;
      if (publicationId) {
        await api.patch(`/publications/${publicationId}`, payload);
      } else {
        const { data } = await api.post("/publications", payload);
        id = data.id;
      }
      onSaved(id!);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="space-y-7">
      {/* Cover */}
      <div>
        <Label className={labelClass + " block mb-2"}>Cover Image</Label>
        <div
          className={cn(
            "relative w-full h-40 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden",
            coverPreview ? "border-transparent" : "border-gray-200 hover:border-rose-400"
          )}
          onClick={() => coverInputRef.current?.click()}
        >
          {coverPreview ? (
            <>
              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
              <button
                className="absolute top-2 right-2 bg-white/90 rounded-full p-1 text-gray-500 hover:text-red-500"
                onClick={e => { e.stopPropagation(); set("coverFileId", ""); set("coverImageUrl", ""); setCoverPreview(""); }}
              ><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon className="w-7 h-7 mx-auto mb-1.5" />
              <p className="text-sm">Click to upload cover</p>
              <button className="text-xs text-rose-500 underline mt-1" onClick={e => { e.stopPropagation(); setShowGallery("cover"); }}>or pick from Gallery</button>
            </div>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept={WEB_IMAGE_ACCEPT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "cover"); e.target.value = ""; }} />
        {uploading && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</p>}
        {uploadError && <p className="text-xs text-red-600 mt-1 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>}
      </div>

      {/* Title & Excerpt */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className={labelClass}>Title <span className="text-red-500">*</span></Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Publication title" className={cn(inputClass, "text-base font-semibold")} />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Excerpt</Label>
          <textarea
            value={form.excerpt}
            onChange={e => set("excerpt", e.target.value)}
            placeholder="Short summary shown in the portal feed…"
            rows={2}
            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <Label className={labelClass}>Content</Label>
        <textarea
          value={form.content}
          onChange={e => set("content", e.target.value)}
          placeholder="Full article / announcement content…"
          rows={10}
          className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
        />
      </div>

      {/* Event */}
      <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isEvent" checked={form.isEvent} onChange={e => set("isEvent", e.target.checked)} className="rounded accent-rose-500" />
          <Label htmlFor="isEvent" className="text-sm font-semibold text-blue-700 cursor-pointer">This is an Event</Label>
        </div>
        {form.isEvent && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={labelClass}>Event Date</Label>
              <Input type="date" value={form.eventDate} onChange={e => set("eventDate", e.target.value)} className={cn(inputClass, "h-8 text-sm")} />
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>CTA Button Label</Label>
              <Input value={form.eventCtaLabel} onChange={e => set("eventCtaLabel", e.target.value)} placeholder="Register Now" className={cn(inputClass, "h-8 text-sm")} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className={labelClass}>CTA Button URL</Label>
              <Input value={form.eventCtaUrl} onChange={e => set("eventCtaUrl", e.target.value)} placeholder="https://…" className={cn(inputClass, "h-8 text-sm")} />
            </div>
          </div>
        )}
      </div>

      {/* External links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={labelClass}>External Links</Label>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-500 hover:text-gray-800" onClick={() => setExternalLinks(l => [...l, { label: "", url: "" }])}>
            <Plus className="w-3 h-3 mr-1" /> Add link
          </Button>
        </div>
        {externalLinks.map((lnk, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input placeholder="Label" value={lnk.label} className={cn(inputClass, "h-8 text-sm w-36 shrink-0")}
              onChange={e => { const v = e.target.value; setExternalLinks(ls => ls.map((l, j) => j === i ? { ...l, label: v } : l)); }} />
            <Input placeholder="https://example.com" value={lnk.url} className={cn(inputClass, "h-8 text-sm flex-1 min-w-0")}
              onChange={e => { const v = e.target.value; setExternalLinks(ls => ls.map((l, j) => j === i ? { ...l, url: v } : l)); }} />
            <button onClick={() => setExternalLinks(ls => ls.filter((_, j) => j !== i))} className="text-red-600 hover:text-red-400 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={labelClass}>Attachments</Label>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-500 hover:text-gray-800" onClick={() => setShowGallery("attach")}>
              <LinkIcon className="w-3 h-3 mr-1" /> From Gallery
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-500 hover:text-gray-800" onClick={() => attachInputRef.current?.click()}>
              <Upload className="w-3 h-3 mr-1" /> Upload
            </Button>
          </div>
        </div>
        <input ref={attachInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "attach"); }} />
        {attachments.map((a, i) => (
          <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-700 flex-1 truncate">{a.fileName}</span>
            <Input placeholder="Label (optional)" value={a.label ?? ""} className={cn(inputClass, "h-6 text-xs w-28")}
              onChange={e => { const v = e.target.value; setAttachments(as => as.map((att, j) => j === i ? { ...att, label: v } : att)); }} />
            <button onClick={() => setAttachments(as => as.filter((_, j) => j !== i))} className="text-red-600 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Audience */}
      <div className="space-y-2">
        <Label className={labelClass}>Audience</Label>
        <div className="grid grid-cols-2 gap-2">
          {AUDIENCE_TYPES.map(at => (
            <button
              key={at.value}
              onClick={() => set("audienceType", at.value)}
              className={cn(
                "text-left p-2.5 rounded-lg border text-sm transition-colors",
                form.audienceType === at.value
                  ? "border-rose-500 bg-rose-50 text-rose-700 font-medium"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              {at.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & Tags */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className={labelClass}>Categories (comma-separated)</Label>
          <Input
            value={form.categories.join(", ")}
            onChange={e => set("categories", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
            placeholder="News, Announcement"
            className={cn(inputClass, "h-8 text-sm")}
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Tags (comma-separated)</Label>
          <Input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="update, important" className={cn(inputClass, "h-8 text-sm")} />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-rose-600 hover:bg-rose-700 border-0">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {publicationId ? "Save Changes" : "Create Publication"}
        </Button>
      </div>

      {/* Gallery picker */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Pick from Gallery</h2>
              <div className="flex items-center gap-2">
                <button onClick={loadGallery} disabled={galleryLoading} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40 flex items-center gap-1">
                  {galleryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Refresh
                </button>
                <button onClick={() => setShowGallery(null)} className="text-gray-400 hover:text-gray-700">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
              {galleryLoading ? (
                <div className="col-span-3 flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                </div>
              ) : null}
              {!galleryLoading && galleryFiles
                .filter(f => showGallery === "cover" ? WEB_IMAGE_TYPES.includes(f.mimeType) : true)
                .map(f => (
                <button
                  key={f.id}
                  className="text-left rounded-lg border border-gray-200 overflow-hidden hover:border-rose-400 transition-colors"
                  onClick={() => {
                    if (showGallery === "cover") {
                      set("coverFileId", f.id);
                      set("coverImageUrl", f.fileUrl);
                      setCoverPreview(f.fileUrl);
                    } else {
                      setAttachments(a => [...a, { fileId: f.id, fileName: f.name, fileUrl: f.fileUrl, fileSize: f.fileSize, mimeType: f.mimeType }]);
                    }
                    setShowGallery(null);
                  }}
                >
                  {f.mimeType?.startsWith("image/") ? (
                    <div className="h-20 overflow-hidden"><img src={f.fileUrl} alt={f.name} className="w-full h-full object-cover" /></div>
                  ) : (
                    <div className="h-20 flex items-center justify-center bg-gray-100"><Paperclip className="w-6 h-6 text-gray-400" /></div>
                  )}
                  <div className="p-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                    <p className="text-[10px] text-gray-400">{f.category}</p>
                  </div>
                </button>
              ))}
              {!galleryLoading && galleryFiles.filter(f => showGallery === "cover" ? WEB_IMAGE_TYPES.includes(f.mimeType) : true).length === 0 && (
                <p className="col-span-3 text-center text-gray-400 text-sm py-8">
                  {showGallery === "cover"
                    ? "No web-compatible images in gallery. Upload a JPEG, PNG, or WebP cover image."
                    : "No gallery files yet."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
