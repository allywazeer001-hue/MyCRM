"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LegacyBuilderRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params?.pageId as string;
    if (id) router.replace(`/apps/portal-builder/portals/${id}`);
    else router.replace("/apps/portal-builder/portals");
  }, [params, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Redirecting to new builder…</span>
      </div>
    </div>
  );
}
