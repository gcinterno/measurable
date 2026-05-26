"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { fetchAccountSummary } from "@/lib/api/account";
import { ReportShareDialog } from "@/components/reports/ReportShareDialog";
import {
  buildReportBlockSlideElements,
  getReportBlockDiagnostics,
  shouldRenderBlocksAsSlides,
  SlideRenderer,
} from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { FEATURES } from "@/config/features";
import { getMeasurableBrandingOverride } from "@/lib/branding";
import {
  createReportShare,
  deleteReport,
  downloadReportPdf,
  fetchLatestReportRenderData,
  updateReportFolder,
} from "@/lib/api/reports";
import { formatDisplayNumber } from "@/lib/formatters";
import { formatMetaTimeframeDateRange } from "@/lib/integrations/timeframes";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { setReportChatContext } from "@/lib/reports/chat-context";
import { getReportIntegrationDetails } from "@/lib/reports/integration-metadata";
import {
  getReportTemplateLabel,
  getStoredReportTemplateSelection,
} from "@/lib/reports/template-selection";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";
import { getReportTemplate } from "@/lib/reports/templates";
import {
  buildDefaultTemplateContext,
  resolveReportCoverSourceName,
} from "@/lib/reports/templates/default-view-models";
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

function getReportTitle(blocks: ReportVersionBlock[], fallbackTitle?: string | null) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return titleBlock?.data.text || fallbackTitle?.trim() || `Report ${blocks.length > 0 ? "Meta" : ""}`.trim();
}

function getReportSummary(blocks: ReportVersionBlock[]) {
  const textBlock = blocks.find((block) => block.type === "text" && block.data.text);
  return textBlock?.data.text || "";
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

function getClipboardReportId(reportId: string) {
  return reportId.replace(/\D/g, "") || reportId;
}

function ReportAssistantPrompt({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed bottom-28 right-5 z-40 max-w-[min(22rem,calc(100vw-2rem))] animate-[assistantPromptIn_420ms_ease-out] rounded-[28px] border border-sky-200 bg-white px-5 py-4 text-slate-950 shadow-[0_24px_70px_rgba(14,165,233,0.22)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-lg text-white">
          🤖
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">AI Assistant</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            Hablemos de tu Reporte! 🤖📊
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso del AI Assistant"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          x
        </button>
      </div>
      <style jsx>{`
        @keyframes assistantPromptIn {
          from {
            opacity: 0;
            transform: translateX(22px) translateY(4px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
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
    brandName?: string;
    source?: string;
    brandNameSource?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [activeSlideId, setActiveSlideId] = useState("01");
  const [shareFeedback, setShareFeedback] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState("");
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [folderId, setFolderId] = useState("");
  const [pendingFolderId, setPendingFolderId] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState("");
  const [deletingReport, setDeletingReport] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resolvedVersionId, setResolvedVersionId] = useState("");
  const [idCopied, setIdCopied] = useState(false);
  const [showReportAssistantPrompt, setShowReportAssistantPrompt] = useState(false);
  const [showFreeWatermark, setShowFreeWatermark] = useState(false);
  const reportAssistantPromptShownRef = useRef(false);
  const slideDeckRef = useRef<HTMLDivElement | null>(null);
  const latestLoadRequestRef = useRef(0);
  const { workspace } = useActiveWorkspace();

  useEffect(() => {
    setFolders(loadStoredFolders());
    setFolderId(loadStoredAssignments()[reportId] || "");
    setPendingFolderId(loadStoredAssignments()[reportId] || "");
  }, [reportId]);

  useEffect(() => {
    let active = true;

    async function loadAccountSummary() {
      try {
        const summary = await fetchAccountSummary();

        if (!active) {
          return;
        }

        setShowFreeWatermark(
          summary.isFreePlan ||
            summary.reportBrandingMode === "measurable" ||
            summary.canUseCustomBranding === false
        );
      } catch (error) {
        console.error("report view account summary error:", error);
      }
    }

    void loadAccountSummary();

    return () => {
      active = false;
    };
  }, []);

  const loadReport = useCallback(async () => {
    const requestId = latestLoadRequestRef.current + 1;
    latestLoadRequestRef.current = requestId;

    setLoading(true);
    setError("");
    setShowReportAssistantPrompt(false);

    try {
      const renderData = await fetchLatestReportRenderData(reportId, {
        source: "report-detail",
      });

      if (latestLoadRequestRef.current !== requestId) {
        return;
      }

      setBlocks(renderData.reportVersion.blocks);
      setReportVersionDescription(renderData.reportVersion.description || null);
      setReportVersionBranding(renderData.reportVersion.branding || null);
      setReportDetail(renderData.detail);
      setResolvedVersionId(renderData.resolvedVersionId);
    } catch (err: unknown) {
      if (latestLoadRequestRef.current !== requestId) {
        return;
      }

      console.error("report version view error:", err);
      setError(messages.reports.loadReportDescription);
    } finally {
      if (latestLoadRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [messages.reports.loadReportDescription, reportId]);

  useEffect(() => {
    void loadReport().catch(() => undefined);
  }, [loadReport]);

  useEffect(() => {
    if (loading || error || blocks.length === 0 || reportAssistantPromptShownRef.current) {
      setShowReportAssistantPrompt(false);
      return;
    }

    reportAssistantPromptShownRef.current = true;
    const showTimer = window.setTimeout(() => {
      setShowReportAssistantPrompt(true);
    }, 450);
    const hideTimer = window.setTimeout(() => {
      setShowReportAssistantPrompt(false);
    }, 30450);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [blocks.length, error, loading, reportId]);

  useEffect(() => {
    if (!idCopied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIdCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [idCopied]);

  const title = useMemo(
    () => getReportTitle(blocks, reportDetail?.title),
    [blocks, reportDetail?.title]
  );
  const summary = useMemo(() => getReportSummary(blocks), [blocks]);
  const aiModeMetadata = getAiModeMetadata(reportDetail, reportVersionDescription);
  const selectedTemplateId = useMemo(
    () => getStoredReportTemplateSelection(reportId),
    [reportId]
  );
  const activeTemplate = selectedTemplateId || reportDetail?.template || undefined;
  const viewModel = useMemo(
    () =>
      buildExecutiveDarkViewModel(blocks, {
        descriptionTimeframe:
          reportDetail?.description?.timeframe ||
          reportVersionDescription?.timeframe ||
          null,
        fallbackTitle: reportDetail?.title || null,
      }),
    [blocks, reportDetail?.description?.timeframe, reportDetail?.title, reportVersionDescription?.timeframe]
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
        {
          id: reportId,
          templateId: selectedTemplateId,
          branding: reportVersionBranding,
          report: {
            branding: reportDetail?.branding,
          },
        },
        workspace?.branding
          ? {
              branding: {
                logoUrl: workspace.branding.logoUrl,
                brandName: workspace.branding.brandName,
                source: workspace.branding.source || "workspace.branding.logoUrl",
                brandNameSource:
                  workspace.branding.brandNameSource || "workspace.branding.brand_name",
              },
            }
          : {
              branding: getReportBrandingSnapshot(reportId),
            },
        {
          branding: getMeasurableBrandingOverride(workspace),
        }
      ),
    [reportDetail?.branding, reportId, reportVersionBranding, selectedTemplateId, workspace]
  );
  useEffect(() => {
    console.info("[ReportBranding][preview.cover]", {
      report_id: reportId,
      template: selectedTemplateId,
      branding_received: {
        report_version: reportVersionBranding,
        report: reportDetail?.branding,
        workspace: workspace?.branding,
      },
      logoUrl_resuelto: resolvedBranding.logoUrl,
      brandName_resuelto: resolvedBranding.brandName,
    });
  }, [
    reportDetail?.branding,
    reportId,
    reportVersionBranding,
    resolvedBranding.brandName,
    resolvedBranding.logoUrl,
    selectedTemplateId,
    workspace?.branding,
  ]);
  const timeframeLabel =
    formatMetaTimeframeDateRange({
      since: viewModel.coverTimeframeSince || viewModel.timeframeSince,
      until: viewModel.coverTimeframeUntil || viewModel.timeframeUntil,
      locale: language,
    }) || viewModel.coverTimeframeLabel || viewModel.periodLabel;
  const template = useMemo(() => getReportTemplate("default"), []);
  const reportIntegration = useMemo(
    () =>
      getReportIntegrationDetails(
        reportDetail || { integrationMetadata: undefined, reportSources: [] }
      ),
    [reportDetail]
  );
  const thumbnailContext = useMemo(
    () =>
      buildDefaultTemplateContext(
        viewModel,
        {
          ...resolvedBranding,
          workspaceId: reportDetail?.workspaceId || null,
        },
        reportId,
        resolveReportCoverSourceName(reportDetail, resolvedBranding.brandName)
      ),
    [reportDetail, reportId, resolvedBranding, viewModel]
  );
  const slideNavigationItems = useMemo(
    () => {
      if (shouldRenderBlocksAsSlides(blocks)) {
        return buildReportBlockSlideElements({
          blocks,
          model: viewModel,
          renderMode: "preview",
          logoUrl: resolvedBranding.logoUrl,
          brandName: resolvedBranding.brandName,
          templateId: selectedTemplateId,
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
              templateId={selectedTemplateId}
              model={slideModel}
            />
          ),
        };
      });
    },
    [
      blocks,
      hideOverviewInsights,
      language,
      resolvedBranding.brandName,
      resolvedBranding.logoUrl,
      selectedTemplateId,
      template.slides,
      thumbnailContext,
      viewModel,
    ]
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
    try {
      setShareLoading(true);
      console.info("[ShareReport][ui.start]", {
        reportId,
      });

      const response = await createReportShare(reportId);

      try {
        await navigator.clipboard.writeText(response.shareUrl);
        setShareFeedback(messages.reports.copiedLink);
      } catch {
        setShareDialogUrl(response.shareUrl);
        setShareDialogOpen(true);
      }

      console.info("[ShareReport][ui.success]", {
        reportId,
        shareUrl: response.shareUrl,
      });
    } catch (error) {
      console.error("[ShareReport][ui.error]", {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });
      setShareFeedback(messages.reports.createShareError);
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCopyReportId() {
    await navigator.clipboard.writeText(getClipboardReportId(reportId));
    setIdCopied(true);
  }

  async function handleDownload() {
    try {
      setPdfLoading(true);
      console.info("[PDFExport][ui.start]", {
        reportId,
        template: activeTemplate || null,
      });

      const result = await downloadReportPdf(
        reportId,
        activeTemplate ? { template: activeTemplate } : undefined
      );

      console.info("[PDFExport][ui.success]", {
        reportId,
        filename: result.filename,
      });
    } catch (error) {
      console.error("[PDFExport][ui.error]", {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });
      setShareFeedback(messages.reports.exportPdfError);
    } finally {
      setPdfLoading(false);
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
    setPendingFolderId(nextFolderId);
  }

  async function handleSaveFolder() {
    const nextFolder = folders.find((folder) => folder.id === pendingFolderId);

    try {
      setSavingFolder(true);
      await updateReportFolder(reportId, {
        folderId: pendingFolderId || null,
        folderName: nextFolder?.name || null,
      });
      handleMoveToFolder(pendingFolderId);
      setFolderFeedback("Folder updated");
    } catch (error) {
      console.error("report detail folder update error:", error);
      setFolderFeedback("No se pudo guardar la carpeta.");
    } finally {
      setSavingFolder(false);
    }
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
      setDeleteConfirmOpen(false);

      const nextAssignments = {
        ...loadStoredAssignments(),
      };
      delete nextAssignments[reportId];
      saveAssignments(nextAssignments);
      router.push("/reports");
    } catch (error) {
      console.error("report detail delete error:", error);
      setDeleteConfirmOpen(false);
      window.alert("No se pudo eliminar el reporte. Intenta nuevamente.");
    } finally {
      setDeletingReport(false);
    }
  }

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
        onAction={() => {
          void loadReport();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {showReportAssistantPrompt ? (
        <ReportAssistantPrompt onClose={() => setShowReportAssistantPrompt(false)} />
      ) : null}
      <ReportShareDialog
        open={shareDialogOpen}
        title={messages.reports.manualShareTitle}
        description={messages.reports.manualShareDescription}
        shareUrl={shareDialogUrl}
        closeLabel={messages.common.close}
        onClose={() => setShareDialogOpen(false)}
      />

      <section className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/reports")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span aria-hidden="true">←</span>
              Volver a reportes
            </button>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
              {title}
            </h1>
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
                {messages.reports.templateLabel}: {getReportTemplateLabel(selectedTemplateId)}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleCopyReportId();
                }}
                className="rounded-full bg-slate-950 px-3 py-1 font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-800"
                title="Copy report ID"
              >
                REPORT ID: {reportId}
              </button>
              {idCopied ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  ID copiado
                </span>
              ) : null}
              {timeframeLabel ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                  Period: {timeframeLabel}
                </span>
              ) : null}
              {FEATURES.ENABLE_AI_AGENTS_MODE && aiModeMetadata.aiMode ? (
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 sm:inline-flex">
                  AI mode: {aiModeMetadata.aiMode === "agents" ? "Agents" : "Standard"}
                </span>
              ) : null}
            </div>
            {FEATURES.ENABLE_AI_AGENTS_MODE && aiModeMetadata.fallbackUsed ? (
              <p className="mt-3 text-xs font-medium text-slate-500">
                Fallback estándar aplicado
              </p>
            ) : null}
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
              <p>
                <span className="font-semibold text-slate-900">
                  {messages.reports.templateLabel}:
                </span>{" "}
                {getReportTemplateLabel(selectedTemplateId)}
              </p>
              <p className="mt-3 sm:mt-1">
                <span className="font-semibold text-slate-900">Integración:</span>{" "}
                {reportIntegration.integrationLabel}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Fuente:</span>{" "}
                {reportIntegration.sourceLabel}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Canal:</span>{" "}
                {reportIntegration.channelLabel}
              </p>
            </div>
            {shareFeedback ? (
              <p className={`mt-4 rounded-2xl px-3 py-2 text-sm ${shareFeedback === messages.reports.createShareError || shareFeedback === messages.reports.exportPdfError ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                {shareFeedback}
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

        <div ref={slideDeckRef} className="report-main-preview-surface w-full">
          <div className="w-full overflow-hidden">
            <SlideRenderer
              reportId={reportId}
              model={viewModel}
              blocks={blocks}
              locale={language}
              hideOverviewInsights={hideOverviewInsights}
              branding={resolvedBranding}
              report={reportDetail}
              templateId={selectedTemplateId}
              watermarkText={showFreeWatermark ? "Reporte creado con measurableapp.com" : undefined}
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
                  disabled={pdfLoading || !reportId}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white ring-1 ring-slate-900/10">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">
                      {messages.reports.downloadPdf}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {pdfLoading ? messages.reports.exportingPdf : messages.reports.saveDeckCopy}
                    </span>
                  </span>
                </button>
              ) : null}

              {showShareAction ? (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={shareLoading || !reportId}
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
                      {shareLoading ? messages.common.generating : messages.reports.shareLinkDescription}
                    </span>
                  </span>
                </button>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="block text-sm font-semibold text-slate-950">
                  {messages.reports.addToFolderLabel}
                </label>
                <select
                  value={pendingFolderId}
                  onChange={(event) => {
                    setPendingFolderId(event.target.value);
                    setFolderFeedback("");
                  }}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none transition focus:border-sky-300"
                >
                  <option value="">{messages.common.noFolder}</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingFolderId(folderId)}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
                  >
                    {messages.common.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveFolder()}
                    disabled={savingFolder || pendingFolderId === folderId}
                    className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingFolder ? "Saving..." : messages.common.save}
                  </button>
                </div>
                {folderFeedback ? (
                  <p className="mt-2 text-xs text-slate-500">{folderFeedback}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
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
              <p className={`mt-3 rounded-2xl px-3 py-2 text-sm ${shareFeedback === messages.reports.createShareError || shareFeedback === messages.reports.exportPdfError ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                {shareFeedback}
              </p>
            ) : null}
          </div>
        </aside>
        ) : null}
      </section>

      <style jsx global>{`
        .report-main-preview-surface [data-report-slide].report-preview-slide {
          background: #ffffff !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          border-radius: 40px !important;
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.05) !important;
          padding: 20px !important;
        }
      `}</style>

      {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] z-50 xl:hidden">
          <div className="mx-auto flex w-full max-w-[1180px] justify-center px-4">
            <div className="pointer-events-auto inline-flex items-center gap-3">
              {showDownloadAction ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={pdfLoading || !reportId}
                  className="inline-flex h-14 min-w-[min(78vw,280px)] items-center justify-center rounded-full bg-[var(--measurable-blue)] px-6 text-[15px] font-semibold text-white shadow-[0_18px_40px_rgba(23,73,255,0.22)] transition hover:scale-[1.01] hover:bg-[var(--measurable-blue-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pdfLoading
                    ? messages.reports.exportingPdf
                    : language === "es"
                      ? "Download report"
                      : "Download report"}
                </button>
              ) : null}

              {showShareAction ? (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={shareLoading || !reportId}
                  aria-label="Share report"
                  className="inline-flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {shareLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
                      <path d="M8.5 12.5 15.5 8.5M8.5 11.5l7 4" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="18" cy="7" r="2.5" strokeWidth="1.8" />
                      <circle cx="6" cy="12" r="2.5" strokeWidth="1.8" />
                      <circle cx="18" cy="17" r="2.5" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <h3 className="text-xl font-semibold text-slate-950">Eliminar reporte</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              ¿Seguro que quieres eliminar este reporte? Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletingReport}
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteReport()}
                disabled={deletingReport}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {deletingReport ? "Eliminando..." : "Eliminar reporte"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
