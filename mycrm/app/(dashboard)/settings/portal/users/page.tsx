"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Portal Users now lives as a tab on the consolidated Portal Settings page.
// Kept as a redirect so any existing bookmarks/links keep working.
export default function PortalUsersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings/portal?tab=users"); }, [router]);
  return null;
}
