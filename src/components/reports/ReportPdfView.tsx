"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { SlideRenderer } from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import {
  fetchReportDetail,
  fetchReportVersions,
  fetchReportVersionView,
} from "@/lib/api/reports";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";
import type {
  ReportDescription,
  ReportDetail,
  ReportLocale,
  ReportVersionBlock,
} from "@/types/report";

type ReportPdfViewProps = {
  reportId: string;
  exportAuthToken?: string;
};

type ReportVersionCandidate = {
  id: string;
  version: string;
  createdAt: string;
};

const EXPORT_SLIDE_WIDTH = REPORT_SLIDE_THEME.slide.width;
const EXPORT_SLIDE_HEIGHT = REPORT_SLIDE_THEME.slide.height;

function getLatestReportVersionId(versions: ReportVersionCandidate[]) {
  const latestVersion =
    [...versions].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return Number(right.id) - Number(left.id);
    })[0] || null;

  return latestVersion?.id || latestVersion?.version || "1";
}

function LoadingState() {
  return (
    <div className="report-pdf-mode min-h-screen bg-[#07111f] px-0 py-0">
      <div className="mx-auto w-[1160px] space-y-0">
        {Array.from({ length: 5 }).map((_, index) => (
          <section
            key={index}
            className="bg-[#07111f]"
          >
            <div className="mx-auto h-[670px] w-[1160px] max-w-none bg-[#07111f]" />
          </section>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="report-pdf-mode flex min-h-screen items-center justify-center bg-[#eef3f8] px-8 py-12">
      <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
          Export
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Report export unavailable
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export function ReportPdfView({ reportId, exportAuthToken }: ReportPdfViewProps) {
  const [blocks, setBlocks] = useState<ReportVersionBlock[]>([]);
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [reportVersionDescription, setReportVersionDescription] =
    useState<ReportDescription | null>(null);
  const [reportLocale, setReportLocale] = useState<ReportLocale>("en");
  const [reportVersionBranding, setReportVersionBranding] = useState<{
    logoUrl?: string;
    source?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const [slidesRendered, setSlidesRendered] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    console.log("export page mounted", {
      reportId,
      hasExportAuthToken: Boolean(exportAuthToken),
    });
  }, [exportAuthToken, reportId]);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");
        console.log("export report fetch started", { reportId });

        const versions = await fetchReportVersions(reportId, {
          authToken: exportAuthToken,
        }).catch((error) => {
          console.warn("[MetaTimeframe][render.pdf] versions list failed", {
            reportId,
            error: error instanceof Error ? error.message : String(error),
          });

          return [];
        });
        const versionId = getLatestReportVersionId(versions);
        const [data, detail] = await Promise.all([
          fetchReportVersionView(reportId, versionId, {
            authToken: exportAuthToken,
          }),
          fetchReportDetail(reportId, {
            authToken: exportAuthToken,
          }),
        ]);

        if (!active) {
          return;
        }

        setBlocks(data.blocks);
        setReportLocale(data.locale);
        setReportVersionDescription(data.description || null);
        setReportVersionBranding(data.branding || null);
        setReportDetail(detail);
        const resolvedLogoUrl = data.branding?.logoUrl || detail?.branding?.logoUrl || null;
        console.log("export report fetch success", {
          reportId,
          blocks: data.blocks.length,
          locale: data.locale,
          hasLogo: Boolean(resolvedLogoUrl),
        });
      } catch (err: unknown) {
        console.error("report pdf view load error:", err);

        if (!active) {
          return;
        }

        console.log("export report fetch failure", {
          reportId,
          error: err instanceof Error ? err.message : String(err),
        });
        setError("The report could not be loaded for export.");
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
  }, [exportAuthToken, reportId]);

  useEffect(() => {
    let active = true;

    async function waitForFonts() {
      if (typeof document === "undefined") {
        return;
      }

      try {
        await document.fonts.ready;
      } catch {
        // Ignore font readiness errors and proceed with current browser state.
      }

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));

      if (active) {
        setFontsReady(true);
      }
    }

    void waitForFonts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (loading || error || blocks.length === 0 || !fontsReady) {
      setSlidesRendered(false);
      return () => {
        active = false;
      };
    }

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        const thirdFrame = window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            if (!active) {
              return;
            }

            const slideCount = rootRef.current?.querySelectorAll("[data-report-slide]").length || 0;
            const svgCount = rootRef.current?.querySelectorAll("svg").length || 0;
            const logos = Array.from(
              rootRef.current?.querySelectorAll<HTMLImageElement>('img[data-report-logo="true"]') ?? []
            );
            const logosReady = logos.every((image) => image.complete && image.naturalWidth > 0);
            const firstSlide = rootRef.current?.querySelector<HTMLElement>("[data-report-slide]");
            const firstSlideRect = firstSlide?.getBoundingClientRect();
            const slideWidthReady = firstSlideRect
              ? Math.abs(firstSlideRect.width - EXPORT_SLIDE_WIDTH) < 1
              : false;
            const slideHeightReady = firstSlideRect
              ? Math.abs(firstSlideRect.height - EXPORT_SLIDE_HEIGHT) < 1
              : false;

            if (
              slideCount === 5 &&
              svgCount > 0 &&
              slideWidthReady &&
              slideHeightReady &&
              logosReady
            ) {
              setSlidesRendered(true);
            }
          }, 80);
        });

        return () => window.cancelAnimationFrame(thirdFrame);
      });

      return () => window.cancelAnimationFrame(secondFrame);
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(firstFrame);
    };
  }, [blocks.length, error, fontsReady, loading, reportDetail?.logoUrl]);

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
    console.info("[MetaTimeframe][render.pdf]", {
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
  const resolvedBranding = useMemo(
    () =>
      resolveReportBranding(
        reportVersionBranding,
        reportDetail?.branding,
        getReportBrandingSnapshot(reportId)
      ),
    [reportDetail?.branding, reportId, reportVersionBranding]
  );
  const exportReady =
    !loading &&
    !error &&
    blocks.length > 0 &&
    fontsReady &&
    slidesRendered;

  if (loading) {
    return <LoadingState />;
  }

  if (error || blocks.length === 0) {
    return <ErrorState message={error || "No report blocks are available for export."} />;
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: ${EXPORT_SLIDE_WIDTH}px ${EXPORT_SLIDE_HEIGHT}px;
          margin: 0;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: ${EXPORT_SLIDE_WIDTH}px;
          height: auto;
          min-width: ${EXPORT_SLIDE_WIDTH}px;
          max-width: ${EXPORT_SLIDE_WIDTH}px;
          background: #07111f;
          overflow: visible !important;
        }

        .report-pdf-mode {
          --report-pdf-slide-width: ${EXPORT_SLIDE_WIDTH}px;
          --report-pdf-slide-height: ${EXPORT_SLIDE_HEIGHT}px;
          width: var(--report-pdf-slide-width);
          min-width: var(--report-pdf-slide-width);
          max-width: var(--report-pdf-slide-width);
          margin: 0;
          padding: 0;
          background: #07111f;
          color: #0f172a;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          overflow: visible;
          display: block;
        }

        .report-pdf-root {
          width: var(--report-pdf-slide-width);
          min-width: var(--report-pdf-slide-width);
          max-width: var(--report-pdf-slide-width);
          margin: 0;
          padding: 0;
          overflow: visible;
          display: block;
          background: #07111f;
        }

        .report-pdf-mode [data-report-slide] {
          box-sizing: border-box;
          display: block;
          width: var(--report-pdf-slide-width);
          min-width: var(--report-pdf-slide-width);
          max-width: var(--report-pdf-slide-width);
          height: var(--report-pdf-slide-height);
          min-height: var(--report-pdf-slide-height);
          max-height: var(--report-pdf-slide-height);
          margin: 0;
          break-inside: avoid;
          page-break-inside: avoid;
          break-after: page;
          page-break-after: always;
          overflow: hidden;
          border-radius: 0;
          border: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          background: #07111f !important;
          transform: none !important;
          page-break-before: auto;
          break-before: auto;
        }

        .report-pdf-mode [data-report-slide]:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .report-pdf-mode [data-report-slide] > div {
          width: var(--report-pdf-slide-width) !important;
          min-width: var(--report-pdf-slide-width) !important;
          max-width: var(--report-pdf-slide-width) !important;
          height: var(--report-pdf-slide-height) !important;
          min-height: var(--report-pdf-slide-height) !important;
          max-height: var(--report-pdf-slide-height) !important;
          margin: 0 !important;
          border-radius: 0 !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .report-pdf-mode .export-slides {
          width: var(--report-pdf-slide-width);
          min-width: var(--report-pdf-slide-width);
          max-width: var(--report-pdf-slide-width);
          margin: 0;
          padding: 0;
          overflow: visible;
          display: block;
        }

        .report-pdf-mode .report-pdf-root > [data-report-slide] + [data-report-slide] {
          margin-top: 0 !important;
        }

        .report-pdf-mode,
        .report-pdf-mode *,
        .report-pdf-mode *::before,
        .report-pdf-mode *::after {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          forced-color-adjust: none;
          font-synthesis: none;
          text-rendering: geometricPrecision;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        @media print {
          html,
          body {
            width: var(--report-pdf-slide-width);
            min-width: var(--report-pdf-slide-width);
            max-width: var(--report-pdf-slide-width);
            margin: 0 !important;
            padding: 0 !important;
            background: #07111f;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .report-pdf-mode {
            width: var(--report-pdf-slide-width);
            min-width: var(--report-pdf-slide-width);
            max-width: var(--report-pdf-slide-width);
            padding: 0;
            margin: 0;
            background: #07111f;
          }

          .report-pdf-mode .export-slides,
          .report-pdf-mode .report-pdf-root {
            width: var(--report-pdf-slide-width);
            min-width: var(--report-pdf-slide-width);
            max-width: var(--report-pdf-slide-width);
            margin: 0;
            padding: 0;
          }

          .report-pdf-mode [data-report-slide] {
            margin: 0 !important;
            transform: none !important;
          }
        }
      `}</style>

      <main
        ref={rootRef}
        className="report-pdf-mode"
        data-report-export-ready={exportReady ? "true" : "false"}
        data-report-locale={reportLocale}
      >
        <div className="export-slides">
          <SlideRenderer
            model={viewModel}
            renderMode="export"
            branding={resolvedBranding}
          />
        </div>
      </main>
    </>
  );
}
