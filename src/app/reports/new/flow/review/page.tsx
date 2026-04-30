"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRef } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { ReportExportSurface } from "@/components/reports/ReportExportSurface";
import {
  getReportBlockDiagnostics,
  SlideRenderer,
} from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { FEATURES } from "@/config/features";
import { ApiError, isPlanLimitError } from "@/lib/api";
import {
  createMetaPagesReport,
  createInstagramBusinessReport,
  exportReportPptx,
  fetchLatestReportRenderData,
  fetchReports,
} from "@/lib/api/reports";
import {
  formatMetaTimeframeDateRange,
  formatMetaTimeframeLabel,
  normalizeMetaTimeframeSelection,
} from "@/lib/integrations/timeframes";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { saveReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { exportReportPdf } from "@/lib/reports/export-pdf";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { getPlanCapabilities } from "@/lib/workspace/plan-limits";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";
import type { ReportDescription, ReportDetail, ReportVersionBlock } from "@/types/report";

const loadingQuotes = [
  {
    quote: "Lo que se mide con claridad permite decidir mejor, enfocar recursos y convertir la actividad diaria en resultados visibles.",
    author: "Peter Drucker",
  },
  {
    quote: "Sin datos, las decisiones dependen de opiniones; con medición constante, cada resultado empieza a mostrar su verdadero contexto.",
    author: "W. Edwards Deming",
  },
  {
    quote: "Confiar en la intuición puede abrir caminos, pero medir resultados permite saber cuáles vale la pena seguir recorriendo.",
    author: "W. Edwards Deming",
  },
  {
    quote: "No puedes mejorar lo que no entiendes; por eso cada reporte debe transformar datos dispersos en una lectura accionable.",
    author: "Peter Drucker",
  },
  {
    quote: "La meta no es acumular más datos, sino encontrar las señales que ayudan a tomar mejores decisiones con menos incertidumbre.",
    author: "Avinash Kaushik",
  },
  {
    quote: "La medición convierte la intuición en dirección, y la dirección correcta permite que cada esfuerzo tenga una razón clara.",
    author: "Measurable",
  },
  {
    quote: "Si no puedes medir el resultado, será difícil aprender de él; si puedes verlo con claridad, puedes mejorarlo con intención.",
    author: "W. Edwards Deming",
  },
  {
    quote: "La claridad aparece cuando los resultados se vuelven visibles y cada métrica empieza a explicar qué cambió, cuándo y por qué.",
    author: "Measurable",
  },
  {
    quote: "El marketing efectivo no termina en la publicación; empieza a mejorar cuando puedes explicar sus resultados con evidencia.",
    author: "Philip Kotler",
  },
  {
    quote: "Los números correctos no solo describen el desempeño; cuentan la historia que ayuda a elegir el siguiente movimiento.",
    author: "Avinash Kaushik",
  },
  {
    quote: "Medir es separar el ruido de la señal para que el equipo pueda concentrarse en lo que realmente mueve el resultado.",
    author: "Nate Silver",
  },
  {
    quote: "La estrategia mejora cuando los resultados dejan de ser invisibles y las conversaciones se apoyan en evidencia compartida.",
    author: "Measurable",
  },
  {
    quote: "Los datos no reemplazan el juicio; lo entrenan, lo cuestionan y lo ayudan a encontrar patrones que antes pasaban desapercibidos.",
    author: "Edward Tufte",
  },
  {
    quote: "Lo importante no es contar todo, sino entender qué cuenta para el objetivo, el cliente y el crecimiento de la marca.",
    author: "Albert Einstein",
  },
  {
    quote: "Cada métrica útil debe acercarte a una decisión concreta; si no cambia una acción, probablemente necesita contexto.",
    author: "Avinash Kaushik",
  },
  {
    quote: "El crecimiento se vuelve repetible cuando sabes qué lo impulsó, qué lo frenó y qué señales conviene observar de nuevo.",
    author: "Measurable",
  },
  {
    quote: "Los reportes existen para reducir incertidumbre, alinear criterios y transformar una semana de actividad en aprendizaje útil.",
    author: "Measurable",
  },
  {
    quote: "La medición consistente construye confianza en la estrategia porque muestra progreso, riesgos y oportunidades con el mismo lenguaje.",
    author: "Peter Drucker",
  },
  {
    quote: "Una buena visualización revela lo que una tabla esconde: tendencias, contrastes y momentos que merecen una decisión.",
    author: "Edward Tufte",
  },
  {
    quote: "Medir resultados es convertir actividad en aprendizaje, y convertir aprendizaje en mejores decisiones para el siguiente ciclo.",
    author: "Measurable",
  },
] as const;

type ReviewStatus = "loading" | "error" | "empty" | "ready";

function getReportTitle(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return titleBlock?.data.text || "Generated report";
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

function NewReportFlowReviewPageContent() {
  const showReviewActions = false;
  const { language, messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedIntegrationContext] = useState(() => getIntegrationReportContext());
  const queryReportId = searchParams.get("reportId") || "";
  const shouldGenerateReport = searchParams.get("generate") === "1" && !queryReportId;
  const [generatedReportId, setGeneratedReportId] = useState("");
  const reportId = generatedReportId || queryReportId;
  const integrationSource = searchParams.get("integration") || "";
  const selectedTemplate = searchParams.get("template") || "modern";
  const preferenceLogoUrl = usePreferencesStore((state) => state.logoDataUrl);
  const currentStep = 4;
  const stepHrefMap: Record<number, string> = {
    1: integrationSource
      ? `/reports/new/flow?integration=${integrationSource}`
      : "/reports/new/flow",
    2: integrationSource
      ? `/reports/new/flow/sync?integration=${integrationSource}`
      : "/reports/new/flow/sync",
    3: integrationSource
      ? `/reports/new/flow/generate?integration=${integrationSource}`
      : "/reports/new/flow/generate",
  };

  const [loadingIndex, setLoadingIndex] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const [blocks, setBlocks] = useState<ReportVersionBlock[]>([]);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [reportVersionDescription, setReportVersionDescription] =
    useState<ReportDescription | null>(null);
  const [reportVersionBranding, setReportVersionBranding] = useState<{
    logoUrl?: string;
    source?: string;
  } | null>(null);
  const [reportsCount, setReportsCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [pptxLoading, setPptxLoading] = useState(false);
  const [pptxFeedback, setPptxFeedback] = useState("");
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [mountExportSurface, setMountExportSurface] = useState(false);
  const [exportSurfaceReady, setExportSurfaceReady] = useState(false);
  const [error, setError] = useState("");
  const [generationErrorDetail, setGenerationErrorDetail] = useState("");
  const [resolvedVersionId, setResolvedVersionId] = useState("");
  const exportSurfaceRef = useRef<HTMLDivElement | null>(null);
  const generationStartedRef = useRef(false);
  const { workspace } = useActiveWorkspace();
  const planCapabilities = getPlanCapabilities(workspace);
  const flowSteps = [
    {
      id: 1,
      title: messages.reports.chooseSource,
      description: messages.reports.chooseSourceDescription,
    },
    {
      id: 2,
      title: messages.reports.syncData,
      description: messages.reports.syncDataDescription,
    },
    {
      id: 3,
      title: messages.reports.generateReport,
      description: messages.reports.generateReportDescription,
    },
    {
      id: 4,
      title: messages.reports.reviewResult,
      description: messages.reports.reviewResultDescription,
    },
  ] as const;

  useEffect(() => {
    console.info("[ReviewBug][entry]", {
      queryReportId,
      generatedReportId,
      reportId,
      shouldGenerateReport,
      hasStoredContext: Boolean(storedIntegrationContext),
    });
  }, [generatedReportId, queryReportId, reportId, shouldGenerateReport, storedIntegrationContext]);

  useEffect(() => {
    let active = true;

    async function createPendingReport() {
      if (!shouldGenerateReport) {
        return;
      }

      if (generationStartedRef.current) {
        return;
      }

      generationStartedRef.current = true;

      if (!storedIntegrationContext?.datasetId || !storedIntegrationContext.synced) {
        setError(messages.reports.noDatasetYet);
        setGenerationErrorDetail(messages.reports.noDatasetYet);
        setReviewStatus("error");
        setIntroComplete(true);
        return;
      }

      try {
        setReviewStatus("loading");
        setError("");
        const normalizedSelection = normalizeMetaTimeframeSelection({
          preset: storedIntegrationContext.timeframe,
          startDate: storedIntegrationContext.startDate,
          endDate: storedIntegrationContext.endDate,
        });
        const requestedAiMode = storedIntegrationContext.aiMode || "standard";
        const requestedSlides = storedIntegrationContext.requestedSlides || 5;
        const selectedEntityId = storedIntegrationContext.pageId || "";
        const selectedSource = integrationSource || storedIntegrationContext.source || "";
        const isInstagramBusiness = selectedSource === "instagram_business";

        console.info("[MetaTimeframe][flow.review.generate]", {
          selectedIntegrationSource: selectedSource,
          selectedEntityId,
          persistedContext: storedIntegrationContext,
          facebookPayload: {
            dataset_id: Number(storedIntegrationContext.datasetId),
            timeframe: normalizedSelection.key,
            start_date: normalizedSelection.startDate,
            end_date: normalizedSelection.endDate,
            requested_slides: requestedSlides,
            ai_mode: requestedAiMode,
          },
          instagramPayload: {
            integration_id: storedIntegrationContext.integrationId,
            workspace_id: storedIntegrationContext.workspaceId,
            account_id: selectedEntityId,
            timeframe: normalizedSelection.key,
            start_date: normalizedSelection.startDate,
            end_date: normalizedSelection.endDate,
            requested_slides: requestedSlides,
            ai_mode: requestedAiMode,
          },
        });

        if (isInstagramBusiness) {
          if (!storedIntegrationContext.integrationId) {
            throw new Error("Instagram Business report generation requires integration_id.");
          }

          if (!selectedEntityId) {
            throw new Error("Instagram Business report generation requires an account_id.");
          }
        }

        const report = isInstagramBusiness
          ? await createInstagramBusinessReport({
              integrationId: storedIntegrationContext.integrationId || "",
              workspaceId: storedIntegrationContext.workspaceId,
              accountId: selectedEntityId,
              timeframe: normalizedSelection.key,
              startDate: normalizedSelection.startDate,
              endDate: normalizedSelection.endDate,
              requestedSlides,
              aiMode: requestedAiMode,
            })
          : await createMetaPagesReport({
              datasetId: storedIntegrationContext.datasetId,
              timeframe: normalizedSelection.key,
              startDate: normalizedSelection.startDate,
              endDate: normalizedSelection.endDate,
              requestedSlides,
              aiMode: requestedAiMode,
            });

        if (!active) {
          return;
        }

        saveReportBrandingSnapshot(report.reportId, {
          logoUrl: preferenceLogoUrl,
          source: "preferences.logoDataUrl",
        });
        console.info("[MetaTimeframe][flow.review.generate] response", {
          reportId: report.reportId,
          raw: report.raw,
        });
        console.info("[AIAgents][generate.response]", {
          reportId: report.reportId,
          aiMode: requestedAiMode,
          fallbackMetadata:
            report.raw && typeof report.raw === "object"
              ? report.raw
              : null,
        });
        setGeneratedReportId(report.reportId);
        router.replace(
          `/reports/new/flow/review?integration=${integrationSource}&reportId=${report.reportId}&template=${selectedTemplate}`
        );
      } catch (err: unknown) {
        console.error("flow review generate report error:", err);

        if (!active) {
          return;
        }

        if (isPlanLimitError(err)) {
          const message = err.message || messages.reports.generateReportError;
          setError(message);
          setGenerationErrorDetail(message);
        } else if (err instanceof ApiError && err.message) {
          setError(err.message);
          setGenerationErrorDetail(
            err.status ? `${err.message} (${err.status})` : err.message
          );
        } else {
          setError(messages.reports.generateReportError);
          setGenerationErrorDetail(messages.reports.generateReportError);
        }
        setReviewStatus("error");
        setIntroComplete(true);
      }
    }

    void createPendingReport();

    return () => {
      active = false;
    };
  }, [
    messages.reports.generateReportError,
    messages.reports.noDatasetYet,
    preferenceLogoUrl,
    router,
    shouldGenerateReport,
    integrationSource,
    selectedTemplate,
    storedIntegrationContext,
  ]);

  useEffect(() => {
    generationStartedRef.current = false;
  }, [retryNonce]);

  useEffect(() => {
    const timers = loadingQuotes.map((_, index) =>
      window.setTimeout(() => {
        setLoadingIndex(index);
      }, index * 4200)
    );

    const revealTimer = window.setTimeout(() => {
      setIntroComplete(true);
    }, 12600);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(revealTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function wait(ms: number) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    }

    async function fetchPreviewBlocks() {
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const renderData = await fetchLatestReportRenderData(reportId, {
            source: "flow-preview",
          });
          const reportVersion = renderData.reportVersion;
          const reportBlocks = reportVersion.blocks;
          setReportVersionDescription(reportVersion.description || null);
          setReportVersionBranding(reportVersion.branding || null);
          setReportDetail(renderData.detail);
          setResolvedVersionId(renderData.resolvedVersionId);

          if (reportBlocks.length > 0 || attempt === 4) {
            return reportBlocks;
          }
        } catch (error) {
          lastError = error;
        }

        if (attempt < 4) {
          await wait(1200);
        }
      }

      throw lastError || new Error("Report preview not ready");
    }

    async function loadReviewData() {
      if (!reportId && shouldGenerateReport) {
        return;
      }

      if (!reportId) {
        console.error("[ReviewBug][report.fetch.error]", {
          reason: "missing_report_id",
          shouldGenerateReport,
        });
        setError(messages.review.loadingReportMissing);
        setGenerationErrorDetail(messages.review.loadingReportMissing);
        setReviewStatus("error");
        return;
      }

      try {
        console.info("[ReviewBug][report.fetch.start]", { reportId });
        setReviewStatus("loading");
        setError("");

        const [reportBlocks, reports] = await Promise.all([
          fetchPreviewBlocks(),
          fetchReports().catch(() => []),
        ]);

        if (!active) {
          return;
        }

        setBlocks(reportBlocks);
        setReportsCount(reports.length);
        setReviewStatus(reportBlocks.length > 0 ? "ready" : "empty");
        console.info("[ReviewBug][report.fetch.success]", {
          reportId,
          blocksCount: reportBlocks.length,
        });
      } catch (err: unknown) {
        console.error("flow review load error:", err);
        console.error("[ReviewBug][report.fetch.error]", {
          reportId,
          error: err instanceof Error ? err.message : String(err),
        });

        if (!active) {
          return;
        }

        setError(
          messages.review.loadingPreviewError
        );
        setGenerationErrorDetail(
          err instanceof Error ? err.message : messages.review.loadingPreviewError
        );
        setReviewStatus("error");
      }
    }

    void loadReviewData();

    return () => {
      active = false;
    };
  }, [
    messages.review.loadingPreviewError,
    messages.review.loadingReportMissing,
    reportId,
    shouldGenerateReport,
    retryNonce,
  ]);

  const reportTitle = useMemo(
    () => getReportTitle(blocks),
    [blocks]
  );
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
    console.info("[Report10][review.blocks]", {
      reportId,
      ...getReportBlockDiagnostics(blocks),
    });
    console.info("[Report15][review.blocks]", {
      reportId,
      ...getReportBlockDiagnostics(blocks),
    });
  }, [blocks, reportId]);
  useEffect(() => {
    console.info("[AUDIT_RENDER_PATH][review.page]", {
      reportIdFromQuery: queryReportId || null,
      reportIdResolved: reportId || null,
      template: selectedTemplate,
      hasPreviewBootstrap: Boolean(
        storedIntegrationContext &&
          "previewBootstrap" in storedIntegrationContext &&
          (storedIntegrationContext as Record<string, unknown>).previewBootstrap
      ),
      blocksLength: blocks.length,
      firstFiveBlocks: blocks.slice(0, 5).map((block, index) => ({
        index,
        semantic_name:
          block.data.semantic_name ??
          block.data.semanticName ??
          block.data.name ??
          block.data.key ??
          null,
        order: block.data.order ?? block.data.slide_order ?? block.data.slideOrder ?? null,
        type: block.type,
        title: block.data.title ?? block.data.heading ?? block.data.label ?? block.data.text ?? null,
      })),
    });
  }, [blocks, queryReportId, reportId, selectedTemplate, storedIntegrationContext]);
  useEffect(() => {
    const diagnostics = getReportBlockDiagnostics(blocks);
    const semanticNames = diagnostics.semanticNames.filter(Boolean);

    console.log("[REPORT_RENDER_PATH]", {
      source: "flow-preview",
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
    }) ||
    formatMetaTimeframeLabel({
      timeframe: storedIntegrationContext?.timeframe,
      startDate: storedIntegrationContext?.startDate,
      endDate: storedIntegrationContext?.endDate,
    });
  const aiModeMetadata = getAiModeMetadata(reportDetail, reportVersionDescription);

  function handleRetryReview() {
    console.info("[ReviewBug][retry]", {
      reportId,
      shouldGenerateReport,
      reviewStatus,
    });
    setError("");
    setGenerationErrorDetail("");
    setReviewStatus("loading");
    setIntroComplete(true);
    setRetryNonce((current) => current + 1);
  }

  async function handleShare() {
    const reportUrl = `${window.location.origin}/reports/${reportId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: reportTitle,
          url: reportUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await navigator.clipboard.writeText(reportUrl);
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
      setError("PDF export is not available for your current plan.");
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
      console.error("flow review pptx export error:", error);
      setPptxFeedback(messages.reports.exportError);
    } finally {
      setPptxLoading(false);
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
        console.error("flow review download error:", err);
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

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.review.reviewResult}
          description={messages.review.reviewDescription}
          backHref={stepHrefMap[3]}
        />
        {mountExportSurface ? (
          <ReportExportSurface
            ref={exportSurfaceRef}
            model={viewModel}
            branding={resolvedBranding}
            onReadyChange={setExportSurfaceReady}
          />
        ) : null}

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="hidden max-w-3xl md:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.review.guidedFlow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {messages.review.reviewResult}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {messages.review.reviewDescription}
            </p>
          </div>

          <DesktopFlowSteps
            steps={flowSteps}
            currentStep={currentStep}
            stepLabel={messages.review.step}
            clickableHrefMap={stepHrefMap}
          />

          <div className="mt-8">
            <section className="rounded-[24px] border-0 bg-transparent p-0 shadow-none md:border md:border-slate-200 md:bg-white md:p-5 md:shadow-sm">
              {!introComplete ? (
                <div className="space-y-4">
                  <div className="rounded-[20px] border-0 bg-transparent px-0 py-0 md:border md:border-slate-200 md:bg-slate-50 md:px-4 md:py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                        Preview
                      </p>
                      <h2 className="mt-2 truncate text-2xl font-semibold text-slate-950">
                        {messages.reports.generateReport}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Generando tu reporte...
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[720px] overflow-auto rounded-[20px] border-0 bg-transparent p-0 md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:sm:p-4">
                    <div className="pr-0 md:pr-1">
                      <div className="rounded-[32px] bg-[#eef3f8] px-2 py-3 md:rounded-[44px] md:px-4 md:py-5">
                        <div className="w-full overflow-hidden">
                          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-[28px] border border-slate-800/80 bg-[#07111f] px-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.12)] md:rounded-[34px]">
                            <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/15 border-t-sky-300" />
                            <p className="mt-5 text-base font-semibold text-white">
                              Generando tu reporte...
                            </p>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                              &ldquo;{loadingQuotes[loadingIndex]?.quote}&rdquo;
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/80">
                              {loadingQuotes[loadingIndex]?.author}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : reviewStatus === "error" ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700">
                  <p className="font-semibold">
                    {messages.reports.generateReportError}
                  </p>
                  <p className="mt-2">
                    {generationErrorDetail || error}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryReview}
                    className="mt-4 inline-flex rounded-2xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
                  >
                    Reintentar
                  </button>
                </div>
              ) : reviewStatus === "empty" ? (
                <div className="flex min-h-[620px] flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 px-6 text-center">
                  <p className="text-lg font-semibold text-slate-950">
                    No report blocks were found
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    The report was created, but the preview did not include slides yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryReview}
                    className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Reintentar
                  </button>
                </div>
              ) : reviewStatus === "loading" ? (
                <div className="space-y-4">
                  <div className="rounded-[20px] border-0 bg-transparent px-0 py-0 md:border md:border-slate-200 md:bg-slate-50 md:px-4 md:py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                        Preview
                      </p>
                      <h2 className="mt-2 truncate text-2xl font-semibold text-slate-950">
                        {messages.reports.generateReport}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Generando tu reporte...
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[720px] overflow-auto rounded-[20px] border-0 bg-transparent p-0 md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:sm:p-4">
                    <div className="pr-0 md:pr-1">
                      <div className="rounded-[32px] bg-[#eef3f8] px-2 py-3 md:rounded-[44px] md:px-4 md:py-5">
                        <div className="w-full overflow-hidden">
                          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-[28px] border border-slate-800/80 bg-[#07111f] px-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.12)] md:rounded-[34px]">
                            <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/15 border-t-sky-300" />
                            <p className="mt-5 text-base font-semibold text-white">
                              Generando tu reporte...
                            </p>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                              &ldquo;{loadingQuotes[loadingIndex]?.quote}&rdquo;
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/80">
                              {loadingQuotes[loadingIndex]?.author}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[20px] border-0 bg-transparent px-0 py-0 md:border md:border-slate-200 md:bg-slate-50 md:px-4 md:py-4">
                    <div className="flex w-full items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                          Preview
                        </p>
                        <h2 className="mt-2 truncate text-2xl font-semibold text-slate-950">
                          {reportTitle}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Period: {timeframeLabel}
                        </p>
                        {FEATURES.ENABLE_AI_AGENTS_MODE && aiModeMetadata.aiMode ? (
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            AI mode:{" "}
                            {aiModeMetadata.aiMode === "agents" ? "Agents" : "Standard"}
                            {aiModeMetadata.fallbackUsed ? " · Se usó fallback estándar" : ""}
                          </p>
                        ) : null}
                      </div>
                      {!FEATURES.ENABLE_APP_REVIEW_MODE && showReviewActions ? (
                      <div className="flex shrink-0 items-center justify-end">
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={handleDownload}
                            disabled={downloading || !reportId}
                            className="hidden items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 md:inline-flex"
                          >
                            {downloading
                              ? pdfProgress
                                ? `${messages.common.generatingPdf} ${pdfProgress.current}/${pdfProgress.total}`
                                : messages.common.downloading
                              : messages.common.download}
                          </button>
                          {FEATURES.ENABLE_PPTX_EXPORT ? (
                            <button
                              type="button"
                              onClick={handleExportPptx}
                              disabled={pptxLoading || !reportId}
                              className={`hidden items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-100 md:inline-flex ${
                                planCapabilities.canExportPptx
                                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                  : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              }`}
                            >
                              {pptxLoading ? messages.reports.exportingPptx : messages.reports.exportPptx}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleShare}
                            disabled={!reportId}
                            className="hidden items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 md:inline-flex"
                          >
                            {messages.common.share}
                          </button>
                          <Link
                            href={reportId ? `/reports/${reportId}` : "/reports"}
                            className="hidden items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 md:inline-flex"
                          >
                            {messages.reports.openFullReport}
                          </Link>

                          <div className="min-w-[8.5rem] rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_100%)] px-4 py-3 text-right shadow-sm md:rounded-2xl md:bg-white md:shadow-none">
                            <p className="text-sm font-medium text-slate-500">
                              {messages.reports.reportsGenerated}
                            </p>
                            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                              {reportsCount}
                            </p>
                          </div>
                        </div>
                      </div>
                      ) : null}
                    </div>
                  </div>
                  {FEATURES.ENABLE_PPTX_EXPORT && pptxFeedback ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {pptxFeedback}
                      {!planCapabilities.canExportPptx ? (
                        <Link
                          href="/plans"
                          className="ml-2 font-semibold text-amber-900 underline"
                        >
                          Upgrade
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="max-h-[720px] overflow-auto rounded-[20px] border-0 bg-transparent p-0 md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:sm:p-4">
                    <div className="pr-0 md:pr-1">
                      <div className="rounded-[32px] bg-[#eef3f8] px-2 py-3 md:rounded-[44px] md:px-4 md:py-5">
                        <div className="w-full overflow-hidden">
                          <SlideRenderer
                            model={viewModel}
                            blocks={blocks}
                            locale={language}
                            branding={resolvedBranding}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </section>
          </div>

          {!FEATURES.ENABLE_APP_REVIEW_MODE && showReviewActions ? (
          <div className="sticky bottom-6 z-40 hidden justify-center px-4 md:flex">
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.16)] backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Actions
              </span>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !reportId}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {downloading
                  ? pdfProgress
                    ? `${messages.common.generatingPdf} ${pdfProgress.current}/${pdfProgress.total}`
                    : messages.common.downloading
                  : messages.common.download}
              </button>
              {FEATURES.ENABLE_PPTX_EXPORT ? (
                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={pptxLoading || !reportId}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    planCapabilities.canExportPptx
                      ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  {pptxLoading ? messages.reports.exportingPptx : messages.reports.exportPptx}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleShare}
                disabled={!reportId}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {messages.common.share}
              </button>
              <Link
                href={reportId ? `/reports/${reportId}` : "/reports"}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
              >
                {messages.reports.openFullReport}
              </Link>
            </div>
          </div>
          ) : null}
        </section>
        {!FEATURES.ENABLE_APP_REVIEW_MODE && showReviewActions ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 border-t border-slate-200 bg-white/96 px-4 pb-4 pt-3 shadow-[0_-12px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !reportId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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
            {FEATURES.ENABLE_PPTX_EXPORT ? (
              <button
                type="button"
                onClick={handleExportPptx}
                disabled={pptxLoading || !reportId}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  planCapabilities.canExportPptx
                    ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:bg-slate-100"
                    : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:bg-amber-50"
                }`}
              >
                {pptxLoading ? messages.reports.exportingPptx : "PPTX"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleShare}
              disabled={!reportId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                <path d="M14 5.5h4.5V10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 5.5l-7.25 7.25" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 7.5H8.25A2.75 2.75 0 0 0 5.5 10.25v5.5a2.75 2.75 0 0 0 2.75 2.75h5.5a2.75 2.75 0 0 0 2.75-2.75V14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {messages.common.share}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href={stepHrefMap[3]}
              className="inline-flex min-w-[5.5rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
            >
              {messages.common.back}
            </Link>
            <button
              type="button"
              disabled={!reportId}
              onClick={() => {
                if (reportId) {
                  window.location.href = `/reports/${reportId}`;
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {messages.reports.openFullReport}
            </button>
          </div>
        </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function NewReportFlowReviewPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        </AppShell>
      }
    >
      <NewReportFlowReviewPageContent />
    </Suspense>
  );
}
