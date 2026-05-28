"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Loader2, Save, ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Type, AlignLeft, LayoutGrid, Table2, Globe, EyeOff, Eye,
} from "lucide-react";

type BlockType = "heading" | "text" | "cards" | "table" | "divider" | "callout";

interface Block {
  id: string;
  type: BlockType;
  content: Record<string, any>;
}

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  status: string;
  blocks: Block[];
  accessTypes: string[];
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: any; description: string }[] = [
  { type: "heading",  label: "Heading",  icon: Type,        description: "Section title" },
  { type: "text",     label: "Text",     icon: AlignLeft,   description: "Rich text paragraph" },
  { type: "cards",    label: "Cards",    icon: LayoutGrid,  description: "Info cards grid" },
  { type: "table",    label: "Table",    icon: Table2,      description: "Data table" },
  { type: "divider",  label: "Divider",  icon: AlignLeft,   description: "Horizontal rule" },
  { type: "callout",  label: "Callout",  icon: AlignLeft,   description: "Highlighted box" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultContent(type: BlockType): Record<string, any> {
  switch (type) {
    case "heading":  return { text: "New Heading", level: 2 };
    case "text":     return { text: "Enter your text here..." };
    case "cards":    return { cards: [{ title: "Card 1", description: "Description", icon: "📌" }] };
    case "table":    return { columns: ["Column 1", "Column 2"], rows: [["Value 1", "Value 2"]] };
    case "divider":  return {};
    case "callout":  return { text: "Important note here.", variant: "info" };
    default:         return {};
  }
}

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: Block; onChange: (b: Block) => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}) {
  const update = (patch: Record<string, any>) => onChange({ ...block, content: { ...block.content, ...patch } });

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{block.type}</span>
        <div className="flex items-center gap-1">
          <button disabled={isFirst} onClick={onMoveUp} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button disabled={isLast} onClick={onMoveDown} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="p-4">
        {block.type === "heading" && (
          <div className="space-y-2">
            <select value={block.content.level} onChange={e => update({ level: Number(e.target.value) })} className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600">
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500" value={block.content.text} onChange={e => update({ text: e.target.value })} placeholder="Heading text" />
          </div>
        )}
        {block.type === "text" && (
          <textarea rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={block.content.text} onChange={e => update({ text: e.target.value })} placeholder="Paragraph text..." />
        )}
        {block.type === "callout" && (
          <div className="space-y-2">
            <select value={block.content.variant} onChange={e => update({ variant: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600">
              <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option><option value="error">Error</option>
            </select>
            <textarea rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={block.content.text} onChange={e => update({ text: e.target.value })} placeholder="Callout message..." />
          </div>
        )}
        {block.type === "cards" && (
          <div className="space-y-2">
            {(block.content.cards as any[]).map((card: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="w-8 border border-gray-200 rounded px-2 py-1.5 text-sm text-center" value={card.icon} onChange={e => { const c = [...block.content.cards]; c[i] = { ...c[i], icon: e.target.value }; update({ cards: c }); }} />
                <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium" placeholder="Title" value={card.title} onChange={e => { const c = [...block.content.cards]; c[i] = { ...c[i], title: e.target.value }; update({ cards: c }); }} />
                <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-500" placeholder="Description" value={card.description} onChange={e => { const c = [...block.content.cards]; c[i] = { ...c[i], description: e.target.value }; update({ cards: c }); }} />
                <button onClick={() => { const c = block.content.cards.filter((_: any, j: number) => j !== i); update({ cards: c }); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => update({ cards: [...block.content.cards, { title: "New Card", description: "", icon: "📌" }] })} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add card</button>
          </div>
        )}
        {block.type === "table" && (
          <div className="space-y-2 overflow-x-auto">
            <div className="flex gap-2 items-center">
              {(block.content.columns as string[]).map((col: string, i: number) => (
                <input key={i} className="border border-gray-200 rounded px-2 py-1 text-xs font-semibold text-gray-600 w-28" value={col} onChange={e => { const c = [...block.content.columns]; c[i] = e.target.value; update({ columns: c }); }} placeholder={`Col ${i + 1}`} />
              ))}
              <button onClick={() => update({ columns: [...block.content.columns, `Col ${block.content.columns.length + 1}`], rows: block.content.rows.map((r: string[]) => [...r, ""]) })} className="text-xs text-indigo-600">+ Col</button>
            </div>
            {(block.content.rows as string[][]).map((row: string[], ri: number) => (
              <div key={ri} className="flex gap-2 items-center">
                {row.map((cell: string, ci: number) => (
                  <input key={ci} className="border border-gray-200 rounded px-2 py-1 text-xs w-28" value={cell} onChange={e => { const r = block.content.rows.map((rr: string[], rri: number) => rri === ri ? rr.map((c: string, ci2: number) => ci2 === ci ? e.target.value : c) : rr); update({ rows: r }); }} />
                ))}
                <button onClick={() => update({ rows: block.content.rows.filter((_: any, i: number) => i !== ri) })} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={() => update({ rows: [...block.content.rows, block.content.columns.map(() => "")] })} className="text-xs text-indigo-600">+ Row</button>
          </div>
        )}
        {block.type === "divider" && <div className="border-t border-gray-200 my-2" />}
      </div>
    </div>
  );
}

export default function PageEditorPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const router = useRouter();
  const [page, setPage] = useState<PortalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(`/portal/admin/builder/pages/${pageId}`)
      .then(r => setPage(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pageId]);

  const save = async (patch?: Partial<PortalPage>) => {
    if (!page) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/portal/admin/builder/pages/${pageId}`, patch ?? { title: page.title, description: page.description, icon: page.icon, blocks: page.blocks, status: page.status });
      setPage(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const addBlock = (type: BlockType) => {
    if (!page) return;
    const newBlock: Block = { id: generateId(), type, content: defaultContent(type) };
    setPage({ ...page, blocks: [...page.blocks, newBlock] });
    setShowBlockPicker(false);
  };

  const updateBlock = (idx: number, block: Block) => {
    if (!page) return;
    const blocks = [...page.blocks];
    blocks[idx] = block;
    setPage({ ...page, blocks });
  };

  const deleteBlock = (idx: number) => {
    if (!page) return;
    setPage({ ...page, blocks: page.blocks.filter((_, i) => i !== idx) });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    if (!page) return;
    const blocks = [...page.blocks];
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    setPage({ ...page, blocks });
  };

  const toggleStatus = () => {
    if (!page) return;
    const next = page.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    setPage({ ...page, status: next });
    save({ status: next, blocks: page.blocks });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  if (!page) return <div className="text-center text-gray-400 py-12">Page not found.</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/settings/portal-builder/pages")} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{page.title}</h1>
          <p className="text-xs text-gray-400 font-mono">/{page.slug}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${page.status === "PUBLISHED" ? "bg-green-50 text-green-700" : page.status === "DRAFT" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
          {page.status}
        </span>
        <button onClick={toggleStatus} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${page.status === "PUBLISHED" ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : "text-green-700 bg-green-50 hover:bg-green-100"}`}>
          {page.status === "PUBLISHED" ? <><EyeOff className="w-3.5 h-3.5" />Unpublish</> : <><Globe className="w-3.5 h-3.5" />Publish</>}
        </button>
        <button onClick={() => save()} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <span className="text-green-300">✓</span> : <Save className="w-3.5 h-3.5" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* Page settings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Page Settings</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={page.title} onChange={e => setPage({ ...page, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Icon (emoji)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={page.icon || ""} onChange={e => setPage({ ...page, icon: e.target.value })} placeholder="📄" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={page.description || ""} onChange={e => setPage({ ...page, description: e.target.value })} placeholder="Short description for the page" />
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Content Blocks</p>
        {page.blocks.map((block, idx) => (
          <BlockEditor
            key={block.id}
            block={block}
            onChange={b => updateBlock(idx, b)}
            onDelete={() => deleteBlock(idx)}
            onMoveUp={() => moveBlock(idx, -1)}
            onMoveDown={() => moveBlock(idx, 1)}
            isFirst={idx === 0}
            isLast={idx === page.blocks.length - 1}
          />
        ))}

        {/* Add block */}
        {showBlockPicker ? (
          <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Choose a block type</p>
            <div className="grid grid-cols-3 gap-2">
              {BLOCK_TYPES.map(({ type, label, icon: Icon, description }) => (
                <button key={type} onClick={() => addBlock(type)} className="flex flex-col items-start p-3 border border-gray-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-left">
                  <Icon className="w-4 h-4 text-indigo-500 mb-1" />
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400">{description}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowBlockPicker(false)} className="mt-3 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowBlockPicker(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add Block
          </button>
        )}
      </div>
    </div>
  );
}
