"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { MetaConnectChoiceModal } from "@/components/integrations/MetaConnectChoiceModal";
import { AppShell } from "@/components/layout/AppShell";
import { UserSuggestionModal } from "@/components/suggestions/UserSuggestionModal";
import { ApiError } from "@/lib/api";
import {
  connectMetaAdsIntegration,
  connectInstagramBusinessIntegration,
  connectMetaIntegration,
  disconnectMetaAdsIntegration,
  disconnectMetaIntegration,
  fetchMetaAdsAccounts,
  fetchMetaAdsStatus,
  fetchMetaInstagramAccountsCatalog,
  fetchMetaPagesCatalog,
  fetchIntegrationsConnectionStatus,
  fetchInstagramBusinessStatus,
  isIntegrationConnectedStatus,
  validateMetaAuthUrl,
} from "@/lib/api/integrations";
import {
  clearPendingMetaOAuth,
  consumePendingMetaOAuthForRetry,
  createPendingMetaOAuth,
  clearMetaOAuthDebugUrl,
  getMetaOAuthRequestedScopes,
  getMetaOAuthFriendlyErrorMessage,
  hasMetaConnectPrerequisites,
  isIntegrationOAuthCompleteMessage,
  isMetaOAuthWindowMessage,
  type IntegrationOAuthCompleteMessage,
  logMetaOAuthDev,
  markMetaRedirectStarted,
  META_OAUTH_POPUP_CLOSE_GRACE_MS,
  META_OAUTH_POPUP_FEATURES,
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
  isMetaOrganicFrontendIntegrationKey,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import { trackMetaEvent } from "@/lib/tracking/meta";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

type MetaRefreshResult = {
  connected: boolean;
  integrationId: string;
  instagramBusinessConnected: boolean;
  facebookPagesCount: number;
  instagramAccountsCount: number;
  catalogsLoaded: boolean;
};

type PopupProvider = "facebook_pages" | "instagram_business" | "meta_ads";

type PopupStatusSnapshot = {
  provider: PopupProvider;
  status: string;
  connected: boolean;
  assetCount: number;
};

function normalizeProviderStatus(status?: string | null) {
  return (status || "").trim().toLowerCase();
}

function isPopupResolvedStatus(status?: string | null) {
  const normalizedStatus = normalizeProviderStatus(status);

  return isIntegrationConnectedStatus(normalizedStatus) || normalizedStatus === "needs_permission";
}

function isAvailableProviderStatus(status?: string | null) {
  const normalizedStatus = normalizeProviderStatus(status);

  return (
    normalizedStatus === "" ||
    normalizedStatus === "available" ||
    normalizedStatus === "no_token" ||
    normalizedStatus === "disconnected"
  );
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getMetaAdsCardStatus(input: {
  loading: boolean;
  status: string;
  connected: boolean;
}) {
  if (input.loading) {
    return "Checking" as const;
  }

  switch ((input.status || "").toLowerCase()) {
    case "needs_permission":
      return "Needs permission" as const;
    case "config_missing":
      return "Configuration missing" as const;
    default:
      return isIntegrationConnectedStatus(input.status) || input.connected
        ? ("Connected" as const)
        : ("Available" as const);
  }
}

function getMetaAdsActionLabel(input: {
  status: string;
  connected: boolean;
}) {
  if (normalizeProviderStatus(input.status) === "needs_permission") {
    return "Reconnect";
  }

  return isIntegrationConnectedStatus(input.status) || input.connected ? "Disconnect" : "Connect";
}

function getMetaAdsHelperText(input: {
  connected: boolean;
  status: string;
  accountsCount: number;
  lastSyncedAt: string;
}) {
  switch ((input.status || "").toLowerCase()) {
    case "needs_permission":
      return "Reconnect and approve the required permissions.";
    case "connected_no_assets":
    case "connected_no_assets_found":
    case "connected_no_assets_available":
    case "connected_empty":
    case "connected_no_ad_accounts":
    case "no_authorized_assets":
      return "Connected, but no assets were found.";
    case "config_missing":
      return "Meta Ads OAuth is not fully configured.";
    default:
      return isIntegrationConnectedStatus(input.status) || input.connected
        ? input.accountsCount > 0
        ? `${input.accountsCount} ad account${input.accountsCount === 1 ? "" : "s"} ready.${input.lastSyncedAt ? ` Last synced ${new Date(input.lastSyncedAt).toLocaleString()}.` : ""}`
        : "Connected, but no assets were found."
        : "Connect ad accounts to generate paid media performance reports.";
  }
}

function getMetaAdsStatusMessage(input: {
  status?: string;
  message?: string;
  missingScopes?: string[];
}) {
  const status = (input.status || "").toLowerCase();

  if ((input.missingScopes?.length || 0) > 0) {
    return "Meta Ads needs additional permissions. Please reconnect and approve all requested access.";
  }

  if (status === "needs_permission") {
    return "Reconnect and approve the required permissions.";
  }

  if (
    status === "connected_no_assets" ||
    status === "connected_no_assets_found" ||
    status === "connected_no_assets_available" ||
    status === "connected_empty" ||
    status === "connected_no_ad_accounts" ||
    status === "no_authorized_assets"
  ) {
    return "Connected, but no assets were found.";
  }

  if (status === "config_missing") {
    return "Meta Ads OAuth is not fully configured.";
  }

  if (status === "connected") {
    return "Meta Ads connected successfully.";
  }

  return input.message || "";
}

function getInstagramBusinessCardStatus(input: {
  loading: boolean;
  status: string;
  connected: boolean;
  assetCount: number;
}) {
  if (input.loading) {
    return "Checking" as const;
  }

  if (normalizeProviderStatus(input.status) === "needs_permission") {
    return "Needs permission" as const;
  }

  if (isIntegrationConnectedStatus(input.status) || input.connected) {
    return "Connected" as const;
  }

  switch ((input.status || "").toLowerCase()) {
    case "config_missing":
      return "Configuration missing" as const;
    case "needs_page_ig_link":
    case "needs_business_or_creator_account":
      return "Needs setup" as const;
    case "no_token":
    case "disconnected":
    case "available":
      return "Available" as const;
    default:
      return isIntegrationConnectedStatus(input.status) || input.connected
        ? ("Connected" as const)
        : ("Available" as const);
  }
}

function getInstagramBusinessActionLabel(input: {
  status: string;
  connected: boolean;
}) {
  if (normalizeProviderStatus(input.status) === "needs_permission") {
    return "Reconnect";
  }

  return isIntegrationConnectedStatus(input.status) || input.connected ? "Disconnect" : "Connect";
}

function getInstagramBusinessHelperText(input: {
  connected: boolean;
  status: string;
  assetCount: number;
}) {
  const status = (input.status || "").toLowerCase();

  if (status === "connected" && input.connected && input.assetCount > 0) {
    return `${input.assetCount} Instagram account${input.assetCount === 1 ? "" : "s"} ready.`;
  }

  if (
    status === "connected_no_assets" ||
    status === "connected_no_instagram_accounts"
  ) {
    return "Connected, but no assets were found.";
  }

  if (input.connected && input.assetCount === 0) {
    return "Connected, but no assets were found.";
  }

  if (status === "needs_page_ig_link") {
    return "Connected, but no assets were found.";
  }

  if (status === "needs_business_or_creator_account") {
    return "Instagram must be Business or Creator to report insights.";
  }

  if (status === "needs_permission") {
    return "Reconnect and approve the required permissions.";
  }

  if (status === "config_missing") {
    return "Instagram Business OAuth is not fully configured.";
  }

  return "Connect Instagram Business accounts linked to your Facebook Pages.";
}

function isInstagramBusinessMessageSource(message: {
  provider?: string;
  source?: string;
  integration_type?: string;
}) {
  return (
    message.provider === "instagram_business" ||
    message.source === "instagram_business" ||
    message.integration_type === "instagram_business"
  );
}

function isInstagramBusinessMissingPermissionsStatus(status?: string) {
  const normalized = (status || "").toLowerCase();

  return (
    normalized === "needs_permission" ||
    normalized === "missing_permissions" ||
    normalized === "insufficient_permissions" ||
    normalized === "permissions_required"
  );
}

function isInstagramBusinessProcessedStatus(status?: string) {
  const normalized = (status || "").toLowerCase();

  return (
    normalized === "connected" ||
    normalized === "connected_no_assets" ||
    normalized === "needs_page_ig_link"
  );
}

function getInstagramBusinessStatusMessage(input: {
  status?: string;
  connected?: boolean;
  assetCount?: number;
  missingScopes?: string[];
  message?: string;
}) {
  const status = (input.status || "").toLowerCase();
  const assetCount = input.assetCount || 0;

  if (
    isInstagramBusinessMissingPermissionsStatus(status) ||
    (input.missingScopes?.length || 0) > 0
  ) {
    return "Instagram Business needs additional permissions. Please reconnect and approve all requested access.";
  }

  if (input.connected && assetCount > 0) {
    return "Instagram Business connected successfully.";
  }

  if (
    status === "connected_no_assets" ||
    status === "connected_no_instagram_accounts" ||
    status === "needs_page_ig_link" ||
    (input.connected && assetCount === 0)
  ) {
    return "Connected, but no assets were found.";
  }

  return input.message || "";
}

function isInstagramDirectLoginReviewError(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("insufficient_developer_role") ||
    normalized.includes("insufficient developer role") ||
    normalized.includes("needs_app_review") ||
    normalized.includes("app review")
  );
}

function IntegrationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspace, loading: workspaceLoading } = useActiveWorkspace();
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaStatusLoading, setMetaStatusLoading] = useState(true);
  const [metaCatalogsLoading, setMetaCatalogsLoading] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [metaStatusMessage, setMetaStatusMessage] = useState("");
  const [metaReconnectMessage, setMetaReconnectMessage] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);
  const [instagramBusinessConnected, setInstagramBusinessConnected] = useState(false);
  const [instagramBusinessStatus, setInstagramBusinessStatus] = useState("");
  const [instagramBusinessAssetCount, setInstagramBusinessAssetCount] = useState(0);
  const [instagramBusinessError, setInstagramBusinessError] = useState("");
  const [metaAdsConnected, setMetaAdsConnected] = useState(false);
  const [metaAdsStatus, setMetaAdsStatus] = useState("");
  const [metaAdsLoading, setMetaAdsLoading] = useState(false);
  const [metaAdsDisconnectLoading, setMetaAdsDisconnectLoading] = useState(false);
  const [metaAdsError, setMetaAdsError] = useState("");
  const [metaAdsStatusMessage, setMetaAdsStatusMessage] = useState("");
  const [metaAdsAccountsCount, setMetaAdsAccountsCount] = useState(0);
  const [metaAdsLastSyncedAt, setMetaAdsLastSyncedAt] = useState("");
  const [metaConnectMode, setMetaConnectMode] = useState<"connect" | "reconnect" | null>(
    null
  );
  const [facebookPagesCount, setFacebookPagesCount] = useState(0);
  const [instagramAccountsCount, setInstagramAccountsCount] = useState(0);
  const [metaCatalogsResolved, setMetaCatalogsResolved] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [facebookPagesChoiceOpen, setFacebookPagesChoiceOpen] = useState(false);
  const [metaConnectChoiceVariant, setMetaConnectChoiceVariant] = useState<
    "facebook_pages" | "instagram_business"
  >("facebook_pages");
  const activeWorkspaceId = workspace?.id || null;
  const connectInFlightRef = useRef(false);
  const popupCallbackReceivedRef = useRef(false);
  const popupPollRef = useRef<number | null>(null);
  const popupCloseGraceRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const popupStatusSnapshotRef = useRef<PopupStatusSnapshot | null>(null);

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

  const closeActivePopup = useCallback(() => {
    const popup = popupWindowRef.current;
    popupWindowRef.current = null;

    if (!popup || popup.closed) {
      return;
    }

    try {
      popup.close();
    } catch {
      // Ignore cross-browser popup close failures.
    }
  }, []);

  const clearProviderErrors = useCallback((provider: PopupProvider) => {
    if (provider === "facebook_pages") {
      setMetaError("");
      return;
    }

    if (provider === "instagram_business") {
      setInstagramBusinessError("");
      return;
    }

    setMetaAdsError("");
  }, []);

  const getPopupStatusSnapshot = useCallback(
    (provider: PopupProvider): PopupStatusSnapshot => {
      if (provider === "facebook_pages") {
        return {
          provider,
          status: metaConnected ? "connected" : "",
          connected: metaConnected,
          assetCount: facebookPagesCount,
        };
      }

      if (provider === "instagram_business") {
        return {
          provider,
          status: normalizeProviderStatus(instagramBusinessStatus),
          connected: instagramBusinessConnected,
          assetCount: instagramBusinessAssetCount,
        };
      }

      return {
        provider,
        status: normalizeProviderStatus(metaAdsStatus),
        connected: metaAdsConnected,
        assetCount: metaAdsAccountsCount,
      };
    },
    [
      facebookPagesCount,
      instagramBusinessAssetCount,
      instagramBusinessConnected,
      instagramBusinessStatus,
      metaAdsAccountsCount,
      metaAdsConnected,
      metaAdsStatus,
      metaConnected,
    ]
  );

  const refreshMetaAdsState = useCallback(async (cacheBust?: number) => {
    if (!activeWorkspaceId) {
      return {
        connected: false,
        integrationId: "",
        accountsCount: 0,
        lastSyncedAt: "",
        status: "",
        missingScopes: [] as string[],
      };
    }

    const status = await fetchMetaAdsStatus({
      workspaceId: activeWorkspaceId,
      cacheBust,
    });
    const normalizedStatus = (status.status || "").toLowerCase();
    const statusConnected =
      isIntegrationConnectedStatus(normalizedStatus) || Boolean(status.connected);

    setMetaAdsStatus(normalizedStatus);
    setMetaAdsConnected(statusConnected);
    setMetaAdsLastSyncedAt(status.lastSyncedAt || "");

    if (statusConnected) {
      setMetaAdsError("");
    }

    if (!connectInFlightRef.current && isAvailableProviderStatus(normalizedStatus)) {
      setMetaAdsError("");
    }

    if (!statusConnected || !status.integrationId) {
      setMetaAdsAccountsCount(0);
      return {
        connected: statusConnected,
        integrationId: status.integrationId || "",
        accountsCount: 0,
        lastSyncedAt: status.lastSyncedAt || "",
        status: normalizedStatus,
        missingScopes: status.missingScopes || [],
      };
    }

    const accounts = await fetchMetaAdsAccounts({
      integrationId: status.integrationId,
      workspaceId: activeWorkspaceId,
    });

    setMetaAdsAccountsCount(accounts.length);
    const finalConnected = statusConnected;
    setMetaAdsConnected(finalConnected);

    return {
      connected: finalConnected,
      integrationId: status.integrationId,
      accountsCount: accounts.length,
      lastSyncedAt: status.lastSyncedAt || "",
      status: normalizedStatus,
      missingScopes: status.missingScopes || [],
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    const metaErrorParam = searchParams.get("meta_error") || searchParams.get("integration_error");
    const providerParam = searchParams.get("meta_provider") || searchParams.get("integration_provider");

    if (!metaErrorParam) {
      return;
    }

    const normalizedProvider =
      providerParam === "instagram_business"
        ? "instagram_business"
        : providerParam === "meta_ads"
          ? "meta_ads"
          : "facebook_pages";

    const isNonBlockingInstagramReviewError =
      normalizedProvider === "instagram_business" &&
      isInstagramDirectLoginReviewError(metaErrorParam);
    const friendlyMessage =
      normalizedProvider === "instagram_business" && !isNonBlockingInstagramReviewError
        ? getMetaOAuthFriendlyErrorMessage("instagram_business", metaErrorParam)
        : metaErrorParam;

    if (normalizedProvider === "instagram_business") {
      setInstagramBusinessError(isNonBlockingInstagramReviewError ? "" : friendlyMessage);
    } else if (normalizedProvider === "meta_ads") {
      setMetaAdsError(friendlyMessage);
    } else {
      setMetaError(friendlyMessage);
    }
    setMetaStatusMessage("");
    setMetaReconnectMessage("");
    if (normalizedProvider !== "meta_ads") {
      setMetaAdsError("");
    }

    router.replace("/integrations");
  }, [router, searchParams]);

  const refreshMetaIntegrationState = useCallback(async (cacheBust?: number): Promise<MetaRefreshResult> => {
    logMetaOAuthDev("status refresh started", {
      route: "/integrations",
      workspaceId: activeWorkspaceId,
    });
    const storedContext = getIntegrationReportContext();
    const [response, instagramStatus] = await Promise.all([
      fetchIntegrationsConnectionStatus({ cacheBust }),
      fetchInstagramBusinessStatus({
        workspaceId: activeWorkspaceId,
        cacheBust,
      }),
    ]);

    const instagramBusinessStatusConnected =
      isIntegrationConnectedStatus(instagramStatus.status) ||
      Boolean(instagramStatus.connected);
    const hasAnyConnectedRecord = response.metaConnected || instagramBusinessStatusConnected;
    const resolvedInstagramStatus = instagramStatus.status || (instagramBusinessStatusConnected ? "connected" : "");
    const resolvedInstagramAssets =
      instagramStatus.assetCount || (instagramBusinessStatusConnected ? instagramAccountsCount : 0);

    setInstagramBusinessStatus(resolvedInstagramStatus);
    setInstagramBusinessAssetCount(resolvedInstagramAssets);
    setInstagramBusinessConnected(
      instagramBusinessStatusConnected || resolvedInstagramAssets > 0
    );

    if (response.metaConnected) {
      setMetaError("");
    }
    if (!connectInFlightRef.current && isAvailableProviderStatus(response.metaConnected ? "connected" : "")) {
      setMetaError("");
    }

    if (instagramBusinessStatusConnected) {
      setInstagramBusinessError("");
    }
    if (!connectInFlightRef.current && isAvailableProviderStatus(resolvedInstagramStatus)) {
      setInstagramBusinessError("");
    }

    if (!hasAnyConnectedRecord) {
      setMetaConnected(false);
      setInstagramBusinessConnected(false);
      setFacebookPagesCount(0);
      setInstagramAccountsCount(0);
      setInstagramBusinessStatus(resolvedInstagramStatus);
      setInstagramBusinessAssetCount(resolvedInstagramAssets);
      setMetaCatalogsResolved(false);
      setMetaReconnectMessage("");
      logMetaOAuthDev("status refresh completed", {
        route: "/integrations",
        connected: false,
        integrationId: response.integrationId || null,
      });
      return {
        connected: false,
        integrationId: response.integrationId || "",
        instagramBusinessConnected: false,
        facebookPagesCount: 0,
        instagramAccountsCount: 0,
        catalogsLoaded: true,
      };
    }

    setMetaConnected(Boolean(response.metaConnected));
    const resolvedWorkspaceId = storedContext?.workspaceId || activeWorkspaceId || "";
    const resolvedMetaSourceForContext =
      instagramBusinessStatusConnected && !response.metaConnected
        ? "instagram_business"
        : storedContext && isMetaFrontendIntegrationKey(storedContext.source)
          ? storedContext.source
          : "facebook_pages";

    if (!response.integrationId) {
      setFacebookPagesCount(0);
      setInstagramAccountsCount(0);
      setInstagramBusinessConnected(
        instagramBusinessStatusConnected || resolvedInstagramAssets > 0
      );
      setMetaCatalogsResolved(false);
      setMetaReconnectMessage("");

      if (resolvedWorkspaceId) {
        setIntegrationReportContext({
          source: resolvedMetaSourceForContext,
          integration: "meta",
          workspaceId: resolvedWorkspaceId,
          integrationId: undefined,
          pageId: storedContext?.pageId,
          pageName: storedContext?.pageName,
          datasetId: storedContext?.datasetId,
          synced: storedContext?.synced,
          requestedSlides: storedContext?.requestedSlides,
          aiMode: storedContext?.aiMode,
        });
      }

      logMetaOAuthDev("status refresh completed without integration id", {
        route: "/integrations",
        connected: true,
      });

      return {
        connected: Boolean(hasAnyConnectedRecord),
        integrationId: "",
        instagramBusinessConnected:
          instagramBusinessStatusConnected || resolvedInstagramAssets > 0,
        facebookPagesCount: 0,
        instagramAccountsCount: 0,
        catalogsLoaded: false,
      };
    }

    let facebookPagesCount = 0;
    let instagramAccountsCount = 0;
    let catalogsLoaded = false;

    try {
      const [facebookPages, instagramAccounts] = await Promise.all([
        fetchMetaPagesCatalog(response.integrationId),
        fetchMetaInstagramAccountsCatalog(response.integrationId),
      ]);

      facebookPagesCount = facebookPages.length;
      instagramAccountsCount = instagramAccounts.length;
      catalogsLoaded = true;
      setFacebookPagesCount(facebookPagesCount);
      setInstagramAccountsCount(instagramAccountsCount);
      setInstagramBusinessAssetCount(instagramAccountsCount);
      setInstagramBusinessConnected(
        instagramAccountsCount > 0 || instagramBusinessStatusConnected
      );
      setMetaCatalogsResolved(true);
    } catch (error) {
      console.error("meta catalog refresh error:", error);
      setFacebookPagesCount(0);
      setInstagramAccountsCount(0);
      setInstagramBusinessAssetCount(resolvedInstagramAssets);
      setInstagramBusinessConnected(instagramBusinessStatusConnected);
      setMetaCatalogsResolved(false);
    }

    if (response.integrationId && resolvedWorkspaceId) {
      setIntegrationReportContext({
        source: resolvedMetaSourceForContext,
        integration: "meta",
        workspaceId: resolvedWorkspaceId,
        integrationId: response.integrationId,
        pageId: storedContext?.pageId,
        pageName: storedContext?.pageName,
        datasetId: storedContext?.datasetId,
        synced: storedContext?.synced,
        requestedSlides: storedContext?.requestedSlides,
        aiMode: storedContext?.aiMode,
      });
    }

    logMetaOAuthDev("status refresh completed", {
      route: "/integrations",
      connected: true,
      integrationId: response.integrationId || null,
      facebookPagesCount,
      instagramAccountsCount,
      catalogsLoaded,
    });

    return {
      connected: Boolean(hasAnyConnectedRecord),
      integrationId: response.integrationId || "",
      instagramBusinessConnected: instagramAccountsCount > 0 || instagramBusinessStatusConnected,
      facebookPagesCount,
      instagramAccountsCount,
      catalogsLoaded,
    };
  }, [activeWorkspaceId]);

  const refreshAllMetaStatuses = useCallback(async (cacheBust?: number) => {
    const [metaResult, metaAdsResult] = await Promise.all([
      refreshMetaIntegrationState(cacheBust),
      refreshMetaAdsState(cacheBust),
    ]);

    return {
      metaResult,
      metaAdsResult,
    };
  }, [refreshMetaAdsState, refreshMetaIntegrationState]);

  const handleIntegrationOAuthComplete = useCallback(
    async (message: IntegrationOAuthCompleteMessage) => {
      const provider = message.provider || "facebook_pages";
      const callbackStatus = normalizeProviderStatus(message.status);
      const backendMessage = message.message || message.error || "";
      const refreshKey = Date.now();

      popupCallbackReceivedRef.current = true;
      stopPopupPolling();
      closeActivePopup();
      clearPendingMetaOAuth();
      connectInFlightRef.current = false;
      popupStatusSnapshotRef.current = null;

      setMetaLoading(false);
      setMetaAdsLoading(false);
      setMetaStatusLoading(true);
      setMetaCatalogsLoading(true);
      setMetaStatusMessage("");
      setMetaReconnectMessage("");
      setMetaAdsStatusMessage("");
      clearProviderErrors(provider);

      try {
        const { metaResult, metaAdsResult } = await refreshAllMetaStatuses(refreshKey);

        if (provider === "instagram_business") {
          const instagramStatusResult = await fetchInstagramBusinessStatus(
            {
              workspaceId: activeWorkspaceId,
              cacheBust: refreshKey,
            }
          );
          const resolvedStatus =
            normalizeProviderStatus(instagramStatusResult.status) || callbackStatus;
          const processed =
            instagramStatusResult.connected ||
            (instagramStatusResult.assetCount || 0) > 0 ||
            isPopupResolvedStatus(resolvedStatus) ||
            isPopupResolvedStatus(callbackStatus);

          if (isIntegrationConnectedStatus(resolvedStatus) || instagramStatusResult.connected) {
            setMetaStatusMessage("Instagram Business connected successfully.");
          } else if (
            resolvedStatus === "connected_no_assets" ||
            resolvedStatus === "connected_no_instagram_accounts" ||
            resolvedStatus === "needs_page_ig_link" ||
            (processed &&
              !instagramStatusResult.connected &&
              (instagramStatusResult.assetCount || 0) === 0)
          ) {
            setMetaStatusMessage(
              getInstagramBusinessStatusMessage({
                status: resolvedStatus || callbackStatus,
                connected: instagramStatusResult.connected,
                assetCount: instagramStatusResult.assetCount,
                message: backendMessage,
              })
            );
          } else if (resolvedStatus === "needs_permission" || callbackStatus === "needs_permission") {
            setInstagramBusinessError(
              getInstagramBusinessStatusMessage({
                status: "needs_permission",
                connected: instagramStatusResult.connected,
                assetCount: instagramStatusResult.assetCount,
                message: backendMessage,
              }) ||
                "Instagram Business needs additional permissions. Please reconnect and approve all requested access."
            );
          } else if (callbackStatus === "error") {
            setInstagramBusinessError(
              backendMessage ||
                "We couldn’t complete the Instagram Business connection. Please try again."
            );
          } else if (metaResult.instagramBusinessConnected) {
            setMetaStatusMessage("Instagram Business connected successfully.");
          }

          return;
        }

        if (provider === "meta_ads") {
          const resolvedStatus = normalizeProviderStatus(metaAdsResult.status) || callbackStatus;

          if (isIntegrationConnectedStatus(resolvedStatus) || metaAdsResult.connected) {
            setMetaAdsStatusMessage("Meta Ads connected successfully.");
          } else if (
            resolvedStatus === "connected_no_assets" ||
            resolvedStatus === "connected_no_assets_found" ||
            resolvedStatus === "connected_no_assets_available" ||
            resolvedStatus === "connected_empty" ||
            resolvedStatus === "connected_no_ad_accounts" ||
            resolvedStatus === "no_authorized_assets"
          ) {
            setMetaAdsStatusMessage(
              getMetaAdsStatusMessage({
                status: resolvedStatus,
                message: backendMessage,
                missingScopes: metaAdsResult.missingScopes,
              })
            );
          } else if (resolvedStatus === "needs_permission" || callbackStatus === "needs_permission") {
            setMetaAdsError(
              getMetaAdsStatusMessage({
                status: "needs_permission",
                message: backendMessage,
                missingScopes: metaAdsResult.missingScopes,
              }) ||
                "Reconnect and approve the required permissions."
            );
          } else if (callbackStatus === "error") {
            setMetaAdsError(
              backendMessage ||
                "We couldn’t complete the Meta Ads connection. Please try again."
            );
          } else if (metaAdsResult.connected) {
            setMetaAdsStatusMessage("Meta Ads connected successfully.");
          }

          return;
        }

        if (metaResult.connected) {
          setMetaStatusMessage("Integration connected successfully.");
        } else if (callbackStatus === "needs_permission" || callbackStatus === "error") {
          setMetaError(
            backendMessage ||
              "We couldn’t complete the Meta connection. Please try again."
          );
        }
      } catch (error) {
        console.error("integration oauth callback refresh error:", error);

        if (provider === "instagram_business") {
          setInstagramBusinessError(
            "The connection finished, but we couldn’t refresh the Instagram Business status."
          );
        } else if (provider === "meta_ads") {
          setMetaAdsError(
            "The connection finished, but we couldn’t refresh the Meta Ads status."
          );
        } else {
          setMetaError("The connection finished, but we couldn’t refresh the status.");
        }
      } finally {
        setMetaLoading(false);
        setMetaAdsLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaConnectMode(null);
      }
    },
    [
      activeWorkspaceId,
      clearProviderErrors,
      closeActivePopup,
      refreshAllMetaStatuses,
      stopPopupPolling,
    ]
  );

  const pollForPopupResolution = useCallback(
    async (snapshot: PopupStatusSnapshot, cacheBustBase = Date.now()) => {
      const deadline = Date.now() + 10000;
      let lastResolvedStatus = snapshot.status;
      let lastConnected = snapshot.connected;
      let lastAssetCount = snapshot.assetCount;
      let attempt = 0;

      while (Date.now() < deadline && !popupCallbackReceivedRef.current) {
        const cacheBust = cacheBustBase + attempt;
        const { metaResult, metaAdsResult } = await refreshAllMetaStatuses(cacheBust);

        if (snapshot.provider === "facebook_pages") {
          lastResolvedStatus = metaResult.connected ? "connected" : "";
          lastConnected = metaResult.connected;
          lastAssetCount = metaResult.facebookPagesCount;
        } else if (snapshot.provider === "instagram_business") {
          const instagramStatusResult = await fetchInstagramBusinessStatus(
            {
              workspaceId: activeWorkspaceId,
              cacheBust,
            }
          );
          lastResolvedStatus = normalizeProviderStatus(instagramStatusResult.status);
          lastConnected = instagramStatusResult.connected;
          lastAssetCount = instagramStatusResult.assetCount || 0;
        } else {
          lastResolvedStatus = normalizeProviderStatus(metaAdsResult.status);
          lastConnected = metaAdsResult.connected;
          lastAssetCount = metaAdsResult.accountsCount;
        }

        const stateChanged =
          lastResolvedStatus !== snapshot.status ||
          lastConnected !== snapshot.connected ||
          lastAssetCount !== snapshot.assetCount;

        if (isPopupResolvedStatus(lastResolvedStatus) || stateChanged) {
          return {
            resolved: true,
            status: lastResolvedStatus,
            connected: lastConnected,
            assetCount: lastAssetCount,
          };
        }

        await delay(1000);
        attempt += 1;
      }

      return {
        resolved: false,
        status: lastResolvedStatus,
        connected: lastConnected,
        assetCount: lastAssetCount,
      };
    },
    [
      activeWorkspaceId,
      refreshAllMetaStatuses,
    ]
  );

  const integrationsStateLoading = metaStatusLoading || metaCatalogsLoading;
  const isFacebookPagesConnected = metaConnected;
  const isInstagramBusinessResolvedConnected =
    isIntegrationConnectedStatus(instagramBusinessStatus) || instagramBusinessConnected;
  const isMetaAdsResolvedConnected =
    isIntegrationConnectedStatus(metaAdsStatus) || metaAdsConnected;
  const facebookPagesCardStatus = integrationsStateLoading
    ? "Checking"
    : isFacebookPagesConnected
      ? "Connected"
      : "Available";
  const instagramCardStatus = getInstagramBusinessCardStatus({
    loading: integrationsStateLoading || metaLoading,
    status: instagramBusinessStatus,
    connected: isInstagramBusinessResolvedConnected,
    assetCount: instagramBusinessAssetCount,
  });
  const metaAdsCardStatus = getMetaAdsCardStatus({
    loading: metaAdsLoading || integrationsStateLoading,
    status: metaAdsStatus,
    connected: isMetaAdsResolvedConnected,
  });
  const hasAnyConnectedIntegration =
    facebookPagesCardStatus === "Connected" ||
    instagramCardStatus === "Connected" ||
    metaAdsCardStatus === "Connected";
  const connectedButNoAuthorizedPages =
    isFacebookPagesConnected &&
    metaCatalogsResolved &&
    facebookPagesCount === 0 &&
    instagramAccountsCount === 0;

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
        setMetaCatalogsLoading(true);
        const result = await refreshMetaIntegrationState();

        if (!active || result.connected) {
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
          setMetaCatalogsLoading(false);
        }
      }
    }

    void loadIntegrationStatus();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, refreshMetaIntegrationState]);

  useEffect(() => {
    let active = true;

    async function loadMetaAdsState() {
      try {
        if (!activeWorkspaceId) {
          return;
        }

        if (!active) {
          return;
        }

        await refreshMetaAdsState();
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta ads status load error:", error);
        setMetaAdsConnected(false);
        setMetaAdsAccountsCount(0);
        setMetaAdsStatus("");
      }
    }

    void loadMetaAdsState();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, refreshMetaAdsState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function handleMetaWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (isIntegrationOAuthCompleteMessage(event.data)) {
        if (
          event.data.provider === "instagram_business" ||
          event.data.provider === "meta_ads"
        ) {
          await handleIntegrationOAuthComplete(event.data);
        }
        return;
      }

      if (!isMetaOAuthWindowMessage(event.data)) {
        return;
      }

      if (event.data.provider === "meta_ads") {
        if (!metaAdsLoading) {
          return;
        }

        popupCallbackReceivedRef.current = true;
        logMetaOAuthDev("meta ads callback message received", {
          route: "/integrations",
          type: event.data.type,
          integrationId: "integrationId" in event.data ? event.data.integrationId || null : null,
        });
        stopPopupPolling();
        clearPendingMetaOAuth();
        connectInFlightRef.current = false;
        setMetaAdsLoading(false);

        if (event.data.type === "MEASURABLE_META_CONNECT_SUCCESS") {
          setMetaAdsError("");
          try {
            const result = await refreshMetaAdsState();
            if (result.connected) {
              setMetaAdsStatusMessage("Meta Ads connected successfully.");
            } else if (result.status === "connected" && result.accountsCount === 0) {
              setMetaAdsStatusMessage(
                getMetaAdsStatusMessage({
                  status: "connected_no_assets",
                  missingScopes: result.missingScopes,
                }) ||
                  "Meta Ads connected, but no ad accounts were found. Make sure your Meta user has access to an ad account in Business Manager."
              );
            } else if (!result.connected) {
              setMetaAdsStatusMessage(
                getMetaAdsStatusMessage({
                  status: result.status,
                  missingScopes: result.missingScopes,
                }) ||
                  "The connection finished, but we couldn’t confirm the Meta Ads status."
              );
            }
          } catch (error) {
            console.error("meta ads popup refresh error:", error);
            setMetaAdsError(
              "The connection finished, but we couldn’t refresh the Meta Ads status."
            );
          }
        } else {
          const nextStatusMessage = getMetaAdsStatusMessage({
            status: event.data.status,
            message: event.data.message,
            missingScopes: event.data.missingScopes,
          });
          setMetaAdsStatus((event.data.status || "").toLowerCase());
          if (event.data.status === "config_missing") {
            setMetaAdsStatusMessage("");
            setMetaAdsError(nextStatusMessage || "Meta Ads OAuth is not fully configured.");
          } else if (
            event.data.status === "needs_permission" ||
            event.data.status === "connected_no_assets" ||
            event.data.status === "no_authorized_assets"
          ) {
            setMetaAdsError("");
            setMetaAdsStatusMessage(nextStatusMessage);
          } else {
            setMetaAdsStatusMessage("");
            setMetaAdsError(
              nextStatusMessage ||
                event.data.message ||
                "We couldn’t complete the Meta Ads connection. Please try again."
            );
          }
          try {
            await refreshMetaAdsState();
          } catch (error) {
            console.error("meta ads popup error refresh failed:", error);
          }
        }

        return;
      }

      if (isInstagramBusinessMessageSource(event.data)) {
        if (!metaLoading && !connectInFlightRef.current) {
          return;
        }

        popupCallbackReceivedRef.current = true;
        logMetaOAuthDev("instagram business callback message received", {
          route: "/integrations",
          type: event.data.type,
          status: event.data.status || null,
          integrationId: "integrationId" in event.data ? event.data.integrationId || null : null,
        });
        stopPopupPolling();
        clearPendingMetaOAuth();
        connectInFlightRef.current = false;
        setMetaLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);

        const eventAssetCount =
          event.data.assetCount ?? event.data.asset_count ?? 0;
        const eventMissingScopes =
          event.data.missingScopes || event.data.missing_scopes || [];

        try {
          setMetaStatusLoading(true);
          setMetaCatalogsLoading(true);
          const statusResult = await fetchInstagramBusinessStatus(activeWorkspaceId);
          const refreshResult = await refreshMetaIntegrationState();
          const message = getInstagramBusinessStatusMessage({
            status: statusResult.status || event.data.status,
            connected:
              statusResult.connected || refreshResult.instagramBusinessConnected,
            assetCount:
              statusResult.assetCount ||
              refreshResult.instagramAccountsCount ||
              eventAssetCount,
            missingScopes:
              statusResult.missingScopes.length > 0
                ? statusResult.missingScopes
                : eventMissingScopes,
            message: statusResult.message || event.data.message,
          });
          const processed =
            statusResult.connected ||
            refreshResult.instagramBusinessConnected ||
            isInstagramBusinessProcessedStatus(statusResult.status) ||
            isInstagramBusinessProcessedStatus(event.data.status);

          if (processed) {
            setInstagramBusinessError("");
            setMetaReconnectMessage("");
            setMetaStatusMessage(
              message || "Instagram Business connected successfully."
            );
          } else if (
            isInstagramBusinessMissingPermissionsStatus(statusResult.status) ||
            isInstagramBusinessMissingPermissionsStatus(event.data.status) ||
            statusResult.missingScopes.length > 0 ||
            eventMissingScopes.length > 0
          ) {
            setMetaStatusMessage("");
            setInstagramBusinessError(
              message ||
                "Instagram Business needs additional permissions. Please reconnect and approve all requested access."
            );
          } else {
            setMetaStatusMessage("");
            setInstagramBusinessError(
              message ||
                event.data.message ||
                "We couldn’t complete the Instagram Business connection. Please try again."
            );
          }
        } catch (error) {
          console.error("instagram business popup refresh error:", error);
          setMetaStatusMessage("");
          setInstagramBusinessError(
            event.data.message ||
              "The connection finished, but we couldn’t refresh the Instagram Business status."
          );
        } finally {
          setMetaStatusLoading(false);
          setMetaCatalogsLoading(false);
          setMetaConnectMode(null);
        }

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
      setMetaCatalogsLoading(false);

      if (event.data.type === "MEASURABLE_META_CONNECT_SUCCESS") {
        setMetaError("");
        try {
          setMetaStatusLoading(true);
          setMetaCatalogsLoading(true);
          const result = await refreshMetaIntegrationState();
          if (!result.connected) {
            setMetaReconnectMessage("");
            setMetaStatusMessage(
              "The connection finished, but we couldn’t confirm the status."
            );
          } else if (!result.catalogsLoaded) {
            void trackMetaEvent("MetaConnected", {
              source: "meta",
              reconnect: metaConnectMode === "reconnect",
              catalog_refresh: "failed",
            });
            setMetaReconnectMessage("");
            setMetaStatusMessage(
              metaConnectMode === "reconnect"
                ? "Meta reconnected, but we couldn’t refresh authorized pages. Please reload or try again."
                : "Meta connected, but we couldn’t refresh authorized pages. Please reload or try again."
            );
          } else if (
            metaConnectMode === "reconnect" &&
            result.facebookPagesCount === 0 &&
            result.instagramAccountsCount === 0
          ) {
            void trackMetaEvent("MetaConnected", {
              source: "meta",
              reconnect: true,
              facebook_pages_count: result.facebookPagesCount,
              instagram_accounts_count: result.instagramAccountsCount,
            });
            setMetaStatusMessage("");
            setMetaReconnectMessage(
              "No authorized pages were found. Make sure you selected at least one Facebook Page during Meta authorization."
            );
          } else {
            void trackMetaEvent("MetaConnected", {
              source: "meta",
              reconnect: metaConnectMode === "reconnect",
              facebook_pages_count: result.facebookPagesCount,
              instagram_accounts_count: result.instagramAccountsCount,
            });
            setMetaReconnectMessage("");
            setMetaStatusMessage("Integration connected successfully.");
          }
        } catch (error) {
          console.error("meta popup refresh error:", error);
          setMetaError("The connection finished, but we couldn’t refresh the status.");
        } finally {
          setMetaStatusLoading(false);
          setMetaCatalogsLoading(false);
          setMetaConnectMode(null);
        }
        return;
      }

      setMetaStatusMessage("");
      setMetaConnectMode(null);
      setMetaError(
        event.data.message ||
          (metaConnectMode === "reconnect"
            ? "We couldn’t reconnect Meta. Please try again."
            : "We couldn’t connect Meta. Please try again.")
      );
    }

    window.addEventListener("message", handleMetaWindowMessage);

    return () => {
      stopPopupPolling();
      window.removeEventListener("message", handleMetaWindowMessage);
    };
  }, [
    activeWorkspaceId,
    handleIntegrationOAuthComplete,
    metaAdsLoading,
    metaConnectMode,
    metaLoading,
    refreshMetaAdsState,
    refreshMetaIntegrationState,
    stopPopupPolling,
  ]);

  async function handleMetaConnect(input?: {
    source?: "facebook_pages" | "instagram_business";
    reconnect?: boolean;
    includeLinkedInstagram?: boolean;
  }) {
    if (connectInFlightRef.current) {
      console.warn("META_CONNECT_DUPLICATE_IGNORED", {
        route: "/integrations",
      });
      return;
    }

    let popupStarted = false;

    try {
      const reconnect = input?.reconnect === true;
      connectInFlightRef.current = true;
      popupCallbackReceivedRef.current = false;
      setMetaLoading(true);
      setMetaConnectMode(reconnect ? "reconnect" : "connect");
      setMetaError("");
      setMetaReconnectMessage("");
      setMetaStatusMessage(reconnect ? "Reconnecting..." : "Connecting...");
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
        input?.source ||
        (storedContext && isMetaFrontendIntegrationKey(storedContext.source)
          ? storedContext.source
          : "facebook_pages");

      setPendingMetaSource(source);

      if (source === "facebook_pages") {
        console.info("FACEBOOK_PAGES_CONNECT_REQUESTED", {
          route: "/integrations",
          workspace_id: connectWorkspaceId,
          include_linked_instagram: input?.includeLinkedInstagram === true,
          reconnect,
        });
      }

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
        reconnect,
        includeLinkedInstagram: input?.includeLinkedInstagram === true,
      });

      const rawAuthUrl = response.authUrlFromBackend || response.redirectUrl;
      const authUrl = normalizeMetaAuthUrl(rawAuthUrl, source);
      const validation = validateMetaAuthUrl(authUrl, source);

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: connectWorkspaceId,
        source,
        integration_type: source,
        auth_url: authUrl || null,
        integration_id: response.integrationId || null,
      });

      console.info("META_CONNECT_AUTH_URL_FINAL", {
        workspace_id: connectWorkspaceId,
        source,
        integration_type: source,
        auth_url: authUrl || null,
        starts_with_expected_domain: validation.startsWithExpectedDomain,
        contains_expected_oauth_path: validation.containsExpectedOAuthPath,
      });

      if (!validation.isValid) {
        console.error("META_CONNECT_INVALID_AUTH_URL", {
          workspace_id: connectWorkspaceId,
          source,
          integration_type: source,
          auth_url: authUrl || null,
          starts_with_expected_domain: validation.startsWithExpectedDomain,
          contains_expected_oauth_path: validation.containsExpectedOAuthPath,
        });
        throw new Error(
          "The backend did not return a valid Meta OAuth URL for the selected integration."
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
        popupWindowRef.current = popup;
        popupStatusSnapshotRef.current = getPopupStatusSnapshot(source);
        popupStarted = true;
        setMetaStatusMessage(reconnect ? "Reconnecting..." : "Connecting...");
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
            const snapshot =
              popupStatusSnapshotRef.current || getPopupStatusSnapshot(source);
            popupStatusSnapshotRef.current = null;
            connectInFlightRef.current = false;
            setMetaLoading(false);
            setMetaStatusLoading(false);
            setMetaCatalogsLoading(false);
            setMetaConnectMode(null);

            try {
              setMetaStatusLoading(true);
              setMetaCatalogsLoading(true);
              const resolution = await pollForPopupResolution(snapshot);
              const result = await refreshMetaIntegrationState();
              if (resolution.resolved && result.connected) {
                setMetaError("");
                if (!result.catalogsLoaded) {
                  void trackMetaEvent("MetaConnected", {
                    source,
                    reconnect,
                    catalog_refresh: "failed",
                  });
                  setMetaReconnectMessage("");
                  setMetaStatusMessage(
                    reconnect
                      ? "Meta reconnected, but we couldn’t refresh authorized pages. Please reload or try again."
                      : "Meta connected, but we couldn’t refresh authorized pages. Please reload or try again."
                  );
                } else if (
                  reconnect &&
                  result.facebookPagesCount === 0 &&
                  result.instagramAccountsCount === 0
                ) {
                  void trackMetaEvent("MetaConnected", {
                    source,
                    reconnect,
                    facebook_pages_count: result.facebookPagesCount,
                    instagram_accounts_count: result.instagramAccountsCount,
                  });
                  setMetaStatusMessage("");
                  setMetaReconnectMessage(
                    "No authorized pages were found. Make sure you selected at least one Facebook Page during Meta authorization."
                  );
                } else {
                  void trackMetaEvent("MetaConnected", {
                    source,
                    reconnect,
                    facebook_pages_count: result.facebookPagesCount,
                    instagram_accounts_count: result.instagramAccountsCount,
                  });
                  setMetaReconnectMessage("");
                  setMetaStatusMessage("Integration connected successfully.");
                }
                return;
              }
            } catch (error) {
              console.error("meta popup closed refresh error:", error);
            } finally {
              setMetaStatusLoading(false);
              setMetaCatalogsLoading(false);
            }

            setMetaStatusMessage("");
            setMetaError(
              reconnect
                ? "We couldn’t reconnect Meta. Please try again."
                : "We couldn’t connect Meta. Please try again."
            );
          }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
        }, 500);
        return;
      }
    } catch (err: unknown) {
      console.error("meta connect error:", err);
      popupWindowRef.current = null;
      popupStatusSnapshotRef.current = null;
      setMetaError(
        err instanceof ApiError && err.message
          ? err.message
          : reconnect
            ? "We couldn’t reconnect Meta. Please try again."
            : "We could not start the Facebook Pages connection. Try again."
      );
      setMetaStatusMessage("");
      setMetaConnectMode(null);
    } finally {
      if (!popupStarted) {
        connectInFlightRef.current = false;
        setMetaLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaConnectMode(null);
      }
    }
  }

  function handleMetaDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Facebook Pages from this workspace? Your existing reports will not be deleted."
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
        setInstagramBusinessConnected(false);
        setFacebookPagesCount(0);
        setInstagramAccountsCount(0);
        setMetaCatalogsResolved(false);
        setMetaReconnectMessage("");
        await refreshMetaIntegrationState();
        setMetaStatusMessage("Integration disconnected successfully.");
      } catch (error) {
        console.error("meta disconnect error:", error);
        setMetaError("We couldn’t disconnect Meta right now. Please try again.");
      } finally {
        setDisconnectLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaLoading(false);
        setMetaConnectMode(null);
      }
    })();
  }

  function handleFacebookPagesConnectRequest() {
    const contextWorkspaceId = activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "";

    if (!contextWorkspaceId) {
      setInstagramBusinessError(
        "No active workspace selected. Please choose a workspace and try again."
      );
      return;
    }

    console.info("FACEBOOK_PAGES_CONNECT_REQUESTED", {
      route: "/integrations",
      workspace_id: contextWorkspaceId,
      option: "choice_modal",
    });

    setMetaConnectChoiceVariant("facebook_pages");
    setFacebookPagesChoiceOpen(true);
    setMetaError("");
  }

  function openInstagramBusinessConnectModal() {
    const contextWorkspaceId = activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "";

    if (!contextWorkspaceId) {
      setInstagramBusinessError(
        "No active workspace selected. Please choose a workspace and try again."
      );
      return;
    }

    console.info("INSTAGRAM_BUSINESS_CONNECT_REQUESTED", {
      route: "/integrations",
      workspace_id: contextWorkspaceId,
      option: "choice_modal",
    });

    setMetaConnectChoiceVariant("instagram_business");
    setFacebookPagesChoiceOpen(true);
    setInstagramBusinessError("");
  }

  function handleMetaConnectChoice(includeLinkedInstagram: boolean) {
    const contextWorkspaceId = activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "";
    const source = metaConnectChoiceVariant;

    if (!contextWorkspaceId) {
      if (source === "instagram_business") {
        setInstagramBusinessError(
          "No active workspace selected. Please choose a workspace and try again."
        );
      } else {
        setMetaError("No active workspace selected. Please choose a workspace and try again.");
      }
      return;
    }

    console.info("META_CONNECT_OPTION_SELECTED", {
      route: "/integrations",
      workspace_id: contextWorkspaceId,
      source,
      option: includeLinkedInstagram ? "facebook_pages_with_instagram" : "facebook_pages",
    });

    setFacebookPagesChoiceOpen(false);

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

    if (source === "instagram_business") {
      void handleInstagramBusinessDedicatedConnect({
        reconnect: false,
        workspaceId: contextWorkspaceId,
      });
      return;
    }

    void handleMetaConnect({
      source,
      reconnect: false,
      includeLinkedInstagram,
    });
  }

  function handleInstagramBusinessConnect() {
    openInstagramBusinessConnectModal();
  }

  async function handleInstagramBusinessDedicatedConnect(input: {
    workspaceId: string;
    reconnect: boolean;
  }) {
    if (connectInFlightRef.current) {
      console.warn("INSTAGRAM_BUSINESS_CONNECT_DUPLICATE_IGNORED", {
        route: "/integrations",
      });
      return;
    }

    let popupStarted = false;
    let popup: Window | null = null;

    try {
      connectInFlightRef.current = true;
      popupCallbackReceivedRef.current = false;
      setMetaLoading(true);
      setMetaConnectMode(input.reconnect ? "reconnect" : "connect");
      setInstagramBusinessError("");
      setMetaReconnectMessage("");
      setMetaStatusMessage(input.reconnect ? "Reconnecting..." : "Connecting...");

      clearMetaOAuthDebugUrl();
      clearStoredMetaIntegrationState();

      setIntegrationReportContext({
        source: "instagram_business",
        integration: "meta",
        workspaceId: input.workspaceId,
        integrationId: undefined,
        datasetId: undefined,
        pageId: undefined,
        pageName: undefined,
        synced: false,
        postConnectRedirect: "/integrations",
      });

      if (typeof window === "undefined") {
        throw new Error("We could not open the Instagram connection window. Please try again.");
      }

      popup = window.open(
        "about:blank",
        "measurable_instagram_business_oauth",
        META_OAUTH_POPUP_FEATURES
      );

      if (!popup) {
        throw new Error("Please allow popups to connect this integration.");
      }

      const response = await connectInstagramBusinessIntegration({
        workspaceId: input.workspaceId,
        reconnect: input.reconnect,
      });
      const rawAuthUrl = response.authUrlFromBackend || response.redirectUrl;
      const authUrl = normalizeMetaAuthUrl(rawAuthUrl, "facebook_pages");
      const validation = validateMetaAuthUrl(authUrl, "facebook_pages");

      if (!validation.isValid || !authUrl) {
        throw new Error("The backend did not return a valid Meta OAuth URL for Instagram Business.");
      }

      createPendingMetaOAuth({
        authUrl,
        source: "instagram_business",
        route: "/integrations",
        transport: "popup",
      });
      storeMetaOAuthDebugUrl(authUrl);
      void showMetaOAuthReadyBanner();
      markMetaRedirectStarted();

      if (popup.closed) {
        throw new Error("The connection window was closed before authorization was completed.");
      }

      popupWindowRef.current = popup;
      popupStatusSnapshotRef.current = getPopupStatusSnapshot("instagram_business");
      popup.location.href = authUrl;
      popupStarted = true;
      stopPopupPolling();
      popupTimeoutRef.current = window.setTimeout(() => {
        setMetaStatusMessage(
          "This is taking longer than expected. Finish the Instagram flow in the popup and we’ll update the connection automatically."
        );
      }, META_OAUTH_POPUP_TIMEOUT_MS);
      popupPollRef.current = window.setInterval(async () => {
        if (!popup || !popup.closed) {
          return;
        }

        stopPopupPolling();
        popupCloseGraceRef.current = window.setTimeout(async () => {
          if (popupCallbackReceivedRef.current) {
            return;
          }

          clearPendingMetaOAuth();
          const snapshot =
            popupStatusSnapshotRef.current ||
            getPopupStatusSnapshot("instagram_business");
          popupStatusSnapshotRef.current = null;
          connectInFlightRef.current = false;
          setMetaLoading(false);
          setMetaStatusLoading(false);
          setMetaCatalogsLoading(false);
          setMetaConnectMode(null);
          let resolution: Awaited<ReturnType<typeof pollForPopupResolution>> | null = null;

          try {
            setMetaStatusLoading(true);
            setMetaCatalogsLoading(true);
            resolution = await pollForPopupResolution(snapshot);
            const statusResult = await fetchInstagramBusinessStatus(input.workspaceId);
            const refreshResult = await refreshMetaIntegrationState();
            const message = getInstagramBusinessStatusMessage({
              status: statusResult.status,
              connected:
                statusResult.connected || refreshResult.instagramBusinessConnected,
              assetCount:
                statusResult.assetCount || refreshResult.instagramAccountsCount,
              missingScopes: statusResult.missingScopes,
              message: statusResult.message,
            });

            if (
              resolution.resolved ||
              statusResult.connected ||
              refreshResult.instagramBusinessConnected ||
              isInstagramBusinessProcessedStatus(statusResult.status)
            ) {
              setInstagramBusinessError("");
              setMetaReconnectMessage("");
              setMetaStatusMessage(message || "Instagram Business connected successfully.");
              return;
            }

            if (
              isInstagramBusinessMissingPermissionsStatus(statusResult.status) ||
              statusResult.missingScopes.length > 0
            ) {
              setMetaStatusMessage("");
              setInstagramBusinessError(
                message ||
                  "Instagram Business needs additional permissions. Please reconnect and approve all requested access."
              );
              return;
            }
          } catch (error) {
            console.error("instagram business popup closed refresh error:", error);
          } finally {
            setMetaStatusLoading(false);
            setMetaCatalogsLoading(false);
          }

          setMetaStatusMessage("");
          if (!resolution?.resolved) {
            setInstagramBusinessError(
              "The connection window was closed before authorization was completed."
            );
          }
        }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
      }, 500);
    } catch (error) {
      console.error("instagram business connect error:", error);
      try {
        popup?.close();
      } catch {
        // Ignore cross-browser popup close failures.
      }
      popupWindowRef.current = null;
      popupStatusSnapshotRef.current = null;
      setMetaStatusMessage("");
      setInstagramBusinessError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn’t connect Instagram through Facebook. Please try again."
      );
      setMetaConnectMode(null);
    } finally {
      if (!popupStarted) {
        connectInFlightRef.current = false;
        setMetaLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaConnectMode(null);
      }
    }
  }

  function handleMetaReconnect(source?: "facebook_pages" | "instagram_business") {
    const storedContext = getIntegrationReportContext();
    const contextWorkspaceId = activeWorkspaceId || storedContext?.workspaceId || "";

    if (!contextWorkspaceId) {
      setMetaError(
        "No active workspace selected. Please choose a workspace and try again."
      );
      return;
    }

    const reconnectSource =
      source ||
      (storedContext && isMetaOrganicFrontendIntegrationKey(storedContext.source)
        ? storedContext.source
        : "facebook_pages");

    if (reconnectSource === "instagram_business") {
      openInstagramBusinessConnectModal();
      return;
    }

    setPendingMetaSource(reconnectSource);

    setIntegrationReportContext({
      source: reconnectSource,
      integration: "meta",
      workspaceId: contextWorkspaceId,
      integrationId: storedContext?.integrationId,
      datasetId: storedContext?.datasetId,
      pageId: storedContext?.pageId,
      pageName: storedContext?.pageName,
      synced: storedContext?.synced ?? false,
      requestedSlides: storedContext?.requestedSlides,
      aiMode: storedContext?.aiMode,
      postConnectRedirect: "/integrations",
    });

    void handleMetaConnect({
      source: reconnectSource,
      reconnect: true,
    });
  }

  function handleMetaAdsConnect(reconnect = false) {
    if (connectInFlightRef.current) {
      console.warn("META_ADS_CONNECT_DUPLICATE_IGNORED", {
        route: "/integrations",
      });
      return;
    }

    void (async () => {
      let popup: Window | null = null;

      try {
        connectInFlightRef.current = true;
        popupCallbackReceivedRef.current = false;
        setMetaAdsLoading(true);
        setMetaAdsError("");
        setMetaAdsStatusMessage(reconnect ? "Reconnecting Meta Ads..." : "Connecting Meta Ads...");

        if (typeof window === "undefined") {
          throw new Error("We could not open the Meta Ads connection window. Please try again.");
        }

        popup = window.open(
          "about:blank",
          "measurable_meta_ads_oauth",
          META_OAUTH_POPUP_FEATURES
        );

        if (!popup) {
          throw new Error("Please allow popups to connect this integration.");
        }

        const response = await connectMetaAdsIntegration({
          workspaceId: activeWorkspaceId || undefined,
          reconnect,
        });
        const authUrl = normalizeMetaAuthUrl(
          response.authUrlFromBackend || response.redirectUrl,
          "meta_ads"
        );
        const validation = validateMetaAuthUrl(authUrl, "meta_ads");

        if (!validation.isValid || !authUrl) {
          throw new Error("The backend did not return a valid Meta Ads OAuth URL.");
        }

        if (popup.closed) {
          throw new Error("The connection window was closed before authorization was completed.");
        }

        console.info("META_OAUTH_SCOPES_REQUESTED", {
          route: "/integrations",
          source: "meta_ads",
          integration_type: "meta_ads",
          scopes: getMetaOAuthRequestedScopes(authUrl),
        });

        createPendingMetaOAuth({
          authUrl,
          source: "meta_ads",
          route: "/integrations",
          transport: "popup",
        });
        storeMetaOAuthDebugUrl(authUrl);
        await showMetaOAuthReadyBanner();

        markMetaRedirectStarted();
        popupWindowRef.current = popup;
        popupStatusSnapshotRef.current = getPopupStatusSnapshot("meta_ads");
        popup.location.href = authUrl;

        stopPopupPolling();
        popupTimeoutRef.current = window.setTimeout(() => {
          setMetaAdsStatusMessage(
            "This is taking longer than expected. Finish the Meta Ads flow in the popup and we’ll update the connection automatically."
          );
        }, META_OAUTH_POPUP_TIMEOUT_MS);
        popupPollRef.current = window.setInterval(async () => {
          if (!popup || !popup.closed) {
            return;
          }

          stopPopupPolling();
          popupCloseGraceRef.current = window.setTimeout(async () => {
            if (popupCallbackReceivedRef.current) {
              return;
            }

            clearPendingMetaOAuth();
            const snapshot =
              popupStatusSnapshotRef.current || getPopupStatusSnapshot("meta_ads");
            popupStatusSnapshotRef.current = null;
            connectInFlightRef.current = false;
            setMetaAdsLoading(false);
            let resolution: Awaited<ReturnType<typeof pollForPopupResolution>> | null = null;

            try {
              resolution = await pollForPopupResolution(snapshot);
              const result = await refreshMetaAdsState();
              if (result.connected) {
                setMetaAdsError("");
                setMetaAdsStatusMessage("Meta Ads connected successfully.");
                return;
              }

              const fallbackStatus =
                result.status === "connected" && result.accountsCount === 0
                  ? "connected_no_assets"
                  : result.status;
              const nextMessage = getMetaAdsStatusMessage({
                status: fallbackStatus,
                missingScopes: result.missingScopes,
              });
              if (nextMessage) {
                if (
                  fallbackStatus === "config_missing" ||
                  fallbackStatus === "no_token" ||
                  fallbackStatus === "disconnected"
                ) {
                  setMetaAdsStatusMessage("");
                  setMetaAdsError(nextMessage);
                  return;
                }

                setMetaAdsError("");
                setMetaAdsStatusMessage(nextMessage);
                return;
              }
            } catch (error) {
              console.error("meta ads popup closed refresh error:", error);
            }

            setMetaAdsStatusMessage("");
            if (!resolution?.resolved) {
              setMetaAdsError(
                "The connection window was closed before authorization was completed."
              );
            }
          }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
        }, 500);
      } catch (error) {
        console.error("meta ads connect error:", error);
        try {
          popup?.close();
        } catch {
          // Ignore popup close failures.
        }
        popupWindowRef.current = null;
        popupStatusSnapshotRef.current = null;
        if (error instanceof ApiError && error.status === 409) {
          console.info("META_ADS_CONNECT_CONFIG_MISSING", {
            route: "/integrations",
            workspace_id: activeWorkspaceId || null,
            reconnect,
          });
          setMetaAdsStatusMessage("");
          setMetaAdsError(
            error.message ||
              "Meta Ads is not configured yet. Missing: META_ADS_APP_ID, META_ADS_APP_SECRET, META_ADS_REDIRECT_URI (or legacy META_APP_ID, META_APP_SECRET, META_REDIRECT_URI)."
          );
        } else {
          setMetaAdsStatusMessage("");
          setMetaAdsError(
            error instanceof Error && error.message
              ? error.message
              : reconnect
                ? "We couldn’t reconnect Meta Ads. Please try again."
                : "We couldn’t connect Meta Ads. Please try again."
          );
        }
      } finally {
        if (!popup || popup.closed) {
          connectInFlightRef.current = false;
          setMetaAdsLoading(false);
        }
      }
    })();
  }

  function handleInstagramBusinessDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Instagram Business from this workspace? Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    void (async () => {
      try {
        setMetaLoading(true);
        setInstagramBusinessError("");
        setMetaStatusMessage("");
        await disconnectMetaIntegration({
          workspaceId: activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "",
        });
        clearMetaIntegrationSessionState();
        clearPendingMetaOAuth();
        clearMetaOAuthDebugUrl();
        stopPopupPolling();
        setMetaConnected(false);
        setInstagramBusinessConnected(false);
        setFacebookPagesCount(0);
        setInstagramAccountsCount(0);
        setInstagramBusinessStatus("");
        setInstagramBusinessAssetCount(0);
        setMetaCatalogsResolved(false);
        await refreshMetaIntegrationState();
        setMetaStatusMessage("Integration disconnected successfully.");
      } catch (error) {
        console.error("instagram business disconnect error:", error);
        setInstagramBusinessError("We couldn’t disconnect Instagram Business right now. Please try again.");
      } finally {
        setMetaLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaConnectMode(null);
      }
    })();
  }

  function handleMetaAdsDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Meta Ads? Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    void (async () => {
      try {
        setMetaAdsDisconnectLoading(true);
        setMetaAdsError("");
        setMetaAdsStatusMessage("");
        await disconnectMetaAdsIntegration({
          workspaceId: activeWorkspaceId || undefined,
        });
        setMetaAdsConnected(false);
        setMetaAdsAccountsCount(0);
        setMetaAdsLastSyncedAt("");
        setMetaAdsStatusMessage("Meta Ads disconnected successfully.");
      } catch (error) {
        console.error("meta ads disconnect error:", error);
        setMetaAdsError("We couldn’t disconnect Meta Ads right now. Please try again.");
      } finally {
        setMetaAdsDisconnectLoading(false);
      }
    })();
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

      {connectedButNoAuthorizedPages ? (
        <section className="mb-5 overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_40%,#dbeafe_100%)] p-5 shadow-[0_18px_50px_rgba(29,78,216,0.12)] sm:mb-6 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                Meta permissions
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Meta is connected, but no authorized pages were found.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Reconnect Meta to review permissions and select the pages you want to use
                in Measurable.
              </p>
              {metaReconnectMessage ? (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {metaReconnectMessage}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => handleMetaReconnect()}
              disabled={metaLoading || disconnectLoading}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#081327_0%,#1d4ed8_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(29,78,216,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reconnect
            </button>
          </div>
        </section>
      ) : null}

      {!integrationsStateLoading && !hasAnyConnectedIntegration ? (
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

      {metaAdsStatusMessage ? (
        <section className="mb-5 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 sm:mb-6">
          {metaAdsStatusMessage}
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-3">
        {integrationCatalog.map((integration) => {
          const isFacebookPages = integration.integrationKey === "facebook_pages";
          const isInstagramBusiness = integration.integrationKey === "instagram_business";
          const isMetaAds = integration.integrationKey === "meta_ads";
          const cardStatus = isFacebookPages
            ? facebookPagesCardStatus
            : isInstagramBusiness
              ? instagramCardStatus
              : isMetaAds
                ? metaAdsCardStatus
                : integration.status;
          const actionLabel = isFacebookPages
            ? isFacebookPagesConnected
              ? "Disconnect"
              : "Connect"
            : isInstagramBusiness
              ? getInstagramBusinessActionLabel({
                  status: instagramBusinessStatus,
                  connected: isInstagramBusinessResolvedConnected,
                })
              : isMetaAds
                ? getMetaAdsActionLabel({
                    status: metaAdsStatus,
                    connected: isMetaAdsResolvedConnected,
                  })
                : integration.actionLabel;
          const onAction = isFacebookPages
            ? isFacebookPagesConnected
              ? handleMetaDisconnect
              : handleFacebookPagesConnectRequest
            : isInstagramBusiness
              ? normalizeProviderStatus(instagramBusinessStatus) === "needs_permission"
                  ? () => handleMetaReconnect("instagram_business")
                  : isInstagramBusinessResolvedConnected
                  ? handleInstagramBusinessDisconnect
                  : handleInstagramBusinessConnect
              : isMetaAds
                ? normalizeProviderStatus(metaAdsStatus) === "needs_permission"
                  ? () => handleMetaAdsConnect(true)
                  : isMetaAdsResolvedConnected
                  ? handleMetaAdsDisconnect
                  : () => handleMetaAdsConnect(false)
                : undefined;
          const disabled = isFacebookPages
            ? integrationsStateLoading || disconnectLoading
            : isInstagramBusiness
              ? integrationsStateLoading || metaLoading
              : isMetaAds
                ? metaAdsLoading || metaAdsDisconnectLoading
                : true;
          const loading = isFacebookPages
            ? metaLoading
            : isInstagramBusiness
              ? metaLoading
              : isMetaAds
                ? metaAdsLoading
                : false;
          const helperText = isFacebookPages
            ? isFacebookPagesConnected
              ? facebookPagesCount > 0
                ? `${facebookPagesCount} page${facebookPagesCount === 1 ? "" : "s"} ready.`
                : "Connected, but no assets were found."
              : "Connect Facebook Pages to generate organic visibility, engagement, page views, and audience reports."
            : isInstagramBusiness
              ? getInstagramBusinessHelperText({
                  connected: isInstagramBusinessResolvedConnected,
                  status: instagramBusinessStatus,
                  assetCount: instagramBusinessAssetCount,
                })
              : isMetaAds
                ? getMetaAdsHelperText({
                    connected: isMetaAdsResolvedConnected,
                    status: metaAdsStatus,
                    accountsCount: metaAdsAccountsCount,
                    lastSyncedAt: metaAdsLastSyncedAt,
                  })
                : undefined;
          const error = isFacebookPages
            ? metaError
            : isInstagramBusiness
              ? instagramBusinessError
              : isMetaAds
                ? metaAdsError
                : "";

          return (
            <IntegrationCard
              key={integration.integrationKey}
              name={integration.name}
              category={integration.category}
              description={integration.description}
              logoUrl={integration.logoUrl}
              logoAlt={integration.logoAlt}
              status={cardStatus}
              actionLabel={actionLabel}
              onAction={onAction}
              disabled={disabled}
              loading={loading}
              helperText={helperText}
              error={error}
            />
          );
        })}
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

      <MetaConnectChoiceModal
        open={facebookPagesChoiceOpen}
        onClose={() => setFacebookPagesChoiceOpen(false)}
        variant={metaConnectChoiceVariant}
        onPagesOnly={() => handleMetaConnectChoice(false)}
        onPagesWithInstagram={() => handleMetaConnectChoice(true)}
      />

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
