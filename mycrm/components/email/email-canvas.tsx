"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Type, Image, MousePointer, Minus, AlignCenter, AlignLeft, AlignRight,
  ChevronUp, ChevronDown, Trash2, Plus, Eye, EyeOff, Bold,
  Square, Maximize2, GripVertical, Upload, Link2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlockType = "heading" | "text" | "image" | "button" | "divider" | "spacer";
type Align = "left" | "center" | "right";

export interface HeadingBlock {
  id: string; type: "heading";
  content: string; level: 1 | 2 | 3;
  fontSize: number; color: string; backgroundColor: string;
  align: Align; bold: boolean;
  padding: [number, number, number, number];
}
export interface TextBlock {
  id: string; type: "text";
  content: string;
  fontSize: number; color: string; backgroundColor: string;
  align: Align; lineHeight: number;
  padding: [number, number, number, number];
}
export interface ImageBlock {
  id: string; type: "image";
  src: string; alt: string;
  sizeMode?: "auto" | "banner" | "custom";
  maxWidth: number;
  height?: number;
  objectFit?: "cover" | "contain" | "fill";
  align: Align; link: string; borderRadius: number;
  padding: [number, number, number, number];
  margin?: [number, number, number, number];
}
export interface ButtonBlock {
  id: string; type: "button";
  text: string; link: string;
  backgroundColor: string; textColor: string;
  fontSize: number; bold: boolean; borderRadius: number; align: Align;
  paddingV: number; paddingH: number;
  blockPadding: [number, number, number, number];
}
export interface DividerBlock {
  id: string; type: "divider";
  color: string; thickness: number; style: "solid" | "dashed" | "dotted";
  padding: [number, number, number, number];
}
export interface SpacerBlock { id: string; type: "spacer"; height: number; }

export type EmailBlock = HeadingBlock | TextBlock | ImageBlock | ButtonBlock | DividerBlock | SpacerBlock;

export interface EmailDesign {
  backgroundColor: string;
  contentBackground: string;
  contentWidth: number;
  fontFamily: string;
  blocks: EmailBlock[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_DESIGN: EmailDesign = {
  backgroundColor: "#f1f5f9", contentBackground: "#ffffff",
  contentWidth: 600, fontFamily: "Arial, sans-serif",
  blocks: [
    { id: "h1", type: "heading", content: "Hello {{name}}!", level: 1, fontSize: 28, color: "#1e293b", backgroundColor: "#ffffff", align: "center", bold: true, padding: [32, 32, 16, 32] },
    { id: "t1", type: "text", content: "Hi {{firstName}},\n\nWelcome! Edit this text and use the variable buttons to personalise this email with data from your CRM records.", fontSize: 15, color: "#475569", backgroundColor: "#ffffff", align: "left", lineHeight: 1.7, padding: [16, 32, 16, 32] },
    { id: "b1", type: "button", text: "Get Started", link: "{{customLink}}", backgroundColor: "#6366f1", textColor: "#ffffff", fontSize: 15, bold: true, borderRadius: 6, align: "center", paddingV: 12, paddingH: 28, blockPadding: [16, 32, 32, 32] },
    { id: "d1", type: "divider", color: "#e2e8f0", thickness: 1, style: "solid", padding: [16, 32, 16, 32] },
    { id: "f1", type: "text", content: "© 2025 {{orgName}} · Unsubscribe", fontSize: 12, color: "#94a3b8", backgroundColor: "#ffffff", align: "center", lineHeight: 1.6, padding: [12, 32, 24, 32] },
  ],
};

// ── Merge tags (standard) ─────────────────────────────────────────────────────

export const MERGE_TAGS = [
  { tag: "name",       label: "Full name",    module: "Standard" },
  { tag: "firstName",  label: "First name",   module: "Standard" },
  { tag: "lastName",   label: "Last name",    module: "Standard" },
  { tag: "email",      label: "Email",        module: "Standard" },
  { tag: "customLink", label: "Custom link",  module: "Standard" },
  { tag: "orgName",    label: "Org name",     module: "Standard" },
];

// ── Module field cache ────────────────────────────────────────────────────────

interface FieldItem { tag: string; label: string; module: string; }

const fieldCache: { items: FieldItem[]; loaded: boolean; loading: boolean } = {
  items: [], loaded: false, loading: false,
};

async function ensureFieldsLoaded(): Promise<FieldItem[]> {
  if (fieldCache.loaded) return fieldCache.items;
  if (fieldCache.loading) {
    // wait for it
    await new Promise(r => {
      const iv = setInterval(() => { if (!fieldCache.loading) { clearInterval(iv); r(undefined); } }, 100);
    });
    return fieldCache.items;
  }
  fieldCache.loading = true;
  try {
    const modsRes = await api.get("/modules");
    const mods: any[] = modsRes.data ?? [];
    await Promise.allSettled(mods.map(async (mod: any) => {
      try {
        const fRes = await api.get(`/fields?moduleId=${mod.id}`);
        const fs: any[] = fRes.data ?? [];
        fs.forEach((f: any) => {
          if (!fieldCache.items.find(x => x.tag === f.name)) {
            fieldCache.items.push({ tag: f.name, label: f.label || f.name, module: mod.name });
          }
        });
      } catch {}
    }));
  } catch {}
  fieldCache.loaded = true;
  fieldCache.loading = false;
  return fieldCache.items;
}

// ── HTML Renderer ─────────────────────────────────────────────────────────────

function pad(p: [number, number, number, number]) {
  return `${p[0]}px ${p[1]}px ${p[2]}px ${p[3]}px`;
}

function blockToHtml(block: EmailBlock, fontFamily: string): string {
  switch (block.type) {
    case "heading": {
      const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
      return `<tr><td style="padding:${pad(block.padding)};background:${block.backgroundColor}">
  <${tag} style="margin:0;font-family:${fontFamily};font-size:${block.fontSize}px;color:${block.color};text-align:${block.align};font-weight:${block.bold ? 700 : 400};line-height:1.3">${block.content.replace(/\n/g, "<br>")}</${tag}>
</td></tr>`;
    }
    case "text":
      return `<tr><td style="padding:${pad(block.padding)};background:${block.backgroundColor}">
  <p style="margin:0;font-family:${fontFamily};font-size:${block.fontSize}px;color:${block.color};text-align:${block.align};line-height:${block.lineHeight}">${block.content.replace(/\n/g, "<br>")}</p>
</td></tr>`;
    case "image": {
      const mode = block.sizeMode ?? "auto";
      const h = block.height ?? 220;
      const fit = block.objectFit ?? "cover";
      const m = block.margin ?? [0, 0, 0, 0];
      const marginStyle = m.some(v => v > 0) ? `margin:${pad(m)};` : "";
      let imgStyle = `display:block;border-radius:${block.borderRadius}px;${marginStyle}`;
      if (mode === "auto")   imgStyle += `max-width:${block.maxWidth}px;width:100%;`;
      if (mode === "banner") imgStyle += `width:100%;height:${h}px;object-fit:${fit};`;
      if (mode === "custom") imgStyle += `width:${block.maxWidth}px;height:${h}px;object-fit:${fit};`;
      const img = `<img src="${block.src}" alt="${block.alt}" style="${imgStyle}" />`;
      return `<tr><td style="padding:${pad(block.padding)};text-align:${block.align}">
  ${block.link ? `<a href="${block.link}" target="_blank">${img}</a>` : img}
</td></tr>`;
    }
    case "button":
      return `<tr><td style="padding:${pad(block.blockPadding)};text-align:${block.align}">
  <a href="${block.link}" target="_blank" style="display:inline-block;padding:${block.paddingV}px ${block.paddingH}px;background:${block.backgroundColor};color:${block.textColor};font-family:${fontFamily};font-size:${block.fontSize}px;font-weight:${block.bold ? 700 : 400};text-decoration:none;border-radius:${block.borderRadius}px">${block.text}</a>
</td></tr>`;
    case "divider":
      return `<tr><td style="padding:${pad(block.padding)}">
  <hr style="border:none;border-top:${block.thickness}px ${block.style} ${block.color};margin:0" />
</td></tr>`;
    case "spacer":
      return `<tr><td style="height:${block.height}px;line-height:${block.height}px;font-size:1px">&nbsp;</td></tr>`;
  }
}

export function renderEmailToHtml(design: EmailDesign, vars?: Record<string, string>): string {
  let rows = design.blocks.map(b => blockToHtml(b, design.fontFamily)).join("\n");
  if (vars) rows = rows.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${design.backgroundColor};font-family:${design.fontFamily}">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:20px 0">
<table width="${design.contentWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${design.contentWidth}px;width:100%;background:${design.contentBackground}">
${rows}
</table></td></tr></table></body></html>`;
}

// ── Block factories ───────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

const BLOCK_FACTORIES: Record<BlockType, () => EmailBlock> = {
  heading: () => ({ id: uid(), type: "heading", content: "New Heading", level: 2, fontSize: 22, color: "#1e293b", backgroundColor: "#ffffff", align: "left", bold: true, padding: [20, 32, 10, 32] }),
  text:    () => ({ id: uid(), type: "text", content: "Type your text here. Use {{name}} to personalise.", fontSize: 15, color: "#475569", backgroundColor: "#ffffff", align: "left", lineHeight: 1.7, padding: [10, 32, 20, 32] }),
  image:   () => ({ id: uid(), type: "image", src: "", alt: "", sizeMode: "auto", maxWidth: 560, height: 220, objectFit: "cover", align: "center", link: "", borderRadius: 0, padding: [16, 20, 16, 20], margin: [0, 0, 0, 0] }),
  button:  () => ({ id: uid(), type: "button", text: "Click Here", link: "{{customLink}}", backgroundColor: "#6366f1", textColor: "#ffffff", fontSize: 15, bold: true, borderRadius: 6, align: "center", paddingV: 12, paddingH: 28, blockPadding: [16, 32, 24, 32] }),
  divider: () => ({ id: uid(), type: "divider", color: "#e2e8f0", thickness: 1, style: "solid", padding: [12, 32, 12, 32] }),
  spacer:  () => ({ id: uid(), type: "spacer", height: 24 }),
};

// ── Layout presets ────────────────────────────────────────────────────────────

const LAYOUT_PRESETS = [
  {
    id: "hero", label: "Hero Banner", icon: "🖼️",
    blocks: (): EmailBlock[] => [
      { ...BLOCK_FACTORIES.image() as ImageBlock, sizeMode: "banner", height: 220, objectFit: "cover", padding: [0, 0, 0, 0] },
      { ...BLOCK_FACTORIES.heading() as HeadingBlock, content: "Your Headline", align: "center", padding: [28, 32, 8, 32] },
      { ...BLOCK_FACTORIES.text() as TextBlock, content: "Describe your message here.", align: "center", padding: [8, 32, 16, 32] },
      { ...BLOCK_FACTORIES.button() as ButtonBlock, align: "center" },
    ],
  },
  {
    id: "feature", label: "Image → Text", icon: "📄",
    blocks: (): EmailBlock[] => [
      { ...BLOCK_FACTORIES.image() as ImageBlock, maxWidth: 560, borderRadius: 8, padding: [24, 32, 16, 32] },
      { ...BLOCK_FACTORIES.heading() as HeadingBlock, content: "Feature Title", level: 2, padding: [8, 32, 8, 32] },
      { ...BLOCK_FACTORIES.text() as TextBlock, padding: [8, 32, 24, 32] },
    ],
  },
  {
    id: "newsletter", label: "Newsletter", icon: "📧",
    blocks: (): EmailBlock[] => [
      { ...BLOCK_FACTORIES.heading() as HeadingBlock, content: "Monthly Newsletter", align: "center", fontSize: 26, padding: [32, 32, 8, 32] },
      { ...BLOCK_FACTORIES.divider() as DividerBlock },
      { ...BLOCK_FACTORIES.text() as TextBlock, content: "Hi {{firstName}},\n\nHere's what's new this month…", padding: [20, 32, 16, 32] },
      { ...BLOCK_FACTORIES.button() as ButtonBlock, text: "Read More", align: "center" },
      { ...BLOCK_FACTORIES.divider() as DividerBlock },
      { ...BLOCK_FACTORIES.text() as TextBlock, content: "© 2025 {{orgName}}", fontSize: 11, color: "#94a3b8", align: "center", padding: [12, 32, 24, 32] },
    ],
  },
  {
    id: "footer", label: "Footer", icon: "🦶",
    blocks: (): EmailBlock[] => [
      { ...BLOCK_FACTORIES.divider() as DividerBlock },
      { ...BLOCK_FACTORIES.text() as TextBlock, content: "© 2025 {{orgName}} · You received this email as a registered member.\nUnsubscribe", fontSize: 11, color: "#94a3b8", align: "center", padding: [16, 32, 24, 32] },
    ],
  },
];

// ── DnD reorder ───────────────────────────────────────────────────────────────

function reorder(blocks: EmailBlock[], fromId: string, toId: string, side: "top" | "bottom"): EmailBlock[] {
  const arr = [...blocks];
  const fi = arr.findIndex(b => b.id === fromId);
  if (fi === -1) return arr;
  const [removed] = arr.splice(fi, 1);
  const ti = arr.findIndex(b => b.id === toId);
  if (ti === -1) { arr.push(removed); return arr; }
  arr.splice(side === "top" ? ti : ti + 1, 0, removed);
  return arr;
}

// ── Canvas block preview ──────────────────────────────────────────────────────

function highlight(text: string): React.ReactNode[] {
  return text.split(/(\{\{[^}]+\}\})/g).map((p, i) =>
    /^\{\{[^}]+\}\}$/.test(p)
      ? <mark key={i} className="bg-amber-100 text-amber-800 rounded px-0.5 font-mono not-italic" style={{ fontSize: "0.88em" }}>{p}</mark>
      : <span key={i}>{p}</span>
  );
}

function BlockPreview({ block, fontFamily }: { block: EmailBlock; fontFamily: string }) {
  switch (block.type) {
    case "heading":
      return (
        <div style={{ padding: block.padding.map(p => p + "px").join(" "), background: block.backgroundColor, textAlign: block.align }}>
          <span style={{ fontFamily, fontSize: block.fontSize, color: block.color, fontWeight: block.bold ? 700 : 400, display: "block", lineHeight: 1.3, whiteSpace: "pre-wrap" }}>
            {highlight(block.content || "Heading")}
          </span>
        </div>
      );
    case "text":
      return (
        <div style={{ padding: block.padding.map(p => p + "px").join(" "), background: block.backgroundColor, textAlign: block.align }}>
          <span style={{ fontFamily, fontSize: block.fontSize, color: block.color, lineHeight: block.lineHeight, display: "block", whiteSpace: "pre-wrap" }}>
            {highlight(block.content || "Text")}
          </span>
        </div>
      );
    case "image": {
      const mode = block.sizeMode ?? "auto";
      const h = block.height ?? 220;
      const fit = (block.objectFit ?? "cover") as React.CSSProperties["objectFit"];
      const m = block.margin ?? [0, 0, 0, 0];
      const imgStyle: React.CSSProperties = { display: "block", borderRadius: block.borderRadius, margin: m.map(v => v + "px").join(" ") };
      if (mode === "auto")   Object.assign(imgStyle, { maxWidth: block.maxWidth, width: "100%" });
      if (mode === "banner") Object.assign(imgStyle, { width: "100%", height: h, objectFit: fit });
      if (mode === "custom") Object.assign(imgStyle, { width: block.maxWidth, height: h, objectFit: fit });
      return (
        <div style={{ padding: block.padding.map(p => p + "px").join(" "), textAlign: block.align }}>
          {block.src
            ? <img src={block.src} alt={block.alt} style={imgStyle} />
            : (
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: mode === "banner" ? "100%" : Math.min(block.maxWidth, 380), height: mode !== "auto" ? h : 130, background: "#f1f5f9", border: "2px dashed #cbd5e1", borderRadius: block.borderRadius, color: "#94a3b8", fontSize: 13, flexDirection: "column", gap: 8, ...imgStyle }}>
                <Image className="w-7 h-7 opacity-40" />
                <span>Add image in properties →</span>
              </div>
            )}
        </div>
      );
    }
    case "button":
      return (
        <div style={{ padding: block.blockPadding.map(p => p + "px").join(" "), textAlign: block.align }}>
          <span style={{ display: "inline-block", padding: `${block.paddingV}px ${block.paddingH}px`, background: block.backgroundColor, color: block.textColor, fontFamily, fontSize: block.fontSize, fontWeight: block.bold ? 700 : 400, borderRadius: block.borderRadius }}>
            {highlight(block.text || "Button")}
          </span>
        </div>
      );
    case "divider":
      return <div style={{ padding: block.padding.map(p => p + "px").join(" ") }}><hr style={{ border: "none", borderTop: `${block.thickness}px ${block.style} ${block.color}`, margin: 0 }} /></div>;
    case "spacer":
      return <div style={{ height: block.height, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="text-[10px] text-slate-300 select-none">↕ {block.height}px spacer</span></div>;
  }
}

// ── Properties subcomponents ──────────────────────────────────────────────────

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 cursor-pointer rounded border border-slate-200 p-0.5 bg-white shrink-0" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 h-8 border border-slate-200 rounded px-2 text-xs font-mono" />
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, max = 999, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return <input type="number" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} className="w-full h-8 border border-slate-200 rounded px-2 text-sm" />;
}

function AlignButtons({ value, onChange }: { value: Align; onChange: (v: Align) => void }) {
  return (
    <div className="flex rounded border border-slate-200 overflow-hidden">
      {(["left", "center", "right"] as Align[]).map(a => (
        <button key={a} onClick={() => onChange(a)} className={cn("flex-1 py-1.5 flex items-center justify-center border-r border-slate-200 last:border-0 transition-colors", value === a ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
          {a === "left" && <AlignLeft className="w-3.5 h-3.5" />}
          {a === "center" && <AlignCenter className="w-3.5 h-3.5" />}
          {a === "right" && <AlignRight className="w-3.5 h-3.5" />}
        </button>
      ))}
    </div>
  );
}

// Spacing with link-all-sides toggle
function SpacingInput({ value, onChange }: { value: [number, number, number, number]; onChange: (v: [number, number, number, number]) => void }) {
  const [linked, setLinked] = useState(value.every(v => v === value[0]));
  const set = (i: number, v: number) => {
    if (linked) onChange([v, v, v, v]);
    else { const n = [...value] as [number, number, number, number]; n[i] = v; onChange(n); }
  };
  return (
    <div className="space-y-1.5">
      <button onClick={() => setLinked(l => !l)} className={cn("flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border transition-colors", linked ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
        <Link2 className="w-3 h-3" />{linked ? "All sides" : "Each side"}
      </button>
      {linked ? (
        <input type="number" value={value[0]} min={0} max={200} onChange={e => set(0, Number(e.target.value))} className="w-full h-8 border border-slate-200 rounded px-2 text-sm" />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {["Top", "Right", "Bottom", "Left"].map((lbl, i) => (
            <div key={i} className="flex items-center gap-1"><span className="text-[10px] text-slate-400 w-10 shrink-0">{lbl}</span>
              <input type="number" value={value[i]} min={0} max={200} onChange={e => set(i, Number(e.target.value))} className="w-full h-7 border border-slate-200 rounded px-1.5 text-xs" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── {{ field autocomplete ─────────────────────────────────────────────────────

function FieldDropdown({ search, onSelect }: { search: string; onSelect: (tag: string) => void }) {
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureFieldsLoaded().then(items => { setFields(items); setLoading(false); });
  }, []);

  const allFields: FieldItem[] = [
    ...MERGE_TAGS.map(m => ({ tag: m.tag, label: m.label, module: "Standard" })),
    ...fields.filter(f => !MERGE_TAGS.find(m => m.tag === f.tag)),
  ];

  const q = search.toLowerCase();
  const filtered = allFields.filter(f =>
    !q || f.tag.toLowerCase().includes(q) || f.label.toLowerCase().includes(q) || f.module.toLowerCase().includes(q)
  );

  const grouped = filtered.reduce<Record<string, FieldItem[]>>((acc, f) => {
    (acc[f.module] ??= []).push(f); return acc;
  }, {});

  return (
    <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden" style={{ maxHeight: 220 }}>
      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
        {loading && <p className="text-xs text-slate-400 px-3 py-2">Loading fields…</p>}
        {!loading && filtered.length === 0 && <p className="text-xs text-slate-400 px-3 py-2">No fields match "{search}"</p>}
        {Object.entries(grouped).map(([mod, items]) => (
          <div key={mod}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-1.5 bg-slate-50 sticky top-0 border-b border-slate-100">{mod}</p>
            {items.map(f => (
              <button key={f.tag} onMouseDown={e => { e.preventDefault(); onSelect(f.tag); }}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-2 transition-colors">
                <span className="font-mono text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">{`{{${f.tag}}}`}</span>
                <span className="text-xs text-slate-500">{f.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Content textarea with {{ autocomplete + merge bar ─────────────────────────

function ContentTextarea({ value, onChange, rows = 4, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [dropSearch, setDropSearch] = useState("");

  const insertTag = (tag: string) => {
    const el = ref.current;
    if (!el) { onChange(value + `{{${tag}}}`); return; }
    const s = el.selectionStart ?? value.length;
    const e2 = el.selectionEnd ?? value.length;
    onChange(value.slice(0, s) + `{{${tag}}}` + value.slice(e2));
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + tag.length + 4; el.focus(); }, 0);
  };

  const handleKeyUp = () => {
    const el = ref.current;
    if (!el) return;
    const before = value.slice(0, el.selectionStart ?? 0);
    const m = before.match(/\{\{([^{}]*)$/);
    if (m) { setDropSearch(m[1]); setShowDrop(true); }
    else setShowDrop(false);
  };

  const handleSelect = (tag: string) => {
    const el = ref.current;
    if (!el) { onChange(value + `{{${tag}}}`); setShowDrop(false); return; }
    const cur = el.selectionStart ?? value.length;
    const before = value.slice(0, cur);
    const m = before.match(/\{\{([^{}]*)$/);
    if (!m) return;
    const newVal = value.slice(0, cur - m[0].length) + `{{${tag}}}` + value.slice(cur);
    onChange(newVal);
    setShowDrop(false);
    setTimeout(() => { el.selectionStart = el.selectionEnd = cur - m[0].length + tag.length + 4; el.focus(); }, 0);
  };

  return (
    <div className="space-y-1">
      {/* Merge tag quick bar */}
      <div className="flex flex-wrap gap-1 pb-0.5">
        <span className="text-[9px] text-slate-400 self-center shrink-0">Insert:</span>
        {MERGE_TAGS.map(m => (
          <button key={m.tag} type="button" onMouseDown={e => { e.preventDefault(); insertTag(m.tag); }}
            className="text-[9px] px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-mono transition-colors leading-none">
            {`{{${m.tag}}}`}
          </button>
        ))}
      </div>
      <div className="relative">
        <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
          onKeyUp={handleKeyUp} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
          rows={rows} placeholder={placeholder}
          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        {showDrop && <FieldDropdown search={dropSearch} onSelect={handleSelect} />}
      </div>
      <p className="text-[9px] text-slate-400">Type <span className="font-mono bg-slate-100 px-0.5 rounded">{"{{"}</span> to search all CRM fields</p>
    </div>
  );
}

// ── Image uploader ────────────────────────────────────────────────────────────

function ImageUploader({
  value, onChange, onUploading,
}: {
  value: string;
  onChange: (url: string) => void;
  onUploading?: (active: boolean) => void;
}) {
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState(value.startsWith("data:") ? "" : value);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const applyUrl = (v: string) => { setUrlInput(v); onChange(v); };

  const handleFile = async (file: File) => {
    setUploadError("");
    setUploading(true);
    onUploading?.(true);
    // Show base64 preview immediately while uploading
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) onChange(e.target.result as string); };
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Raw fetch (not the `api` axios client) so the browser sets the correct
      // multipart boundary itself — axios's instance-level JSON content-type
      // default would otherwise break the upload. Goes to the backend, which
      // stores the image in durable object storage and returns a stable public
      // URL any email client can actually load (not a same-origin-only path).
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/media/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      if (data?.url) {
        onChange(data.url); // Replace base64 with server URL — now safe to save
      }
    } catch (e: any) {
      // Upload failed — clear the base64 so the stuck-image guard doesn't block saving
      onChange("");
      setUploadError(e?.message ?? "Upload failed. Try again or use a URL.");
    } finally {
      setUploading(false);
      onUploading?.(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex rounded border border-slate-200 overflow-hidden text-xs">
        {(["url", "upload"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors", tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
            {t === "url" ? <Link2 className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
            {t === "url" ? "URL" : "Upload"}
          </button>
        ))}
      </div>
      {tab === "url" && (
        <div className="flex gap-1.5">
          <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onBlur={() => applyUrl(urlInput)} onKeyDown={e => e.key === "Enter" && applyUrl(urlInput)}
            placeholder="https://example.com/image.jpg" className="flex-1 h-8 border border-slate-200 rounded px-2 text-xs" />
          <button onClick={() => applyUrl(urlInput)} className="px-2 h-8 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700 shrink-0">Set</button>
        </div>
      )}
      {tab === "upload" && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className={cn(
              "w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors text-xs disabled:opacity-50",
              uploading
                ? "border-indigo-400 bg-indigo-50 text-indigo-600 cursor-wait"
                : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-400"
            )}>
            {uploading
              ? <><span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /><span>Uploading…</span></>
              : <><Upload className="w-5 h-5" /><span>Click to choose image</span><span className="text-[10px] text-slate-300">PNG · JPG · GIF · WebP</span></>
            }
          </button>
          {uploadError && (
            <p className="text-[11px] text-red-500 bg-red-50 border border-red-200 rounded px-2 py-1">{uploadError}</p>
          )}
        </>
      )}
      {value && (
        <div className="relative rounded overflow-hidden border border-slate-200 bg-slate-50">
          <img src={value} alt="" className="w-full h-24 object-contain" />
          <button onClick={() => { onChange(""); setUrlInput(""); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] hover:bg-red-600">✕</button>
        </div>
      )}
    </div>
  );
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropertiesPanel({ block, design, onBlockChange, onDesignChange, onUploading }: {
  block: EmailBlock | null; design: EmailDesign;
  onBlockChange: (b: EmailBlock) => void;
  onDesignChange: (d: Partial<EmailDesign>) => void;
  onUploading?: (active: boolean) => void;
}) {
  if (!block) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Settings</p>
        <PropRow label="Outer Background"><ColorInput value={design.backgroundColor} onChange={v => onDesignChange({ backgroundColor: v })} /></PropRow>
        <PropRow label="Content Background"><ColorInput value={design.contentBackground} onChange={v => onDesignChange({ contentBackground: v })} /></PropRow>
        <PropRow label="Content Width (px)"><NumberInput value={design.contentWidth} onChange={v => onDesignChange({ contentWidth: v })} min={320} max={900} /></PropRow>
        <PropRow label="Font Family">
          <select value={design.fontFamily} onChange={e => onDesignChange({ fontFamily: e.target.value })} className="w-full h-8 border border-slate-200 rounded px-2 text-sm bg-white">
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Verdana, sans-serif">Verdana</option>
          </select>
        </PropRow>
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">CRM Variables</p>
          <div className="flex flex-col gap-1.5">
            {MERGE_TAGS.map(m => (
              <div key={m.tag} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px] shrink-0">{`{{${m.tag}}}`}</span>
                <span className="text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Plus any field from your CRM modules — type <span className="font-mono bg-slate-100 px-0.5">{"{{"}</span> in any text field to search all fields.</p>
        </div>
        <p className="text-xs text-slate-400 text-center border-t border-slate-100 pt-3">← Click a block to edit it</p>
      </div>
    );
  }

  const upd = (patch: Partial<EmailBlock>) => onBlockChange({ ...block, ...patch } as EmailBlock);

  return (
    <div className="p-4 space-y-4">
      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{block.type}</p>

      {block.type === "heading" && (<>
        <PropRow label="Content"><ContentTextarea value={block.content} onChange={v => upd({ content: v })} rows={3} placeholder="Your heading…" /></PropRow>
        <PropRow label="Level">
          <div className="flex rounded border border-slate-200 overflow-hidden">
            {([1, 2, 3] as const).map(l => (
              <button key={l} onClick={() => upd({ level: l })} className={cn("flex-1 py-1.5 text-xs font-bold border-r border-slate-200 last:border-0 transition-colors", block.level === l ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>H{l}</button>
            ))}
          </div>
        </PropRow>
        <PropRow label="Font Size"><NumberInput value={block.fontSize} onChange={v => upd({ fontSize: v })} min={10} max={80} /></PropRow>
        <PropRow label="Text Color"><ColorInput value={block.color} onChange={v => upd({ color: v })} /></PropRow>
        <PropRow label="Background"><ColorInput value={block.backgroundColor} onChange={v => upd({ backgroundColor: v })} /></PropRow>
        <PropRow label="Align"><AlignButtons value={block.align} onChange={v => upd({ align: v })} /></PropRow>
        <PropRow label="Bold">
          <button onClick={() => upd({ bold: !block.bold })} className={cn("w-full h-8 rounded border text-sm font-semibold transition-colors flex items-center justify-center gap-1.5", block.bold ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
            <Bold className="w-3.5 h-3.5" />{block.bold ? "Bold" : "Normal"}
          </button>
        </PropRow>
        <PropRow label="Padding"><SpacingInput value={block.padding} onChange={v => upd({ padding: v })} /></PropRow>
      </>)}

      {block.type === "text" && (<>
        <PropRow label="Content"><ContentTextarea value={block.content} onChange={v => upd({ content: v })} rows={6} placeholder="Your text… type {{ to insert a CRM field" /></PropRow>
        <PropRow label="Font Size"><NumberInput value={block.fontSize} onChange={v => upd({ fontSize: v })} min={10} max={48} /></PropRow>
        <PropRow label="Text Color"><ColorInput value={block.color} onChange={v => upd({ color: v })} /></PropRow>
        <PropRow label="Background"><ColorInput value={block.backgroundColor} onChange={v => upd({ backgroundColor: v })} /></PropRow>
        <PropRow label="Align"><AlignButtons value={block.align} onChange={v => upd({ align: v })} /></PropRow>
        <PropRow label="Line Height"><NumberInput value={block.lineHeight} onChange={v => upd({ lineHeight: v })} min={1} max={3} step={0.1} /></PropRow>
        <PropRow label="Padding"><SpacingInput value={block.padding} onChange={v => upd({ padding: v })} /></PropRow>
      </>)}

      {block.type === "image" && (<>
        <PropRow label="Image"><ImageUploader value={block.src} onChange={v => upd({ src: v })} onUploading={onUploading} /></PropRow>
        {/* Size mode */}
        <PropRow label="Size Mode">
          <div className="flex rounded border border-slate-200 overflow-hidden text-xs">
            {(["auto", "banner", "custom"] as const).map(m => (
              <button key={m} onClick={() => upd({ sizeMode: m })}
                className={cn("flex-1 py-1.5 capitalize border-r border-slate-200 last:border-0 transition-colors", (block.sizeMode ?? "auto") === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
                {m === "auto" ? "Fit" : m === "banner" ? "Banner" : "Custom"}
              </button>
            ))}
          </div>
        </PropRow>
        {(block.sizeMode ?? "auto") !== "banner" && <PropRow label="Width (px)"><NumberInput value={block.maxWidth} onChange={v => upd({ maxWidth: v })} min={50} max={600} /></PropRow>}
        {(block.sizeMode ?? "auto") !== "auto" && (<>
          <PropRow label="Height (px)"><NumberInput value={block.height ?? 220} onChange={v => upd({ height: v })} min={50} max={600} /></PropRow>
          <PropRow label="Object Fit">
            <select value={block.objectFit ?? "cover"} onChange={e => upd({ objectFit: e.target.value as any })} className="w-full h-8 border border-slate-200 rounded px-2 text-sm bg-white">
              <option value="cover">Cover (crop to fill)</option>
              <option value="contain">Contain (letterbox)</option>
              <option value="fill">Stretch to fill</option>
            </select>
          </PropRow>
        </>)}
        <PropRow label="Alt Text"><input type="text" value={block.alt} onChange={e => upd({ alt: e.target.value })} placeholder="Describe the image" className="w-full h-8 border border-slate-200 rounded px-2 text-sm" /></PropRow>
        <PropRow label="Link URL"><input type="text" value={block.link} onChange={e => upd({ link: e.target.value })} placeholder="https://… or {{customLink}}" className="w-full h-8 border border-slate-200 rounded px-2 text-sm" /></PropRow>
        <PropRow label="Corner Radius"><NumberInput value={block.borderRadius} onChange={v => upd({ borderRadius: v })} min={0} max={50} /></PropRow>
        <PropRow label="Align"><AlignButtons value={block.align} onChange={v => upd({ align: v })} /></PropRow>
        <PropRow label="Padding"><SpacingInput value={block.padding} onChange={v => upd({ padding: v })} /></PropRow>
        <PropRow label="Margin"><SpacingInput value={block.margin ?? [0,0,0,0]} onChange={v => upd({ margin: v })} /></PropRow>
      </>)}

      {block.type === "button" && (<>
        <PropRow label="Button Text"><ContentTextarea value={block.text} onChange={v => upd({ text: v })} rows={2} placeholder="Click Here" /></PropRow>
        <PropRow label="Link URL"><input type="text" value={block.link} onChange={e => upd({ link: e.target.value })} placeholder="https://… or {{customLink}}" className="w-full h-8 border border-slate-200 rounded px-2 text-sm" /></PropRow>
        <PropRow label="Background"><ColorInput value={block.backgroundColor} onChange={v => upd({ backgroundColor: v })} /></PropRow>
        <PropRow label="Text Color"><ColorInput value={block.textColor} onChange={v => upd({ textColor: v })} /></PropRow>
        <PropRow label="Font Size"><NumberInput value={block.fontSize} onChange={v => upd({ fontSize: v })} min={10} max={32} /></PropRow>
        <PropRow label="Bold">
          <button onClick={() => upd({ bold: !block.bold })} className={cn("w-full h-8 rounded border text-sm font-semibold transition-colors flex items-center justify-center gap-1.5", block.bold ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
            <Bold className="w-3.5 h-3.5" />{block.bold ? "Bold" : "Normal"}
          </button>
        </PropRow>
        <PropRow label="Corner Radius"><NumberInput value={block.borderRadius} onChange={v => upd({ borderRadius: v })} min={0} max={40} /></PropRow>
        <PropRow label="Align"><AlignButtons value={block.align} onChange={v => upd({ align: v })} /></PropRow>
        <PropRow label="Button Padding">
          <div className="flex gap-2">
            <div className="flex-1"><p className="text-[10px] text-slate-400 mb-1">Vertical</p><NumberInput value={block.paddingV} onChange={v => upd({ paddingV: v })} min={4} max={40} /></div>
            <div className="flex-1"><p className="text-[10px] text-slate-400 mb-1">Horizontal</p><NumberInput value={block.paddingH} onChange={v => upd({ paddingH: v })} min={8} max={80} /></div>
          </div>
        </PropRow>
        <PropRow label="Block Padding"><SpacingInput value={block.blockPadding} onChange={v => upd({ blockPadding: v })} /></PropRow>
      </>)}

      {block.type === "divider" && (<>
        <PropRow label="Color"><ColorInput value={block.color} onChange={v => upd({ color: v })} /></PropRow>
        <PropRow label="Thickness (px)"><NumberInput value={block.thickness} onChange={v => upd({ thickness: v })} min={1} max={10} /></PropRow>
        <PropRow label="Style">
          <select value={block.style} onChange={e => upd({ style: e.target.value as any })} className="w-full h-8 border border-slate-200 rounded px-2 text-sm bg-white">
            <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
          </select>
        </PropRow>
        <PropRow label="Padding"><SpacingInput value={block.padding} onChange={v => upd({ padding: v })} /></PropRow>
      </>)}

      {block.type === "spacer" && <PropRow label="Height (px)"><NumberInput value={block.height} onChange={v => upd({ height: v })} min={4} max={200} /></PropRow>}
    </div>
  );
}

// ── Main EmailCanvas ───────────────────────────────────────────────────────────

interface EmailCanvasProps {
  design: EmailDesign;
  onChange: (d: EmailDesign) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function EmailCanvas({ design, onChange, onUploadingChange }: EmailCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [preview,    setPreview]    = useState(false);
  const [draggedId,  setDraggedId]  = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragSide,   setDragSide]   = useState<"top" | "bottom">("bottom");
  const uploadCount = useRef(0);

  const handleUploading = useCallback((active: boolean) => {
    uploadCount.current += active ? 1 : -1;
    onUploadingChange?.(uploadCount.current > 0);
  }, [onUploadingChange]);

  const selectedBlock = design.blocks.find(b => b.id === selectedId) ?? null;

  const updateBlock  = useCallback((b: EmailBlock) => onChange({ ...design, blocks: design.blocks.map(x => x.id === b.id ? b : x) }), [design, onChange]);
  const updateDesign = useCallback((p: Partial<EmailDesign>) => onChange({ ...design, ...p }), [design, onChange]);

  const addBlock = (type: BlockType) => {
    const b = BLOCK_FACTORIES[type]();
    onChange({ ...design, blocks: [...design.blocks, b] });
    setSelectedId(b.id);
  };

  const addLayout = (preset: typeof LAYOUT_PRESETS[number]) => {
    const newBlocks = preset.blocks();
    onChange({ ...design, blocks: [...design.blocks, ...newBlocks] });
    setSelectedId(newBlocks[0].id);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = design.blocks.findIndex(b => b.id === id);
    if (idx + dir < 0 || idx + dir >= design.blocks.length) return;
    const blocks = [...design.blocks];
    [blocks[idx], blocks[idx + dir]] = [blocks[idx + dir], blocks[idx]];
    onChange({ ...design, blocks });
  };

  const deleteBlock = (id: string) => {
    onChange({ ...design, blocks: design.blocks.filter(b => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateBlock = (id: string) => {
    const idx = design.blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const copy = { ...design.blocks[idx], id: uid() };
    const blocks = [...design.blocks]; blocks.splice(idx + 1, 0, copy);
    onChange({ ...design, blocks }); setSelectedId(copy.id);
  };


  return (
    <div className="flex h-full overflow-hidden">

      {/* Left panel */}
      <div className="w-44 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="overflow-y-auto flex-1">
          {/* Blocks */}
          <div className="p-2 border-b border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5">Blocks</p>
            <div className="space-y-0.5">
              {[
                { type: "heading" as BlockType, label: "Heading",  icon: <Type className="w-3.5 h-3.5" /> },
                { type: "text"    as BlockType, label: "Text",     icon: <AlignLeft className="w-3.5 h-3.5" /> },
                { type: "image"   as BlockType, label: "Image",    icon: <Image className="w-3.5 h-3.5" /> },
                { type: "button"  as BlockType, label: "Button",   icon: <MousePointer className="w-3.5 h-3.5" /> },
                { type: "divider" as BlockType, label: "Divider",  icon: <Minus className="w-3.5 h-3.5" /> },
                { type: "spacer"  as BlockType, label: "Spacer",   icon: <Maximize2 className="w-3.5 h-3.5" /> },
              ].map(({ type, label, icon }) => (
                <button key={type} onClick={() => addBlock(type)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group">
                  <span className="text-slate-400 group-hover:text-indigo-500">{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>

          {/* Layout presets */}
          <div className="p-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5">Layouts</p>
            <div className="space-y-0.5">
              {LAYOUT_PRESETS.map(preset => (
                <button key={preset.id} onClick={() => addLayout(preset)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                  <span>{preset.icon}</span>{preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings link */}
        <div className="border-t border-slate-100 p-2">
          <button onClick={() => setSelectedId(null)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 transition-colors">
            <Square className="w-3.5 h-3.5" /> Email Settings
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-10 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <span className="text-xs text-slate-400 flex-1">
            {design.blocks.length} block{design.blocks.length !== 1 ? "s" : ""}
            {selectedBlock && <> · <span className="text-indigo-600 font-medium">{selectedBlock.type}</span></>}
          </span>
          <span className="text-[10px] text-slate-300 hidden sm:flex items-center gap-1"><GripVertical className="w-3 h-3" /> drag to reorder</span>
          <button onClick={() => setPreview(p => !p)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors", preview ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {preview ? "Edit" : "Preview"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-200">
          {preview ? (
            <div className="mx-auto shadow-lg" style={{ maxWidth: design.contentWidth, background: design.contentBackground }}>
              <iframe srcDoc={renderEmailToHtml(design)} style={{ width: "100%", minHeight: 400, border: "none", display: "block" }}
                onLoad={e => { const f = e.target as HTMLIFrameElement; if (f.contentDocument?.body) f.style.height = f.contentDocument.body.scrollHeight + "px"; }} />
            </div>
          ) : (
            <div className="mx-auto shadow-lg" style={{ maxWidth: design.contentWidth, background: design.contentBackground }}>
              {design.blocks.map((block, idx) => {
                const isDragging   = draggedId === block.id;
                const isDragTarget = dragOverId === block.id && draggedId !== block.id;
                return (
                  <div key={block.id}
                    draggable={true}
                    onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", block.id); setDraggedId(block.id); }}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (draggedId === block.id) return; setDragOverId(block.id); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDragSide(e.clientY < r.top + r.height / 2 ? "top" : "bottom"); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); const fromId = e.dataTransfer.getData("text/plain"); if (!fromId || fromId === block.id) return; onChange({ ...design, blocks: reorder(design.blocks, fromId, block.id, dragSide) }); setDraggedId(null); setDragOverId(null); }}
                    onClick={() => setSelectedId(block.id)}
                    onMouseEnter={() => setHoveredId(block.id)} onMouseLeave={() => setHoveredId(null)}
                    className="relative"
                    style={{
                      cursor: "grab",
                      opacity: isDragging ? 0.4 : 1,
                      outline: selectedId === block.id ? "2px solid #6366f1" : hoveredId === block.id ? "2px solid #c7d2fe" : "2px solid transparent",
                      borderTop: isDragTarget && dragSide === "top" ? "3px solid #6366f1" : undefined,
                      borderBottom: isDragTarget && dragSide === "bottom" ? "3px solid #6366f1" : undefined,
                    }}>
                    {/* Drag grip */}
                    {(hoveredId === block.id || selectedId === block.id) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pl-1 z-20 cursor-grab active:cursor-grabbing">
                        <div className="w-5 h-8 flex items-center justify-center text-slate-300 hover:text-indigo-400"><GripVertical className="w-4 h-4" /></div>
                      </div>
                    )}

                    <BlockPreview block={block} fontFamily={design.fontFamily} />

                    {/* Controls */}
                    {(hoveredId === block.id || selectedId === block.id) && (
                      <div className="absolute top-1 right-1 flex gap-0.5 z-10" onClick={e => e.stopPropagation()}>
                        <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="w-6 h-6 rounded bg-white/90 shadow flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 text-slate-600"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveBlock(block.id, 1)} disabled={idx === design.blocks.length - 1} className="w-6 h-6 rounded bg-white/90 shadow flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 text-slate-600"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => duplicateBlock(block.id)} className="w-6 h-6 rounded bg-white/90 shadow flex items-center justify-center hover:bg-slate-100 text-slate-600" title="Duplicate"><Plus className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteBlock(block.id)} className="w-6 h-6 rounded bg-white/90 shadow flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-slate-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    {hoveredId === block.id && selectedId !== block.id && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-slate-700/80 text-white rounded text-[10px] font-medium pointer-events-none">{block.type}</div>
                    )}
                  </div>
                );
              })}
              {design.blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                  <GripVertical className="w-10 h-10 mb-3" />
                  <p className="text-sm">Add blocks or choose a layout from the left panel</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: properties */}
      <div className="w-64 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-100 shrink-0 sticky top-0 bg-white z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {selectedBlock ? `${selectedBlock.type} properties` : "Email & Variables"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PropertiesPanel block={selectedBlock} design={design} onBlockChange={updateBlock} onDesignChange={updateDesign} onUploading={handleUploading} />
        </div>
      </div>
    </div>
  );
}
