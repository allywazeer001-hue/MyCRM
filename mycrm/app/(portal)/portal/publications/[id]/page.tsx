"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  ArrowLeft, CalendarDays, ExternalLink, Download, Paperclip, Loader2,
} from "lucide-react";

interface Props { params: Promise<{ id: string }> }

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function PortalPublicationDetailPage({ params }: Props) {
  const { id }  = use(params);
  const router  = useRouter();
  const { user } = usePortalAuthStore();
  const orgId    = user?.organizationId;

  const [pub, setPub]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    portalApi.get(`/portal-publications/${orgId}/${id}`, {
      params: { portalUserId: user?.id },
    })
      .then(r => setPub(r.data))
      .catch(() => router.push("/portal/publications"))
      .finally(() => setLoading(false));
  }, [orgId, id]); // eslint-disable-line

  const trackEvent = (type: string, meta?: any) => {
    if (!orgId) return;
    portalApi.post(`/portal-publications/${orgId}/${id}/engage`, {
      activityType: type,
      portalUserId: user?.id,
      metadata: meta ?? {},
      deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : undefined,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <PortalShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      </PortalShell>
    );
  }

  if (!pub) return null;

  const coverUrl = pub.coverFile?.fileUrl ?? pub.coverImageUrl;

  return (
    <PortalShell>
      <div className="max-w-2xl mx-auto pb-16">
        {/* Back */}
        <button
          onClick={() => router.push("/portal/publications")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Publications
        </button>

        {/* Cover */}
        {coverUrl && (
          <div className="w-full h-56 rounded-2xl overflow-hidden mb-6">
            <img src={coverUrl} alt={pub.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Event badge */}
        {pub.isEvent && (
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Event</span>
            {pub.eventDate && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> {formatDate(pub.eventDate)}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{pub.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          <span>By {pub.author.firstName} {pub.author.lastName}</span>
          {pub.publishedAt && <span>· {formatDate(pub.publishedAt)}</span>}
        </div>

        {/* Event CTA */}
        {pub.isEvent && pub.eventCtaUrl && (
          <a
            href={pub.eventCtaUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("EVENT_LINK_CLICKED", { url: pub.eventCtaUrl })}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition"
          >
            {pub.eventCtaLabel || "Register"} <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Excerpt */}
        {pub.excerpt && (
          <p className="mt-5 text-base text-gray-600 font-medium leading-relaxed border-l-4 border-indigo-200 pl-4">
            {pub.excerpt}
          </p>
        )}

        {/* Content */}
        {pub.content && (
          <div className="mt-6 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
            {pub.content}
          </div>
        )}

        {/* External links */}
        {Array.isArray(pub.externalLinks) && pub.externalLinks.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Related Links</h3>
            <div className="space-y-2">
              {pub.externalLinks.map((lnk: any, i: number) => (
                <a
                  key={i}
                  href={lnk.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent("EXTERNAL_LINK_CLICKED", { url: lnk.url, label: lnk.label })}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  {lnk.label || lnk.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {Array.isArray(pub.attachments) && pub.attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments</h3>
            <div className="space-y-2">
              {pub.attachments.map((att: any) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  onClick={() => trackEvent("ATTACHMENT_DOWNLOADED", { fileName: att.fileName })}
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition group"
                >
                  <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{att.label || att.fileName}</span>
                  <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
