"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { AppShell } from "@/components/layout/AppShell";
import {
  connectMetaIntegration,
  fetchIntegrationsConnectionStatus,
} from "@/lib/api/integrations";
import {
  clearPendingMetaSource,
  clearIntegrationReportContext,
  getIntegrationReportContext,
  setPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";

function IntegrationsPageContent() {
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
    let active = true;

    async function loadIntegrationStatus() {
      try {
        const storedContext = getIntegrationReportContext();
        const response = await fetchIntegrationsConnectionStatus();

        if (!active) {
          return;
        }

        if (response.metaConnected) {
          setMetaConnected(true);

          if (response.integrationId) {
            setIntegrationReportContext({
              source:
                storedContext && isMetaFrontendIntegrationKey(storedContext.source)
                  ? storedContext.source
                  : "facebook_pages",
              integration: "meta",
              workspaceId: storedContext?.workspaceId || "1",
              integrationId: response.integrationId,
              pageId: storedContext?.pageId,
              pageName: storedContext?.pageName,
              datasetId: storedContext?.datasetId,
              synced: storedContext?.synced,
              requestedSlides: storedContext?.requestedSlides,
              aiMode: storedContext?.aiMode,
            });
          }

          return;
        }

        setMetaConnected(false);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("integrations status load error:", error);
      }
    }

    void loadIntegrationStatus();

    return () => {
      active = false;
    };
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
      const storedContext = getIntegrationReportContext();
      setIntegrationReportContext({
        source:
          storedContext && isMetaFrontendIntegrationKey(storedContext.source)
            ? storedContext.source
            : "facebook_pages",
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
      const storedContext = getIntegrationReportContext();

      if (storedContext?.integration === "meta") {
        setIntegrationReportContext({
          ...storedContext,
          postConnectRedirect: undefined,
        });
      }

      const response = await connectMetaIntegration();

      if (response.connected) {
        setMetaConnected(true);
      }

      if (response.redirectUrl) {
        console.info("[MetaOAuth][redirect]", {
          auth_url_from_backend: response.authUrlFromBackend || response.redirectUrl,
          final_auth_url_used: response.finalAuthUrlUsed || response.redirectUrl,
        });
        window.location.href = response.redirectUrl;
        return;
      }

      if (!response.connected) {
        throw new Error("The backend did not return a connection URL for Meta.");
      }
    } catch (err: unknown) {
      console.error("meta connect error:", err);
      setMetaError(
        "We could not start the Facebook Pages connection. Try again."
      );
    } finally {
      setMetaLoading(false);
    }
  }

  function handleMetaDisconnect() {
    clearPendingMetaSource();
    clearIntegrationReportContext();
    setMetaConnected(false);
    setMetaError("");
  }

  function handleMetaConnectSource(source: "facebook_pages" | "instagram_business") {
    const storedContext = getIntegrationReportContext();
    setPendingMetaSource(source);

    setIntegrationReportContext({
      source,
      integration: "meta",
      workspaceId: storedContext?.workspaceId || "1",
      integrationId:
        storedContext?.integration === "meta"
          ? storedContext.integrationId
          : undefined,
      postConnectRedirect: undefined,
    });

    void handleMetaConnect();
  }

  function handleMetaSelectSource(source: "facebook_pages" | "instagram_business") {
    const storedContext = getIntegrationReportContext();

    setIntegrationReportContext({
      source,
      integration: "meta",
      workspaceId: storedContext?.workspaceId || "1",
      integrationId: storedContext?.integrationId || "",
      requestedSlides: storedContext?.requestedSlides,
      aiMode: storedContext?.aiMode,
    });

    router.push(`/reports/new/flow/sync?integration=${source}`);
  }

  return (
    <AppShell>
      <div className="mb-5 sm:mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Connectors
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Integrations ready to grow with the product
        </h2>
      </div>

      {!metaConnected ? (
        <section className="mb-5 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5 sm:mb-6 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            There are no connected integrations yet
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You can start with Facebook Pages to validate the full connection, selection, and sync flow.
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-3">
        {integrationCatalog.map((integration) => (
          <IntegrationCard
            key={integration.integrationKey}
            name={integration.name}
            category={integration.category}
            description={integration.description}
            logoUrl={integration.logoUrl}
            logoAlt={integration.logoAlt}
            status={
              isMetaFrontendIntegrationKey(integration.integrationKey)
                ? metaConnected
                  ? "Connected"
                  : integration.status
                : integration.status
            }
            actionLabel={
              isMetaFrontendIntegrationKey(integration.integrationKey)
                ? metaConnected
                  ? "Select"
                  : "Connect"
                : integration.actionLabel
            }
            onAction={
              isMetaFrontendIntegrationKey(integration.integrationKey)
                ? metaConnected
                  ? () => handleMetaSelectSource(integration.integrationKey)
                  : () => handleMetaConnectSource(integration.integrationKey)
                : undefined
            }
            secondaryActionLabel={
              isMetaFrontendIntegrationKey(integration.integrationKey) && metaConnected
                ? "Disconnect"
                : undefined
            }
            onSecondaryAction={
              isMetaFrontendIntegrationKey(integration.integrationKey) && metaConnected
                ? handleMetaDisconnect
                : undefined
            }
            disabled={!isMetaFrontendIntegrationKey(integration.integrationKey)}
            loading={isMetaFrontendIntegrationKey(integration.integrationKey) && metaLoading}
            error={isMetaFrontendIntegrationKey(integration.integrationKey) ? metaError : ""}
            />
        ))}
      </div>
    </AppShell>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:mb-6 sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        </AppShell>
      }
    >
      <IntegrationsPageContent />
    </Suspense>
  );
}
