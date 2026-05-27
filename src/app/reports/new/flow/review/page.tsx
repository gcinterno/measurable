"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRef } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { UpgradeLimitModal } from "@/components/layout/UpgradeLimitModal";
import { useI18n } from "@/components/providers/LanguageProvider";
import { fetchAccountSummary } from "@/lib/api/account";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { ReportShareDialog } from "@/components/reports/ReportShareDialog";
import {
  getReportBlockDiagnostics,
  SlideRenderer,
} from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { FEATURES } from "@/config/features";
import { ApiError, isPlanLimitError } from "@/lib/api";
import { getMeasurableBrandingOverride } from "@/lib/branding";
import {
  createReportShare,
  createMetaPagesReport,
  createMultiSourceReport,
  createInstagramBusinessReport,
  downloadReportPdf,
  fetchLatestReportRenderData,
  fetchReports,
} from "@/lib/api/reports";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  formatMetaTimeframeDateRange,
  formatMetaTimeframeLabel,
  normalizeMetaTimeframeSelection,
} from "@/lib/integrations/timeframes";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { saveReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import {
  resolveReportTemplateSelection,
  saveReportTemplateSelection,
} from "@/lib/reports/template-selection";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";
import type { SourceKey } from "@/lib/integrations/session";
import type { ReportDescription, ReportDetail, ReportVersionBlock } from "@/types/report";

const REPORT_PDF_DOWNLOADS_LOCKED = true;
const REPORT_PDF_LOCKED_TOOLTIP = "Proximamente";

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

function getSourceDisplayLabel(sourceKey: SourceKey) {
  return sourceKey === "instagram_business" ? "Instagram Account" : "Facebook Page";
}

function buildMultiSourceReportTitle(sourceKeys: SourceKey[]) {
  return sourceKeys
    .map((sourceKey) =>
      sourceKey === "instagram_business" ? "Instagram" : "Facebook"
    )
    .join(" + ");
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
  const showReviewActions = true;
  const { language, messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedIntegrationContext] = useState(() => getIntegrationReportContext());
  const queryReportId = searchParams.get("reportId") || "";
  const shouldGenerateReport = searchParams.get("generate") === "1" && !queryReportId;
  const [generatedReportId, setGeneratedReportId] = useState("");
  const reportId = generatedReportId || queryReportId;
  const integrationSource = searchParams.get("integration") || "";
  const templateFromQuery = searchParams.get("template") || "";
  const selectedTemplate = resolveReportTemplateSelection(
    templateFromQuery || storedIntegrationContext?.templateId
  );
  const currentStep = 4;
  const stepHrefMap: Record<number, string> = {
    1: integrationSource
      ? `/reports/new/flow?resume=1&integration=${integrationSource}`
      : "/reports/new/flow?resume=1",
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState("");
  const [error, setError] = useState("");
  const [generationErrorDetail, setGenerationErrorDetail] = useState("");
  const [generationLimitReached, setGenerationLimitReached] = useState(false);
  const [resolvedVersionId, setResolvedVersionId] = useState("");
  const [showFreeWatermark, setShowFreeWatermark] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState(
    "Has alcanzado el límite de 10 reportes gratuitos."
  );
  const [upgradeModalUrl, setUpgradeModalUrl] = useState("/wishlist");
  const generationStartedRef = useRef(false);
  const { workspace } = useActiveWorkspace();
  const activeTemplate = useMemo(
    () =>
      templateFromQuery ||
      selectedTemplate ||
      reportDetail?.template ||
      "executive",
    [reportDetail?.template, selectedTemplate, templateFromQuery]
  );
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
    console.info("[REVIEW_TEMPLATE_AUDIT]", {
      templateFromQuery: templateFromQuery || null,
      selectedTemplate,
      reportTemplate: reportDetail?.template || null,
      activeTemplate,
      reportId: reportId || null,
      hasReportDetail: Boolean(reportDetail),
      blocksCount: blocks.length,
    });
  }, [
    activeTemplate,
    blocks.length,
    reportDetail,
    reportDetail?.template,
    reportId,
    selectedTemplate,
    templateFromQuery,
  ]);

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

      try {
        if (!storedIntegrationContext) {
          throw new Error("Report generation requires an active report creation session.");
        }

        setReviewStatus("loading");
        setError("");
        const normalizedSelection = normalizeMetaTimeframeSelection({
          preset: storedIntegrationContext.timeframe,
          startDate: storedIntegrationContext.startDate,
          endDate: storedIntegrationContext.endDate,
        });
        const requestedAiMode = storedIntegrationContext.aiMode || "standard";
        const selectedSources =
          storedIntegrationContext.selectedSources?.length
            ? storedIntegrationContext.selectedSources
            : integrationSource || storedIntegrationContext.source
              ? [(integrationSource || storedIntegrationContext.source) as SourceKey]
              : [];
        const selectedAccountsBySource = storedIntegrationContext.selectedAccountsBySource;
        const selectedSource = selectedSources[0] || integrationSource || storedIntegrationContext.source || "";
        const selectedSourceKey = isMetaFrontendIntegrationKey(selectedSource)
          ? selectedSource
          : undefined;
        const selectedEntityId =
          (selectedSourceKey &&
            selectedAccountsBySource?.[selectedSourceKey]?.accountId) ||
          storedIntegrationContext.pageId ||
          "";
        const isInstagramBusiness = selectedSource === "instagram_business";
        const isMultiSource = selectedSources.length > 1;
        const requestedSlides = isMultiSource
          ? 10
          : storedIntegrationContext.requestedSlides || 5;
        const isSourceConfigured = (sourceKey: SourceKey) => {
          const configuredSource = selectedAccountsBySource?.[sourceKey];

          if (
            configuredSource?.accountId &&
            configuredSource.datasetId &&
            configuredSource.syncStatus === "synced"
          ) {
            return true;
          }

          return (
            selectedSources.length === 1 &&
            sourceKey === selectedSource &&
            Boolean(storedIntegrationContext.datasetId) &&
            Boolean(storedIntegrationContext.synced)
          );
        };

        console.info("[MetaTimeframe][flow.review.generate]", {
          selectedIntegrationSource: selectedSource,
          selectedSources,
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

        if (
          selectedSources.length === 0 ||
          selectedSources.length > 2 ||
          (!selectedAccountsBySource && selectedSources.length > 1)
        ) {
          throw new Error("Report generation requires one or two configured sources.");
        }

        if (
          selectedSources.some(
            (sourceKey) => !isSourceConfigured(sourceKey)
          )
        ) {
          throw new Error("Each selected source must be synced before creating the report.");
        }

        if (isInstagramBusiness) {
          if (!storedIntegrationContext.integrationId) {
            throw new Error("Instagram Business report generation requires integration_id.");
          }

          if (!selectedEntityId) {
            throw new Error("Instagram Business report generation requires an account_id.");
          }
        }

        let report;

        if (isMultiSource) {
          if (!selectedAccountsBySource) {
            throw new Error("Multi-source reports require configured source accounts.");
          }

          report = await createMultiSourceReport({
            title: `${buildMultiSourceReportTitle(selectedSources)} report`,
            timeframe: normalizedSelection.key,
            startDate: normalizedSelection.startDate,
            endDate: normalizedSelection.endDate,
            requestedSlides,
            aiMode: requestedAiMode,
            locale: language,
            sources: selectedSources.map((sourceKey, position) => ({
              provider: "meta",
              sourceType: sourceKey,
              integrationId:
                selectedAccountsBySource[sourceKey].integrationId ||
                storedIntegrationContext.integrationId ||
                "",
              integrationAccountId:
                selectedAccountsBySource[sourceKey].integrationAccountId ||
                selectedAccountsBySource[sourceKey].accountId,
              datasetId: selectedAccountsBySource[sourceKey].datasetId || "",
              position,
              label: getSourceDisplayLabel(sourceKey),
            })),
          });
        } else if (isInstagramBusiness) {
          report = await createInstagramBusinessReport({
            integrationId: storedIntegrationContext.integrationId || "",
            workspaceId: storedIntegrationContext.workspaceId,
            accountId: selectedEntityId,
            timeframe: normalizedSelection.key,
            startDate: normalizedSelection.startDate,
            endDate: normalizedSelection.endDate,
            requestedSlides,
            aiMode: requestedAiMode,
          });
        } else {
          report = await createMetaPagesReport({
            datasetId:
              (selectedSourceKey &&
                selectedAccountsBySource?.[selectedSourceKey]?.datasetId) ||
              storedIntegrationContext.datasetId ||
              "",
            workspaceId: storedIntegrationContext.workspaceId,
            timeframe: normalizedSelection.key,
            startDate: normalizedSelection.startDate,
            endDate: normalizedSelection.endDate,
            requestedSlides,
            aiMode: requestedAiMode,
          });
        }

        if (!active) {
          return;
        }

        if (workspace?.branding?.logoUrl) {
          saveReportBrandingSnapshot(report.reportId, {
            logoUrl: workspace.branding.logoUrl,
            source: "workspace.branding.logoUrl",
          });
        }
        saveReportTemplateSelection(report.reportId, selectedTemplate);
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

        if (err instanceof ApiError && err.code === "FREE_REPORT_LIMIT_REACHED") {
          setGenerationLimitReached(true);
          setUpgradeModalMessage(
            err.message || "Has alcanzado el límite de 10 reportes gratuitos."
          );
          setUpgradeModalUrl(err.upgradeUrl || "https://measurableapp.com/wishlist");
          setUpgradeModalOpen(true);
          setError("");
          setGenerationErrorDetail("");
          setReviewStatus("loading");
        } else if (isPlanLimitError(err)) {
          const message = "Llegaste al limite mensual de reportes de tu plan.";
          setGenerationLimitReached(true);
          setUpgradeModalMessage(message);
          setUpgradeModalUrl(err.upgradeUrl || "/pricing");
          setUpgradeModalOpen(true);
          setError(message);
          setGenerationErrorDetail(message);
        } else if (err instanceof ApiError && err.message) {
          setGenerationLimitReached(false);
          setError(err.message);
          setGenerationErrorDetail(
            err.status ? `${err.message} (${err.status})` : err.message
          );
        } else {
          setGenerationLimitReached(false);
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
    language,
    messages.reports.generateReportError,
    messages.reports.noDatasetYet,
    router,
    shouldGenerateReport,
    integrationSource,
    selectedTemplate,
    storedIntegrationContext,
    workspace?.branding?.logoUrl,
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
        {
          id: reportId,
          templateId: selectedTemplate,
          branding: reportVersionBranding,
          report: {
            branding: reportDetail?.branding,
          },
        },
        {
          branding: getReportBrandingSnapshot(reportId),
        },
        {
          branding: getMeasurableBrandingOverride(workspace),
        }
      ),
    [reportDetail?.branding, reportId, reportVersionBranding, selectedTemplate, workspace]
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
  const selectedSourceCards = useMemo(() => {
    const selectedSources = storedIntegrationContext?.selectedSources || [];
    const selectedAccounts = storedIntegrationContext?.selectedAccountsBySource;

    return selectedSources.map((sourceKey) => {
      const integration = integrationCatalog.find(
        (item) => item.integrationKey === sourceKey
      );
      const selectedAccount = selectedAccounts?.[sourceKey];

      return {
        key: sourceKey,
        integrationLabel:
          integration?.name ||
          (sourceKey === "instagram_business" ? "Instagram Business" : "Facebook Page"),
        sourceLabel: selectedAccount?.accountName || "Fuente no disponible",
        channelLabel: sourceKey === "instagram_business" ? "Instagram" : "Facebook",
      };
    });
  }, [storedIntegrationContext]);

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
        console.error("flow review account summary error:", error);
      }
    }

    void loadAccountSummary();

    return () => {
      active = false;
    };
  }, []);

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
    } catch (shareError) {
      console.error("[ShareReport][ui.error]", {
        reportId,
        error: shareError instanceof Error ? shareError.message : String(shareError),
      });
      setShareFeedback(messages.reports.createShareError);
    } finally {
      setShareLoading(false);
    }
  }

  async function handleDownload() {
    try {
      setPdfLoading(true);
      console.log("[PDF_TEMPLATE_AUDIT]", {
        reportId,
        activeTemplate,
        source: templateFromQuery
          ? "query"
          : selectedTemplate
            ? "state"
            : reportDetail?.template
              ? "report"
              : "default",
      });
      console.info("[PDFExport][ui.start]", {
        reportId,
      });

      const result = await downloadReportPdf(reportId, { template: activeTemplate });

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

  useEffect(() => {
    if (!shareFeedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShareFeedback("");
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shareFeedback]);

  return (
    <AppShell>
      <div className="-mx-4 -mt-4 space-y-5 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
        <UpgradeLimitModal
          open={upgradeModalOpen}
          message={upgradeModalMessage}
          onClose={() => {
            setUpgradeModalOpen(false);
            router.replace(
              integrationSource
                ? `/reports/new/flow/generate?integration=${integrationSource}`
                : "/reports/new/flow/generate"
            );
          }}
          onUpgrade={() => {
            window.location.assign(upgradeModalUrl || "https://measurableapp.com/wishlist");
          }}
        />
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.review.reviewResult}
          description={messages.review.reviewDescription}
          backHref={stepHrefMap[3]}
        />
        <ReportShareDialog
          open={shareDialogOpen}
          title={messages.reports.manualShareTitle}
          description={messages.reports.manualShareDescription}
          shareUrl={shareDialogUrl}
          closeLabel={messages.common.close}
          onClose={() => setShareDialogOpen(false)}
        />

        <section className="p-5 sm:p-8">
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
            {selectedSourceCards.length > 0 ? (
              <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Integración utilizada
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {selectedSourceCards.map((card) => (
                    <div key={card.key} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-base font-semibold text-slate-950">{card.integrationLabel}</p>
                      <p className="mt-2 text-sm text-slate-600">{card.sourceLabel}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Canal: {card.channelLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="p-0">
              {!introComplete ? (
                <div className="space-y-4">
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

                  <div className="max-h-[720px] overflow-auto rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm md:p-3">
                    <div className="w-full overflow-hidden">
                      <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-[24px] border border-slate-800/80 bg-[#07111f] px-6 text-center md:aspect-[16/9] md:min-h-0 md:rounded-[28px]">
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
              ) : reviewStatus === "error" ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700">
                  <p className="font-semibold">
                    {generationLimitReached
                      ? "Limite mensual alcanzado"
                      : messages.reports.generateReportError}
                  </p>
                  <p className="mt-2">
                    {generationErrorDetail || error}
                  </p>
                  {generationLimitReached ? (
                    <Link
                      href="/pricing"
                      className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
                    >
                      Ver planes
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRetryReview}
                      className="mt-4 inline-flex rounded-2xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
                    >
                      Reintentar
                    </button>
                  )}
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

                  <div className="max-h-[720px] overflow-auto rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm md:p-3">
                    <div className="w-full overflow-hidden">
                      <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-[24px] border border-slate-800/80 bg-[#07111f] px-6 text-center md:aspect-[16/9] md:min-h-0 md:rounded-[28px]">
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
              ) : (
                <div className="space-y-4">
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
                          <div className="group relative hidden md:block">
                            <button
                              type="button"
                              onClick={handleDownload}
                              disabled={REPORT_PDF_DOWNLOADS_LOCKED || pdfLoading || !reportId}
                              aria-disabled={REPORT_PDF_DOWNLOADS_LOCKED}
                              className={`items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed md:inline-flex ${
                                REPORT_PDF_DOWNLOADS_LOCKED
                                  ? "border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7ed_100%)] text-slate-800 shadow-[0_14px_34px_rgba(245,158,11,0.10)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:bg-slate-100"
                              }`}
                            >
                              {REPORT_PDF_DOWNLOADS_LOCKED ? (
                                <>
                                  <span className="mr-2 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                    Locked
                                  </span>
                                  {messages.reports.downloadPdf}
                                </>
                              ) : pdfLoading ? (
                                messages.reports.exportingPdf
                              ) : (
                                messages.reports.downloadPdf
                              )}
                            </button>
                            {REPORT_PDF_DOWNLOADS_LOCKED ? (
                              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                                {REPORT_PDF_LOCKED_TOOLTIP}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={handleShare}
                            disabled={shareLoading || !reportId}
                            className="hidden items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 md:inline-flex"
                          >
                            {shareLoading ? messages.common.generating : messages.common.share}
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
                  {shareFeedback ? (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        shareFeedback === messages.reports.createShareError ||
                        shareFeedback === messages.reports.exportPdfError
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {shareFeedback}
                    </div>
                  ) : null}

                  <div className="max-h-[720px] overflow-auto rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm md:p-3">
                    <div className="w-full overflow-hidden">
                      <SlideRenderer
                        reportId={reportId}
                        model={viewModel}
                        blocks={blocks}
                        locale={language}
                        branding={resolvedBranding}
                        report={reportDetail}
                        templateId={selectedTemplate}
                        templateOverride={activeTemplate}
                        watermarkText={showFreeWatermark ? "Reporte creado con measurableapp.com" : undefined}
                      />
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
              <div className="group relative">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={REPORT_PDF_DOWNLOADS_LOCKED || pdfLoading || !reportId}
                  aria-disabled={REPORT_PDF_DOWNLOADS_LOCKED}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                    REPORT_PDF_DOWNLOADS_LOCKED
                      ? "border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7ed_100%)] text-slate-800 shadow-[0_14px_34px_rgba(245,158,11,0.10)]"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:bg-slate-100"
                  }`}
                >
                  {REPORT_PDF_DOWNLOADS_LOCKED ? (
                    <>
                      <span className="mr-2 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                        Locked
                      </span>
                      {messages.reports.downloadPdf}
                    </>
                  ) : pdfLoading ? (
                    messages.reports.exportingPdf
                  ) : (
                    messages.reports.downloadPdf
                  )}
                </button>
                {REPORT_PDF_DOWNLOADS_LOCKED ? (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                    {REPORT_PDF_LOCKED_TOOLTIP}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleShare}
                disabled={shareLoading || !reportId}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {shareLoading ? messages.common.generating : messages.common.share}
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
            <div className="group relative">
              <button
                type="button"
                onClick={handleDownload}
                disabled={REPORT_PDF_DOWNLOADS_LOCKED || pdfLoading || !reportId}
                aria-disabled={REPORT_PDF_DOWNLOADS_LOCKED}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  REPORT_PDF_DOWNLOADS_LOCKED
                    ? "border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7ed_100%)] text-slate-800 shadow-[0_14px_34px_rgba(245,158,11,0.10)]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:bg-slate-100"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                  <path d="M12 4.5v9M8.5 10l3.5 3.5 3.5-3.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.5 15.5v2a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {REPORT_PDF_DOWNLOADS_LOCKED ? (
                  <>
                    <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Locked
                    </span>
                    {messages.reports.downloadPdf}
                  </>
                ) : pdfLoading ? (
                  messages.reports.exportingPdf
                ) : (
                  messages.reports.downloadPdf
                )}
              </button>
              {REPORT_PDF_DOWNLOADS_LOCKED ? (
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  {REPORT_PDF_LOCKED_TOOLTIP}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleShare}
              disabled={shareLoading || !reportId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5 stroke-current">
                <path d="M14 5.5h4.5V10" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 5.5l-7.25 7.25" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 7.5H8.25A2.75 2.75 0 0 0 5.5 10.25v5.5a2.75 2.75 0 0 0 2.75 2.75h5.5a2.75 2.75 0 0 0 2.75-2.75V14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {shareLoading ? messages.common.generating : messages.common.share}
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
          <div className="-mx-4 -mt-4 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
            <section className="p-5 sm:p-8">
              <div className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
              </div>
            </section>
          </div>
        </AppShell>
      }
    >
      <NewReportFlowReviewPageContent />
    </Suspense>
  );
}
