"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { AppShell } from "@/components/layout/AppShell";
import { UserSuggestionModal } from "@/components/suggestions/UserSuggestionModal";
import {
  connectMetaIntegration,
  disconnectMetaIntegration,
  fetchMetaPages,
  fetchIntegrationsConnectionStatus,
  validateMetaAuthUrl,
} from "@/lib/api/integrations";
import {
  clearPendingMetaOAuth,
  consumePendingMetaOAuthForRetry,
  createPendingMetaOAuth,
  clearMetaOAuthDebugUrl,
  hasMetaConnectPrerequisites,
  isMetaOAuthWindowMessage,
  logMetaOAuthDev,
  markMetaRedirectStarted,
  META_OAUTH_POPUP_CLOSE_GRACE_MS,
  META_OAUTH_POPUP_TIMEOUT_MS,
  normalizeMetaAuthUrl,
  openMetaOAuthPopup,
  showMetaOAuthReadyBanner,
  storeMetaOAuthDebugUrl,
} from "@/lib/integrations/meta-oauth";
import {
  clearMetaIntegrationSessionState,
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
  const { workspace, loading: workspaceLoading } = useActiveWorkspace();
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaStatusLoading, setMetaStatusLoading] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [metaStatusMessage, setMetaStatusMessage] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const activeWorkspaceId = workspace?.id || null;
  const connectInFlightRef = useRef(false);
  const popupCallbackReceivedRef = useRef(false);
  const popupPollRef = useRef<number | null>(null);
  const popupCloseGraceRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);

  const stopPopupPolling = useCallback(() => {
    if (popupPollRef.current !== null && typeof window !== "undefined") {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
    if (popupCloseGraceRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(popupCloseGraceRef.current);
      popupCloseGraceRef.current = null;
    }
    if (popupTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
  }, []);

  const refreshMetaIntegrationState = useCallback(async () => {
    logMetaOAuthDev("status refresh started", {
      route: "/integrations",
      workspaceId: activeWorkspaceId,
    });
    const storedContext = getIntegrationReportContext();
    const response = await fetchIntegrationsConnectionStatus();

    if (!response.metaConnected) {
      setMetaConnected(false);
      logMetaOAuthDev("status refresh completed", {
        route: "/integrations",
        connected: false,
        integrationId: response.integrationId || null,
      });
      return false;
    }

    setMetaConnected(true);

    if (response.integrationId && (storedContext?.workspaceId || activeWorkspaceId)) {
      const authorizedPages = await fetchMetaPages(
        response.integrationId,
        storedContext?.workspaceId || activeWorkspaceId || ""
      );

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

      if (authorizedPages.length === 0) {
        setMetaStatusMessage(
          "Meta is connected, but we couldn’t find any authorized pages yet."
        );
      }
    }

    logMetaOAuthDev("status refresh completed", {
      route: "/integrations",
      connected: true,
      integrationId: response.integrationId || null,
    });

    return true;
  }, [activeWorkspaceId]);

  useEffect(() => {
    const retryAuthUrl = consumePendingMetaOAuthForRetry({
      route: "/integrations",
      hasCallbackParams: false,
    });

    if (!retryAuthUrl || connectInFlightRef.current || typeof window === "undefined") {
      return;
    }

    window.location.href = retryAuthUrl;
  }, []);

  useEffect(() => {
    let active = true;

    async function loadIntegrationStatus() {
      try {
        setMetaStatusLoading(true);
        const connected = await refreshMetaIntegrationState();

        if (!active || connected) {
          return;
        }

        setMetaConnected(false);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("integrations status load error:", error);
      } finally {
        if (active) {
          setMetaStatusLoading(false);
        }
      }
    }

    void loadIntegrationStatus();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, refreshMetaIntegrationState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function handleMetaWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || !isMetaOAuthWindowMessage(event.data)) {
        return;
      }

      popupCallbackReceivedRef.current = true;
      logMetaOAuthDev("callback message received", {
        route: "/integrations",
        type: event.data.type,
        integrationId: "integrationId" in event.data ? event.data.integrationId || null : null,
      });
      stopPopupPolling();
      clearPendingMetaOAuth();
      connectInFlightRef.current = false;
      setMetaLoading(false);
      setMetaStatusLoading(false);

      if (event.data.type === "MEASURABLE_META_CONNECT_SUCCESS") {
        setMetaError("");
        try {
          const connected = await refreshMetaIntegrationState();
          setMetaStatusMessage(
            connected
              ? "Integration connected successfully."
              : "The connection finished, but we couldn’t confirm the status."
          );
        } catch (error) {
          console.error("meta popup refresh error:", error);
          setMetaError("The connection finished, but we couldn’t refresh the status.");
        }
        return;
      }

      setMetaStatusMessage("");
      setMetaError(
        event.data.message || "We couldn’t complete the Meta connection. Please try again."
      );
    }

    window.addEventListener("message", handleMetaWindowMessage);

    return () => {
      stopPopupPolling();
      window.removeEventListener("message", handleMetaWindowMessage);
    };
  }, [activeWorkspaceId, refreshMetaIntegrationState, stopPopupPolling]);

  async function handleMetaConnect() {
    if (connectInFlightRef.current) {
      console.warn("META_CONNECT_DUPLICATE_IGNORED", {
        route: "/integrations",
      });
      return;
    }

    let popupStarted = false;

    try {
      connectInFlightRef.current = true;
      popupCallbackReceivedRef.current = false;
      setMetaLoading(true);
      setMetaError("");
      setMetaStatusMessage("Connecting...");
      setMetaStatusLoading(true);
      const storedContext = getIntegrationReportContext();
      const connectWorkspaceId = activeWorkspaceId || storedContext?.workspaceId || "";
      const { tokenReady } = hasMetaConnectPrerequisites();

      if (!tokenReady) {
        setMetaError("Your session is not ready yet. Refresh and try again.");
        return;
      }

      if (!connectWorkspaceId || workspaceLoading) {
        setMetaError(
          "No active workspace selected. Please choose a workspace and try again."
        );
        return;
      }

      const source =
        storedContext && isMetaFrontendIntegrationKey(storedContext.source)
          ? storedContext.source
          : "facebook_pages";

      clearMetaOAuthDebugUrl();
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
          postConnectRedirect: "/integrations",
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

      const rawAuthUrl = response.authUrlFromBackend || response.redirectUrl;
      const authUrl = normalizeMetaAuthUrl(rawAuthUrl);
      const validation = validateMetaAuthUrl(authUrl);

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: connectWorkspaceId,
        source,
        auth_url: authUrl || null,
        integration_id: response.integrationId || null,
      });

      console.info("META_CONNECT_AUTH_URL_FINAL", {
        workspace_id: connectWorkspaceId,
        source,
        auth_url: authUrl || null,
        starts_with_facebook: validation.startsWithFacebook,
        contains_dialog_oauth: validation.containsDialogOAuth,
      });

      if (!validation.isValid) {
        console.error("META_CONNECT_INVALID_AUTH_URL", {
          workspace_id: connectWorkspaceId,
          source,
          auth_url: authUrl || null,
          starts_with_facebook: validation.startsWithFacebook,
          contains_dialog_oauth: validation.containsDialogOAuth,
        });
        setMetaConnected(false);
        throw new Error(
          "The backend did not return a valid Meta OAuth URL with /dialog/oauth."
        );
      }

      createPendingMetaOAuth({
        authUrl,
        source,
        route: "/integrations",
        transport: "popup",
      });
      storeMetaOAuthDebugUrl(authUrl);
      await showMetaOAuthReadyBanner();

      if (typeof window !== "undefined") {
        markMetaRedirectStarted();
        const popup = openMetaOAuthPopup(authUrl);

        if (!popup) {
          logMetaOAuthDev("popup blocked, using same-tab fallback", {
            route: "/integrations",
            source,
          });
          window.location.href = authUrl;
          return;
        }

        logMetaOAuthDev("popup opened", {
          route: "/integrations",
          source,
        });
        popupStarted = true;
        setMetaStatusMessage("Connecting...");
        stopPopupPolling();
        popupTimeoutRef.current = window.setTimeout(() => {
          logMetaOAuthDev("timeout reached", {
            route: "/integrations",
            source,
          });
          setMetaStatusMessage(
            "This is taking longer than expected. Finish the Facebook flow in the popup and we’ll update the connection automatically."
          );
        }, META_OAUTH_POPUP_TIMEOUT_MS);
        popupPollRef.current = window.setInterval(async () => {
          if (!popup.closed) {
            return;
          }

          logMetaOAuthDev("popup closed", {
            route: "/integrations",
            source,
            callbackReceived: popupCallbackReceivedRef.current,
          });
          stopPopupPolling();
          popupCloseGraceRef.current = window.setTimeout(async () => {
            if (popupCallbackReceivedRef.current) {
              return;
            }

            clearPendingMetaOAuth();
            connectInFlightRef.current = false;
            setMetaLoading(false);
            setMetaStatusLoading(false);

            try {
              const connected = await refreshMetaIntegrationState();
              if (connected) {
                setMetaError("");
                setMetaStatusMessage("Integration connected successfully.");
                return;
              }
            } catch (error) {
              console.error("meta popup closed refresh error:", error);
            }

            setMetaStatusMessage("");
            setMetaError(
              "The connection window was closed before authorization was completed. Please try again."
            );
          }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
        }, 500);
        return;
      }
    } catch (err: unknown) {
      console.error("meta connect error:", err);
      setMetaConnected(false);
      setMetaStatusMessage("");
      setMetaError(
        "We could not start the Facebook Pages connection. Try again."
      );
    } finally {
      if (!popupStarted) {
        connectInFlightRef.current = false;
        setMetaLoading(false);
        setMetaStatusLoading(false);
      }
    }
  }

  function handleMetaDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Meta? This will disconnect Facebook Pages and Instagram Business from this workspace. Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    void (async () => {
      try {
        setDisconnectLoading(true);
        setMetaError("");
        setMetaStatusMessage("");
        await disconnectMetaIntegration({
          workspaceId: activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "",
        });
        clearMetaIntegrationSessionState();
        clearPendingMetaOAuth();
        clearMetaOAuthDebugUrl();
        stopPopupPolling();
        setMetaConnected(false);
        await refreshMetaIntegrationState();
        setMetaStatusMessage("Integration disconnected successfully.");
      } catch (error) {
        console.error("meta disconnect error:", error);
        setMetaError("We couldn’t disconnect Meta right now. Please try again.");
      } finally {
        setDisconnectLoading(false);
        setMetaStatusLoading(false);
        setMetaLoading(false);
      }
    })();
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
      postConnectRedirect: "/integrations",
    });

    void handleMetaConnect();
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

      {!metaStatusLoading && !metaConnected ? (
        <section className="mb-5 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5 sm:mb-6 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            There are no connected integrations yet
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You can start with Facebook Pages to validate the full connection, selection, and sync flow.
          </p>
        </section>
      ) : null}

      {metaStatusMessage ? (
        <section className="mb-5 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 sm:mb-6">
          {metaStatusMessage}
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
                ? metaStatusLoading
                  ? "Checking"
                  : metaConnected
                  ? "Connected"
                  : integration.status
                : integration.status
            }
            actionLabel={
              isMetaFrontendIntegrationKey(integration.integrationKey)
                ? metaStatusLoading
                  ? "Checking..."
                  : metaConnected
                  ? undefined
                  : "Connect"
                : integration.actionLabel
            }
            onAction={
              isMetaFrontendIntegrationKey(integration.integrationKey)
                ? metaStatusLoading || metaConnected
                  ? undefined
                  : () =>
                      handleMetaConnectSource(
                        integration.integrationKey as "facebook_pages" | "instagram_business"
                      )
                : undefined
            }
            secondaryActionLabel={
              isMetaFrontendIntegrationKey(integration.integrationKey) &&
              !metaStatusLoading &&
              metaConnected
                ? disconnectLoading
                  ? "Disconnecting..."
                  : "Disconnect"
                : undefined
            }
            onSecondaryAction={
              isMetaFrontendIntegrationKey(integration.integrationKey) &&
              !metaStatusLoading &&
              metaConnected
                ? handleMetaDisconnect
                : undefined
            }
            disabled={!isMetaFrontendIntegrationKey(integration.integrationKey)}
            loading={
              isMetaFrontendIntegrationKey(integration.integrationKey) &&
              (metaLoading || metaStatusLoading || disconnectLoading)
            }
            secondaryLoading={
              isMetaFrontendIntegrationKey(integration.integrationKey) && disconnectLoading
            }
            error={isMetaFrontendIntegrationKey(integration.integrationKey) ? metaError : ""}
            />
        ))}
      </div>

      <section className="mt-6 flex min-h-[180px] w-full max-w-[1400px] flex-col justify-between gap-5 rounded-[28px] border border-sky-100 bg-sky-50/60 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Image
              src="/brand/measurable-logo.svg"
              alt="Measurable"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
              Measurable
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              Which other integrations would you like to get?
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSuggestionOpen(true)}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-50 sm:w-auto"
        >
          Send suggestion
        </button>
      </section>

      <UserSuggestionModal
        open={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
      />
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
