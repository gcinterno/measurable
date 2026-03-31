"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdAccountSelector } from "@/components/integrations/AdAccountSelector";
import { MetaStatusCard } from "@/components/integrations/MetaStatusCard";
import { AppShell } from "@/components/layout/AppShell";
import {
  connectMetaIntegration,
  fetchMetaPages,
  selectMetaPage,
  syncMetaPages,
} from "@/lib/api/integrations";
import { createMetaPagesReport } from "@/lib/api/reports";
import {
  getIntegrationReportContext,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

type MetaOption = {
  id: string;
  name: string;
};

type MetaUiState =
  | "not_connected"
  | "connected"
  | "pages_loaded"
  | "page_selected"
  | "syncing"
  | "synced"
  | "generating_report"
  | "error";

function MetaIntegrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = getActiveWorkspaceId();
  const [pages, setPages] = useState<MetaOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [createReportLoading, setCreateReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [pageSelected, setPageSelected] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);

  useEffect(() => {
    const storedContext = getIntegrationReportContext();

    if (!storedContext || storedContext.integration !== "meta") {
      return;
    }

    if (storedContext.integrationId) {
      setIntegrationId(storedContext.integrationId);
      setConnected(true);
    }

    if (storedContext.datasetId) {
      setDatasetId(storedContext.datasetId);
    }

    if (storedContext.pageId) {
      setSelectedPageId(storedContext.pageId);
      setPageSelected(true);
    }

    if (storedContext.synced) {
      setSyncCompleted(true);
    }
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const callbackIntegrationId = searchParams.get("integration_id");
    const message = searchParams.get("message");

    if (status !== "connected") {
      return;
    }

    setConnected(true);
    setError("");
    setSyncCompleted(false);
    setStatusMessage(
      message || "Conexión completada. Ahora elige la página que quieres usar."
    );

    if (callbackIntegrationId) {
      setIntegrationId(callbackIntegrationId);
      setIntegrationReportContext({
        source: "meta",
        integration: "meta",
        workspaceId: workspaceId || "1",
        integrationId: callbackIntegrationId,
      });
    }

    router.replace("/integrations/meta");
  }, [router, searchParams, workspaceId]);

  useEffect(() => {
    let active = true;

    async function loadMetaPages() {
      if (!integrationId) {
        if (active) {
          setLoading(false);
          setPages([]);

          if (!connected) {
            setStatusMessage("");
          } else {
            setStatusMessage(
              "Conexión detectada. Esperando integration_id para cargar las páginas."
            );
          }
        }

        return;
      }

      try {
        setLoading(true);
        setError("");
        setStatusMessage("");

        const pageData = await fetchMetaPages(integrationId);

        if (!active) {
          return;
        }

        setPages(pageData);
        setConnected((current) => current || pageData.length > 0);
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        console.error("meta pages load error:", err);
        setError(
          "No pudimos cargar las paginas de Facebook. Intenta actualizar la vista."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMetaPages();

    return () => {
      active = false;
    };
  }, [connected, integrationId, workspaceId]);

  const uiState = useMemo<MetaUiState>(() => {
    if (error) {
      return "error";
    }

    if (createReportLoading) {
      return "generating_report";
    }

    if (syncLoading) {
      return "syncing";
    }

    if (syncCompleted) {
      return "synced";
    }

    if (pageSelected && selectedPageId) {
      return "page_selected";
    }

    if (pages.length > 0) {
      return "pages_loaded";
    }

    if (connected) {
      return "connected";
    }

    return "not_connected";
  }, [
    connected,
    createReportLoading,
    error,
    pageSelected,
    pages.length,
    selectedPageId,
    syncCompleted,
    syncLoading,
  ]);

  async function handleConnect() {
    try {
      setConnectLoading(true);
      setError("");
      setStatusMessage("");
      const response = await connectMetaIntegration();

      if (response.connected) {
        setConnected(true);
      }

      if (response.integrationId) {
        setIntegrationId(response.integrationId);
        setIntegrationReportContext({
          source: "meta",
          integration: "meta",
          workspaceId: workspaceId || "1",
          integrationId: response.integrationId,
        });
      }

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }
    } catch (err: unknown) {
      console.error("meta connect pages error:", err);
      setError(
        "No pudimos iniciar la conexion de Facebook Pages. Intentalo de nuevo."
      );
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleSelectPage() {
    if (!selectedPageId) {
      setError("Selecciona una pagina antes de continuar.");
      return;
    }

    if (!integrationId) {
      setError(
        "No encontramos el integration_id de Meta. Vuelve a conectar Facebook Pages e intenta otra vez."
      );
      return;
    }

    try {
      setSelectLoading(true);
      setError("");
      const response = await selectMetaPage({
        integrationId,
        pageId: selectedPageId,
      });

      if (response.integrationId) {
        setIntegrationId(response.integrationId);
      }

      if (response.datasetId) {
        setDatasetId(response.datasetId);
      }

      setPageSelected(true);
      setSyncCompleted(false);
      setStatusMessage(
        "Página seleccionada correctamente. Ya puedes sincronizar los datos."
      );
    } catch (err: unknown) {
      console.error("meta select page error:", err);
      setError(
        "No pudimos guardar la pagina seleccionada. Revisa la seleccion e intentalo otra vez."
      );
    } finally {
      setSelectLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedPageId) {
      setError("Selecciona una pagina antes de sincronizar.");
      return;
    }

    if (!integrationId) {
      setError(
        "No encontramos el integration_id de Meta. Vuelve a conectar Facebook Pages e intenta otra vez."
      );
      return;
    }

    try {
      setSyncLoading(true);
      setError("");
      setStatusMessage("");
      const response = await syncMetaPages({
        pageId: selectedPageId,
        integrationId,
      });

      const nextIntegrationId = response.integrationId || integrationId;
      const nextDatasetId = response.datasetId || datasetId;

      setIntegrationId(nextIntegrationId);
      setDatasetId(nextDatasetId);
      setSyncCompleted(true);
      setStatusMessage(
        response.message ||
          response.detail ||
          "Datos sincronizados correctamente. Ya puedes generar el reporte."
      );

      setIntegrationReportContext({
        source: "meta",
        integration: "meta",
        workspaceId: workspaceId || "1",
        integrationId: nextIntegrationId,
        datasetId: nextDatasetId,
        pageId: selectedPageId,
        synced: true,
      });
    } catch (err: unknown) {
      console.error("meta pages sync error:", err);
      setError(
        "No pudimos sincronizar los datos de la pagina. Intenta nuevamente en unos segundos."
      );
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!datasetId) {
      setError(
        "Aún no existe un dataset sincronizado. Sincroniza los datos antes de generar el reporte."
      );
      return;
    }

    try {
      setCreateReportLoading(true);
      setError("");
      setStatusMessage("");
      const report = await createMetaPagesReport({ datasetId });
      router.replace(`/reports/${report.reportId}`);
    } catch (err: unknown) {
      console.error("meta pages create report error:", err);
      setError(
        "No pudimos generar el reporte con los datos sincronizados. Intenta nuevamente."
      );
    } finally {
      setCreateReportLoading(false);
    }
  }

  const primaryAction = (() => {
    if (!connected) {
      return {
        label: connectLoading ? "Conectando..." : "Conectar Facebook Pages",
        onClick: handleConnect,
        disabled: connectLoading || loading,
      };
    }

    if (!pageSelected) {
      return {
        label:
          selectLoading ? "Guardando página..." : "Guardar página seleccionada",
        onClick: handleSelectPage,
        disabled:
          selectLoading || syncLoading || createReportLoading || !selectedPageId,
      };
    }

    if (!syncCompleted) {
      return {
        label: syncLoading ? "Sincronizando datos..." : "Sincronizar datos",
        onClick: handleSync,
        disabled: syncLoading || createReportLoading || !selectedPageId,
      };
    }

    return {
      label: createReportLoading ? "Generando reporte..." : "Generar reporte",
      onClick: handleGenerateReport,
      disabled: createReportLoading || !selectedPageId,
    };
  })();

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <MetaStatusCard
          state={uiState}
          workspaceId={workspaceId}
          onAction={primaryAction.onClick}
          actionLabel={primaryAction.label}
          actionDisabled={primaryAction.disabled}
          error={error}
        />

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        ) : (
          <AdAccountSelector
            accounts={pages}
            value={selectedPageId}
            onChange={(value) => {
              setSelectedPageId(value);
              setPageSelected(false);
              setSyncCompleted(false);
              setStatusMessage("");
              setError("");
            }}
            loading={selectLoading || syncLoading || createReportLoading}
          />
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Flujo Meta Pages
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Conecta, sincroniza y genera tu reporte
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Este flujo ya está conectado al backend real. Solo necesitas avanzar paso a paso hasta generar el reporte.
            </p>
            <ol className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
              <li>1. Conecta Facebook Pages con el workspace actual.</li>
              <li>2. Elige la página correcta y guarda la selección.</li>
              <li>3. Sincroniza los datos reales de esa página.</li>
              <li>4. Genera el reporte y ábrelo dentro de la plataforma.</li>
            </ol>

            {statusMessage ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            ) : null}

            {datasetId ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Datos listos para generar reporte.
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Estado actual
              </h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Workspace: {workspaceId || "Sin workspace"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Conectado: {connected ? "Sí" : "No"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Páginas cargadas: {pages.length}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Página: {selectedPageId || "Sin seleccionar"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Integration ID: {integrationId || "Sin integration_id"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Dataset ID: {datasetId || "Sin dataset"}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Confirmaciones
              </h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {connected
                    ? "Conexión activa con Facebook Pages."
                    : "Aún falta conectar Facebook Pages."}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {pageSelected && selectedPageId
                    ? "Página seleccionada y guardada correctamente."
                    : "Todavía no has confirmado una página."}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {syncCompleted
                    ? "Datos sincronizados y listos para el siguiente paso."
                    : "La sincronización aún no se ha completado."}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {datasetId
                    ? "Datos listos para generar reporte."
                    : "El reporte se habilitará cuando exista un dataset sincronizado."}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

export default function MetaIntegrationPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="space-y-5 sm:space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
              </div>
            </section>
          </div>
        </AppShell>
      }
    >
      <MetaIntegrationPageContent />
    </Suspense>
  );
}
