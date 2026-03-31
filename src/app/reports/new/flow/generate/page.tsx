"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { createMetaPagesReport } from "@/lib/api/reports";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import { integrationCatalog } from "@/lib/integrations/catalog";

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

const timeframeOptions = [
  {
    id: "last-28-days",
    label: "Últimos 28 días",
    description: "Periodo activo actualmente para este flujo.",
  },
] as const;

const templateOptions = [
  {
    id: "minimalista",
    name: "Minimalista",
    description: "Lectura limpia y directa para una revisión rápida.",
    previewClass:
      "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] border-slate-200",
  },
  {
    id: "moderno",
    name: "Moderno",
    description: "Más contraste visual y bloques destacados.",
    previewClass:
      "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] border-slate-800",
  },
  {
    id: "ejecutivo",
    name: "Ejecutivo",
    description: "Enfocado en resumen, KPIs y lectura gerencial.",
    previewClass:
      "bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] border-slate-300",
  },
] as const;

export default function NewReportFlowGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    searchParams.get("integration") || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
  const datasetId = storedIntegrationContext?.datasetId || "";
  const currentStep = 3;
  const stepHrefMap: Record<number, string> = {
    1: integrationSource
      ? `/reports/new/flow?integration=${integrationSource}`
      : "/reports/new/flow",
    2: integrationSource
      ? `/reports/new/flow/sync?integration=${integrationSource}`
      : "/reports/new/flow/sync",
  };
  const [selectedTimeframe, setSelectedTimeframe] = useState(
    timeframeOptions[0].id
  );
  const [selectedTemplate, setSelectedTemplate] = useState(
    templateOptions[0].id
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerateReport() {
    if (!datasetId) {
      setError(
        "Todavía no existe un dataset sincronizado. Completa el paso de sincronización primero."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      const report = await createMetaPagesReport({ datasetId });
      router.replace(
        `/reports/new/flow/review?integration=${integrationSource}&reportId=${report.reportId}&template=${selectedTemplate}`
      );
    } catch (err: unknown) {
      console.error("flow generate report error:", err);
      setError("No pudimos generar el reporte. Intenta nuevamente.");
    } finally {
      setLoading(false);
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
              Generar reporte
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Los datos ya están listos. El siguiente paso es crear el reporte final y abrirlo en la plataforma.
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

          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Datos preparados
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              {selectedIntegration?.name || "Integración lista"}
            </h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Timeframe
                </p>
                <div className="mt-4 space-y-3">
                  {timeframeOptions.map((option) => {
                    const active = option.id === selectedTimeframe;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedTimeframe(option.id)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                        }`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p
                          className={`mt-1 text-sm ${
                            active ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Plantilla de reporte
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {templateOptions.map((template) => {
                    const active = template.id === selectedTemplate;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`rounded-[20px] border p-3 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950/5 shadow-[0_0_0_1px_rgba(15,23,42,0.12)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`rounded-[16px] border p-3 ${template.previewClass}`}
                        >
                          <div
                            className={`rounded-full ${
                              template.id === "moderno"
                                ? "bg-white/30"
                                : "bg-slate-200"
                            } h-2.5 w-16`}
                          />
                          <div className="mt-3 space-y-2">
                            <div
                              className={`h-3 rounded-full ${
                                template.id === "moderno"
                                  ? "bg-white/80"
                                  : "bg-slate-300"
                              }`}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div
                                className={`h-12 rounded-xl ${
                                  template.id === "moderno"
                                    ? "bg-white/15"
                                    : template.id === "ejecutivo"
                                      ? "bg-slate-300"
                                      : "bg-slate-200"
                                }`}
                              />
                              <div
                                className={`h-12 rounded-xl ${
                                  template.id === "moderno"
                                    ? "bg-white/10"
                                    : template.id === "ejecutivo"
                                      ? "bg-slate-200"
                                      : "bg-slate-100"
                                }`}
                              />
                            </div>
                            <div
                              className={`h-16 rounded-2xl ${
                                template.id === "moderno"
                                  ? "bg-white/10"
                                  : "bg-slate-100"
                              }`}
                            />
                          </div>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-slate-950">
                          {template.name}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {template.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/reports/new/flow/sync?integration=${integrationSource}`}
                className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Volver
              </Link>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loading}
                className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Generando..." : "Generar reporte"}
              </button>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
