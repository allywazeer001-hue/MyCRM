"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Self-registration is disabled. Portal accounts are created by administrators only.
export default function PortalRegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/portal/login"); }, [router]);
  return null;
}
