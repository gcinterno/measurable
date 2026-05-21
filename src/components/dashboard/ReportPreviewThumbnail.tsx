"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { resolveReportBranding } from "@/lib/reports/branding";
import { getCoverThumbnailMeta, getCoverThumbnailSubtitle } from "@/lib/reports/cover-thumbnail";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
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
  const [templateId, setTemplateId] = useState<ReportTemplateId>("executive");
  const [containerWidth, setContainerWidth] = useState(0);
  const reportTimeframe: ReportDescriptionTimeframe | null =
    report.description?.timeframe || null;

  // LEGACY: this thumbnail still renders CoverSlide directly for dashboard cards.
  // Source of truth for branding resolution is resolveReportBranding() used by the 5-slide renderer.
  const resolvedBranding = useMemo(
    () =>
      resolveReportBranding(
        {
          id: report.id,
          branding: report.branding,
        },
        {
          branding: getReportBrandingSnapshot(report.id),
        }
      ),
    [report.branding, report.id]
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
    setTemplateId(getStoredReportTemplateSelection(report.id));
  }, [report.id]);

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
