import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AnnouncementBanner } from "@/components/announcement-banner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cloudbox",
  description: "Cloudbox — Professional Business Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
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
