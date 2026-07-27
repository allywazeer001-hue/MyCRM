"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

// This standalone suggestions page has been folded into the guided
// "Create Visualization from Report" wizard on /analytics (Select Report is
// skipped since we already know which report). Kept as a redirect so old
// links/bookmarks still land somewhere useful.
export default function VisualizeReportRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.reportId as string;

  useEffect(() => {
    router.replace(`/analytics?openReportWizard=${reportId}`);
  }, [reportId, router]);

  return <div className="flex items-center justify-center min-h-64"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
}
