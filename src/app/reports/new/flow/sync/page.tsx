"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { AdAccountSelector } from "@/components/integrations/AdAccountSelector";
import {
  fetchMetaPages,
  selectMetaPage,
  syncMetaPages,
} from "@/lib/api/integrations";
import {
  getIntegrationReportContext,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
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

type MetaOption = {
  id: string;
  name: string;
};

export default function NewReportFlowSyncPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    searchParams.get("integration") || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
  const integrationId = storedIntegrationContext?.integrationId || "";
  const workspaceId = storedIntegrationContext?.workspaceId || "1";
  const currentStep = 2;
  const previousStepHref =
    integrationSource
      ? `/reports/new/flow?integration=${integrationSource}`
      : "/reports/new/flow";

  const [pages, setPages] = useState<MetaOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState(
    storedIntegrationContext?.pageId || ""
  );
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(0);

    const progressSteps = [0, 20, 40, 60, 80, 90];
    let stepIndex = 0;

    const intervalId = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, progressSteps.length - 1);
      setLoadingProgress(progressSteps[stepIndex]);
    }, 350);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading]);

  useEffect(() => {
    let active = true;

    async function loadPages() {
      if (selectedIntegration?.integrationKey !== "meta") {
        setLoading(false);
        return;
      }

      if (!integrationId) {
        setLoading(false);
        setError(
          "No encontramos una integración activa. Vuelve al paso 1 y confirma la integración."
        );
        return;
      }

      try {
        setLoading(true);
        setError("");
        const pageData = await fetchMetaPages(integrationId);

        if (!active) {
          return;
        }

        setPages(pageData);
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        console.error("flow sync pages load error:", err);
        setError(
          "No pudimos cargar las páginas disponibles. Intenta nuevamente."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPages();

    return () => {
      active = false;
    };
  }, [integrationId, selectedIntegration?.integrationKey]);

  async function handleSync() {
    if (!selectedPageId) {
      setError("Selecciona una página antes de sincronizar.");
      return;
    }

    try {
      setSyncLoading(true);
      setError("");
      await selectMetaPage({
        integrationId,
        pageId: selectedPageId,
      });

      const response = await syncMetaPages({
        integrationId,
        pageId: selectedPageId,
      });

      const nextIntegrationId = response.integrationId || integrationId;
      const nextDatasetId = response.datasetId || "";

      setIntegrationReportContext({
        source: "meta",
        integration: "meta",
        workspaceId,
        integrationId: nextIntegrationId,
        pageId: selectedPageId,
        datasetId: nextDatasetId,
        synced: true,
      });

      router.replace("/reports/new/flow/generate?integration=meta");
    } catch (err: unknown) {
      console.error("flow meta sync error:", err);
      setError(
        "No pudimos sincronizar los datos de la página. Intenta nuevamente."
      );
    } finally {
      setSyncLoading(false);
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
              Sincronizar datos
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Completa la selección de página y sincroniza los datos reales antes de generar el reporte.
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
                    <Link href={previousStepHref} className="block rounded-[24px]">
                      {stepCard}
                    </Link>
                  ) : (
                    stepCard
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                Integración confirmada
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                {selectedIntegration?.name || "Fuente seleccionada"}
              </h2>
            </div>

            {selectedIntegration?.integrationKey === "meta" ? (
              <>
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">
                        Cargando páginas disponibles...
                      </span>
                      <span className="font-semibold text-sky-700">
                        {loadingProgress}%
                      </span>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0284c7_100%)] transition-[width] duration-300"
                        style={{ width: `${loadingProgress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400">
                      <span>0%</span>
                      <span>20%</span>
                      <span>40%</span>
                      <span>60%</span>
                      <span>80%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <AdAccountSelector
                    accounts={pages}
                    value={selectedPageId}
                    onChange={(value) => {
                      setSelectedPageId(value);
                      setError("");
                    }}
                    loading={syncLoading}
                  />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={loading || syncLoading || !selectedPageId}
                    className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {syncLoading ? "Sincronizando..." : "Sincronizar datos"}
                  </button>
                  <Link
                    href="/reports/new/flow"
                    className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-700"
                  >
                    Volver
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                Este flujo de sincronización todavía está habilitado solo para Meta.
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
