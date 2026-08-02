import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2 } from "lucide-react";
import { Footer } from "@/components/marketing/footer";
import { CONTACT_INFO } from "@/lib/contact-info";
import { ContactSocials } from "@/components/marketing/contact-socials";
import { BRAND } from "@/lib/core-brand";

export const metadata = {
  title: `Contact us — ${BRAND.name}`,
  description: `Get in touch with the ${BRAND.name} team.`,
};

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

export default function ContactPage() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#060d1f" }}>
      {/* Ambient blobs */}
      <div className="fixed top-[-10%] left-[15%] w-[700px] h-[700px] rounded-full bg-blue-600/6 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[0] left-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-700/7 blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-14 py-5 border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-xl shadow-brand-dark/60">
            <LogoMark size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
        </Link>
        <Link href="/" className="text-sm text-white/50 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back home
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-14 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm mb-6"
          style={{ background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          We&apos;d love to hear from you
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
          Get in touch
        </h1>
        <p className="text-lg text-white/45 max-w-xl mx-auto leading-relaxed">
          Questions, feedback, or want a walkthrough of {BRAND.name} for your organization? Reach out directly — we read every message.
        </p>
      </section>

      {/* Contact cards */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-14 pb-24">
        <div className="rounded-3xl p-1 mb-10" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.06) 100%)" }}>
          <div className="rounded-[calc(1.5rem-2px)] p-8 md:p-10" style={{ background: "rgba(11,20,45,0.9)" }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{CONTACT_INFO.ceoName}</h2>
                <p className="text-sm text-white/40">{CONTACT_INFO.ceoTitle}, {BRAND.name}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {CONTACT_INFO.emails.map((email) => (
                <a
                  key={email}
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-sm text-white/70 break-all">{email}</span>
                </a>
              ))}
              {CONTACT_INFO.phones.map((phone) => (
                <a
                  key={phone}
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-white/70">{phone}</span>
                </a>
              ))}
            </div>

            <ContactSocials />
          </div>
        </div>

        <div className="text-center">
          <Link href="/register" className="inline-flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-base transition-all shadow-2xl shadow-blue-900/60 hover:-translate-y-0.5">
            Or just create your organization <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
