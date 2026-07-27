"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FormsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/cloudforms"); }, [router]);
  return null;
}
