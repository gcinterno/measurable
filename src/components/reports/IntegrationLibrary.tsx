"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/providers/LanguageProvider";
import {
  connectMetaAdsIntegration,
  connectMetaIntegration,
  disconnectMetaAdsIntegration,
  disconnectMetaIntegration,
  fetchMetaAdsAccounts,
  fetchMetaAdsStatus,
  fetchIntegrationsConnectionStatus,
  fetchMetaInstagramAccounts,
  fetchMetaPages,
  validateMetaAuthUrl,
} from "@/lib/api/integrations";
import {
  clearPendingMetaOAuth,
  consumePendingMetaOAuthForRetry,
  createPendingMetaOAuth,
  clearMetaOAuthDebugUrl,
  hasMetaConnectPrerequisites,
  isMetaOAuthWindowMessage,
  markMetaRedirectStarted,
  normalizeMetaAuthUrl,
  openMetaOAuthPopup,
  showMetaOAuthReadyBanner,
  storeMetaOAuthDebugUrl,
} from "@/lib/integrations/meta-oauth";
import {
  isMetaOrganicFrontendIntegrationKey,
  isMetaFrontendIntegrationKey,
  type IntegrationCatalogItem,
  type MetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  createEmptySelectedAccountsBySource,
  clearIntegrationReportContext,
  clearMetaIntegrationSessionState,
  clearStoredMetaIntegrationState,
  getIntegrationReportContext,
  type SelectedAccountsBySource,
  setPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { trackMetaEvent } from "@/lib/tracking/meta";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

type IntegrationLibraryProps = {
  integrations: readonly IntegrationCatalogItem[];
  selectedIntegrationKeys?: string[];
  embedded?: boolean;
  connectedIntegrationKey?: string;
  mode?: "report-flow" | "management";
};

type MetaFlowState =
  | "not_connected"
  | "checking"
  | "connected";

function getMetaDescriptionSuffix(
  integrationKey: MetaFrontendIntegrationKey,
  counts: Record<MetaFrontendIntegrationKey, number>
) {
  if (integrationKey === "meta_ads") {
    const count = counts.meta_ads;
    return ` ${count} connected ad account${count === 1 ? "" : "s"} ready to use.`;
  }

  if (integrationKey === "instagram_business") {
    const count = counts.instagram_business;
    return ` ${count} authorized account${count === 1 ? "" : "s"} ready to use.`;
  }

  const count = counts.facebook_pages;
  return ` ${count} authorized page${count === 1 ? "" : "s"} ready to use.`;
}

function getBadgeClasses(
  status: IntegrationCatalogItem["status"] | "Checking"
) {
  switch (status) {
    case "Connected":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Checking":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    case "Available":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "Coming soon":
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

function SelectionIndicator({
  selected,
  disabled = false,
}: {
  selected: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
        disabled
          ? "border-slate-200 bg-slate-100"
          : selected
            ? "border-sky-600 bg-sky-600 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
            : "border-slate-300 bg-white text-transparent"
      }`}
      aria-hidden="true"
    >
      {selected ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.257a1 1 0 0 1-1.42 0L4.79 10.66a1 1 0 1 1 1.414-1.414l2.596 2.595 6.493-6.545a1 1 0 0 1 1.411-.006Z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </span>
  );
}

function buildNextSelectedContext(input: {
  currentContext: ReturnType<typeof getIntegrationReportContext>;
  workspaceId: string;
  integrationId: string;
  selectedSources: MetaFrontendIntegrationKey[];
  selectedAccountsBySource: SelectedAccountsBySource;
}) {
  const {
    currentContext,
    workspaceId,
    integrationId,
    selectedSources,
    selectedAccountsBySource,
  } = input;
  const firstSource = selectedSources[0] || "";
  const firstSourceAccount = firstSource
    ? selectedAccountsBySource[firstSource]
    : undefined;

  return {
    source: firstSource,
    integration:
      selectedSources.length === 0
        ? ""
        : firstSource === "meta_ads"
          ? "meta_ads"
          : "meta",
    workspaceId: workspaceId || currentContext?.workspaceId || "",
    integrationId:
      firstSourceAccount?.integrationId ||
      integrationId ||
      currentContext?.integrationId,
    adAccountId:
      firstSource === "meta_ads" ? firstSourceAccount?.accountId || undefined : undefined,
    pageId:
      firstSource === "meta_ads" ? undefined : firstSourceAccount?.accountId || undefined,
    pageName: firstSourceAccount?.accountName || undefined,
    datasetId: firstSourceAccount?.datasetId || undefined,
    synced:
      selectedSources.length > 0 &&
      selectedSources.every(
        (sourceKey) => selectedAccountsBySource[sourceKey].syncStatus === "synced"
      ),
    requestedSlides: currentContext?.requestedSlides,
    aiMode: currentContext?.aiMode,
    templateId: currentContext?.templateId,
    timeframe: currentContext?.timeframe,
    startDate: currentContext?.startDate,
    endDate: currentContext?.endDate,
    timeframeSelection: currentContext?.timeframeSelection,
    sharedTimeframe: currentContext?.sharedTimeframe,
    postConnectRedirect: currentContext?.postConnectRedirect,
    selectedSources,
    selectedAccountsBySource,
    reportKind:
      selectedSources.length > 1
        ? ("multi_source" as const)
        : ("single_source" as const),
  };
}

export function IntegrationLibrary({
  integrations,
  selectedIntegrationKeys = [],
  embedded = false,
  connectedIntegrationKey,
  mode = "management",
}: IntegrationLibraryProps) {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const { workspace, loading: workspaceLoading } = useActiveWorkspace();
  const [connectingIntegrationKey, setConnectingIntegrationKey] = useState<string | null>(null);
  const [disconnectingIntegrationKey, setDisconnectingIntegrationKey] = useState<string | null>(null);
  const [connectError, setConnectError] = useState("");
  const [metaFlowState, setMetaFlowState] = useState<MetaFlowState>(
    embedded && mode === "report-flow" ? "checking" : "not_connected"
  );
  const [metaAdsFlowState, setMetaAdsFlowState] = useState<MetaFlowState>(
    embedded && mode === "report-flow" ? "checking" : "not_connected"
  );
  const [metaCounts, setMetaCounts] = useState<Record<MetaFrontendIntegrationKey, number>>({
    facebook_pages: 0,
    instagram_business: 0,
    meta_ads: 0,
  });
  const [currentSelectedSources, setCurrentSelectedSources] = useState<
    MetaFrontendIntegrationKey[]
  >(() => selectedIntegrationKeys.filter(isMetaFrontendIntegrationKey));
  const [metaIntegrationId, setMetaIntegrationId] = useState(
    storedIntegrationContext?.integration === "meta"
      ? storedIntegrationContext.integrationId || ""
      : ""
  );
  const [metaAdsIntegrationId, setMetaAdsIntegrationId] = useState(
    storedIntegrationContext?.source === "meta_ads"
      ? storedIntegrationContext.integrationId || ""
      : ""
  );
  const activeWorkspaceId = workspace?.id || null;
  const connectInFlightRef = useRef(false);
  const popupPollRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);
  const maxSources = 2;
  const isReportFlowMode = mode === "report-flow";

  const stopPopupPolling = useCallback(() => {
    if (popupPollRef.current !== null && typeof window !== "undefined") {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
    if (popupTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
  }, []);

  const refreshMetaState = useCallback(async () => {
    if (!embedded) {
      return false;
    }

    let resolvedIntegrationId = metaIntegrationId;

    if (!resolvedIntegrationId) {
      const connectionStatus = await fetchIntegrationsConnectionStatus();

      if (!connectionStatus.metaConnected || !connectionStatus.integrationId) {
        clearMetaIntegrationSessionState();
        setCurrentSelectedSources([]);
        setMetaIntegrationId("");
        setMetaCounts({
          facebook_pages: 0,
          instagram_business: 0,
          meta_ads: 0,
        });
        setMetaFlowState("not_connected");
        return false;
      }

      resolvedIntegrationId = connectionStatus.integrationId;
      setMetaIntegrationId(connectionStatus.integrationId);
    }

    const [pages, instagramAccounts] = await Promise.all([
      fetchMetaPages(resolvedIntegrationId, activeWorkspaceId),
      fetchMetaInstagramAccounts(resolvedIntegrationId, activeWorkspaceId),
    ]);

    setMetaCounts({
      facebook_pages: pages.length,
      instagram_business: instagramAccounts.length,
      meta_ads: metaCounts.meta_ads,
    });
    setMetaFlowState("connected");

    return true;
  }, [activeWorkspaceId, embedded, metaCounts.meta_ads, metaIntegrationId]);

  const refreshMetaAdsState = useCallback(async () => {
    if (!embedded) {
      return false;
    }

    const status = await fetchMetaAdsStatus(activeWorkspaceId);

    if (!status.connected || !status.integrationId) {
      setMetaAdsIntegrationId("");
      setMetaCounts((current) => ({
        ...current,
        meta_ads: 0,
      }));
      setMetaAdsFlowState("not_connected");
      return false;
    }

    const accounts = await fetchMetaAdsAccounts({
      integrationId: status.integrationId,
      workspaceId: activeWorkspaceId,
    });

    setMetaAdsIntegrationId(status.integrationId);
    setMetaCounts((current) => ({
      ...current,
      meta_ads: accounts.length,
    }));
    setMetaAdsFlowState("connected");
    return true;
  }, [activeWorkspaceId, embedded]);

  useEffect(() => {
    setCurrentSelectedSources(selectedIntegrationKeys.filter(isMetaFrontendIntegrationKey));
  }, [selectedIntegrationKeys]);

  useEffect(() => {
    if (!embedded) {
      return;
    }

    const hasCallbackParams =
      Boolean(searchParams.get("status")) ||
      Boolean(searchParams.get("integration_id")) ||
      Boolean(searchParams.get("error")) ||
      Boolean(searchParams.get("meta_state")) ||
      Boolean(searchParams.get("meta_error"));
    const retryAuthUrl = consumePendingMetaOAuthForRetry({
      route: "/reports/new/flow",
      hasCallbackParams,
    });

    if (!retryAuthUrl || connectInFlightRef.current || typeof window === "undefined") {
      return;
    }

    window.location.href = retryAuthUrl;
  }, [embedded, searchParams]);

  useEffect(() => {
    const currentContext = getIntegrationReportContext();

    if (currentContext?.integration === "meta" && currentContext.integrationId) {
      setMetaIntegrationId(currentContext.integrationId);
      return;
    }

    setMetaIntegrationId("");
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMetaState() {
      if (!embedded) {
        return;
      }

      try {
        setMetaFlowState("checking");
        let resolvedIntegrationId = metaIntegrationId;

        if (!resolvedIntegrationId) {
          const connectionStatus = await fetchIntegrationsConnectionStatus();

          if (!active) {
            return;
          }

          if (connectionStatus.metaConnected && connectionStatus.integrationId) {
            resolvedIntegrationId = connectionStatus.integrationId;
            setMetaIntegrationId(connectionStatus.integrationId);
          } else {
            clearMetaIntegrationSessionState();
            setCurrentSelectedSources([]);
            setMetaIntegrationId("");
            setMetaCounts({
              facebook_pages: 0,
              instagram_business: 0,
              meta_ads: 0,
            });
            setMetaFlowState("not_connected");
            return;
          }
        }

        const [pages, instagramAccounts] = await Promise.all([
          fetchMetaPages(resolvedIntegrationId, activeWorkspaceId),
          fetchMetaInstagramAccounts(resolvedIntegrationId, activeWorkspaceId),
        ]);

        if (active) {
          setMetaCounts({
            facebook_pages: pages.length,
            instagram_business: instagramAccounts.length,
            meta_ads: metaCounts.meta_ads,
          });
          setMetaFlowState("connected");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta flow status load error:", error);
        setMetaCounts({
          facebook_pages: 0,
          instagram_business: 0,
          meta_ads: 0,
        });
        setMetaIntegrationId("");
        setMetaFlowState("not_connected");
      }
    }

    void loadMetaState();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, embedded, metaCounts.meta_ads, metaIntegrationId]);

  useEffect(() => {
    let active = true;

    async function loadMetaAdsState() {
      if (!embedded) {
        return;
      }

      try {
        setMetaAdsFlowState("checking");
        const connected = await refreshMetaAdsState();

        if (!active || connected) {
          return;
        }
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta ads flow status load error:", error);
        setMetaCounts((current) => ({
          ...current,
          meta_ads: 0,
        }));
        setMetaAdsIntegrationId("");
        setMetaAdsFlowState("not_connected");
      }
    }

    void loadMetaAdsState();

    return () => {
      active = false;
    };
  }, [embedded, refreshMetaAdsState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function handleMetaWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || !isMetaOAuthWindowMessage(event.data)) {
        return;
      }

      stopPopupPolling();
      clearPendingMetaOAuth();
      connectInFlightRef.current = false;
      setConnectingIntegrationKey(null);

      if (event.data.type === "MEASURABLE_META_CONNECT_SUCCESS") {
        setConnectError("");

        if (connectingIntegrationKey === "meta_ads" && event.data.integrationId) {
          setMetaAdsIntegrationId(event.data.integrationId);
        } else if (event.data.integrationId) {
          setMetaIntegrationId(event.data.integrationId);
        }

        try {
          const connected =
            connectingIntegrationKey === "meta_ads"
              ? await refreshMetaAdsState()
              : await refreshMetaState();
          if (connected) {
            void trackMetaEvent("MetaConnected", {
              source: connectingIntegrationKey || "meta",
              surface: "report_flow",
            });
          }
        } catch (error) {
          console.error("integration library popup refresh error:", error);
          setConnectError("The connection finished, but we couldn’t refresh the status.");
        }

        return;
      }

      setConnectError(event.data.message || "We couldn’t complete the Meta connection.");
    }

    window.addEventListener("message", handleMetaWindowMessage);

    return () => {
      stopPopupPolling();
      window.removeEventListener("message", handleMetaWindowMessage);
    };
  }, [connectingIntegrationKey, refreshMetaAdsState, refreshMetaState, stopPopupPolling]);

  const metaUi = useMemo(() => {
    switch (metaFlowState) {
      case "connected":
        return {
          badge: "Connected" as const,
        };
      case "checking":
        return {
          badge: "Checking" as const,
        };
      case "not_connected":
      default:
        return {
          badge: "Available" as const,
        };
    }
  }, [metaFlowState]);

  async function handleDirectConnect(integration: IntegrationCatalogItem) {
    if (!isMetaFrontendIntegrationKey(integration.integrationKey)) {
      return;
    }

    if (connectInFlightRef.current) {
      console.warn("META_CONNECT_DUPLICATE_IGNORED", {
        route: "IntegrationLibrary",
        source: integration.integrationKey,
      });
      return;
    }

    let popupStarted = false;

    try {
      connectInFlightRef.current = true;
      setConnectingIntegrationKey(integration.integrationKey);
      setConnectError("");
      clearMetaOAuthDebugUrl();
      const currentContext = getIntegrationReportContext();
      const contextWorkspaceId =
        activeWorkspaceId || currentContext?.workspaceId || "";
      const { tokenReady } = hasMetaConnectPrerequisites();

      if (!tokenReady) {
        setConnectError("Your session is not ready yet. Refresh and try again.");
        return;
      }

      if (!contextWorkspaceId || workspaceLoading) {
        setConnectError(
          "No active workspace selected. Please choose a workspace and try again."
        );
        return;
      }

      if (embedded) {
        if (isMetaOrganicFrontendIntegrationKey(integration.integrationKey)) {
          setPendingMetaSource(integration.integrationKey);
        }
        setIntegrationReportContext({
          source: integration.integrationKey,
          integration:
            integration.integrationKey === "meta_ads" ? "meta_ads" : "meta",
          workspaceId: contextWorkspaceId,
          integrationId: undefined,
          pageId: undefined,
          pageName: undefined,
          datasetId: undefined,
          synced: false,
          requestedSlides: currentContext?.requestedSlides,
          aiMode: currentContext?.aiMode,
          postConnectRedirect: "/reports/new/flow",
          selectedSources: [integration.integrationKey],
          selectedAccountsBySource: createEmptySelectedAccountsBySource(),
          reportKind: "single_source",
        });
      }

      clearStoredMetaIntegrationState();

      console.info("META_CONNECT_START", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        route: "IntegrationLibrary",
      });

      if (integration.integrationKey === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_CONNECT_CLICKED", {
          route: "IntegrationLibrary",
          integration_type: "instagram_business",
          workspace_id: contextWorkspaceId,
        });
      }

      const response =
        integration.integrationKey === "meta_ads"
          ? await connectMetaAdsIntegration({
              workspaceId: contextWorkspaceId,
              source: "meta_ads",
            })
          : await connectMetaIntegration({
              workspaceId: contextWorkspaceId,
              source: integration.integrationKey,
            });

      const rawAuthUrl = response.authUrlFromBackend || response.redirectUrl;
      const normalizedSource =
        integration.integrationKey === "meta_ads"
          ? "meta_ads"
          : integration.integrationKey === "instagram_business"
            ? "instagram_business"
            : "facebook_pages";
      const authUrl = normalizeMetaAuthUrl(rawAuthUrl, normalizedSource);
      const validation = validateMetaAuthUrl(authUrl, normalizedSource);

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        integration_type: integration.integrationKey,
        auth_url: authUrl || null,
        integration_id: response.integrationId || null,
      });

      if (integration.integrationKey === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_AUTH_URL_RECEIVED", {
          route: "IntegrationLibrary",
          integration_type: "instagram_business",
          workspace_id: contextWorkspaceId,
          auth_url: authUrl || null,
          integration_id: response.integrationId || null,
        });
      }

      console.info("META_CONNECT_AUTH_URL_FINAL", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        integration_type: integration.integrationKey,
        auth_url: authUrl || null,
        starts_with_expected_domain: validation.startsWithExpectedDomain,
        contains_expected_oauth_path: validation.containsExpectedOAuthPath,
      });

      if (!validation.isValid) {
        console.error("META_CONNECT_INVALID_AUTH_URL", {
          workspace_id: contextWorkspaceId,
          source: integration.integrationKey,
          integration_type: integration.integrationKey,
          auth_url: authUrl || null,
          starts_with_expected_domain: validation.startsWithExpectedDomain,
          contains_expected_oauth_path: validation.containsExpectedOAuthPath,
        });
        if (integration.integrationKey === "instagram_business") {
          console.info("INSTAGRAM_BUSINESS_CONNECT_FAILED", {
            route: "IntegrationLibrary",
            integration_type: "instagram_business",
            workspace_id: contextWorkspaceId,
            auth_url: authUrl || null,
          });
        }
        throw new Error(
          "The backend did not return a valid Meta OAuth URL for the selected integration."
        );
      }

      createPendingMetaOAuth({
        authUrl,
        source: integration.integrationKey,
        route: "IntegrationLibrary",
        transport: "popup",
      });
      storeMetaOAuthDebugUrl(authUrl);
      await showMetaOAuthReadyBanner();

      if (typeof window !== "undefined") {
        markMetaRedirectStarted();
        const popup = openMetaOAuthPopup(authUrl);

        if (!popup) {
          window.location.href = authUrl;
          return;
        }

        popupStarted = true;
        stopPopupPolling();
        popupTimeoutRef.current = window.setTimeout(() => {
          connectInFlightRef.current = false;
          setConnectingIntegrationKey(null);
          setConnectError(
            "If you finished connecting, you can now close the Meta tab."
          );
        }, 90000);
        popupPollRef.current = window.setInterval(async () => {
          if (!popup.closed) {
            return;
          }

          stopPopupPolling();
          clearPendingMetaOAuth();
          connectInFlightRef.current = false;
          setConnectingIntegrationKey(null);

          try {
            const connectedAfterClose = await refreshMetaState();
            if (connectedAfterClose) {
              void trackMetaEvent("MetaConnected", {
                source: integration.integrationKey,
                surface: "report_flow",
              });
              setConnectError("");
              return;
            }
          } catch (error) {
            console.error("integration library popup closed refresh error:", error);
          }

          setConnectError("The connection window closed before authorization was completed.");
        }, 2500);
      }
    } catch (error) {
      console.error("direct integration connect error:", error);
      if (integration.integrationKey === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_CONNECT_FAILED", {
          route: "IntegrationLibrary",
          integration_type: "instagram_business",
          workspace_id: contextWorkspaceId,
          reason: error instanceof Error ? error.message : "unknown_error",
        });
      }
      setConnectError("We could not start the Facebook Pages connection. Try again.");
    } finally {
      if (!popupStarted) {
        connectInFlightRef.current = false;
        setConnectingIntegrationKey(null);
      }
    }
  }

  function handleMetaSelect(integrationKey: MetaFrontendIntegrationKey) {
    const nextContext = getIntegrationReportContext();
    const existingSelectedSources = currentSelectedSources;
    const alreadySelected = existingSelectedSources.includes(integrationKey);
    const nextSelectedSources = alreadySelected
      ? existingSelectedSources.filter((sourceKey) => sourceKey !== integrationKey)
      : [...existingSelectedSources, integrationKey];
    const mixesMetaAdsWithOrganic =
      nextSelectedSources.includes("meta_ads") &&
      nextSelectedSources.some((sourceKey) => sourceKey !== "meta_ads");

    if (!alreadySelected && nextSelectedSources.length > maxSources) {
      setConnectError(`You can select up to ${maxSources} sources for one report.`);
      return;
    }

    if (mixesMetaAdsWithOrganic) {
      setConnectError(
        "Meta Ads currently supports single-source reports only. Select Meta Ads by itself."
      );
      return;
    }

    const selectedAccountsBySource = {
      ...(nextContext?.selectedAccountsBySource || createEmptySelectedAccountsBySource()),
    };

    if (!alreadySelected) {
      selectedAccountsBySource[integrationKey] = {
        ...selectedAccountsBySource[integrationKey],
        integrationId:
          (integrationKey === "meta_ads" ? metaAdsIntegrationId : metaIntegrationId) ||
          selectedAccountsBySource[integrationKey].integrationId,
      };
    } else {
      selectedAccountsBySource[integrationKey] = {
        ...createEmptySelectedAccountsBySource()[integrationKey],
        integrationId: "",
      };
    }

    setCurrentSelectedSources(nextSelectedSources);
    setIntegrationReportContext(
      buildNextSelectedContext({
        currentContext: nextContext,
        workspaceId: activeWorkspaceId || nextContext?.workspaceId || "",
        integrationId:
          integrationKey === "meta_ads" ? metaAdsIntegrationId : metaIntegrationId,
        selectedSources: nextSelectedSources,
        selectedAccountsBySource,
      })
    );
    setConnectError("");
  }

  function handleContinueWithSelectedSources() {
    if (currentSelectedSources.length === 0) {
      setConnectError("Select at least one source to continue.");
      return;
    }

    const nextContext = getIntegrationReportContext();
    const selectedAccountsBySource =
      nextContext?.selectedAccountsBySource || createEmptySelectedAccountsBySource();

    setIntegrationReportContext(
      buildNextSelectedContext({
        currentContext: nextContext,
        workspaceId: activeWorkspaceId || nextContext?.workspaceId || "",
        integrationId:
          currentSelectedSources[0] === "meta_ads"
            ? metaAdsIntegrationId
            : metaIntegrationId,
        selectedSources: currentSelectedSources,
        selectedAccountsBySource,
      })
    );
    router.push(`/reports/new/flow/sync?integration=${currentSelectedSources[0]}`);
  }

  async function handleMetaDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Meta? This will disconnect Facebook Pages and Instagram Business from this workspace. Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const currentContext = getIntegrationReportContext();
      setDisconnectingIntegrationKey("meta");
      setConnectError("");
      await disconnectMetaIntegration({
        workspaceId: activeWorkspaceId || currentContext?.workspaceId || "",
      });
      clearMetaIntegrationSessionState();
      setCurrentSelectedSources([]);
      setMetaIntegrationId("");
      setMetaCounts({
        facebook_pages: 0,
        instagram_business: 0,
        meta_ads: 0,
      });
      setMetaFlowState("not_connected");
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("resume");
      router.replace(`/reports/new/flow${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
    } catch (error) {
      console.error("integration library disconnect error:", error);
      setConnectError("We couldn’t disconnect Meta right now. Please try again.");
    } finally {
      setDisconnectingIntegrationKey(null);
    }
  }

  async function handleMetaAdsDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Meta Ads? Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const currentContext = getIntegrationReportContext();
      setDisconnectingIntegrationKey("meta_ads");
      setConnectError("");
      await disconnectMetaAdsIntegration({
        workspaceId: activeWorkspaceId || currentContext?.workspaceId || "",
      });
      if (currentContext?.source === "meta_ads") {
        clearMetaIntegrationSessionState();
      }
      setCurrentSelectedSources((current) =>
        current.filter((sourceKey) => sourceKey !== "meta_ads")
      );
      setMetaAdsIntegrationId("");
      setMetaCounts((current) => ({
        ...current,
        meta_ads: 0,
      }));
      setMetaAdsFlowState("not_connected");
    } catch (error) {
      console.error("integration library meta ads disconnect error:", error);
      setConnectError("We couldn’t disconnect Meta Ads right now. Please try again.");
    } finally {
      setDisconnectingIntegrationKey(null);
    }
  }

  function renderCardActions(input: {
    integration: IntegrationCatalogItem;
    isOrganicMeta: boolean;
    isMetaAds: boolean;
    isMetaConnected: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    isSelected: boolean;
    isComingSoon: boolean;
  }) {
    const {
      integration,
      isOrganicMeta,
      isMetaAds,
      isMetaConnected,
      isConnected,
      isConnecting,
      isSelected,
      isComingSoon,
    } = input;

    if (isReportFlowMode) {
      if (isComingSoon) {
        return (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-70 blur-[0.2px]"
          >
            {messages.common.comingSoon}
          </button>
        );
      }

      if ((isOrganicMeta && metaFlowState === "checking") || (isMetaAds && metaAdsFlowState === "checking")) {
        return (
          <button
            type="button"
            disabled
            className="inline-flex cursor-wait items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
          >
            Checking connection...
          </button>
        );
      }

      if ((isOrganicMeta || isMetaAds) && isMetaConnected) {
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleMetaSelect(integration.integrationKey as MetaFrontendIntegrationKey);
            }}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              isSelected
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                : "bg-slate-950 !text-white hover:bg-slate-800"
            }`}
          >
            {isSelected ? "Selected" : "Select"}
          </button>
        );
      }

      if (isOrganicMeta || isMetaAds) {
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleDirectConnect(integration);
            }}
            disabled={isConnecting}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isConnecting
              ? messages.integrationsPage.connecting
              : messages.common.connect}
          </button>
        );
      }

      return (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-70 blur-[0.2px]"
        >
          {messages.common.comingSoon}
        </button>
      );
    }

    if ((isOrganicMeta || isMetaAds) && embedded && isMetaConnected) {
      return (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleMetaSelect(integration.integrationKey as MetaFrontendIntegrationKey);
            }}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
              isSelected
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                : "bg-slate-950 !text-white hover:bg-slate-800"
            }`}
            disabled={disconnectingIntegrationKey === integration.integrationKey}
          >
            {isSelected ? "Selected" : "Select"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void (isMetaAds ? handleMetaAdsDisconnect() : handleMetaDisconnect());
            }}
            disabled={disconnectingIntegrationKey === integration.integrationKey}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disconnectingIntegrationKey === integration.integrationKey ? "Disconnecting..." : "Disconnect"}
          </button>
        </>
      );
    }

      if (
        (isOrganicMeta && embedded && metaFlowState === "checking") ||
        (isMetaAds && embedded && metaAdsFlowState === "checking")
      ) {
        return (
          <button
            type="button"
            disabled
            className="inline-flex cursor-wait items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
          >
          Checking connection...
          </button>
        );
      }

    if (!isOrganicMeta && !isMetaAds && isConnected && embedded) {
      return (
        <>
          <Link
            href={`/reports/new/flow/sync?integration=${integration.integrationKey}`}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
          >
            Continuar con {integration.name}
          </Link>
          <button
            type="button"
            onClick={() => {
              clearIntegrationReportContext();
              const nextParams = new URLSearchParams(searchParams.toString());
              nextParams.set("integration", integration.integrationKey);
              router.replace(`/reports/new/flow?${nextParams.toString()}`);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Desconectar integracion
          </button>
        </>
      );
    }

    if (
      embedded &&
      ((isOrganicMeta && metaFlowState === "not_connected") ||
        (isMetaAds && metaAdsFlowState === "not_connected"))
    ) {
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleDirectConnect(integration);
          }}
          disabled={isConnecting}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isConnecting
            ? messages.integrationsPage.connecting
            : messages.common.connect}
        </button>
      );
    }

    if (isComingSoon) {
      return (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-70 blur-[0.2px]"
        >
          {messages.common.comingSoon}
        </button>
      );
    }

    return (
      <Link
        href={
          embedded
            ? integration.status === "Connected"
              ? `/reports/new/flow/sync?integration=${integration.integrationKey}`
              : integration.detailHref || "/integrations"
            : integration.detailHref || "/integrations"
        }
        className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
          integration.status === "Available" || integration.status === "Connected"
            ? "bg-slate-950 !text-white hover:bg-slate-800"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
        }`}
      >
        {integration.status === "Connected"
          ? embedded
            ? messages.reports.confirmIntegration
            : messages.reports.useIntegration
          : integration.status === "Available"
            ? embedded
              ? integration.actionLabel
              : messages.reports.useIntegration
            : messages.reports.viewIntegration}
      </Link>
    );
  }

  return (
    <section
      className={
        embedded
          ? "mt-8"
          : "rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {embedded ? messages.reports.step1 : messages.reports.allIntegrations}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {embedded ? messages.reports.chooseIntegration : messages.reports.allIntegrations}
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          {embedded
            ? messages.reports.chooseIntegrationDescription
            : messages.reports.allIntegrationsDescription}
        </p>
      </div>

      {connectError ? (
        <p className="mt-4 text-sm text-red-600">{connectError}</p>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const selected = currentSelectedSources.includes(
            integration.integrationKey as MetaFrontendIntegrationKey
          );
          const connected = integration.integrationKey === connectedIntegrationKey;
          const isMeta = isMetaFrontendIntegrationKey(integration.integrationKey);
          const isOrganicMeta = isMetaOrganicFrontendIntegrationKey(
            integration.integrationKey
          );
          const isMetaAds = integration.integrationKey === "meta_ads";
          const metaConnected =
            (isOrganicMeta && metaFlowState === "connected") ||
            (isMetaAds && metaAdsFlowState === "connected");
          const blockedComingSoon =
            !isMeta && integration.status !== "Connected";
          const isConnecting = connectingIntegrationKey === integration.integrationKey;
          const badgeLabel =
            isOrganicMeta && embedded
              ? metaUi.badge
              : isMetaAds && embedded
                ? metaAdsFlowState === "connected"
                  ? "Connected"
                  : metaAdsFlowState === "checking"
                    ? "Checking"
                    : "Available"
                : integration.status;
          const titleBadge =
            isMeta && embedded
              ? badgeLabel
              : selected
                ? messages.common.selected
                : badgeLabel;
          const metaDescriptionSuffix =
            isMeta && embedded && metaConnected
              ? getMetaDescriptionSuffix(
                  integration.integrationKey as MetaFrontendIntegrationKey,
                  metaCounts
                )
              : "";
          const canToggleSelection =
            isReportFlowMode &&
            isMeta &&
            embedded &&
            metaConnected &&
            !blockedComingSoon;

          return (
            <article
              key={integration.integrationKey}
              onClick={
                canToggleSelection
                  ? () =>
                      handleMetaSelect(
                        integration.integrationKey as MetaFrontendIntegrationKey
                      )
                  : undefined
              }
              className={`rounded-[24px] border p-4 transition ${
                selected
                  ? "border-sky-300 bg-sky-50/60 shadow-[0_0_0_1px_rgba(125,211,252,0.45)]"
                  : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
              } ${canToggleSelection ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                  <Image
                    src={integration.logoUrl}
                    alt={integration.logoAlt}
                    width={24}
                    height={24}
                    className="h-6 w-6"
                    unoptimized
                  />
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
                    badgeLabel
                  )}`}
                >
                  {titleBadge}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {integration.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {integration.description}
                {metaDescriptionSuffix}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {renderCardActions({
                  integration,
                  isOrganicMeta,
                  isMetaAds,
                  isMetaConnected: metaConnected,
                  isConnected: connected,
                  isConnecting,
                  isSelected: selected,
                  isComingSoon: blockedComingSoon,
                })}
              </div>

              <div className="mt-4 flex justify-end">
                {canToggleSelection ? (
                  <button
                    type="button"
                    aria-label={selected ? `Unselect ${integration.name}` : `Select ${integration.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMetaSelect(
                        integration.integrationKey as MetaFrontendIntegrationKey
                      );
                    }}
                    className="rounded-full"
                  >
                    <SelectionIndicator selected={selected} />
                  </button>
                ) : isMeta && embedded ? (
                  <SelectionIndicator selected={false} disabled />
                ) : null}
              </div>

            </article>
          );
        })}
      </div>

            {embedded && isReportFlowMode ? (
        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {`${currentSelectedSources.length} source${currentSelectedSources.length === 1 ? "" : "s"} selected`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              You can configure up to {maxSources} sources in the next step.
            </p>
          </div>
          <button
            type="button"
            onClick={handleContinueWithSelectedSources}
            disabled={currentSelectedSources.length === 0}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Continue
          </button>
        </div>
      ) : null}
    </section>
  );
}
