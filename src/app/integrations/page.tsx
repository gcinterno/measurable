"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { AppShell } from "@/components/layout/AppShell";
import {
  connectMetaIntegration,
  fetchMetaPages,
  fetchIntegrationsConnectionStatus,
  isValidMetaAuthUrl,
} from "@/lib/api/integrations";
import {
  clearPendingMetaSource,
  clearIntegrationReportContext,
  clearStoredMetaIntegrationState,
  getIntegrationReportContext,
  setPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

function IntegrationsPageContent() {
  const router = useRouter();
  const { workspace } = useActiveWorkspace();
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);
  const activeWorkspaceId = workspace?.id || null;

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
          let hasAuthorizedPages = true;

          if (response.integrationId && (storedContext?.workspaceId || activeWorkspaceId)) {
            const authorizedPages = await fetchMetaPages(
              response.integrationId,
              storedContext?.workspaceId || activeWorkspaceId || ""
            );
            hasAuthorizedPages = authorizedPages.length > 0;
          }

          setMetaConnected(hasAuthorizedPages);

          if (response.integrationId && hasAuthorizedPages) {
            setIntegrationReportContext({
              source:
                storedContext && isMetaFrontendIntegrationKey(storedContext.source)
                  ? storedContext.source
                  : "facebook_pages",
              integration: "meta",
              workspaceId: storedContext?.workspaceId || activeWorkspaceId || "",
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
  }, [activeWorkspaceId]);

  async function handleMetaConnect() {
    try {
      setMetaLoading(true);
      setMetaError("");
      const storedContext = getIntegrationReportContext();
      const connectWorkspaceId = activeWorkspaceId || storedContext?.workspaceId || "";

      if (!connectWorkspaceId) {
        setMetaError(
          "No active workspace selected. Please choose a workspace and try again."
        );
        return;
      }

      const source =
        storedContext && isMetaFrontendIntegrationKey(storedContext.source)
          ? storedContext.source
          : "facebook_pages";

      clearStoredMetaIntegrationState();

      if (storedContext?.integration === "meta") {
        setIntegrationReportContext({
          ...storedContext,
          workspaceId: connectWorkspaceId,
          integrationId: undefined,
          datasetId: undefined,
          pageId: undefined,
          pageName: undefined,
          synced: false,
          postConnectRedirect: undefined,
        });
      }

      console.info("META_CONNECT_START", {
        workspace_id: connectWorkspaceId,
        source,
        route: "/integrations",
      });

      const response = await connectMetaIntegration({
        workspaceId: connectWorkspaceId,
        source,
      });

      const authUrl = response.authUrlFromBackend || response.redirectUrl;

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: connectWorkspaceId,
        source,
        auth_url: authUrl || null,
        integration_id: response.integrationId || null,
      });

      if (!isValidMetaAuthUrl(authUrl)) {
        console.error("META_CONNECT_INVALID_AUTH_URL", {
          workspace_id: connectWorkspaceId,
          source,
          auth_url: authUrl || null,
        });
        setMetaConnected(false);
        throw new Error("The backend did not return a valid Meta OAuth URL.");
      }

      if (response.integrationId) {
        setIntegrationReportContext({
          source,
          integration: "meta",
          workspaceId: connectWorkspaceId,
          integrationId: response.integrationId,
        });
      }

      if (typeof window !== "undefined") {
        window.location.assign(authUrl);
        return;
      }
    } catch (err: unknown) {
      console.error("meta connect error:", err);
      setMetaConnected(false);
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
    const contextWorkspaceId = activeWorkspaceId || storedContext?.workspaceId || "";

    if (!contextWorkspaceId) {
      setMetaError(
        "No active workspace selected. Please choose a workspace and try again."
      );
      return;
    }

    setPendingMetaSource(source);

    setIntegrationReportContext({
      source,
      integration: "meta",
      workspaceId: contextWorkspaceId,
      integrationId: undefined,
      datasetId: undefined,
      pageId: undefined,
      pageName: undefined,
      synced: false,
      postConnectRedirect: undefined,
    });

    void handleMetaConnect();
  }

  function handleMetaSelectSource(source: "facebook_pages" | "instagram_business") {
    const storedContext = getIntegrationReportContext();
    const contextWorkspaceId = activeWorkspaceId || storedContext?.workspaceId || "";

    setIntegrationReportContext({
      source,
      integration: "meta",
      workspaceId: contextWorkspaceId,
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
                  ? undefined
                  : "Connect"
                : integration.actionLabel
            }
            onAction={
              isMetaFrontendIntegrationKey(integration.integrationKey)
                ? metaConnected
                  ? undefined
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
