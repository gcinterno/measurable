"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { IntegrationLibrary } from "@/components/reports/IntegrationLibrary";
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
    title: "Conectar y preparar",
    description: "Autoriza la fuente y deja listos los datos.",
  },
  {
    id: 3,
    title: "Generar reporte",
    description: "Dispara la creación del reporte desde la fuente elegida.",
  },
  {
    id: 4,
    title: "Revisar resultado",
    description: "Abre el reporte generado y continúa el análisis.",
  },
] as const;

function NewReportFlowPageContent() {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source");
  const integrationParam = searchParams.get("integration");
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    sourceParam || integrationParam || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
  const currentStep = 1;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Flujo guiado
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Crear un reporte paso a paso
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Un flujo simple para ayudar al usuario a entender dónde está y cuál es el siguiente paso natural dentro del proceso.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => {
              const completed = currentStep > step.id;
              const active = currentStep === step.id;

              return (
                <div key={step.id} className="relative">
                  {index < flowSteps.length - 1 ? (
                    <div className="absolute left-[calc(50%+26px)] top-6 hidden h-px w-[calc(100%-52px)] bg-slate-200 lg:block" />
                  ) : null}

                  <div
                    className={`relative rounded-[24px] border p-5 transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white"
                        : completed
                          ? "border-sky-200 bg-sky-50 text-slate-950"
                          : "border-slate-200 bg-slate-50 text-slate-950"
                    }`}
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
                </div>
              );
            })}
          </div>

          {selectedIntegration ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Fuente detectada:{" "}
              <span className="font-semibold text-slate-950">
                {selectedIntegration.name}
              </span>
            </div>
          ) : null}

          <IntegrationLibrary
            integrations={integrationCatalog}
            selectedIntegrationKey={selectedIntegration?.integrationKey}
            embedded
          />
        </section>
      </div>
    </AppShell>
  );
}

export default function NewReportFlowPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        </AppShell>
      }
    >
      <NewReportFlowPageContent />
    </Suspense>
  );
}
