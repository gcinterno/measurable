"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { MEASURABLE_BRAND_LOGO_URL } from "@/lib/branding";
import { fetchReportDetail } from "@/lib/api/reports";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getCoverThumbnailMeta, getCoverThumbnailSubtitle } from "@/lib/reports/cover-thumbnail";
import {
  getReportBrandingSnapshot,
  saveReportBrandingSnapshot,
} from "@/lib/reports/branding-snapshots";
import {
  getStoredReportTemplateSelection,
  type ReportTemplateId,
} from "@/lib/reports/template-selection";
import { REPORT_SLIDE_THEME } from "@/lib/reports/theme";
import type { Report, ReportDescriptionTimeframe } from "@/types/report";

type ReportPreviewThumbnailProps = {
  report: Report;
};

const THUMBNAIL_WIDTH = REPORT_SLIDE_THEME.slide.width;
const THUMBNAIL_HEIGHT = REPORT_SLIDE_THEME.slide.height;

export function ReportPreviewThumbnail({ report }: ReportPreviewThumbnailProps) {
  const { language } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [brandingOverride, setBrandingOverride] = useState<Report["branding"] | null>(null);
  const reportTimeframe: ReportDescriptionTimeframe | null =
    report.description?.timeframe || null;
  const brandingSnapshot = useMemo(() => getReportBrandingSnapshot(report.id), [report.id]);
  const templateId = useMemo<ReportTemplateId>(
    () => getStoredReportTemplateSelection(report.id),
    [report.id]
  );

  // LEGACY: this thumbnail still renders CoverSlide directly for dashboard cards.
  // Source of truth for branding resolution is resolveReportBranding() used by the 5-slide renderer.
  const resolvedBranding = useMemo(
    () =>
      resolveReportBranding(
        {
          id: report.id,
          branding: brandingOverride || report.branding,
        },
        {
          branding: brandingSnapshot,
        }
      ),
    [brandingOverride, brandingSnapshot, report.branding, report.id]
  );
  const slideModel = useMemo(
    () => ({
      reportTitle: report.title,
      subtitle: getCoverThumbnailSubtitle(language),
      meta: getCoverThumbnailMeta(language, reportTimeframe),
      branding: {
        logoUrl: resolvedBranding.logoUrl || null,
        brandName: resolvedBranding.brandName,
      },
    }),
    [language, report.title, reportTimeframe, resolvedBranding]
  );
  const slideScale = containerWidth > 0 ? containerWidth / THUMBNAIL_WIDTH : 0;

  useEffect(() => {
    if (
      brandingOverride ||
      report.branding?.logoUrl ||
      brandingSnapshot?.logoUrl ||
      resolvedBranding.logoUrl !== MEASURABLE_BRAND_LOGO_URL
    ) {
      return;
    }

    let active = true;

    async function loadBrandingFromDetail() {
      try {
        const detail = await fetchReportDetail(report.id);

        if (!active || !detail?.branding?.logoUrl) {
          return;
        }

        setBrandingOverride(detail.branding);
        saveReportBrandingSnapshot(report.id, {
          logoUrl: detail.branding.logoUrl,
          source: detail.branding.source || "reportDetail.branding.logoUrl",
        });
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("report preview branding fallback error:", {
          reportId: report.id,
          error,
        });
      }
    }

    void loadBrandingFromDetail();

    return () => {
      active = false;
    };
  }, [
    brandingOverride,
    brandingSnapshot?.logoUrl,
    report.branding?.logoUrl,
    report.id,
    resolvedBranding.logoUrl,
  ]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[1160/670] overflow-hidden rounded-[24px] border border-slate-200 bg-[#eef3f8] shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
    >
      {slideScale > 0 ? (
        <div className="absolute inset-0 overflow-hidden">
          <div
            style={{
              width: THUMBNAIL_WIDTH,
              height: THUMBNAIL_HEIGHT,
              transform: `scale(${slideScale})`,
              transformOrigin: "top left",
            }}
          >
            <CoverSlide
              slideId={`thumbnail-${report.id}`}
              eyebrow=""
              title=""
              renderMode="preview"
              templateId={templateId}
              model={slideModel}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
