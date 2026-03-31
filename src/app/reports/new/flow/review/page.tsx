"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { SlideRenderer } from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import {
  exportReportPptx,
  fetchReportVersionBlocks,
  fetchReports,
} from "@/lib/api/reports";
import { integrationCatalog } from "@/lib/integrations/catalog";
import type { ReportVersionBlock } from "@/types/report";

const flowSteps = [
  {
    id: 1,
    title: "Elegir fuente",
    description: "Selecciona la integración o el origen del reporte.",
  },
  {
    id: 2,
    title: "Sincronizar datos",
    description: "Conecta la fuente y deja listos los datos reales.",
  },
  {
    id: 3,
    title: "Generar reporte",
    description: "Crea el reporte desde los datos ya preparados.",
  },
  {
    id: 4,
    title: "Revisar resultado",
    description: "Abre el reporte generado y continúa el análisis.",
  },
] as const;

const loadingLabels = [
  "Analizando tus datos...",
  "Procesando...",
  "Completado",
] as const;

const REVIEW_FETCH_ATTEMPTS = 5;
const REVIEW_FETCH_RETRY_MS = 1200;

function getReportTitle(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return titleBlock?.data.text || "Reporte generado";
}

export default function NewReportFlowReviewPage() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId") || "";
  const integrationSource = searchParams.get("integration") || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
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
  const [showReport, setShowReport] = useState(false);
  const [blocks, setBlocks] = useState<ReportVersionBlock[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [loadingReport, setLoadingReport] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timers = loadingLabels.map((_, index) =>
      window.setTimeout(() => {
        setLoadingIndex(index);
      }, index * 1200)
    );

    const revealTimer = window.setTimeout(() => {
      setShowReport(true);
    }, loadingLabels.length * 1200);

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

      for (let attempt = 0; attempt < REVIEW_FETCH_ATTEMPTS; attempt += 1) {
        try {
          const reportBlocks = await fetchReportVersionBlocks(reportId, "1");

          if (reportBlocks.length > 0 || attempt === REVIEW_FETCH_ATTEMPTS - 1) {
            return reportBlocks;
          }
        } catch (error) {
          lastError = error;
        }

        if (attempt < REVIEW_FETCH_ATTEMPTS - 1) {
          await wait(REVIEW_FETCH_RETRY_MS);
        }
      }

      throw lastError || new Error("Report preview not ready");
    }

    async function loadReviewData() {
      if (!reportId) {
        setError("No encontramos el reporte generado para este paso.");
        setLoadingReport(false);
        return;
      }

      try {
        setLoadingReport(true);
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
      } catch (err: unknown) {
        console.error("flow review load error:", err);

        if (!active) {
          return;
        }

        setError(
          "No pudimos cargar la vista previa del reporte todavía. Intenta de nuevo en unos segundos o abre el reporte completo."
        );
      } finally {
        if (active) {
          setLoadingReport(false);
        }
      }
    }

    void loadReviewData();

    return () => {
      active = false;
    };
  }, [reportId]);

  const reportTitle = useMemo(() => getReportTitle(blocks), [blocks]);
  const viewModel = useMemo(
    () => buildExecutiveDarkViewModel(blocks),
    [blocks]
  );

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
    try {
      setDownloading(true);
      await exportReportPptx(reportId);
    } catch (err) {
      console.error("flow review download error:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Flujo guiado
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Revisar resultado
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              El reporte ya fue creado. Antes de abrirlo por completo, aquí tienes una vista interna para revisar el resultado.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => {
              const completed = currentStep > step.id;
              const active = currentStep === step.id;
              const isClickable = step.id < currentStep;
              const stepCard = (
                <div
                  className={`relative rounded-[24px] border p-5 transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : completed
                        ? "border-sky-200 bg-sky-50 text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-950"
                  } ${isClickable ? "cursor-pointer hover:border-sky-300 hover:bg-sky-100" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                        active
                          ? "bg-white text-slate-950"
                          : completed
                            ? "bg-sky-600 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {completed ? "✓" : step.id}
                    </span>
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          active
                            ? "text-sky-200"
                            : completed
                              ? "text-sky-700"
                              : "text-slate-400"
                        }`}
                      >
                        Paso {step.id}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
                    </div>
                  </div>
                  <p
                    className={`mt-4 text-sm leading-6 ${
                      active ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              );

              return (
                <div key={step.id} className="relative">
                  {index < flowSteps.length - 1 ? (
                    <div className="absolute left-[calc(50%+26px)] top-6 hidden h-px w-[calc(100%-52px)] bg-slate-200 lg:block" />
                  ) : null}
                  {isClickable ? (
                    <Link
                      href={stepHrefMap[step.id]}
                      className="block rounded-[24px]"
                    >
                      {stepCard}
                    </Link>
                  ) : (
                    stepCard
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Acciones
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  {selectedIntegration?.name || "Reporte listo"}
                </h2>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Reportes generados</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {reportsCount}/3
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Límite de referencia para plan free.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading || !reportId}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {downloading ? "Descargando..." : "Descargar"}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!reportId}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  Compartir
                </button>
                <Link
                  href={reportId ? `/reports/${reportId}` : "/reports"}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Abrir reporte completo
                </Link>
              </div>
            </aside>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              {!showReport ? (
                <div className="flex min-h-[620px] flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                  <div className="flex h-48 w-full max-w-md items-center justify-center rounded-[24px] border border-slate-200 bg-white text-sm text-slate-400 shadow-sm">
                    Espacio para GIF de carga
                  </div>
                  <p className="mt-6 text-lg font-semibold text-slate-950">
                    {loadingLabels[loadingIndex]}
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : loadingReport ? (
                <div className="flex min-h-[620px] items-center justify-center rounded-[20px] border border-slate-200 bg-slate-50 text-sm text-slate-500">
                  Cargando vista previa del reporte...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                      Vista previa
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      {reportTitle}
                    </h2>
                  </div>

                  <div className="max-h-[720px] overflow-y-auto rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div className="pr-1">
                      <div className="rounded-[44px] bg-[#eef3f8] px-3 py-4 sm:px-4 sm:py-5">
                        <SlideRenderer model={viewModel} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
