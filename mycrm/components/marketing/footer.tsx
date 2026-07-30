"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { SOCIAL_PLATFORMS } from "@/lib/social-platforms";
import { CONTACT_INFO } from "@/lib/contact-info";
import { BRAND } from "@/lib/core-brand";

const STORAGE_KEY = "cloudbox-landing-config";

// ── Logo mark (kept in sync with the landing page's LogoMark) ────────────────
function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2"  y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="18" y="2"  width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="2"  y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.7" />
      <rect x="18" y="18" width="12" height="12" rx="3" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSocialLinks(JSON.parse(raw)?.socialLinks ?? {});
    } catch { /* ignore */ }
  }, []);

  const activeSocials = SOCIAL_PLATFORMS.filter((p) => socialLinks[p.key]);

  return (
    <footer className="relative z-10 border-t border-white/[0.05] px-6 md:px-14 py-14 text-white/40">
      <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
              <LogoMark size={16} />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">{BRAND.name}</span>
          </div>
          <p className="text-sm leading-relaxed max-w-xs">
            One unified platform to grow your customer base, manage your people, track your finances, and run every operation — built from the gaps real teams actually hit.
          </p>
        </div>

        {/* Product */}
        <div>
          <p className="text-white/70 font-semibold text-sm mb-4">Product</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/register" className="hover:text-white transition-colors">Get started</Link></li>
            <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
            <li><a href="https://claude.ai/code/artifact/2ef3933b-27cf-4447-9bba-1c9632bce995" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <p className="text-white/70 font-semibold text-sm mb-4">Company</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact us</Link></li>
            <li className="text-white/30">{CONTACT_INFO.ceoName} — {CONTACT_INFO.ceoTitle}</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="text-white/70 font-semibold text-sm mb-4">Get in touch</p>
          <ul className="space-y-2.5 text-sm">
            {CONTACT_INFO.emails.map((email) => (
              <li key={email}>
                <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white transition-colors break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" /> {email}
                </a>
              </li>
            ))}
            {CONTACT_INFO.phones.map((phone) => (
              <li key={phone}>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5 shrink-0" /> {phone}
                </a>
              </li>
            ))}
          </ul>

          {activeSocials.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              {activeSocials.map((p) => {
                const Icon = p.icon;
                return (
                  <a key={p.key} href={socialLinks[p.key]} target="_blank" rel="noopener noreferrer" title={p.label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.12] text-white/50 hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/20">
        <span>© {year} {BRAND.name}. All rights reserved.</span>
        <a href="/land-admin" className="text-white/15 hover:text-white/40 transition-colors">
          Platform Admin
        </a>
      </div>
    </footer>
  );
}
