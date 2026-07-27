"use client";

import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";
import { api } from "@/lib/api";

interface Announcement {
  message: string;
  updatedAt: string;
}

const DISMISS_KEY = "cloudbox-announcement-dismissed";

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/public/announcements/active")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setAnnouncement(data);
        // A new announcement (different updatedAt) always shows again, even if a previous one was dismissed.
        setDismissed(localStorage.getItem(DISMISS_KEY) === data.updatedAt);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!announcement || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, announcement.updatedAt);
    setDismissed(true);
  };

  return (
    <div
      className="relative z-[100] flex items-center justify-center gap-3 px-4 py-2.5 text-white text-sm text-center"
      style={{ background: "linear-gradient(90deg, #1e1b4b 0%, #3730a3 55%, #2563eb 100%)" }}
    >
      <Megaphone className="w-4 h-4 shrink-0 opacity-80" />
      <span className="leading-snug font-semibold">{announcement.message}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
