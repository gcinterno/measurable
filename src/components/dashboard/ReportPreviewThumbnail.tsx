"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { fetchReportDetail } from "@/lib/api/reports";
import { getCoverThumbnailMeta, getCoverThumbnailSubtitle, getCoverThumbnailTitle } from "@/lib/reports/cover-thumbnail";
import { getReportBrandingSnapshot } from "@/lib/reports/branding-snapshots";
import { getLogoContentAspectRatio } from "@/lib/reports/logo";
import type { Report, ReportDescriptionTimeframe } from "@/types/report";

type ReportPreviewThumbnailProps = {
  report: Report;
};

export function ReportPreviewThumbnail({ report }: ReportPreviewThumbnailProps) {
  const { language, messages } = useI18n();
  const [detailLogoUrl, setDetailLogoUrl] = useState<string | null>(null);
  const [detailTimeframe, setDetailTimeframe] =
    useState<ReportDescriptionTimeframe | null>(null);
  const [logoRatio, setLogoRatio] = useState(1);
  const resolvedLogoUrl = useMemo(
    () =>
      report.branding?.logoUrl?.trim() ||
      detailLogoUrl?.trim() ||
      getReportBrandingSnapshot(report.id)?.logoUrl?.trim() ||
      "",
    [detailLogoUrl, report.branding?.logoUrl, report.id]
  );

  useEffect(() => {
    let active = true;

    async function loadReportBranding() {
      if (report.branding?.logoUrl?.trim() && detailTimeframe) {
        return;
      }

      try {
        const detail = await fetchReportDetail(report.id);

        if (!active) {
          return;
        }

        setDetailLogoUrl(detail?.branding?.logoUrl?.trim() || null);
        setDetailTimeframe(detail?.description?.timeframe || null);
      } catch {
        if (!active) {
          return;
        }

        setDetailLogoUrl(null);
        setDetailTimeframe(null);
      }
    }

    void loadReportBranding();

    return () => {
      active = false;
    };
  }, [detailTimeframe, report.branding?.logoUrl, report.id]);

  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-slate-200 bg-[#07111f] shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
      <div className="relative h-full overflow-hidden bg-[linear-gradient(90deg,#0b1220_0%,#0b1220_54%,#1a2433_54%,#1a2433_100%)] p-4 text-white">
        <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-white/85" />
          <span className="h-1.5 w-2 rounded-full bg-white/35" />
          <span className="h-1.5 w-2 rounded-full bg-white/35" />
          <span className="h-1.5 w-2 rounded-full bg-white/35" />
        </div>

        <div className="relative z-10 flex h-full">
          <div className="flex w-[55%] flex-col justify-center pr-4">
            <h4 className="max-w-none text-[1.02rem] font-semibold leading-[0.9] tracking-[-0.05em] text-white sm:text-[1.15rem]">
              {getCoverThumbnailTitle(report.title, language)}
            </h4>
            <p className="mt-3 text-[0.34rem] text-slate-300 sm:text-[0.42rem]">
              {getCoverThumbnailSubtitle(language)}
            </p>
            <div className="mt-2 h-px w-14 bg-gradient-to-r from-sky-300 via-white/70 to-transparent" />
            <p className="mt-2 text-[0.32rem] font-medium uppercase tracking-[0.18em] text-sky-300 sm:text-[0.38rem]">
              {getCoverThumbnailMeta(language, detailTimeframe)}
            </p>
          </div>

          <div className="relative w-[45%]">
            <div className="absolute inset-y-[14%] left-0 w-px bg-white/6" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[40%] items-center justify-end pr-4">
          {resolvedLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedLogoUrl}
              alt={`${report.title} logo`}
              className="w-auto max-w-full object-contain object-right opacity-95"
              style={{
                maxHeight: logoRatio > 1.32 ? "34%" : "52%",
                maxWidth: "86%",
              }}
              onLoad={(event) =>
                setLogoRatio(getLogoContentAspectRatio(event.currentTarget))
              }
            />
          ) : (
            <p className="max-w-[110px] text-right text-[0.46rem] font-medium text-slate-400 sm:text-[0.56rem]">
              {messages.settings.logoRecommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
