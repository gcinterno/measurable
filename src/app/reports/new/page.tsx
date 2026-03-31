"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { IntegrationDropzoneCard } from "@/components/reports/IntegrationDropzoneCard";
import { IntegrationLibrary } from "@/components/reports/IntegrationLibrary";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import { integrationCatalog } from "@/lib/integrations/catalog";

const quickSteps = [
  { id: 1, label: "Elegir fuente" },
  { id: 2, label: "Sincronizar datos" },
  { id: 3, label: "Generar reporte" },
  { id: 4, label: "Descargar o compartir" },
] as const;

function NewReportPageContent() {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source");
  const integrationParam = searchParams.get("integration");
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource = sourceParam || integrationParam || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="px-2 py-1 sm:px-0">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-center sm:gap-3">
            {quickSteps.map((step, index) => {
              const active = step.id === 1;

              return (
                <div key={step.id} className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        active
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {step.id}
                    </span>
                    <span
                      className={`text-sm font-medium whitespace-nowrap ${
                        active ? "text-slate-950" : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {index < quickSteps.length - 1 ? (
                    <span className="h-px w-5 bg-slate-200 sm:w-7" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <IntegrationDropzoneCard />

        <IntegrationLibrary
          integrations={integrationCatalog}
          selectedIntegrationKey={selectedIntegration?.integrationKey}
        />
      </div>
    </AppShell>
  );
}

export default function NewReportPage() {
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
      <NewReportPageContent />
    </Suspense>
  );
}
