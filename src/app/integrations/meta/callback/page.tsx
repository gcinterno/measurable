"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  fetchIntegrationsConnectionStatus,
  fetchMetaPages,
} from "@/lib/api/integrations";
import {
  clearPendingMetaSource,
  getIntegrationReportContext,
  getPendingMetaSource,
  isPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { clearPendingMetaOAuth } from "@/lib/integrations/meta-oauth";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

export const dynamic = "force-dynamic";

function CallbackRedirectFallback() {
  return null;
}

function MetaIntegrationCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function finishCallback() {
      const storedContext = getIntegrationReportContext();
      const querySource = searchParams.get("source");
      const pendingMetaSource = getPendingMetaSource();
      const resolvedSource =
        (isPendingMetaSource(querySource) && querySource) ||
        pendingMetaSource ||
        (isPendingMetaSource(storedContext?.source) ? storedContext.source : null);
      const status = searchParams.get("status");
      const integrationId = searchParams.get("integration_id");
      const errorParam = searchParams.get("error");
      const message = searchParams.get("message");

      console.info("META_CALLBACK_QUERY", {
        status,
        integration_id: integrationId,
        source: querySource,
        pending_source: pendingMetaSource,
        error: errorParam,
        message,
      });

      if (errorParam) {
        clearPendingMetaOAuth();
        clearPendingMetaSource();
        router.replace(
          `/integrations/meta?meta_error=${encodeURIComponent(
            "Meta authorization was canceled or failed. Try again."
          )}`
        );
        return;
      }

      if (status === "connected") {
        const resolvedWorkspaceId =
          storedContext?.workspaceId || getActiveWorkspaceId() || "";
        let refreshedIntegrationId = integrationId || "";
        let metaConnected = false;
        let pagesCount = 0;

        try {
          const refreshResult = await fetchIntegrationsConnectionStatus();
          metaConnected = refreshResult.metaConnected;
          refreshedIntegrationId =
            refreshedIntegrationId || refreshResult.integrationId || "";

          if (metaConnected && refreshedIntegrationId && resolvedWorkspaceId) {
            const authorizedPages = await fetchMetaPages(
              refreshedIntegrationId,
              resolvedWorkspaceId
            );
            pagesCount = authorizedPages.length;
          }

          console.info("META_CALLBACK_REFRESH_RESULT", {
            meta_connected: metaConnected,
            integration_id: refreshedIntegrationId || null,
            workspace_id: resolvedWorkspaceId || null,
            pages_count: pagesCount,
          });
          console.info("META_AUTHORIZED_PAGES_COUNT", {
            integration_id: refreshedIntegrationId || null,
            pages_count: pagesCount,
          });
        } catch (error) {
          console.error("meta callback refresh error:", error);
          console.info("META_CALLBACK_REFRESH_RESULT", {
            meta_connected: false,
            integration_id: refreshedIntegrationId || null,
            workspace_id: resolvedWorkspaceId || null,
            pages_count: 0,
            error: error instanceof Error ? error.message : "unknown_error",
          });
          clearPendingMetaOAuth();
          clearPendingMetaSource();
          router.replace(
            `/integrations/meta?meta_error=${encodeURIComponent(
              "We could not verify the Meta connection after the callback. Try reconnecting."
            )}`
          );
          return;
        }

        if (!metaConnected || !refreshedIntegrationId) {
          clearPendingMetaOAuth();
          clearPendingMetaSource();
          router.replace(
            `/integrations/meta?meta_error=${encodeURIComponent(
              "Meta returned from OAuth, but the integration was not confirmed by the backend."
            )}`
          );
          return;
        }

        setIntegrationReportContext({
          source: resolvedSource || storedContext?.source || "",
          integration: "meta",
          workspaceId: resolvedWorkspaceId,
          integrationId: refreshedIntegrationId,
          pageId: undefined,
          pageName: undefined,
          datasetId: undefined,
          synced: false,
          requestedSlides: storedContext?.requestedSlides,
          aiMode: storedContext?.aiMode,
        });
        clearPendingMetaOAuth();
        clearPendingMetaSource();

        if (pagesCount === 0) {
          router.replace(
            `/integrations/meta?meta_state=no_authorized_pages&integration_id=${encodeURIComponent(
              refreshedIntegrationId
            )}&pages_count=0`
          );
          return;
        }

        router.replace(
          storedContext?.postConnectRedirect ||
            `/integrations/meta?meta_state=connected&integration_id=${encodeURIComponent(
              refreshedIntegrationId
            )}&pages_count=${encodeURIComponent(String(pagesCount))}`
        );
        return;
      }

      clearPendingMetaSource();
      clearPendingMetaOAuth();
      router.replace(storedContext?.postConnectRedirect || "/integrations");
    }

    void finishCallback();
  }, [router, searchParams]);

  return null;
}

export default function MetaIntegrationCallbackPage() {
  return (
    <Suspense fallback={<CallbackRedirectFallback />}>
      <MetaIntegrationCallbackContent />
    </Suspense>
  );
}
