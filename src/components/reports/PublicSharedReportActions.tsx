"use client";

import { useState } from "react";

import { downloadPublicSharedReportPdf } from "@/lib/api/reports";

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
      window.alert("No pudimos descargar el PDF. Intenta de nuevo.");
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
              Visitar Plataforma
            </a>

            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={downloading}
              aria-label="Download PDF"
              className="inline-flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:h-[64px] sm:w-[64px]"
            >
              {downloading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
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
