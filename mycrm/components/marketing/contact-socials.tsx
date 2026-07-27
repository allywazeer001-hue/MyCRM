"use client";

import { useEffect, useState } from "react";
import { SOCIAL_PLATFORMS } from "@/lib/social-platforms";

const STORAGE_KEY = "cloudbox-landing-config";

export function ContactSocials() {
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSocialLinks(JSON.parse(raw)?.socialLinks ?? {});
    } catch { /* ignore */ }
  }, []);

  const active = SOCIAL_PLATFORMS.filter((p) => socialLinks[p.key]);

  if (active.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl px-5 py-4 text-white/25 text-sm"
        style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.08)" }}>
        No social links added yet — add some from Platform Admin.
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3 flex-wrap">
      {active.map((p) => {
        const Icon = p.icon;
        return (
          <a key={p.key} href={socialLinks[p.key]} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl px-5 py-3 transition-all hover:-translate-y-0.5 text-sm text-white/70"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Icon className="w-4 h-4 text-blue-400 shrink-0" />
            {p.label}
          </a>
        );
      })}
    </div>
  );
}
