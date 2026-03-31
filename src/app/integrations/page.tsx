"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { AppShell } from "@/components/layout/AppShell";
import { connectMetaIntegration } from "@/lib/api/integrations";
import {
  clearIntegrationReportContext,
  getIntegrationReportContext,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { integrationCatalog } from "@/lib/integrations/catalog";

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);

  useEffect(() => {
    const storedContext = getIntegrationReportContext();

    if (storedContext?.integration === "meta" && storedContext.integrationId) {
      setMetaConnected(true);
    }
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const integrationId = searchParams.get("integration_id");

    if (status !== "connected") {
      return;
    }

    setMetaConnected(true);
    setMetaError("");

    if (integrationId) {
      setIntegrationReportContext({
        source: "meta",
        integration: "meta",
        workspaceId: "1",
        integrationId,
      });
    }

    router.replace("/integrations");
  }, [router, searchParams]);

  async function handleMetaConnect() {
    try {
      setMetaLoading(true);
      setMetaError("");

      const response = await connectMetaIntegration();

      if (response.connected) {
        setMetaConnected(true);
      }

      if (response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }

      if (!response.connected) {
        throw new Error("El backend no devolvio una URL de conexion para Meta.");
      }
    } catch (err: unknown) {
      console.error("meta connect error:", err);
      setMetaError(
        "No pudimos iniciar la conexion de Facebook Pages. Intentalo de nuevo."
      );
    } finally {
      setMetaLoading(false);
    }
  }

  function handleMetaDisconnect() {
    clearIntegrationReportContext();
    setMetaConnected(false);
    setMetaError("");
  }

  return (
    <AppShell>
      <div className="mb-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:mb-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Connectors
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Integraciones listas para crecer con el producto
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
          Usa Facebook Pages para arrancar el flujo real de autorizacion hoy. El resto de
          conectores ya mantienen la misma superficie visual para futuras
          integraciones sin cambiar el shell.
        </p>
      </div>

      {!metaConnected ? (
        <section className="mb-5 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5 sm:mb-6 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            Aun no hay integraciones conectadas
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Puedes empezar con Facebook Pages para validar el flujo completo de conexion, seleccion y sincronizacion.
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {integrationCatalog.map((integration) => (
          <IntegrationCard
            key={integration.integrationKey}
            name={integration.name}
            category={integration.category}
            description={integration.description}
            logoUrl={integration.logoUrl}
            logoAlt={integration.logoAlt}
            status={
              integration.integrationKey === "meta"
                ? metaConnected
                  ? "Conectado"
                  : integration.status
                : integration.status
            }
            actionLabel={
              integration.integrationKey === "meta"
                ? metaConnected
                  ? "Desconectar"
                  : integration.actionLabel
                : integration.actionLabel
            }
            onAction={
              integration.integrationKey === "meta"
                ? metaConnected
                  ? handleMetaDisconnect
                  : handleMetaConnect
                : undefined
            }
            disabled={integration.integrationKey !== "meta"}
            loading={integration.integrationKey === "meta" && metaLoading}
            error={integration.integrationKey === "meta" ? metaError : ""}
            detailHref={
              integration.integrationKey === "meta"
                ? metaConnected
                  ? undefined
                  : integration.detailHref
                : undefined
            }
            detailLabel={
              integration.integrationKey === "meta"
                ? "Abrir detalle de Meta"
                : undefined
            }
          />
        ))}
      </div>
    </AppShell>
  );
}
