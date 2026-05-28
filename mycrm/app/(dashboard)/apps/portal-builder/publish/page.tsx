"use client";
import { useEffect, useState } from "react";
import { portalApi } from "@/lib/portal-api";
import { useRouter } from "next/navigation";
import {
  Rocket, Loader2, Globe, EyeOff, Eye, Copy, CheckCircle,
  ExternalLink, FileText, AlertCircle,
} from "lucide-react";

interface PortalPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
  layoutTemplate?: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PUBLISHED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-900/40 text-green-300 border border-green-800/50">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      Draft
    </span>
  );
}

function PageRow({
  page,
  onStatusChange,
}: {
  page: PortalPage;
  onStatusChange: (id: string, newStatus: string) => void;
}) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const portalUrl = `/portal/pages/${page.slug}`;

  const toggle = async () => {
    const newStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setToggling(true);
    try {
      await portalApi.patch(`/portal/padmin/pages/${page.id}`, { status: newStatus });
      onStatusChange(page.id, newStatus);
    } catch {}
    setToggling(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + portalUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-4">
        {/* Page info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <p className="text-sm font-semibold text-white truncate">{page.title}</p>
            <StatusBadge status={page.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="font-mono">/portal/pages/{page.slug}</span>
            {page.publishedAt && (
              <span>Published {new Date(page.publishedAt).toLocaleDateString()}</span>
            )}
            {page.layoutTemplate && (
              <span className="capitalize">{page.layoutTemplate.replace("-", " ")} layout</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Copy link — only when published */}
          {page.status === "PUBLISHED" && (
            <>
              <button
                onClick={copyLink}
                title="Copy portal link"
                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open portal page"
                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}

          {/* Edit button */}
          <button
            onClick={() => router.push(`/apps/portal-builder/pages/${page.id}`)}
            title="Edit page"
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors font-medium"
          >
            Edit
          </button>

          {/* Publish/Unpublish toggle */}
          <button
            onClick={toggle}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
              page.status === "PUBLISHED"
                ? "bg-gray-800 hover:bg-red-900/30 text-gray-300 hover:text-red-300 border border-gray-700 hover:border-red-800"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : page.status === "PUBLISHED" ? (
              <><EyeOff className="w-3.5 h-3.5" />Unpublish</>
            ) : (
              <><Globe className="w-3.5 h-3.5" />Publish</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PublishPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PortalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    portalApi.get("/portal/padmin/pages")
      .then(r => setPages(r.data ?? []))
      .catch(() => setError("Could not load pages."))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (id: string, newStatus: string) => {
    setPages(prev => prev.map(p =>
      p.id === id
        ? { ...p, status: newStatus, publishedAt: newStatus === "PUBLISHED" ? new Date().toISOString() : p.publishedAt }
        : p
    ));
  };

  const published = pages.filter(p => p.status === "PUBLISHED");
  const drafts    = pages.filter(p => p.status !== "PUBLISHED");

  const publishAll = async () => {
    for (const p of drafts) {
      try {
        await portalApi.patch(`/portal/padmin/pages/${p.id}`, { status: "PUBLISHED" });
        handleStatusChange(p.id, "PUBLISHED");
      } catch {}
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-400" />
            Publish
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Control which pages are live on your portal. Published pages are visible to portal users.
          </p>
        </div>
        {drafts.length > 0 && (
          <button
            onClick={publishAll}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4" />
            Publish All ({drafts.length})
          </button>
        )}
      </div>

      {/* Stats bar */}
      {!loading && pages.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-white">{pages.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Pages</p>
          </div>
          <div className="bg-gray-900 border border-green-900/40 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{published.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Published</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-gray-400">{drafts.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Drafts</p>
          </div>
        </div>
      )}

      {/* Portal live link */}
      {published.length > 0 && (
        <div className="flex items-center gap-3 bg-green-950/20 border border-green-900/40 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-sm text-green-300 font-medium">Your portal is live</p>
          <a
            href="/portal/dashboard"
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1.5 text-xs text-green-400 hover:text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Open Portal
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Pages */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />{error}
          </p>
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center">
          <FileText className="w-10 h-10 text-gray-800 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No pages yet</p>
          <p className="text-xs text-gray-600 mt-1 mb-4">Apply a template or create pages to get started.</p>
          <button
            onClick={() => router.push("/apps/portal-builder/templates")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
          >
            Browse Templates
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {published.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Published</p>
              {published.map(p => (
                <PageRow key={p.id} page={p} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
          {drafts.length > 0 && (
            <div className={published.length > 0 ? "mt-4" : ""}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Drafts</p>
              {drafts.map(p => (
                <PageRow key={p.id} page={p} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
