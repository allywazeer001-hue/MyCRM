"use client";
import { useState, useEffect } from "react";
import { Users, Search, FileText, ExternalLink, LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const CARD_PALETTES = [
  { grad: "from-violet-500 to-indigo-500" },
  { grad: "from-indigo-500 to-blue-500"  },
  { grad: "from-blue-500 to-cyan-500"    },
  { grad: "from-teal-500 to-emerald-500" },
  { grad: "from-emerald-500 to-green-500"},
  { grad: "from-pink-500 to-rose-500"    },
  { grad: "from-amber-500 to-orange-500" },
  { grad: "from-fuchsia-500 to-purple-500"},
];

function FormDocIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="2" width="18" height="20" rx="4" fill="white" opacity="0.9" />
      <rect x="7" y="7"   width="10" height="2.5" rx="1.25" fill="currentColor" opacity="0.45" />
      <rect x="7" y="11"  width="7"  height="2"   rx="1"    fill="currentColor" opacity="0.35" />
      <rect x="7" y="15"  width="8.5" height="2"  rx="1"    fill="currentColor" opacity="0.35" />
    </svg>
  );
}

interface SharedForm {
  id: string;
  name: string;
  description?: string;
  type: string;
  token?: string;
  createdBy: { firstName: string; lastName: string };
  _count: { submissions: number };
}

export default function SharedFormsPage() {
  const router = useRouter();
  const [forms,    setForms]    = useState<SharedForm[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  useEffect(() => {
    api.get("/forms/shared")
      .then((r) => setForms(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = forms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div>
          <h1 className="text-[15px] font-bold text-slate-800">Shared With Me</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {forms.length} {forms.length === 1 ? "form" : "forms"} shared with you
          </p>
        </div>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-2 px-5 py-3 shrink-0" style={{ borderBottom: "1px solid #f8fafc" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shared forms…"
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl outline-none transition-all"
            style={{ background: "#f8f7ff", border: "1.5px solid #ede9fe", color: "#1e1b4b" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.15)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#ede9fe";  e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-xl overflow-hidden shrink-0" style={{ border: "1.5px solid #ede9fe", background: "#f8f7ff" }}>
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-all", viewMode === "grid" ? "text-white" : "text-slate-400 hover:text-violet-500")}
            style={viewMode === "grid" ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-all", viewMode === "list" ? "text-white" : "text-slate-400 hover:text-violet-500")}
            style={viewMode === "list" ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #ede9fe, #e0e7ff)" }}>
              <Users className="w-8 h-8 text-violet-400" />
            </div>
            <p className="font-bold text-slate-700 text-[15px]">
              {search ? "No matching forms" : "Nothing shared yet"}
            </p>
            <p className="text-slate-400 text-[12px] mt-1">
              {search ? "Try a different search term" : "Forms shared with you will appear here"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* ── Grid view ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((form, i) => {
              const pal = CARD_PALETTES[i % CARD_PALETTES.length];
              return (
                <div
                  key={form.id}
                  className="cf-shared-card group bg-white rounded-2xl overflow-hidden cursor-pointer relative"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1.5px solid #f1f5f9" }}
                  onClick={() => router.push(`/cf/forms/${form.id}/builder`)}
                >
                  <div className={cn("h-[72px] bg-gradient-to-br flex items-center justify-center relative", pal.grad)}>
                    <FormDocIcon />
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-bold text-slate-800 text-[12.5px] truncate">{form.name}</h3>
                    {form.description && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{form.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">by {form.createdBy.firstName} {form.createdBy.lastName}</p>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                        {form.type === "MODULE" ? "Module" : "Standalone"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{form._count.submissions} responses</span>
                        {form.token && (
                          <a href={`/f/${form.token}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-violet-600 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List view ── */
          <div className="space-y-2">
            {filtered.map((form, i) => {
              const pal = CARD_PALETTES[i % CARD_PALETTES.length];
              return (
                <div
                  key={form.id}
                  className="cf-shared-row group flex items-center gap-3 p-3.5 bg-white rounded-xl cursor-pointer transition-all"
                  style={{ border: "1.5px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                  onClick={() => router.push(`/cf/forms/${form.id}/builder`)}
                >
                  {/* Color bar */}
                  <div className={cn("w-1.5 h-10 rounded-full bg-gradient-to-b shrink-0", pal.grad)} />

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ede9fe, #e0e7ff)" }}>
                    <FileText className="w-4 h-4 text-violet-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-[13px] truncate">{form.name}</p>
                    {form.description && <p className="text-[11px] text-slate-400 truncate">{form.description}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">by {form.createdBy.firstName} {form.createdBy.lastName}</p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-[13px] font-bold text-slate-700">{form._count.submissions}</p>
                      <p className="text-[10px] text-slate-400">responses</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="hidden md:inline text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                        {form.type === "MODULE" ? "Module" : "Standalone"}
                      </span>
                      {form.token && (
                        <a href={`/f/${form.token}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-violet-600 transition-colors" title="Preview form">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        .cf-shared-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.11) !important; border-color: #e0d9f7 !important; }
        .cf-shared-row:hover  { transform: translateY(-1px); border-color: #e0d9f7 !important; box-shadow: 0 4px 14px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  );
}
