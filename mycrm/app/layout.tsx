import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { BRAND } from "@/lib/core-brand";
import "./globals.css";

// Exposed as CSS variables (not just .className) so each theme in globals.css
// can pick which one to use via --font-sans — see the per-theme blocks there.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: BRAND.name,
  description: `${BRAND.name} — ${BRAND.tagline}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} ${inter.className}`} suppressHydrationWarning>
        <ThemeProvider>
          {/*
            Full-screen shells below (dashboard, portal, Cloud Forms) size themselves
            with h-full against this wrapper rather than an absolute viewport unit,
            so they correctly shrink to make room for the banner instead of
            overflowing the viewport by its height.
          */}
          <div className="flex flex-col h-dvh">
            <AnnouncementBanner />
            <div className="flex-1 min-h-0">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
