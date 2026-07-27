"use client";
/**
 * Guided flow for "Create Visualization from an Existing Report":
 *   Select Report → Recommendations → Customize → Preview → Create
 *
 * The report stays the single source of truth for "which records" — the
 * created widget is live-linked (AnalyticsWidget.sourceReportId) so its
 * filter is re-read from the report every time it loads (see
 * resolveLiveFilterGroup in analytics-widget.tsx), not copied once. The
 * widget still owns its own chart type / grouping / aggregation choices.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Search, FileBarChart2,
  Sparkles, Check, Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  generateVizSuggestions, reportFiltersToFilterGroup, NUMERIC_TYPES,
  type VizSuggestion, type SuggestionChartType,
} from "@/lib/report-viz-suggestions";
import {
  loadWidgetData, AnalyticsWidgetBody,
  type AnalyticsWidget, type AggregationType,
} from "@/components/analytics/analytics-widget";

const CHART_TYPE_META: Record<SuggestionChartType, { label: string; icon: string }> = {
  bar:  { label: "Bar Chart",  icon: "📊" },
  pie:  { label: "Pie Chart",  icon: "🥧" },
  line: { label: "Line Chart", icon: "📈" },
  area: { label: "Area Chart", icon: "🏔️" },
  kpi:  { label: "KPI Card",   icon: "🔢" },
};
const ALL_CHART_TYPES: SuggestionChartType[] = ["bar", "pie", "line", "area", "kpi"];
const AGGREGATIONS: AggregationType[] = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

interface ReportSummary {
  id: string;
  name: string;
  moduleId: string;
  moduleName: string;
  columns: { fieldName: string; fieldLabel: string; fieldType: string }[];
  filters: { fieldName: string; fieldLabel: string; fieldType: string; operator: string; value: string; value2: string; conjunction: "AND" | "OR" }[];
}

type Step = "select" | "recommend" | "customize" | "preview";

interface Props {
  initialReportId?: string;
  onCreated: (widget: Omit<AnalyticsWidget, "id">) => void;
  onCancel: () => void;
}

export function ReportVisualizationWizard({ initialReportId, onCreated, onCancel }: Props) {
  const [step, setStep] = useState<Step>(initialReportId ? "recommend" : "select");
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportSearch, setReportSearch] = useState("");
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState("");

  const [selectedSuggestion, setSelectedSuggestion] = useState<VizSuggestion | null>(null);
  const [customMode, setCustomMode] = useState(false);

  // Customize-step fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [chartType, setChartType] = useState<SuggestionChartType>("bar");
  const [groupByField, setGroupByField] = useState<string>("");
  const [secondaryGroupByField, setSecondaryGroupByField] = useState<string>("");
  const [aggregation, setAggregation] = useState<AggregationType>("COUNT");
  const [aggregateField, setAggregateField] = useState<string>("");

  const [previewWidget, setPreviewWidget] = useState<AnalyticsWidget | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Load report list (Select step) ──────────────────────────────────────
  useEffect(() => {
    api.get("/reports")
      .then(({ data }) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  // ── Load the pre-selected report, if opened from a specific report ─────
  useEffect(() => {
    if (!initialReportId) return;
    api.get(`/reports/${initialReportId}`)
      .then(({ data }) => setReport(data))
      .catch(() => setError("Could not load that report."));
  }, [initialReportId]);

  const suggestions = useMemo(() => report ? generateVizSuggestions(report.columns ?? []) : [], [report]);
  const numericColumns = useMemo(() => (report?.columns ?? []).filter(c => NUMERIC_TYPES.includes(c.fieldType)), [report]);
  const filteredReports = reports.filter(r =>
    !reportSearch.trim() || r.name.toLowerCase().includes(reportSearch.trim().toLowerCase())
  );

  const selectReport = (r: ReportSummary) => {
    setReport(r);
    setStep("recommend");
  };

  const chooseSuggestion = (s: VizSuggestion) => {
    setSelectedSuggestion(s);
    setCustomMode(false);
    setTitle(s.label);
    setDescription(s.description);
    setChartType(s.defaultType);
    setGroupByField(s.groupByField ?? "");
    setSecondaryGroupByField(s.secondaryGroupByField ?? "");
    setAggregation(s.aggregation);
    setAggregateField(s.aggregateField ?? "");
    setStep("customize");
  };

  const chooseCustom = () => {
    setSelectedSuggestion(null);
    setCustomMode(true);
    setTitle(report ? `${report.name} (Chart)` : "New Visualization");
    setDescription("");
    setChartType("bar");
    setGroupByField(report?.columns?.[0]?.fieldName ?? "");
    setSecondaryGroupByField("");
    setAggregation("COUNT");
    setAggregateField("");
    setStep("customize");
  };

  const buildWidget = (): Omit<AnalyticsWidget, "id"> | null => {
    if (!report) return null;
    const { filterGroup } = reportFiltersToFilterGroup(report.filters ?? []);
    return {
      title: title.trim() || "Untitled Visualization",
      type: chartType,
      moduleId: report.moduleId,
      aggregation,
      aggregateField: aggregation === "COUNT" ? undefined : (aggregateField || undefined),
      groupByField: chartType === "kpi" ? undefined : (groupByField || undefined),
      secondaryGroupByField: chartType === "bar" ? (secondaryGroupByField || undefined) : undefined,
      barMode: secondaryGroupByField ? "grouped" : undefined,
      filterGroup,
      sourceReportId: report.id,
      loading: true,
    } as Omit<AnalyticsWidget, "id">;
  };

  const goToPreview = async () => {
    const draft = buildWidget();
    if (!draft) return;
    setStep("preview");
    setPreviewLoading(true);
    const loaded = await loadWidgetData({ ...draft, id: "__preview__" } as AnalyticsWidget);
    setPreviewWidget(loaded);
    setPreviewLoading(false);
  };

  const create = () => {
    const draft = buildWidget();
    if (!draft) return;
    onCreated(draft);
  };

  const canGoPreview = groupByField || chartType === "kpi";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header + step indicator */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Create Visualization from Report</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {(["select", "recommend", "customize", "preview"] as Step[])
                  .filter(s => s !== "select" || !initialReportId)
                  .map(s => ({ select: "Select Report", recommend: "Recommendations", customize: "Customize", preview: "Preview" }[s]))
                  .join(" → ")}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── Step 1: Select Report ── */}
          {step === "select" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Select an existing report as the source for your visualization.</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  placeholder="Search reports…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              {loadingReports ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div>
              ) : filteredReports.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No reports found.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {filteredReports.map(r => (
                    <button
                      key={r.id}
                      onClick={() => selectReport(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <FileBarChart2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.moduleName} · {(r.columns ?? []).length} columns</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Recommendations ── */}
          {step === "recommend" && report && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Based on the columns in <strong>{report.name}</strong>, here&apos;s what we&apos;d recommend:
              </p>
              {suggestions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No automatic suggestions for this report&apos;s columns — build one manually below.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => chooseSuggestion(s)}
                      className="text-left bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm rounded-xl p-3 flex items-start gap-2.5 transition-all"
                    >
                      <span className="text-xl shrink-0">{CHART_TYPE_META[s.defaultType].icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{s.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={chooseCustom}
                className="w-full text-center text-xs font-semibold text-gray-500 hover:text-indigo-600 py-2"
              >
                None of these — build a custom visualization from this report
              </button>
            </div>
          )}

          {/* ── Step 3: Customize ── */}
          {step === "customize" && report && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Name</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500">Chart Type</label>
                <div className="flex flex-wrap gap-2">
                  {(customMode ? ALL_CHART_TYPES : selectedSuggestion?.allowedTypes ?? ALL_CHART_TYPES).map(t => (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors",
                        chartType === t ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"
                      )}
                    >
                      <span>{CHART_TYPE_META[t].icon}</span>{CHART_TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {chartType !== "kpi" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">X Axis / Category</label>
                    <select value={groupByField} onChange={e => setGroupByField(e.target.value)}
                      className="w-full h-9 px-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white">
                      <option value="">Select field…</option>
                      {(report.columns ?? []).map(c => <option key={c.fieldName} value={c.fieldName}>{c.fieldLabel}</option>)}
                    </select>
                  </div>
                  {chartType === "bar" && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Secondary Grouping (optional)</label>
                      <select value={secondaryGroupByField} onChange={e => setSecondaryGroupByField(e.target.value)}
                        className="w-full h-9 px-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white">
                        <option value="">None</option>
                        {(report.columns ?? []).filter(c => c.fieldName !== groupByField).map(c => (
                          <option key={c.fieldName} value={c.fieldName}>{c.fieldLabel}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Y Axis / Value</label>
                  <select value={aggregation} onChange={e => setAggregation(e.target.value as AggregationType)}
                    className="w-full h-9 px-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white">
                    {AGGREGATIONS.map(a => <option key={a} value={a}>{a === "COUNT" ? "Count of records" : a}</option>)}
                  </select>
                </div>
                {aggregation !== "COUNT" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Field</label>
                    <select value={aggregateField} onChange={e => setAggregateField(e.target.value)}
                      className="w-full h-9 px-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white">
                      <option value="">Select field…</option>
                      {numericColumns.map(c => <option key={c.fieldName} value={c.fieldName}>{c.fieldLabel}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Filters — inherited live from the report, not editable here */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />Filters (inherited live from &quot;{report.name}&quot;)
                </label>
                {report.filters.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">This report has no filters — the visualization includes all records.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {report.filters.map((f, i) => (
                      <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-gray-600">
                        {i > 0 && <span className="font-bold mr-1">{f.conjunction}</span>}
                        {f.fieldLabel} {f.operator.replace(/_/g, " ")}{f.value ? ` "${f.value}"` : ""}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">
                  If the report&apos;s filters change later (e.g. narrowed to &quot;Only Active&quot;), this visualization updates automatically — edit the report to change what it includes.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Preview ── */}
          {step === "preview" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Here&apos;s a live preview using the report&apos;s current data:</p>
              <div className="border border-gray-200 rounded-2xl p-4 h-72 bg-white">
                {previewLoading || !previewWidget ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-800 mb-2 truncate">{previewWidget.title}</p>
                    <div className="h-[calc(100%-2rem)]">
                      <AnalyticsWidgetBody widget={previewWidget} />
                    </div>
                  </>
                )}
              </div>
              {description && <p className="text-xs text-gray-400">{description}</p>}

              {/* Diagnostic hint — the query succeeded but matched nothing, most likely
                  because of the report's own filters (which this visualization inherits live). */}
              {!previewLoading && previewWidget && !previewWidget.error &&
                (previewWidget.data ?? []).length === 0 && previewWidget.type !== "kpi" && report && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">No records matched.</p>
                    {report.filters.length > 0 ? (
                      <p className="mt-0.5">
                        &quot;{report.name}&quot; has {report.filters.length} filter{report.filters.length !== 1 ? "s" : ""} applied
                        (inherited live by this visualization) — try loosening them on the report, or double-check the
                        field chosen above actually varies across the report&apos;s matching records.
                      </p>
                    ) : (
                      <p className="mt-0.5">
                        The report itself has no filters, so this means the module has no records with a value in the
                        field you selected — try a different field, or add some data first.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
          <button
            onClick={() => {
              if (step === "recommend" && !initialReportId) setStep("select");
              else if (step === "customize") setStep("recommend");
              else if (step === "preview") setStep("customize");
              else onCancel();
            }}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-3.5 h-3.5" />{step === "select" ? "Cancel" : "Back"}
          </button>

          {step === "customize" && (
            <button
              disabled={!canGoPreview}
              onClick={goToPreview}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Preview<ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {step === "preview" && (
            <button
              onClick={create}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Check className="w-3.5 h-3.5" />Create Visualization
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
