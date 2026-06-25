"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Loader2, BarChart2, Send, Archive, RotateCcw, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AdminPublicationForm from "../_form";
import { cn } from "@/lib/utils";

interface Props { params: Promise<{ id: string }> }

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED:  "bg-amber-100 text-amber-700",
};

export default function AdminPublicationDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [pub, setPub]         = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/publications/${id}`)
      .then(r => setPub(r.data))
      .catch(() => router.push("/portal/admin/publications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const act = async (action: string) => {
    await api.post(`/publications/${id}/${action}`);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div>;
  if (!pub) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/portal/admin/publications")} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{pub.title}</h1>
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_STYLES[pub.status])}>
          {pub.status}
        </span>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500 hover:text-gray-800" onClick={() => router.push(`/portal/admin/publications/${id}/analytics`)}>
            <BarChart2 className="w-3.5 h-3.5 mr-1" /> Analytics
          </Button>
          {pub.status === "DRAFT" && (
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 border-0 text-white" onClick={() => act("publish")}>
              <Send className="w-3.5 h-3.5 mr-1" /> Publish
            </Button>
          )}
          {pub.status === "PUBLISHED" && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600 hover:text-amber-700" onClick={() => act("unpublish")}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Unpublish
            </Button>
          )}
          {pub.status !== "ARCHIVED" && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-gray-700" onClick={() => act("archive")}>
              <Archive className="w-3.5 h-3.5 mr-1" /> Archive
            </Button>
          )}
        </div>
      </div>

      <AdminPublicationForm initialData={pub} publicationId={id} onSaved={() => load()} />
    </div>
  );
}
