"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ApiError } from "@/lib/api";
import { getPublicSharedReport } from "@/lib/api/reports";
import { resolveReportBranding } from "@/lib/reports/branding";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { PublicSharedReportActions } from "@/components/reports/PublicSharedReportActions";
import { SlideRenderer } from "@/components/reports/SlideRenderer";
import { SharedReportExpiredState } from "@/components/reports/SharedReportExpiredState";
import { formatMetaTimeframeDateRange } from "@/lib/integrations/timeframes";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";
import type { ReportTemplateId } from "@/lib/reports/template-selection";
import type { ReportDescription, ReportDetail, ReportVersionBlock } from "@/types/report";

type PublicSharedReportViewProps = {
  token: string;
  exportMode?: boolean;
};

const PDF_EXPORT_PAGE_WIDTH = 1600;
const PDF_EXPORT_PAGE_HEIGHT = 900;
const PDF_EXPORT_SCALE = PDF_EXPORT_PAGE_WIDTH / REPORT_SLIDE_THEME.slide.surfaceWidth;

type PublicSharedReportErrorVariant = "expired" | "not_found" | "generic";

function getPublicSharedReportErrorVariant(error: unknown): PublicSharedReportErrorVariant {
  if (error instanceof ApiError) {
    if (error.status === 410 || error.code === "share_link_expired") {
      return "expired";
    }

    if (error.status === 404 || error.code === "share_link_not_found") {
      return "not_found";
    }
  }

  return "generic";
}

function getReportTitle(blocks: ReportVersionBlock[], fallbackTitle?: string | null) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return titleBlock?.data.text || fallbackTitle?.trim() || "Shared report";
}

function normalizeTemplate(value: string | null | undefined) {
  const trimmed = value?.trim() || "";

  return trimmed;
}

function getBlockTemplateHint(block: ReportVersionBlock | undefined) {
  if (!block) {
    return null;
  }

  const data = block.data as Record<string, unknown>;
  const candidates = [
    data.template,
    data.templateId,
    data.visual_template,
    data.visualTemplate,
    data.cover_template,
    data.coverTemplate,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function PublicSharedReportView({ token, exportMode = false }: PublicSharedReportViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorVariant, setErrorVariant] = useState<PublicSharedReportErrorVariant | null>(null);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [blocks, setBlocks] = useState<ReportVersionBlock[]>([]);
  const [reportVersionDescription, setReportVersionDescription] =
    useState<ReportDescription | null>(null);
  const [reportLocale, setReportLocale] = useState<"en" | "es">("en");
  const [reportVersionBranding, setReportVersionBranding] = useState<{
    logoUrl?: string;
    brandName?: string;
    source?: string;
    brandNameSource?: string;
  } | null>(null);
  const [slidesRendered, setSlidesRendered] = useState(false);
  const [pdfSlideCount, setPdfSlideCount] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const cleanToken = useMemo(() => token.split("?")[0].split("#")[0].trim(), [token]);
  const templateFromQuery = searchParams.get("template");

  useEffect(() => {
    if (!exportMode) {
      return;
    }

    console.info("[PUBLIC_SHARE_DEBUG][route]", {
      rawParamsToken: token,
      cleanToken,
      exportMode,
      pathname,
      search: searchParams.toString(),
    });
  }, [cleanToken, exportMode, pathname, searchParams, token]);

  useEffect(() => {
    let active = true;

    async function loadSharedReport() {
      if (exportMode) {
        console.info("[PublicShareExport][fetch.start]", {
          token: cleanToken,
        });
      }

      try {
        setLoading(true);
        setErrorVariant(null);
        const response = await getPublicSharedReport(cleanToken);

        if (!active) {
          return;
        }

        setReportDetail(response.report);
        setBlocks(response.reportVersion.blocks);
        setReportVersionDescription(response.reportVersion.description || null);
        setReportLocale(response.reportVersion.locale === "es" ? "es" : "en");
        setReportVersionBranding(response.reportVersion.branding || null);

        if (exportMode) {
          console.info("[PublicShareExport][fetch.success]", {
            token: cleanToken,
            blocks: response.reportVersion.blocks.length,
            locale: response.reportVersion.locale,
          });
        }
      } catch (loadError) {
        if (!active) {
          return;
        }

        console.error("public shared report load error:", loadError);
        if (exportMode) {
          console.info("[PublicShareExport][fetch.error]", {
            token: cleanToken,
            error: loadError instanceof Error ? loadError.message : String(loadError),
          });
        }
        setErrorVariant(getPublicSharedReportErrorVariant(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSharedReport();

    return () => {
      active = false;
    };
  }, [cleanToken, exportMode]);

  const title = useMemo(
    () => reportDetail?.reportTitle || reportDetail?.title || getReportTitle(blocks, reportDetail?.title),
    [blocks, reportDetail?.reportTitle, reportDetail?.title]
  );
  const effectiveTemplate = useMemo(
    () =>
      normalizeTemplate(templateFromQuery) ||
      normalizeTemplate(reportDetail?.template) ||
      "executive",
    [reportDetail?.template, templateFromQuery]
  );
  const reportForRenderer = useMemo(() => {
    if (!reportDetail) {
      return null;
    }

    const resolvedLogoUrl =
      reportDetail.logoUrl ||
      reportDetail.branding?.logoUrl ||
      reportVersionBranding?.logoUrl ||
      null;
    const resolvedBrandName =
      reportDetail.brandName ||
      reportDetail.branding?.brandName ||
      reportVersionBranding?.brandName ||
      null;
    const reportTitle = reportDetail.reportTitle || reportDetail.title || title;
    const resolvedBranding = {
      logoUrl: resolvedLogoUrl,
      brandName: resolvedBrandName,
      source: reportDetail.branding?.source || reportVersionBranding?.source,
      brandNameSource:
        reportDetail.branding?.brandNameSource || reportVersionBranding?.brandNameSource,
    };

    return {
      ...reportDetail,
      id: reportDetail.id,
      title: reportTitle,
      reportTitle,
      report_title: reportTitle,
      workspaceId: reportDetail.workspaceId,
      workspace_id: reportDetail.workspaceId,
      integrationType: reportDetail.integrationType,
      integration_type: reportDetail.integrationType,
      integrationLabel: reportDetail.integrationLabel,
      integration_label: reportDetail.integrationLabel,
      sourceName: reportDetail.sourceName,
      source_name: reportDetail.sourceName,
      channel: reportDetail.channel,
      channel_name: reportDetail.channel,
      brandName: resolvedBrandName || reportDetail.brandName || undefined,
      brand_name: resolvedBrandName || reportDetail.brandName || undefined,
      logoUrl: resolvedLogoUrl || reportDetail.logoUrl || undefined,
      logo_url: resolvedLogoUrl || reportDetail.logoUrl || undefined,
      periodStart: reportDetail.periodStart,
      period_start: reportDetail.periodStart,
      periodEnd: reportDetail.periodEnd,
      period_end: reportDetail.periodEnd,
      template: effectiveTemplate,
      branding: resolvedBranding,
      report: {
        workspaceId: reportDetail.workspaceId || null,
        workspace_id: reportDetail.workspaceId || null,
        branding: resolvedBranding,
        logoUrl: resolvedLogoUrl || undefined,
        logo_url: resolvedLogoUrl || undefined,
        brandName: resolvedBrandName || undefined,
        brand_name: resolvedBrandName || undefined,
        integrationType: reportDetail.integrationType,
        integration_type: reportDetail.integrationType,
        integrationLabel: reportDetail.integrationLabel,
        integration_label: reportDetail.integrationLabel,
        sourceName: reportDetail.sourceName,
        source_name: reportDetail.sourceName,
        channel: reportDetail.channel,
        integrationMetadata: {
          integrationType: reportDetail.integrationType,
          integrationDisplayName: reportDetail.integrationLabel,
          sourceName: reportDetail.sourceName,
          channel: reportDetail.channel,
        },
        reportSources: reportDetail.reportSources,
        sourceSummary: reportDetail.sourceSummary,
        title: reportDetail.title,
        rawIntegrationHints: reportDetail.rawIntegrationHints,
      },
    } satisfies ReportDetail & {
      report?: Record<string, unknown>;
    };
  }, [effectiveTemplate, reportDetail, reportVersionBranding, title]);
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
  const resolvedBranding = useMemo(
    () =>
      resolveReportBranding(
        reportForRenderer
          ? ({
              ...reportForRenderer,
              workspaceId: reportForRenderer.workspaceId || null,
            } as unknown as Record<string, unknown>)
          : {
              id: reportDetail?.id || cleanToken,
              workspaceId: reportDetail?.workspaceId || null,
              branding: reportVersionBranding,
            }
      ),
    [cleanToken, reportDetail?.id, reportDetail?.workspaceId, reportForRenderer, reportVersionBranding]
  );

  useEffect(() => {
    if (!exportMode || !reportDetail) {
      return;
    }

    console.log("[PUBLIC_EXPORT_TEMPLATE_AUDIT]", {
      exportMode,
      token: cleanToken,
      templateFromQuery,
      reportTemplate: reportDetail?.template || reportForRenderer?.template || null,
      effectiveTemplate,
      blocksCount: blocks.length,
      firstBlockTemplate: getBlockTemplateHint(blocks[0]),
      firstSlideTemplate: effectiveTemplate,
      firstSlideType: "cover",
      pathname: typeof window === "undefined" ? pathname : window.location.pathname,
      search: typeof window === "undefined" ? searchParams.toString() : window.location.search,
    });
  }, [
    cleanToken,
    blocks,
    effectiveTemplate,
    exportMode,
    pathname,
    reportDetail,
    reportForRenderer?.template,
    searchParams,
    templateFromQuery,
  ]);
  const timeframeLabel =
    formatMetaTimeframeDateRange({
      since: viewModel.coverTimeframeSince || viewModel.timeframeSince,
      until: viewModel.coverTimeframeUntil || viewModel.timeframeUntil,
      locale: reportLocale,
    }) || viewModel.coverTimeframeLabel || viewModel.periodLabel;
  const readyCandidate =
    exportMode && !loading && !errorVariant && blocks.length > 0 && Boolean(reportDetail);
  const hasRenderableSlides = exportMode && pdfSlideCount > 0;
  const exportReady = !loading && !errorVariant && blocks.length > 0 && hasRenderableSlides;
  const dataPdfReady = exportMode && hasRenderableSlides ? "true" : undefined;
  const dataPdfError = exportMode && errorVariant ? "true" : undefined;

  useEffect(() => {
    if (!exportMode) {
      return;
    }

    const logoNode = rootRef.current?.querySelector<HTMLImageElement>('img[data-report-logo="true"]');
    const slideDomCount =
      typeof document === "undefined"
        ? 0
        : document.querySelectorAll("[data-report-slide='true'], [data-report-slide]").length;

    console.info("[PDF_EXPORT_FRONTEND][mode]", {
      exportMode,
      token: cleanToken,
      pageWidth: PDF_EXPORT_PAGE_WIDTH,
      pageHeight: PDF_EXPORT_PAGE_HEIGHT,
      zoom: PDF_EXPORT_SCALE,
    });

    console.info("[PDF_EXPORT_FRONTEND][slides.count]", {
      slidesFromData: blocks.length,
      slideDomCount,
      pdfSlideCount,
    });

    const rootRect = rootRef.current?.getBoundingClientRect();
    console.info("[PDF_EXPORT_FRONTEND][root]", {
      offsetWidth: rootRef.current?.offsetWidth ?? null,
      offsetHeight: rootRef.current?.offsetHeight ?? null,
      scrollWidth: rootRef.current?.scrollWidth ?? null,
      scrollHeight: rootRef.current?.scrollHeight ?? null,
      rectWidth: rootRect?.width ?? null,
      rectHeight: rootRect?.height ?? null,
    });

    console.info("[PDF_EXPORT_FRONTEND][cover.logo]", {
      logoUrl: resolvedBranding.logoUrl || null,
      logoLoaded: Boolean(logoNode && logoNode.complete && logoNode.naturalWidth > 0),
      logoFailed: Boolean(logoNode && logoNode.complete && logoNode.naturalWidth === 0),
    });

    console.info("[PDF_LAYOUT_AUDIT]", {
      reportId: reportDetail?.id || cleanToken,
      renderMode: exportMode ? "export" : "preview",
      viewportWidth: typeof window === "undefined" ? null : window.innerWidth,
      viewportHeight: typeof window === "undefined" ? null : window.innerHeight,
      bodyScrollWidth: typeof document === "undefined" ? null : document.body.scrollWidth,
      bodyScrollHeight: typeof document === "undefined" ? null : document.body.scrollHeight,
      pdfWidth: PDF_EXPORT_PAGE_WIDTH,
      pdfHeight: PDF_EXPORT_PAGE_HEIGHT,
      slideRootClientWidth: rootRef.current?.clientWidth ?? null,
      slideRootClientHeight: rootRef.current?.clientHeight ?? null,
      slideFrameWidth:
        rootRef.current?.querySelector<HTMLElement>("[data-pdf-slide-frame='true']")?.clientWidth ??
        null,
      slideFrameHeight:
        rootRef.current?.querySelector<HTMLElement>("[data-pdf-slide-frame='true']")?.clientHeight ??
        null,
      appliedScale: PDF_EXPORT_SCALE,
      hasWhiteBorderRisk:
        Boolean(rootRef.current?.clientWidth && rootRef.current.clientWidth < PDF_EXPORT_PAGE_WIDTH) ||
        Boolean(rootRef.current?.clientHeight && rootRef.current.clientHeight < PDF_EXPORT_PAGE_HEIGHT),
      coverLogoUrl: resolvedBranding.logoUrl || null,
      coverLogoLoaded: Boolean(logoNode && logoNode.complete && logoNode.naturalWidth > 0),
    });

    console.info("[PDF_EXPORT_FRONTEND][ready]", {
      exportReady,
      dataPdfReady,
      dataPdfError,
      hasReport: Boolean(reportDetail),
      hasSlides: blocks.length > 0,
      slideDomCount,
    });

    console.info("[PDF_EXPORT_FRONTEND][page.size]", {
      pageWidth: PDF_EXPORT_PAGE_WIDTH,
      pageHeight: PDF_EXPORT_PAGE_HEIGHT,
      slideWidth: REPORT_SLIDE_THEME.slide.width,
      slideHeight: REPORT_SLIDE_THEME.slide.height,
      zoom: PDF_EXPORT_SCALE,
    });

    console.info("[PublicShareExport][mode]", {
      token,
      exportMode,
    });

    window.requestAnimationFrame(() => {
      const pageNodes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-pdf-page="true"]')
      );

      console.info("[PDF_EXPORT_FRONTEND][slide.rects]", {
        pages: pageNodes.map((page, index) => ({
          index,
          offsetWidth: page.offsetWidth,
          offsetHeight: page.offsetHeight,
          scrollWidth: page.scrollWidth,
          scrollHeight: page.scrollHeight,
        })),
      });

      if (exportReady && typeof window !== "undefined") {
        const firstSlide = pageNodes[0] || null;
        const exportWindow = window as Window & { __MEASURABLE_EXPORT_READY__?: boolean };

        exportWindow.__MEASURABLE_EXPORT_READY__ = true;
        console.info("[PDF_EXPORT_DOM_READY]", {
          slideCount: pageNodes.length,
          template: reportDetail?.template || "default",
          reportId: reportDetail?.id || cleanToken,
          firstSlideRect: firstSlide
            ? (() => {
                const rect = firstSlide.getBoundingClientRect();

                return {
                  width: rect.width,
                  height: rect.height,
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  bottom: rect.bottom,
                };
              })()
            : null,
          allSlideRects: pageNodes.map((page, index) => {
            const rect = page.getBoundingClientRect();

            return {
              index,
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
            };
          }),
          exportMode,
        });
      }
    });
  }, [
    blocks.length,
    cleanToken,
    dataPdfError,
    dataPdfReady,
    exportMode,
    exportReady,
    pdfSlideCount,
    reportDetail,
    resolvedBranding.logoUrl,
    token,
  ]);

  useEffect(() => {
    if (!exportMode || !exportReady) {
      return;
    }

    console.info("[PublicShareExport][ready]", {
      token: cleanToken,
      blocks: blocks.length,
      reportId: reportDetail?.id || cleanToken,
    });
  }, [blocks.length, cleanToken, exportMode, exportReady, reportDetail?.id]);

  useEffect(() => {
    if (!exportMode) {
      return;
    }

    console.log("[PDF_READY_DEBUG][public-share]", {
      isPdfExport: exportMode,
      hasReport: Boolean(reportDetail),
      slidesCount: blocks.length,
      reportSlideDomCount:
        typeof document === "undefined"
          ? 0
          : document.querySelectorAll("[data-report-slide]").length,
      bodyReady:
        typeof document === "undefined"
          ? null
          : document.body.getAttribute("data-pdf-ready"),
      rootReady:
        typeof document === "undefined"
          ? false
          : document.querySelector("[data-pdf-ready='true']") !== null,
      pdfReady:
        typeof document === "undefined"
          ? false
          : document.querySelector("[data-pdf-ready='true']") !== null,
      pdfError:
        typeof document === "undefined"
          ? false
          : document.querySelector("[data-pdf-error='true']") !== null,
      url: typeof window === "undefined" ? "" : window.location.href,
    });
  }, [blocks.length, errorVariant, exportMode, reportDetail, slidesRendered]);

  useEffect(() => {
    if (!exportMode) {
      return;
    }

    console.log("[PDF_READY_DEBUG][dom-marker]", {
      dataPdfReady,
      dataPdfError,
    });
  }, [dataPdfError, dataPdfReady, exportMode]);

  useEffect(() => {
    if (!exportMode || !errorVariant) {
      return;
    }

    console.log("[PDF_READY_DEBUG][error]", {
      errorVariant,
      bodyError:
        typeof document === "undefined" ? null : document.body.getAttribute("data-pdf-error"),
      bodyErrorReason:
        typeof document === "undefined"
          ? null
          : document.body.getAttribute("data-pdf-error-reason"),
    });
  }, [errorVariant, exportMode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!exportMode) {
      delete document.body.dataset.pdfReady;
      delete document.body.dataset.pdfSlideCount;
      delete document.body.dataset.pdfError;
      delete document.body.dataset.pdfErrorReason;
      delete document.body.dataset.publicShareExportMode;
      document.body.removeAttribute("data-pdf-ready");
      document.body.removeAttribute("data-pdf-slide-count");
      document.body.removeAttribute("data-pdf-error");
      document.body.removeAttribute("data-pdf-error-reason");
      document.body.removeAttribute("data-public-share-export-mode");
      return;
    }

    document.body.dataset.publicShareExportMode = "true";
    document.body.setAttribute("data-public-share-export-mode", "true");

    if (errorVariant) {
      document.body.dataset.pdfError = "true";
      document.body.dataset.pdfErrorReason = "public_report_load_failed";
      document.body.setAttribute("data-pdf-error", "true");
      document.body.setAttribute("data-pdf-error-reason", "public_report_load_failed");
      delete document.body.dataset.pdfReady;
      delete document.body.dataset.pdfSlideCount;
      document.body.removeAttribute("data-pdf-ready");
      document.body.removeAttribute("data-pdf-slide-count");
      return;
    }

    if (slidesRendered && pdfSlideCount > 0) {
      document.body.dataset.pdfReady = "true";
      document.body.dataset.pdfSlideCount = String(pdfSlideCount);
      delete document.body.dataset.pdfError;
      delete document.body.dataset.pdfErrorReason;
      document.body.setAttribute("data-pdf-ready", "true");
      document.body.setAttribute("data-pdf-slide-count", String(pdfSlideCount));
      document.body.removeAttribute("data-pdf-error");
      document.body.removeAttribute("data-pdf-error-reason");
      return;
    }

    delete document.body.dataset.pdfReady;
    delete document.body.dataset.pdfSlideCount;
    delete document.body.dataset.pdfError;
    delete document.body.dataset.pdfErrorReason;
    document.body.removeAttribute("data-pdf-ready");
    document.body.removeAttribute("data-pdf-slide-count");
    document.body.removeAttribute("data-pdf-error");
    document.body.removeAttribute("data-pdf-error-reason");
  }, [errorVariant, exportMode, pdfSlideCount, slidesRendered]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!exportMode) {
      delete (window as Window & { __MEASURABLE_EXPORT_READY__?: boolean })
        .__MEASURABLE_EXPORT_READY__;
      return;
    }

    (window as Window & { __MEASURABLE_EXPORT_READY__?: boolean }).__MEASURABLE_EXPORT_READY__ =
      Boolean(exportReady);

    return () => {
      delete (window as Window & { __MEASURABLE_EXPORT_READY__?: boolean })
        .__MEASURABLE_EXPORT_READY__;
    };
  }, [exportMode, exportReady]);

  useEffect(() => {
    if (!exportMode) {
      return;
    }

    if (loading || errorVariant || blocks.length === 0) {
      setSlidesRendered(false);
      setPdfSlideCount(0);
      return;
    }

    let active = true;
    let resolved = false;
    const readyTimeout = window.setTimeout(() => {
      if (!active || resolved) {
        return;
      }

      const slideCount = rootRef.current?.querySelectorAll("[data-report-slide]").length || 0;
      const logoNode = rootRef.current?.querySelector<HTMLImageElement>('img[data-report-logo="true"]');
      const logoLoaded = Boolean(logoNode && logoNode.complete && logoNode.naturalWidth > 0);

      console.warn("[PDF_READY_DEBUG][public-share]", {
        exportMode,
        hasReport: Boolean(reportDetail),
        blocksCount: blocks.length,
        hasError: Boolean(errorVariant),
        readyCandidate,
        slideCount,
        logoLoaded,
        fallback: "timeout",
      });

      if (slideCount > 0) {
        setPdfSlideCount(slideCount);
        resolved = true;
        setSlidesRendered(true);
      }
    }, 1500);

    const measureReady = () => {
      if (!active || resolved) {
        return;
      }

      const slideCount = rootRef.current?.querySelectorAll("[data-report-slide]").length || 0;
      const logoNode = rootRef.current?.querySelector<HTMLImageElement>('img[data-report-logo="true"]');
      const logoLoaded = Boolean(logoNode && logoNode.complete && logoNode.naturalWidth > 0);
      setPdfSlideCount(slideCount);

      if (slideCount > 0 && logoLoaded) {
        resolved = true;
        setSlidesRendered(true);
        window.clearTimeout(readyTimeout);
        return;
      }

      window.requestAnimationFrame(measureReady);
    };

    window.requestAnimationFrame(measureReady);

    return () => {
      active = false;
      resolved = true;
      window.clearTimeout(readyTimeout);
    };
  }, [blocks.length, errorVariant, exportMode, loading, readyCandidate, reportDetail]);

  if (loading) {
    if (exportMode) {
      return (
        <div
          className="public-share-pdf-mode min-h-screen bg-white"
          style={{ visibility: "hidden" }}
        />
      );
    }

    return (
      <section className="mx-auto max-w-[1180px] space-y-4 px-4 py-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-full bg-slate-200" />
        <div className="h-5 w-72 animate-pulse rounded-full bg-slate-100" />
        <div className="h-[420px] animate-pulse rounded-[32px] bg-slate-100" />
      </section>
    );
  }

  if (errorVariant || !reportDetail || blocks.length === 0) {
    const variant = errorVariant ?? "generic";

    if (exportMode) {
      return (
        <div
          className="public-share-pdf-mode min-h-screen bg-white"
          data-pdf-error="true"
          style={{ visibility: "visible" }}
        >
          <div style={{ display: "none" }} data-pdf-error="true" />
          <SharedReportExpiredState variant={variant} exportMode />
        </div>
      );
    }

    return <SharedReportExpiredState variant={variant} />;
  }

    if (exportMode) {
      return (
        <>
          <style jsx global>{`
          @page {
            size: ${PDF_EXPORT_PAGE_WIDTH}px ${PDF_EXPORT_PAGE_HEIGHT}px;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            width: ${PDF_EXPORT_PAGE_WIDTH}px !important;
            min-width: ${PDF_EXPORT_PAGE_WIDTH}px !important;
            max-width: ${PDF_EXPORT_PAGE_WIDTH}px !important;
            height: auto !important;
            min-height: 100% !important;
            background: #ffffff;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .public-share-pdf-mode {
            --report-pdf-slide-width: ${PDF_EXPORT_PAGE_WIDTH}px;
            --report-pdf-slide-height: ${PDF_EXPORT_PAGE_HEIGHT}px;
            --report-pdf-content-width: ${REPORT_SLIDE_THEME.slide.surfaceWidth}px;
            --report-pdf-content-height: ${REPORT_SLIDE_THEME.slide.surfaceHeight}px;
            width: var(--report-pdf-slide-width) !important;
            height: auto !important;
            min-width: var(--report-pdf-slide-width) !important;
            max-width: var(--report-pdf-slide-width) !important;
            min-height: var(--report-pdf-slide-height) !important;
            max-height: none !important;
            margin: 0;
            padding: 0;
            background: #ffffff;
            overflow: visible;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            zoom: 1 !important;
            transform: none !important;
            transform-origin: top left;
            filter: none !important;
            backdrop-filter: none !important;
            animation: none !important;
            transition: none !important;
          }

          .public-share-pdf-mode [data-report-slide],
          .public-share-pdf-mode [data-pdf-page] {
            box-sizing: border-box;
            display: block !important;
            width: var(--report-pdf-slide-width) !important;
            min-width: var(--report-pdf-slide-width) !important;
            max-width: var(--report-pdf-slide-width) !important;
            height: var(--report-pdf-slide-height) !important;
            min-height: var(--report-pdf-slide-height) !important;
            max-height: var(--report-pdf-slide-height) !important;
            margin: 0;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page !important;
            page-break-after: always !important;
            overflow: hidden !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
            scale: none !important;
            filter: none !important;
            backdrop-filter: none !important;
            animation: none !important;
            transition: none !important;
          }

          .public-share-pdf-mode [data-report-slide]:last-child,
          .public-share-pdf-mode [data-pdf-page]:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .public-share-pdf-mode [data-pdf-slide-frame="true"] {
            box-sizing: border-box !important;
            width: var(--report-pdf-content-width) !important;
            min-width: var(--report-pdf-content-width) !important;
            max-width: var(--report-pdf-content-width) !important;
            height: var(--report-pdf-content-height) !important;
            min-height: var(--report-pdf-content-height) !important;
            max-height: var(--report-pdf-content-height) !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            transform-origin: top left !important;
            transform: none !important;
            zoom: ${PDF_EXPORT_SCALE};
          }

          .public-share-pdf-mode [data-report-slide] > div:not([data-pdf-slide-frame="true"]),
          .public-share-pdf-mode [data-pdf-page] > div:not([data-pdf-slide-frame="true"]) {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .public-share-pdf-mode *,
          .public-share-pdf-mode *::before,
          .public-share-pdf-mode *::after {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            text-rendering: geometricPrecision;
            box-shadow: none;
            text-shadow: none;
            animation: none !important;
            transition: none !important;
          }

          .public-share-pdf-mode [data-pdf-hidden="true"],
          .public-share-pdf-mode [data-floating-actions],
          .public-share-pdf-mode [data-shared-actions],
          .public-share-pdf-mode [data-floating-widget],
          .public-share-pdf-mode [data-chat-widget],
          .public-share-pdf-mode [data-assistant-widget],
          .public-share-pdf-mode [data-nextjs-toast],
          .public-share-pdf-mode [data-nextjs-dialog],
          .public-share-pdf-mode [data-nextjs-dev-tools],
          .public-share-pdf-mode [data-nextjs-dev-tools-indicator],
          .public-share-pdf-mode [data-next-badge],
          .public-share-pdf-mode #__next-build-watcher,
          .public-share-pdf-mode #nextjs-build-watcher,
          .public-share-pdf-mode .nextjs-portal,
          .public-share-pdf-mode nextjs-portal,
          body[data-public-share-export-mode="true"] > *:not(main.public-share-pdf-mode),
          body[data-public-share-export-mode="true"] [style*="position: fixed"],
          body[data-public-share-export-mode="true"] [style*="position:fixed"],
          body[data-public-share-export-mode="true"] [class*="nextjs"],
          body[data-public-share-export-mode="true"] [id*="nextjs"],
          body[data-public-share-export-mode="true"] [class*="devtools"],
          .public-share-pdf-mode nav,
          .public-share-pdf-mode aside,
          .public-share-pdf-mode header {
            display: none !important;
          }

          @media print {
            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            [data-report-slide] {
              width: ${REPORT_SLIDE_THEME.slide.width}px !important;
              height: ${REPORT_SLIDE_THEME.slide.height}px !important;
              break-after: page;
              page-break-after: always;
              overflow: hidden !important;
              box-shadow: none !important;
              transform: none !important;
              filter: none !important;
              backdrop-filter: none !important;
              animation: none !important;
              transition: none !important;
            }

            [data-pdf-hidden="true"],
            [data-floating-actions],
            [data-shared-actions],
            [data-floating-widget],
            [data-chat-widget],
            [data-assistant-widget],
            [data-nextjs-toast],
            [data-nextjs-dialog],
            [data-nextjs-dev-tools],
            [data-nextjs-dev-tools-indicator],
            [data-next-badge],
            #__next-build-watcher,
            #nextjs-build-watcher,
            .nextjs-portal,
            nextjs-portal,
            body[data-public-share-export-mode="true"] > *:not(main.public-share-pdf-mode),
            body[data-public-share-export-mode="true"] [style*="position: fixed"],
            body[data-public-share-export-mode="true"] [style*="position:fixed"],
            body[data-public-share-export-mode="true"] [class*="nextjs"],
            body[data-public-share-export-mode="true"] [id*="nextjs"],
            body[data-public-share-export-mode="true"] [class*="devtools"],
            nav,
            aside,
            header {
              display: none !important;
            }
          }
          `}</style>

          <main
            ref={rootRef}
            className="public-share-pdf-mode"
            data-public-share-export-mode={exportMode ? "true" : undefined}
            data-pdf-ready={dataPdfReady}
            data-pdf-error={dataPdfError}
            data-pdf-slide-count={exportMode ? pdfSlideCount : undefined}
            style={{
              visibility: exportReady ? "visible" : "hidden",
              width: `${PDF_EXPORT_PAGE_WIDTH}px`,
              minHeight: `${PDF_EXPORT_PAGE_HEIGHT}px`,
              height: "auto",
              overflow: "visible",
            }}
          >
            <SlideRenderer
              reportId={reportDetail.id}
              model={viewModel}
              renderMode="export"
              blocks={blocks}
              locale={reportLocale}
              branding={resolvedBranding}
              report={reportForRenderer}
              templateId={effectiveTemplate as ReportTemplateId}
              templateOverride={effectiveTemplate}
              watermarkText={undefined}
            />
            <div style={{ display: "none" }} data-pdf-ready={dataPdfReady} />
            {dataPdfError ? <div style={{ display: "none" }} data-pdf-error={dataPdfError} /> : null}
          </main>
        </>
      );
    }

  return (
    <div className="min-h-screen bg-[#f3f6fb]">
      <header className="border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/brand/measurable-logo.svg" alt="Measurable" className="h-9 w-auto" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Shared Report
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        <section className="mb-6 rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          {timeframeLabel ? (
            <p className="mt-3 text-sm text-slate-500">Period: {timeframeLabel}</p>
          ) : null}
        </section>

        <div className="overflow-hidden rounded-[40px] bg-[#eef3f8] px-4 py-5">
          <SlideRenderer
            reportId={reportDetail.id}
            model={viewModel}
            blocks={blocks}
            locale={reportLocale}
            branding={resolvedBranding}
            report={reportForRenderer}
            templateId={effectiveTemplate as ReportTemplateId}
            templateOverride={effectiveTemplate}
          />
        </div>
      </main>
      <PublicSharedReportActions
        token={token}
        isPdfExport={exportMode}
        template={effectiveTemplate}
      />
    </div>
  );
}
