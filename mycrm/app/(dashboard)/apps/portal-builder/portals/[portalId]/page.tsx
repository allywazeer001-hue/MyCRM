"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { portalApi } from "@/lib/portal-api";
import { Loader2, AlertCircle } from "lucide-react";
import {
  PortalCanvasBuilder,
  CanvasSection,
  parseSectionCols,
} from "@/components/portal/portal-canvas-builder";

const TEMPLATE_COLS: Record<string, number> = {
  single: 1,
  "two-column": 2,
  "three-column": 3,
  sidebar: 2,
  "three-col": 3,
  dashboard: 3,
  cards: 1,
};

interface RawField {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  isEditable: boolean;
  isReadOnly: boolean;
  isVisible: boolean;
  isAdminOnly: boolean;
  options: unknown[];
  order: number;
  mappedCrmFieldName?: string;
  mappedCrmModuleSlug?: string;
}

interface RawSection {
  id: string;
  label: string;
  columnIndex: number;
  order: number;
  isCollapsible: boolean;
  isVisible: boolean;
  icon?: string;
  fields: RawField[];
}

interface RawPage {
  id: string;
  title: string;
  status: string;
  layoutTemplate: string;
  sections: RawSection[];
}

export default function PortalBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const portalId = params?.portalId as string;

  const [page, setPage] = useState<RawPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!portalId) return;
    portalApi.get(`/portal/padmin/pages/${portalId}`)
      .then(res => setPage(res.data))
      .catch(() => setError("Failed to load portal. It may have been deleted."))
      .finally(() => setLoading(false));
  }, [portalId]);

  // Hooks must be unconditional — computed before any early returns
  const sections = useMemo<CanvasSection[]>(() => {
    if (!page) return [];
    return page.sections.map(s => {
      const { cols, ratio } = parseSectionCols(s.icon);
      return {
        ...s,
        sectionColumns: cols,
        columnRatio: ratio,
        isVisible: s.isVisible ?? true,
        isCollapsible: s.isCollapsible ?? false,
        fields: (s.fields ?? []).map(f => ({
          ...f,
          options: (f.options ?? []) as Array<{ label: string; value: string }>,
          isAdminOnly: f.isAdminOnly ?? false,
          isVisible: f.isVisible ?? true,
        })),
      };
    });
  }, [page]);

  const templateColumns = page ? (TEMPLATE_COLS[page.layoutTemplate] ?? 1) : 1;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Loading portal builder…</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-white font-semibold">Failed to load portal</p>
          <p className="text-sm text-gray-400">{error || "Portal not found."}</p>
          <button
            onClick={() => router.push("/apps/portal-builder/portals")}
            className="mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-colors"
          >
            Back to My Portals
          </button>
        </div>
      </div>
    );
  }

  return (
    <PortalCanvasBuilder
      pageId={page.id}
      pageName={page.title}
      sections={sections}
      templateColumns={templateColumns}
      initialStatus={page.status}
      onBack={() => router.push("/apps/portal-builder/portals")}
    />
  );
}
