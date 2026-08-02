"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Portal Builder now lives as a tab on the consolidated Portal Settings page.
// Kept as a redirect so any existing bookmarks/links keep working.
export default function PortalBuilderRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/portal?tab=builder"); }, [router]);
  return null;
}
