"use client";

import { useState } from "react";

import { downloadPublicSharedReportPdf } from "@/lib/api/reports";

const REPORT_PDF_DOWNLOADS_LOCKED = true;

type PublicSharedReportActionsProps = {
  token: string;
  isPdfExport: boolean;
  template?: string | null;
};

export function PublicSharedReportActions({
  token,
  isPdfExport,
  template,
}: PublicSharedReportActionsProps) {
  const [downloading, setDownloading] = useState(false);

  if (isPdfExport) {
    return null;
  }

  async function handleDownloadPdf() {
    try {
      setDownloading(true);
      await downloadPublicSharedReportPdf(
        token,
        template ? { template } : undefined
      );
    } catch (error) {
      console.error("[PublicSharedPDF][failure]", {
        token,
        template: template || null,
        error: error instanceof Error ? error.message : String(error),
      });
      window.alert("We couldn’t download the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="public-shared-report-actions pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-50 print:hidden sm:bottom-8">
        <div className="mx-auto flex w-full max-w-[1180px] justify-center px-4 sm:px-6">
          <div className="pointer-events-auto inline-flex items-center gap-3 sm:gap-4">
            <a
              href="https://www.measurableapp.com/?utm_source=shared_report&utm_medium=cta&utm_campaign=public_report_view"
              className="inline-flex h-14 w-[min(80vw,280px)] items-center justify-center rounded-full bg-[var(--measurable-blue)] px-6 text-[15px] font-semibold !text-white shadow-[0_18px_40px_rgba(23,73,255,0.22)] transition hover:scale-[1.01] hover:bg-[var(--measurable-blue-hover)] active:scale-[0.99] visited:!text-white sm:h-14 sm:min-w-[292px] sm:w-auto sm:px-8 sm:text-base"
            >
              Visit Platform
            </a>

            <div className="group relative">
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={REPORT_PDF_DOWNLOADS_LOCKED || downloading}
                aria-label="Download PDF"
                aria-disabled={REPORT_PDF_DOWNLOADS_LOCKED}
                className={`inline-flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full transition active:scale-[0.98] disabled:cursor-not-allowed sm:h-[64px] sm:w-[64px] ${
                  REPORT_PDF_DOWNLOADS_LOCKED
                    ? "border border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7ed_100%)] text-amber-700 shadow-[0_18px_40px_rgba(245,158,11,0.14)]"
                    : "bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-70"
                }`}
              >
                {downloading && !REPORT_PDF_DOWNLOADS_LOCKED ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                ) : REPORT_PDF_DOWNLOADS_LOCKED ? (
                  <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                    Locked
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
                    <path
                      d="M12 4.5v9M8.5 10l3.5 3.5 3.5-3.5"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.5 15.5v2a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
              {REPORT_PDF_DOWNLOADS_LOCKED ? (
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                  Coming soon
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .public-shared-report-actions {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
