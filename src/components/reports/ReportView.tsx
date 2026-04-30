"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { ReportExportSurface } from "@/components/reports/ReportExportSurface";
import {
  buildReportBlockSlideElements,
  getReportBlockDiagnostics,
  shouldRenderBlocksAsSlides,
  SlideRenderer,
} from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { FEATURES } from "@/config/features";
import {
  deleteReport,
  exportReportPptx,
  fetchLatestReportRenderData,
} from "@/lib/api/reports";
import { formatDisplayNumber } from "@/lib/formatters";
import { formatMetaTimeframeDateRange } from "@/lib/integrations/timeframes";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { setReportChatContext } from "@/lib/reports/chat-context";
import { exportReportPdf } from "@/lib/reports/export-pdf";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";
import { getReportTemplate } from "@/lib/reports/templates";
import { buildDefaultTemplateContext } from "@/lib/reports/templates/default-view-models";
import { getPlanCapabilities } from "@/lib/workspace/plan-limits";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";
import type { ReportDescription, ReportDetail, ReportVersionBlock } from "@/types/report";

type ReportViewProps = {
  reportId: string;
  hideOverviewInsights?: boolean;
  showDownloadAction?: boolean;
  showShareAction?: boolean;
};

type ReportFolder = {
  id: string;
  name: string;
};

const REPORT_FOLDERS_KEY = "reportFolders";
const REPORT_FOLDER_ASSIGNMENTS_KEY = "reportFolderAssignments";

function loadStoredFolders() {
  if (typeof window === "undefined") {
    return [] as ReportFolder[];
  }

  try {
    const raw = window.localStorage.getItem(REPORT_FOLDERS_KEY);
    return raw ? (JSON.parse(raw) as ReportFolder[]) : [];
  } catch {
    return [];
  }
}

function loadStoredAssignments() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  try {
    const raw = window.localStorage.getItem(REPORT_FOLDER_ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveAssignments(assignments: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    REPORT_FOLDER_ASSIGNMENTS_KEY,
    JSON.stringify(assignments)
  );
}

function getReportTitle(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return titleBlock?.data.text || `Report ${blocks.length > 0 ? "Meta" : ""}`.trim();
}

function getReportSummary(blocks: ReportVersionBlock[]) {
  const textBlock = blocks.find((block) => block.type === "text" && block.data.text);
  return textBlock?.data.text || "";
}

function getShortReportSummary(summary: string) {
  const trimmedSummary = summary.trim();

  if (trimmedSummary.length <= 120) {
    return trimmedSummary;
  }

  return `${trimmedSummary.slice(0, 117).trimEnd()}...`;
}

function getAiModeMetadata(
  reportDetail: ReportDetail | null,
  reportVersionDescription: ReportDescription | null
) {
  const description = reportDetail?.description || reportVersionDescription;
  const aiMode = description?.ai_mode || description?.aiMode;
  const fallbackUsed =
    description?.ai_agent_fallback_used === true ||
    description?.aiAgentFallbackUsed === true;

  return {
    aiMode: typeof aiMode === "string" ? aiMode : "",
    fallbackUsed,
  };
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="aspect-[16/9] w-full rounded-[34px] border border-slate-800/80 bg-[#07111f] p-6 sm:p-8 lg:p-10">
          <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 h-20 w-2/3 animate-pulse rounded-[28px] bg-white/10" />
          <div className="mt-6 h-28 w-1/2 animate-pulse rounded-[28px] bg-white/5" />
        </div>
      </section>
      <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="aspect-[16/9] w-full rounded-[34px] border border-slate-800/80 bg-[#07111f] p-6 sm:p-8 lg:p-10">
          <div className="grid h-full gap-4 lg:grid-cols-3">
            <div className="animate-pulse rounded-[28px] bg-white/10" />
            <div className="animate-pulse rounded-[28px] bg-white/5" />
            <div className="animate-pulse rounded-[28px] bg-white/5" />
          </div>
        </div>
      </section>
      <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="aspect-[16/9] w-full rounded-[34px] border border-slate-800/80 bg-[#07111f] p-6 sm:p-8 lg:p-10">
          <div className="grid h-full gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="animate-pulse rounded-[28px] bg-white/10" />
            <div className="grid gap-4">
              <div className="animate-pulse rounded-[28px] bg-white/10" />
              <div className="animate-pulse rounded-[28px] bg-white/5" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StateCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="mx-auto max-w-[980px] rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="rounded-[32px] border border-slate-800/80 bg-[linear-gradient(145deg,#07111f_0%,#0f172a_100%)] p-8 text-white sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300">
          Executive Dark
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          {description}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

export default function ReportView({
  reportId,
  hideOverviewInsights = false,
  showDownloadAction = true,
  showShareAction = true,
}: ReportViewProps) {
  const router = useRouter();
  const { language, messages } = useI18n();
  const [blocks, setBlocks] = useState<ReportVersionBlock[]>([]);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [reportVersionDescription, setReportVersionDescription] =
    useState<ReportDescription | null>(null);
  const [reportVersionBranding, setReportVersionBranding] = useState<{
    logoUrl?: string;
    source?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pptxLoading, setPptxLoading] = useState(false);
  const [pptxFeedback, setPptxFeedback] = useState("");
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [mountExportSurface, setMountExportSurface] = useState(false);
  const [exportSurfaceReady, setExportSurfaceReady] = useState(false);
  const [activeSlideId, setActiveSlideId] = useState("01");
  const [shareFeedback, setShareFeedback] = useState("");
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [folderId, setFolderId] = useState("");
  const [deletingReport, setDeletingReport] = useState(false);
  const [resolvedVersionId, setResolvedVersionId] = useState("");
  const exportSurfaceRef = useRef<HTMLDivElement | null>(null);
  const slideDeckRef = useRef<HTMLDivElement | null>(null);
  const { workspace } = useActiveWorkspace();
  const planCapabilities = getPlanCapabilities(workspace);

  useEffect(() => {
    setFolders(loadStoredFolders());
    setFolderId(loadStoredAssignments()[reportId] || "");
  }, [reportId]);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const renderData = await fetchLatestReportRenderData(reportId, {
          source: "report-detail",
        });

        if (!active) {
          return;
        }

        setBlocks(renderData.reportVersion.blocks);
        setReportVersionDescription(renderData.reportVersion.description || null);
        setReportVersionBranding(renderData.reportVersion.branding || null);
        setReportDetail(renderData.detail);
        setResolvedVersionId(renderData.resolvedVersionId);
      } catch (err: unknown) {
        console.error("report version view error:", err);

        if (!active) {
          return;
        }

        setError(messages.reports.loadReportDescription);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [messages.reports.loadReportDescription, reportId]);

  const title = useMemo(() => getReportTitle(blocks), [blocks]);
  const summary = useMemo(() => getReportSummary(blocks), [blocks]);
  const shortSummary = useMemo(() => getShortReportSummary(summary), [summary]);
  const aiModeMetadata = getAiModeMetadata(reportDetail, reportVersionDescription);
  const viewModel = useMemo(
    () =>
      buildExecutiveDarkViewModel(blocks, {
        descriptionTimeframe:
          reportDetail?.description?.timeframe ||
          reportVersionDescription?.timeframe ||
          null,
      }),
    [blocks, reportDetail?.description?.timeframe, reportVersionDescription?.timeframe]
  );
  useEffect(() => {
    console.info("[MetaTimeframe][render.full]", {
      source: viewModel.coverTimeframeSource,
      since: viewModel.coverTimeframeSince || null,
      until: viewModel.coverTimeframeUntil || null,
      label: viewModel.coverTimeframeLabel || viewModel.descriptionTimeframe?.label || null,
    });
  }, [
    viewModel.coverTimeframeLabel,
    viewModel.coverTimeframeSince,
    viewModel.coverTimeframeSource,
    viewModel.coverTimeframeUntil,
    viewModel.descriptionTimeframe?.label,
  ]);
  useEffect(() => {
    console.info("[Report10][detail.blocks]", {
      reportId,
      ...getReportBlockDiagnostics(blocks),
    });
    console.info("[Report15][detail.blocks]", {
      reportId,
      ...getReportBlockDiagnostics(blocks),
    });
  }, [blocks, reportId]);
  useEffect(() => {
    const diagnostics = getReportBlockDiagnostics(blocks);
    const semanticNames = diagnostics.semanticNames.filter(Boolean);

    console.log("[REPORT_RENDER_PATH]", {
      source: "report-detail",
      reportId,
      versionId: resolvedVersionId || null,
      blocksCount: diagnostics.blocksCount,
      slidesCount: diagnostics.blocksCount,
      rendererUsed: blocks.length > 0 ? "SlideRenderer:block-slides" : "SlideRenderer:template-slides",
      firstSemanticName: semanticNames[0] || null,
      semanticNames,
    });
  }, [blocks, reportId, resolvedVersionId]);
  const resolvedBranding = useMemo(
    () =>
      resolveReportBranding(
        reportVersionBranding,
        reportDetail?.branding,
        getReportBrandingSnapshot(reportId)
      ),
    [reportDetail?.branding, reportId, reportVersionBranding]
  );
  const timeframeLabel =
    formatMetaTimeframeDateRange({
      since: viewModel.coverTimeframeSince || viewModel.timeframeSince,
      until: viewModel.coverTimeframeUntil || viewModel.timeframeUntil,
      locale: language,
    }) || viewModel.coverTimeframeLabel || viewModel.periodLabel;
  const template = useMemo(() => getReportTemplate("default"), []);
  const thumbnailContext = useMemo(
    () => buildDefaultTemplateContext(viewModel, resolvedBranding),
    [resolvedBranding, viewModel]
  );
  const slideNavigationItems = useMemo(
    () => {
      if (shouldRenderBlocksAsSlides(blocks)) {
        return buildReportBlockSlideElements({
          blocks,
          model: viewModel,
          renderMode: "preview",
          logoUrl: resolvedBranding.logoUrl,
          locale: language,
          hideOverviewInsights,
        }).map((element, index) => {
          const id = String(index + 1).padStart(2, "0");

          return {
            id,
            key: `block-${id}`,
            element,
          };
        });
      }

      return template.slides.map((slide) => {
        const SlideComponent = slide.component;
        const slideModel = slide.buildModel(thumbnailContext);

        return {
          id: slide.id,
          key: slide.key,
          element: (
            <SlideComponent
              key={`thumb-${slide.id}`}
              slideId={slide.id}
              eyebrow={slide.eyebrow}
              title={slide.title}
              renderMode="preview"
              model={slideModel}
            />
          ),
        };
      });
    },
    [blocks, hideOverviewInsights, language, resolvedBranding.logoUrl, template.slides, thumbnailContext, viewModel]
  );
  useEffect(() => {
    console.info("[AUDIT_RENDER_PATH][ReportView]", {
      source: shouldRenderBlocksAsSlides(blocks) ? "blocks" : "template",
      usesBlocks: shouldRenderBlocksAsSlides(blocks),
      usesTemplate: !shouldRenderBlocksAsSlides(blocks),
      blocksLength: blocks.length,
      templateSlidesLength: template.slides.length,
      renderMode: "preview",
      currentSlide: activeSlideId,
      slideNavigationItemsLength: slideNavigationItems.length,
    });
  }, [activeSlideId, blocks, slideNavigationItems.length, template.slides.length]);

  async function handleShare() {
    const reportUrl = `${window.location.origin}/reports/${reportId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: reportUrl,
        });
        setShareFeedback(messages.reports.sharedLink);
        return;
      } catch {
        return;
      }
    }

    await navigator.clipboard.writeText(reportUrl);
    setShareFeedback(messages.reports.copiedLink);
  }

  async function handleDownload() {
    console.info("[PlanLimits][export.ui]", {
      currentPlan: planCapabilities.plan,
      plan: planCapabilities.plan,
      exportType: "pdf",
      reportId,
      allowed: planCapabilities.canExportPdf,
    });

    if (!planCapabilities.canExportPdf) {
      setShareFeedback("PDF export is not available for your current plan.");
      return;
    }

    setExportSurfaceReady(false);
    setMountExportSurface(true);
    setDownloading(true);
  }

  async function handleExportPptx() {
    if (!FEATURES.ENABLE_PPTX_EXPORT) {
      return;
    }

    const allowed = planCapabilities.canExportPptx;

    console.info("[PlanLimits][export.ui]", {
      currentPlan: planCapabilities.plan,
      plan: planCapabilities.plan,
      exportType: "pptx",
      reportId,
      allowed,
    });

    if (!allowed) {
      setPptxFeedback("PPTX export is available on Core and Advanced plans.");
      return;
    }

    try {
      setPptxLoading(true);
      setPptxFeedback("");
      console.info("[PlanLimits][export.ui]", {
        currentPlan: planCapabilities.plan,
        plan: planCapabilities.plan,
        exportType: "pptx",
        reportId,
        allowed,
        stage: "request start",
      });
      const message = await exportReportPptx(reportId);
      console.info("[PlanLimits][export.ui]", {
        currentPlan: planCapabilities.plan,
        plan: planCapabilities.plan,
        exportType: "pptx",
        reportId,
        allowed,
        stage: "request success",
      });
      setPptxFeedback(message || messages.reports.exportStarted);
    } catch (error) {
      console.warn("[PlanLimits][export.ui]", {
        currentPlan: planCapabilities.plan,
        plan: planCapabilities.plan,
        exportType: "pptx",
        reportId,
        allowed,
        stage: "request failure",
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("report view pptx export error:", error);
      setPptxFeedback(messages.reports.exportError);
    } finally {
      setPptxLoading(false);
    }
  }

  function handleMoveToFolder(nextFolderId: string) {
    const nextAssignments = {
      ...loadStoredAssignments(),
    };

    if (!nextFolderId) {
      delete nextAssignments[reportId];
    } else {
      nextAssignments[reportId] = nextFolderId;
    }

    saveAssignments(nextAssignments);
    setFolderId(nextFolderId);
  }

  async function handleDeleteReport() {
    const confirmed = window.confirm(
      messages.reports.deleteReportConfirm.replace("{name}", title)
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingReport(true);
      await deleteReport(reportId);

      const nextAssignments = {
        ...loadStoredAssignments(),
      };
      delete nextAssignments[reportId];
      saveAssignments(nextAssignments);
      router.push("/reports");
    } catch (error) {
      console.error("report detail delete error:", error);
      window.alert(
        messages.reports.deleteReportFailed
      );
    } finally {
      setDeletingReport(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function generatePdf() {
      if (!downloading || !mountExportSurface || !exportSurfaceReady || !exportSurfaceRef.current) {
        return;
      }

      try {
        await exportReportPdf(exportSurfaceRef.current, {
          onProgress: (current, total) => {
            if (active) {
              setPdfProgress({ current, total });
            }
          },
        });
      } catch (err) {
        console.error("report view download error:", err);
      } finally {
        if (active) {
          setDownloading(false);
          setMountExportSurface(false);
          setExportSurfaceReady(false);
          setPdfProgress(null);
        }
      }
    }

    void generatePdf();

    return () => {
      active = false;
    };
  }, [downloading, exportSurfaceReady, mountExportSurface]);

  useEffect(() => {
    if (blocks.length === 0) {
      return;
    }

    const stats = blocks
      .filter((block) => block.type === "stat")
      .map((block, index) => ({
        label: block.data.label || `KPI ${index + 1}`,
        value:
          block.data.value === null ||
          block.data.value === undefined ||
          block.data.value === ""
            ? "N/A"
            : formatDisplayNumber(block.data.value),
      }));

    setReportChatContext({
      reportId,
      title,
      summary,
      stats,
    });
  }, [blocks, reportId, summary, title]);

  useEffect(() => {
    if (!shareFeedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShareFeedback("");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shareFeedback]);

  useEffect(() => {
    const root = slideDeckRef.current;

    if (!root) {
      return;
    }

    const slideElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-report-slide]")
    );

    if (slideElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]) {
          setActiveSlideId(
            visibleEntries[0].target.getAttribute("data-report-slide") || "01"
          );
        }
      },
      {
        threshold: [0.35, 0.55, 0.8],
        rootMargin: "-15% 0px -25% 0px",
      }
    );

    slideElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [blocks, resolvedBranding, viewModel]);

  function scrollToSlide(slideId: string) {
    const root = slideDeckRef.current;
    const target = root?.querySelector<HTMLElement>(`[data-report-slide="${slideId}"]`);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveSlideId(slideId);
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <StateCard
        title={messages.reports.loadReportError}
        description={error}
        actionLabel={messages.reports.tryAgain}
        onAction={() => window.location.reload()}
      />
    );
  }

  if (blocks.length === 0) {
    return (
      <StateCard
        title={messages.reports.contentUnavailable}
        description={messages.reports.contentUnavailableDescription}
        actionLabel={messages.reports.refresh}
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-8">
      {mountExportSurface ? (
        <ReportExportSurface
          ref={exportSurfaceRef}
          model={viewModel}
          branding={resolvedBranding}
          onReadyChange={setExportSurfaceReady}
        />
      ) : null}

      <section className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
              {shortSummary ||
                (language === "es"
                  ? messages.reports.reportReadyDescription
                  : messages.reports.reportReadyDescription)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {language === "es" ? "Creado" : "Created"}:{" "}
                {reportDetail?.createdAt
                  ? new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(reportDetail.createdAt))
                  : "-"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {messages.reports.templateLabel}: Executive Dark
              </span>
              {timeframeLabel ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  Period: {timeframeLabel}
                </span>
              ) : null}
              {FEATURES.ENABLE_AI_AGENTS_MODE && aiModeMetadata.aiMode ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  AI mode: {aiModeMetadata.aiMode === "agents" ? "Agents" : "Standard"}
                </span>
              ) : null}
            </div>
            {FEATURES.ENABLE_AI_AGENTS_MODE && aiModeMetadata.fallbackUsed ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                Fallback estándar aplicado
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="xl:grid xl:grid-cols-[220px_minmax(0,1fr)_260px] xl:items-start xl:gap-6">
        <aside className="sticky top-6 hidden xl:block">
          <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Slides
            </p>
            <div className="mt-4 space-y-3">
              {slideNavigationItems.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => scrollToSlide(slide.id)}
                  className={`block w-full rounded-[24px] border p-2 text-left transition ${
                    activeSlideId === slide.id
                      ? "border-sky-300 bg-sky-50 shadow-[0_10px_24px_rgba(14,165,233,0.14)]"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="overflow-hidden rounded-[18px]">
                    <div
                      style={{
                        width: REPORT_SLIDE_THEME.slide.width,
                        transform: "scale(0.145)",
                        transformOrigin: "top left",
                        height: REPORT_SLIDE_THEME.slide.height * 0.145,
                      }}
                    >
                      {slide.element}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Slide {index + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{slide.id}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div
          ref={slideDeckRef}
          className="rounded-[44px] bg-[#eef3f8] px-4 py-5"
        >
          <div className="w-full overflow-hidden">
            <SlideRenderer
              model={viewModel}
              blocks={blocks}
              locale={language}
              hideOverviewInsights={hideOverviewInsights}
              branding={resolvedBranding}
            />
          </div>
        </div>

        {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
        <aside className="sticky top-6 hidden xl:block">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {language === "es" ? "Acciones" : "Actions"}
            </p>
            <div className="mt-4 space-y-3">
              {showDownloadAction ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || !reportId}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white ring-1 ring-slate-900/10">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">
                      {messages.common.download}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {downloading
                        ? pdfProgress
                          ? `${messages.common.generatingPdf} ${pdfProgress.current}/${pdfProgress.total}`
                          : messages.common.downloading
                        : language === "es"
                          ? messages.reports.saveDeckCopy
                          : messages.reports.saveDeckCopy}
                    </span>
                  </span>
                </button>
              ) : null}

              {FEATURES.ENABLE_PPTX_EXPORT ? (
                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={pptxLoading || !reportId}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                    planCapabilities.canExportPptx
                      ? "border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50"
                      : "border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:bg-amber-50"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white ring-1 ring-slate-900/10">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                      <path d="M6.5 4.5h7l4 4v11h-11v-15Z" strokeWidth="1.8" strokeLinejoin="round" />
                      <path d="M13.5 4.5v4h4M9 13h6M9 16h4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">
                      {messages.reports.exportPptx}
                    </span>
                    <span className={`block text-xs ${planCapabilities.canExportPptx ? "text-slate-500" : "text-amber-800"}`}>
                      {pptxLoading
                        ? messages.reports.exportingPptx
                        : planCapabilities.canExportPptx
                          ? "PowerPoint deck export"
                          : "Core or Advanced required"}
                    </span>
                  </span>
                </button>
              ) : null}

              {showShareAction ? (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!reportId}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white ring-1 ring-slate-900/10">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                      <path d="M8.5 12.5 15.5 8.5M8.5 11.5l7 4" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="18" cy="7" r="2.5" strokeWidth="1.8" />
                      <circle cx="6" cy="12" r="2.5" strokeWidth="1.8" />
                      <circle cx="18" cy="17" r="2.5" strokeWidth="1.8" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">
                      {messages.common.share}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {language === "es"
                        ? messages.reports.shareLinkDescription
                        : messages.reports.shareLinkDescription}
                    </span>
                  </span>
                </button>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="block text-sm font-semibold text-slate-950">
                  {messages.reports.addToFolderLabel}
                </label>
                <select
                  value={folderId}
                  onChange={(event) => handleMoveToFolder(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-sky-300"
                >
                  <option value="">{messages.common.noFolder}</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void handleDeleteReport()}
                disabled={deletingReport}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15 text-red-200 ring-1 ring-red-500/20">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                    <path d="M6.5 7.5h11M9.5 7.5V6a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M8.5 10.5v6M12 10.5v6M15.5 10.5v6M7.5 7.5l.7 10.1a2 2 0 0 0 2 1.9h3.6a2 2 0 0 0 2-1.9l.7-10.1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-red-700">
                    {messages.common.deleteReport}
                  </span>
                  <span className="block text-xs text-red-600">
                    {deletingReport
                      ? messages.common.deletingReport
                      : messages.reports.deleteReportDescription}
                  </span>
                </span>
              </button>
            </div>

            {shareFeedback ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {shareFeedback}
              </p>
            ) : null}
            {FEATURES.ENABLE_PPTX_EXPORT && pptxFeedback ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {pptxFeedback}
                {!planCapabilities.canExportPptx ? (
                  <button
                    type="button"
                    onClick={() => router.push("/plans")}
                    className="ml-2 font-semibold underline"
                  >
                    Upgrade
                  </button>
                ) : null}
              </p>
            ) : null}
          </div>
        </aside>
        ) : null}
      </section>

      {!FEATURES.ENABLE_APP_REVIEW_MODE && FEATURES.ENABLE_PPTX_EXPORT && pptxFeedback ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 xl:hidden">
          {pptxFeedback}
          {!planCapabilities.canExportPptx ? (
            <button
              type="button"
              onClick={() => router.push("/plans")}
              className="ml-2 font-semibold underline"
            >
              Upgrade
            </button>
          ) : null}
        </p>
      ) : null}

      {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 border-t border-slate-900 bg-[linear-gradient(180deg,#0b1220_0%,#111827_100%)] px-4 pb-4 pt-3 text-white shadow-[0_-12px_24px_rgba(15,23,42,0.22)] backdrop-blur xl:hidden">
        <div className={`grid gap-3 ${showDownloadAction || showShareAction ? "grid-cols-2" : "grid-cols-1"}`}>
          {showDownloadAction ? (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !reportId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:bg-white/5"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                <path d="M12 4.5v9M8.5 10l3.5 3.5 3.5-3.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5.5 15.5v2a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {downloading
                ? pdfProgress
                  ? `${messages.common.generatingPdf} ${pdfProgress.current}/${pdfProgress.total}`
                  : messages.common.downloading
                : messages.common.download}
            </button>
          ) : null}
          {FEATURES.ENABLE_PPTX_EXPORT ? (
            <button
              type="button"
              onClick={handleExportPptx}
              disabled={pptxLoading || !reportId}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                planCapabilities.canExportPptx
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
              }`}
            >
              {pptxLoading ? messages.reports.exportingPptx : "PPTX"}
            </button>
          ) : null}
          {showShareAction ? (
            <button
              type="button"
              onClick={handleShare}
              disabled={!reportId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:bg-white/5"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                <path d="M14 5.5h4.5V10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 5.5l-7.25 7.25" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 7.5H8.25A2.75 2.75 0 0 0 5.5 10.25v5.5a2.75 2.75 0 0 0 2.75 2.75h5.5a2.75 2.75 0 0 0 2.75-2.75V14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {messages.common.share}
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select
            value={folderId}
            onChange={(event) => handleMoveToFolder(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-white outline-none"
          >
            <option value="">{language === "es" ? "Agregar a folder" : "Add to folder"}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleDeleteReport()}
            disabled={deletingReport}
            className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingReport
              ? language === "es"
                ? "Eliminando..."
                : "Deleting..."
              : language === "es"
                ? "Eliminar reporte"
                : "Delete report"}
          </button>
        </div>
      </div>
      ) : null}
    </div>
  );
}
