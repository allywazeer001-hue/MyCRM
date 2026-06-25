"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { portalApi } from "@/lib/portal-api";
import { usePortalAuthStore } from "@/store/portal-auth.store";
import {
  CalendarDays, Clock, ArrowRight, Newspaper, Loader2, ExternalLink,
} from "lucide-react";

interface Publication {
  id: string;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  coverFile?: { fileUrl: string };
  publishedAt?: string;
  isEvent: boolean;
  eventDate?: string;
  eventCtaLabel?: string;
  eventCtaUrl?: string;
  author: { firstName: string; lastName: string };
}

function timeAgo(d?: string) {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 4) return `${wks} week${wks !== 1 ? "s" : ""} ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo} month${mo !== 1 ? "s" : ""} ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function timeUntil(d: string) {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "Event started";
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} away`;
  const hrs = Math.floor(ms / 3600000);
  return `${hrs} hour${hrs !== 1 ? "s" : ""} away`;
}

export default function PortalPublicationsPage() {
  const router   = useRouter();
  const { user } = usePortalAuthStore();
  const orgId    = user?.organizationId;

  const [loading, setLoading]             = useState(true);
  const [upcomingEvent, setUpcomingEvent] = useState<Publication | null>(null);
  const [publications, setPublications]   = useState<Publication[]>([]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    portalApi.get(`/portal-publications/feed/${orgId}`)
      .then(r => {
        setUpcomingEvent(r.data.upcomingEvent ?? null);
        setPublications(r.data.publications ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const trackClick = (pubId: string, type: string) => {
    if (!orgId) return;
    portalApi.post(`/portal-publications/${orgId}/${pubId}/engage`, {
      activityType: type,
      portalUserId: user?.id,
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

  return (
    <PortalShell>
      <div className="max-w-3xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publications</h1>
          <p className="text-sm text-gray-500 mt-0.5">Announcements, news and events from your organisation</p>
        </div>

        {/* ── Section 1: Upcoming Event Banner ────────────────────────────── */}
        {upcomingEvent && (
          <div
            className="relative rounded-2xl overflow-hidden shadow-lg min-h-56 flex items-end"
            style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)" }}
          >
            {(upcomingEvent.coverFile?.fileUrl || upcomingEvent.coverImageUrl) && (
              <img
                src={upcomingEvent.coverFile?.fileUrl ?? upcomingEvent.coverImageUrl}
                alt={upcomingEvent.title}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            <div className="relative z-10 p-6 w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Upcoming Event
                </span>
                {upcomingEvent.eventDate && (
                  <span className="text-white/80 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeUntil(upcomingEvent.eventDate)}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{upcomingEvent.title}</h2>
              {upcomingEvent.excerpt && (
                <p className="text-white/80 text-sm mt-1 line-clamp-2">{upcomingEvent.excerpt}</p>
              )}
              {upcomingEvent.eventDate && (
                <p className="text-white/70 text-xs mt-2 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> {new Date(upcomingEvent.eventDate!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => {
                    trackClick(upcomingEvent.id, "VIEWED");
                    router.push(`/portal/publications/${upcomingEvent.id}`);
                  }}
                  className="bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition flex items-center gap-1.5"
                >
                  Read More <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {upcomingEvent.eventCtaUrl && (
                  <a
                    href={upcomingEvent.eventCtaUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackClick(upcomingEvent.id, "EVENT_LINK_CLICKED")}
                    className="bg-white/20 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/30 transition flex items-center gap-1.5 border border-white/30"
                  >
                    {upcomingEvent.eventCtaLabel || "Learn More"} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Section 2: Publications Feed ─────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Latest Publications</h2>
          {publications.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <Newspaper className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No publications yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publications.map(pub => (
                <button
                  key={pub.id}
                  onClick={() => {
                    trackClick(pub.id, "VIEWED");
                    router.push(`/portal/publications/${pub.id}`);
                  }}
                  className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                >
                  {/* Cover */}
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {pub.isEvent
                        ? <CalendarDays className="w-10 h-10 text-indigo-300" />
                        : <Newspaper className="w-10 h-10 text-gray-300" />}
                    </div>
                    {(pub.coverFile?.fileUrl || pub.coverImageUrl) && (
                      <img
                        src={pub.coverFile?.fileUrl ?? pub.coverImageUrl}
                        alt={pub.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>

                  <div className="p-4">
                    {pub.isEvent && (
                      <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Event</span>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                      {pub.title}
                    </h3>
                    {pub.excerpt && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pub.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-gray-400">
                        {pub.author.firstName} {pub.author.lastName}
                      </span>
                      <span className="text-[11px] text-gray-400">{timeAgo(pub.publishedAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
