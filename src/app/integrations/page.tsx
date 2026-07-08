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
  isMetaProviderAvailableStatus,
  isMetaProviderConnectedStatus,
  normalizeMetaProviderStatus,
  normalizeMetaProviderStatusValue,
  type MetaProviderKey,
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
  facebookPagesConnected: boolean;
  facebookPagesStatus: string;
  facebookPagesIntegrationId: string;
  instagramBusinessConnected: boolean;
  instagramBusinessStatus: string;
  instagramBusinessIntegrationId: string;
  facebookPagesCount: number;
  instagramAccountsCount: number;
  catalogsLoaded: boolean;
};

type PopupProvider = MetaProviderKey;

type ProviderUserAction = "connect" | "disconnect" | null;

type ProviderRuntimeState = {
  status: string;
  isActionInFlight: boolean;
  lastUserAction: ProviderUserAction;
  lastActionAt: number;
  error: string;
};

type PopupStatusSnapshot = {
  provider: PopupProvider;
  status: string;
  connected: boolean;
  assetCount: number;
};

const POPUP_STATUS_POLL_MS = 30000;
const DISCONNECT_STATUS_PROTECTION_MS = 10000;

function createProviderRuntimeState(): ProviderRuntimeState {
  return {
    status: "",
    isActionInFlight: false,
    lastUserAction: null,
    lastActionAt: 0,
    error: "",
  };
}

function createProviderRuntimeStateMap() {
  return {
    facebook_pages: createProviderRuntimeState(),
    instagram_business: createProviderRuntimeState(),
    meta_ads: createProviderRuntimeState(),
  } satisfies Record<PopupProvider, ProviderRuntimeState>;
}

function normalizeProviderStatus(status?: string | null) {
  return normalizeMetaProviderStatusValue(status);
}

function isPopupResolvedStatus(status?: string | null) {
  const normalizedStatus = normalizeProviderStatus(status);

  return isMetaProviderConnectedStatus(normalizedStatus) || normalizedStatus === "needs_permission";
}

function isAvailableProviderStatus(status?: string | null) {
  return isMetaProviderAvailableStatus(status);
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function resolveOAuthMessageProvider(message: {
  provider?: string;
  source?: string;
  integration_type?: string;
}) {
  const candidates = [
    message.provider,
    message.source,
    message.integration_type,
  ].map((value) => normalizeProviderStatus(value));

  if (candidates.includes("instagram_business")) {
    return "instagram_business" as const;
  }

  if (candidates.includes("meta_ads")) {
    return "meta_ads" as const;
  }

  return "facebook_pages" as const;
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
  const [, setMetaCatalogsLoading] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [metaStatusMessage, setMetaStatusMessage] = useState("");
  const [metaReconnectMessage, setMetaReconnectMessage] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);
  const [facebookPagesStatus, setFacebookPagesStatus] = useState("");
  const [instagramBusinessConnected, setInstagramBusinessConnected] = useState(false);
  const [instagramBusinessStatus, setInstagramBusinessStatus] = useState("");
  const [instagramBusinessStatusLoading, setInstagramBusinessStatusLoading] = useState(true);
  const [instagramBusinessAssetCount, setInstagramBusinessAssetCount] = useState(0);
  const [instagramBusinessError, setInstagramBusinessError] = useState("");
  const [metaAdsConnected, setMetaAdsConnected] = useState(false);
  const [metaAdsStatus, setMetaAdsStatus] = useState("");
  const [metaAdsLoading, setMetaAdsLoading] = useState(false);
  const [metaAdsStatusLoading, setMetaAdsStatusLoading] = useState(true);
  const [metaAdsDisconnectLoading, setMetaAdsDisconnectLoading] = useState(false);
  const [metaAdsError, setMetaAdsError] = useState("");
  const [metaAdsStatusMessage, setMetaAdsStatusMessage] = useState("");
  const [metaAdsAccountsCount, setMetaAdsAccountsCount] = useState(0);
  const [metaAdsLastSyncedAt, setMetaAdsLastSyncedAt] = useState("");
  const [, setMetaConnectMode] = useState<"connect" | "reconnect" | null>(
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
  const [providerRuntimeState, setProviderRuntimeState] = useState(
    createProviderRuntimeStateMap
  );
  const activeWorkspaceId = workspace?.id || null;
  const connectInFlightRef = useRef(false);
  const providerRuntimeStateRef = useRef(providerRuntimeState);
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

  const updateProviderRuntimeState = useCallback(
    (
      provider: PopupProvider,
      patch:
        | Partial<ProviderRuntimeState>
        | ((current: ProviderRuntimeState) => Partial<ProviderRuntimeState>)
    ) => {
      const currentState = providerRuntimeStateRef.current;
      const currentProviderState = currentState[provider];
      const nextPatch =
        typeof patch === "function" ? patch(currentProviderState) : patch;
      const nextState = {
        ...currentState,
        [provider]: {
          ...currentProviderState,
          ...nextPatch,
        },
      };

      providerRuntimeStateRef.current = nextState;
      setProviderRuntimeState(nextState);
    },
    []
  );

  const beginProviderAction = useCallback(
    (provider: PopupProvider, action: Exclude<ProviderUserAction, null>) => {
      updateProviderRuntimeState(provider, {
        isActionInFlight: true,
        lastUserAction: action,
        lastActionAt: Date.now(),
        error: "",
      });
    },
    [updateProviderRuntimeState]
  );

  const completeProviderAction = useCallback(
    (
      provider: PopupProvider,
      patch: Partial<ProviderRuntimeState> = {}
    ) => {
      updateProviderRuntimeState(provider, {
        isActionInFlight: false,
        ...patch,
      });
    },
    [updateProviderRuntimeState]
  );

  const shouldIgnoreProviderStatus = useCallback(
    (
      provider: PopupProvider,
      requestStartedAt: number,
      nextStatus: ReturnType<typeof normalizeMetaProviderStatus>
    ) => {
      const runtimeState = providerRuntimeStateRef.current[provider];

      if (runtimeState.lastActionAt > 0 && requestStartedAt < runtimeState.lastActionAt) {
        return true;
      }

      if (
        runtimeState.lastUserAction === "disconnect" &&
        Date.now() - runtimeState.lastActionAt < DISCONNECT_STATUS_PROTECTION_MS &&
        nextStatus.connected
      ) {
        return true;
      }

      return false;
    },
    []
  );

  const clearProviderErrors = useCallback((provider: PopupProvider) => {
    updateProviderRuntimeState(provider, { error: "" });

    if (provider === "facebook_pages") {
      setMetaError("");
      return;
    }

    if (provider === "instagram_business") {
      setInstagramBusinessError("");
      return;
    }

    setMetaAdsError("");
  }, [updateProviderRuntimeState]);

  const markProviderStatus = useCallback(
    (provider: PopupProvider, status: string) => {
      updateProviderRuntimeState(provider, { status });
    },
    [updateProviderRuntimeState]
  );

  const markProviderDisconnected = useCallback(
    (provider: PopupProvider) => {
      updateProviderRuntimeState(provider, {
        status: "disconnected",
        isActionInFlight: false,
        lastUserAction: "disconnect",
        lastActionAt: Date.now(),
        error: "",
      });

      if (provider === "facebook_pages") {
        setFacebookPagesStatus("disconnected");
        setMetaConnected(false);
        setFacebookPagesCount(0);
        setMetaError("");
        return;
      }

      if (provider === "instagram_business") {
        setInstagramBusinessStatus("disconnected");
        setInstagramBusinessConnected(false);
        setInstagramBusinessAssetCount(0);
        setInstagramBusinessError("");
        return;
      }

      setMetaAdsStatus("disconnected");
      setMetaAdsConnected(false);
      setMetaAdsAccountsCount(0);
      setMetaAdsLastSyncedAt("");
      setMetaAdsError("");
    },
    [updateProviderRuntimeState]
  );

  const getPopupStatusSnapshot = useCallback(
    (provider: PopupProvider): PopupStatusSnapshot => {
      if (provider === "facebook_pages") {
        const facebookPagesUiStatus = normalizeMetaProviderStatus({
          provider,
          status: facebookPagesStatus,
          connected: metaConnected,
          assetCount: facebookPagesCount,
        });

        return {
          provider,
          status: facebookPagesUiStatus.status,
          connected: facebookPagesUiStatus.connected,
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
      facebookPagesStatus,
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
    const requestStartedAt = Date.now();

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
    const normalizedStatus = normalizeProviderStatus(status.status);
    const statusUi = normalizeMetaProviderStatus({
      provider: "meta_ads",
      status: normalizedStatus,
      connected: status.connected,
      assetCount: 0,
      lastSyncedAt: status.lastSyncedAt,
    });
    const statusConnected = statusUi.connected;

    if (shouldIgnoreProviderStatus("meta_ads", requestStartedAt, statusUi)) {
      const runtimeStatus = providerRuntimeStateRef.current.meta_ads.status;
      const runtimeUiStatus = normalizeMetaProviderStatus({
        provider: "meta_ads",
        status: runtimeStatus,
        connected: false,
      });

      return {
        connected: runtimeUiStatus.connected,
        integrationId: "",
        accountsCount: 0,
        lastSyncedAt: "",
        status: runtimeUiStatus.status,
        missingScopes: status.missingScopes || [],
      };
    }

    setMetaAdsStatus(normalizedStatus);
    setMetaAdsConnected(statusConnected);
    setMetaAdsLastSyncedAt(status.lastSyncedAt || "");
    markProviderStatus("meta_ads", normalizedStatus);

    if (statusConnected) {
      setMetaAdsError("");
      updateProviderRuntimeState("meta_ads", {
        error: "",
        isActionInFlight: false,
      });
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
  }, [
    activeWorkspaceId,
    markProviderStatus,
    shouldIgnoreProviderStatus,
    updateProviderRuntimeState,
  ]);

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
    const requestStartedAt = Date.now();

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

    const facebookPagesProvider = response.providers.facebook_pages;
    const instagramBusinessProvider = response.providers.instagram_business;
    const resolvedFacebookStatus = normalizeProviderStatus(
      facebookPagesProvider.status ||
        response.facebookPagesStatus ||
        (response.metaConnected ? "connected" : "")
    );
    const facebookPagesUiStatus = normalizeMetaProviderStatus({
      provider: "facebook_pages",
      status: resolvedFacebookStatus,
      connected:
        facebookPagesProvider.connected ||
        response.facebookPagesConnected ||
        response.metaConnected,
      assetCount:
        facebookPagesProvider.assetCount || response.facebookPagesAssetCount,
      lastSyncedAt: facebookPagesProvider.lastSyncedAt,
    });
    const resolvedInstagramStatus = normalizeProviderStatus(
      instagramStatus.status ||
        instagramBusinessProvider.status ||
        response.instagramBusinessStatus
    );
    const resolvedInstagramAssets =
      instagramStatus.assetCount ||
      instagramBusinessProvider.assetCount ||
      response.instagramBusinessAssetCount ||
      0;
    const instagramBusinessUiStatus = normalizeMetaProviderStatus({
      provider: "instagram_business",
      status: resolvedInstagramStatus,
      connected:
        instagramStatus.connected ||
        instagramBusinessProvider.connected ||
        response.instagramBusinessConnected,
      assetCount: resolvedInstagramAssets,
      lastSyncedAt: instagramStatus.lastSyncedAt || instagramBusinessProvider.lastSyncedAt,
    });
    const ignoreFacebookStatus = shouldIgnoreProviderStatus(
      "facebook_pages",
      requestStartedAt,
      facebookPagesUiStatus
    );
    const ignoreInstagramStatus = shouldIgnoreProviderStatus(
      "instagram_business",
      requestStartedAt,
      instagramBusinessUiStatus
    );
    const effectiveFacebookUiStatus = ignoreFacebookStatus
      ? normalizeMetaProviderStatus({
          provider: "facebook_pages",
          status: providerRuntimeStateRef.current.facebook_pages.status,
          connected: false,
        })
      : facebookPagesUiStatus;
    const effectiveInstagramUiStatus = ignoreInstagramStatus
      ? normalizeMetaProviderStatus({
          provider: "instagram_business",
          status: providerRuntimeStateRef.current.instagram_business.status,
          connected: false,
        })
      : instagramBusinessUiStatus;
    const hasAnyConnectedRecord =
      effectiveFacebookUiStatus.connected || effectiveInstagramUiStatus.connected;

    if (!ignoreFacebookStatus) {
      setFacebookPagesStatus(resolvedFacebookStatus);
      setMetaConnected(facebookPagesUiStatus.connected);
      markProviderStatus("facebook_pages", resolvedFacebookStatus);
    }

    if (!ignoreInstagramStatus) {
      setInstagramBusinessStatus(resolvedInstagramStatus);
      setInstagramBusinessAssetCount(resolvedInstagramAssets);
      setInstagramBusinessConnected(instagramBusinessUiStatus.connected);
      markProviderStatus("instagram_business", resolvedInstagramStatus);
    }

    if (!ignoreFacebookStatus && facebookPagesUiStatus.connected) {
      setMetaError("");
      updateProviderRuntimeState("facebook_pages", {
        error: "",
        isActionInFlight: false,
      });
    }
    if (!ignoreFacebookStatus && !connectInFlightRef.current && isAvailableProviderStatus(resolvedFacebookStatus)) {
      setMetaError("");
      updateProviderRuntimeState("facebook_pages", { error: "" });
    }

    if (!ignoreInstagramStatus && instagramBusinessUiStatus.connected) {
      setInstagramBusinessError("");
      updateProviderRuntimeState("instagram_business", {
        error: "",
        isActionInFlight: false,
      });
    }
    if (!ignoreInstagramStatus && !connectInFlightRef.current && isAvailableProviderStatus(resolvedInstagramStatus)) {
      setInstagramBusinessError("");
      updateProviderRuntimeState("instagram_business", { error: "" });
    }

    if (!hasAnyConnectedRecord) {
      if (!ignoreFacebookStatus) {
        setMetaConnected(false);
        setFacebookPagesCount(0);
        setFacebookPagesStatus(resolvedFacebookStatus);
      }

      if (!ignoreInstagramStatus) {
        setInstagramBusinessConnected(false);
        setInstagramAccountsCount(0);
        setInstagramBusinessStatus(resolvedInstagramStatus);
        setInstagramBusinessAssetCount(resolvedInstagramAssets);
      }
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
        facebookPagesConnected: effectiveFacebookUiStatus.connected,
        facebookPagesStatus: effectiveFacebookUiStatus.status || resolvedFacebookStatus,
        facebookPagesIntegrationId:
          response.facebookPagesIntegrationId || response.integrationId || "",
        instagramBusinessConnected: effectiveInstagramUiStatus.connected,
        instagramBusinessStatus: effectiveInstagramUiStatus.status || resolvedInstagramStatus,
        instagramBusinessIntegrationId:
          instagramStatus.integrationId ||
          response.instagramBusinessIntegrationId ||
          "",
        facebookPagesCount: 0,
        instagramAccountsCount: 0,
        catalogsLoaded: true,
      };
    }

    const resolvedWorkspaceId = storedContext?.workspaceId || activeWorkspaceId || "";
    const resolvedMetaSourceForContext =
      effectiveInstagramUiStatus.connected && !effectiveFacebookUiStatus.connected
        ? "instagram_business"
        : storedContext && isMetaFrontendIntegrationKey(storedContext.source)
          ? storedContext.source
          : "facebook_pages";

    if (!response.integrationId) {
      if (!ignoreFacebookStatus) {
        setFacebookPagesCount(0);
      }
      if (!ignoreInstagramStatus) {
        setInstagramAccountsCount(0);
        setInstagramBusinessConnected(effectiveInstagramUiStatus.connected);
      }
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
        facebookPagesConnected: effectiveFacebookUiStatus.connected,
        facebookPagesStatus: effectiveFacebookUiStatus.status || resolvedFacebookStatus,
        facebookPagesIntegrationId:
          response.facebookPagesIntegrationId || response.integrationId || "",
        instagramBusinessConnected: effectiveInstagramUiStatus.connected,
        instagramBusinessStatus: effectiveInstagramUiStatus.status || resolvedInstagramStatus,
        instagramBusinessIntegrationId:
          instagramStatus.integrationId ||
          response.instagramBusinessIntegrationId ||
          "",
        facebookPagesCount: 0,
        instagramAccountsCount: resolvedInstagramAssets,
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
      if (!ignoreFacebookStatus) {
        setFacebookPagesCount(facebookPagesCount);
      }
      if (!ignoreInstagramStatus) {
        setInstagramAccountsCount(instagramAccountsCount);
        setInstagramBusinessAssetCount(instagramAccountsCount);
        setInstagramBusinessConnected(effectiveInstagramUiStatus.connected);
      }
      setMetaCatalogsResolved(true);
    } catch (error) {
      console.error("meta catalog refresh error:", error);
      if (!ignoreFacebookStatus) {
        setFacebookPagesCount(0);
      }
      if (!ignoreInstagramStatus) {
        setInstagramAccountsCount(0);
        setInstagramBusinessAssetCount(resolvedInstagramAssets);
        setInstagramBusinessConnected(effectiveInstagramUiStatus.connected);
      }
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
      facebookPagesConnected: effectiveFacebookUiStatus.connected,
      facebookPagesStatus: effectiveFacebookUiStatus.status || resolvedFacebookStatus,
      facebookPagesIntegrationId:
        response.facebookPagesIntegrationId || response.integrationId || "",
      instagramBusinessConnected: effectiveInstagramUiStatus.connected,
      instagramBusinessStatus: effectiveInstagramUiStatus.status || resolvedInstagramStatus,
      instagramBusinessIntegrationId:
        instagramStatus.integrationId ||
        response.instagramBusinessIntegrationId ||
        "",
      facebookPagesCount,
      instagramAccountsCount,
      catalogsLoaded,
    };
  }, [
    activeWorkspaceId,
    markProviderStatus,
    shouldIgnoreProviderStatus,
    updateProviderRuntimeState,
  ]);

  const handleIntegrationOAuthComplete = useCallback(
    async (
      message: IntegrationOAuthCompleteMessage & {
        source?: string;
        integration_type?: string;
      }
    ) => {
      const provider = resolveOAuthMessageProvider(message);
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
      if (provider === "meta_ads") {
        setMetaAdsStatusLoading(true);
      } else if (provider === "instagram_business") {
        setInstagramBusinessStatusLoading(true);
      } else {
        setMetaStatusLoading(true);
        setMetaCatalogsLoading(true);
      }
      setMetaStatusMessage("");
      setMetaReconnectMessage("");
      setMetaAdsStatusMessage("");
      clearProviderErrors(provider);

      try {
        if (provider === "instagram_business") {
          const instagramStatusResult = await fetchInstagramBusinessStatus(
            {
              workspaceId: activeWorkspaceId,
              cacheBust: refreshKey,
            }
          );
          const resolvedStatus =
            normalizeProviderStatus(instagramStatusResult.status) || callbackStatus;
          const instagramUiStatus = normalizeMetaProviderStatus({
            provider,
            status: resolvedStatus,
            connected: instagramStatusResult.connected,
            assetCount: instagramStatusResult.assetCount,
            lastSyncedAt: instagramStatusResult.lastSyncedAt,
          });

          setInstagramBusinessStatus(resolvedStatus);
          setInstagramBusinessConnected(instagramUiStatus.connected);
          setInstagramBusinessAssetCount(instagramStatusResult.assetCount || 0);

          if (instagramUiStatus.connected) {
            setInstagramBusinessError("");
            setMetaStatusMessage(
              instagramUiStatus.helperText ||
                getInstagramBusinessStatusMessage({
                  status: resolvedStatus,
                  connected: true,
                  assetCount: instagramStatusResult.assetCount,
                  message: backendMessage,
                }) ||
                "Instagram Business connected successfully."
            );
          } else if (
            resolvedStatus === "needs_permission" ||
            callbackStatus === "needs_permission"
          ) {
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
          }

          return;
        }

        if (provider === "meta_ads") {
          const metaAdsResult = await refreshMetaAdsState(refreshKey);
          const resolvedStatus = normalizeProviderStatus(metaAdsResult.status) || callbackStatus;
          const metaAdsUiStatus = normalizeMetaProviderStatus({
            provider,
            status: resolvedStatus,
            connected: metaAdsResult.connected,
            assetCount: metaAdsResult.accountsCount,
            lastSyncedAt: metaAdsResult.lastSyncedAt,
          });

          if (metaAdsUiStatus.connected) {
            setMetaAdsError("");
            setMetaAdsStatusMessage(
              metaAdsUiStatus.helperText ||
              getMetaAdsStatusMessage({
                status: resolvedStatus,
                message: backendMessage,
                missingScopes: metaAdsResult.missingScopes,
              }) ||
                "Meta Ads connected successfully."
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

        const metaResult = await refreshMetaIntegrationState(refreshKey);
        if (metaResult.facebookPagesConnected) {
          setMetaError("");
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
        setInstagramBusinessStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaAdsStatusLoading(false);
        completeProviderAction(provider);
        setMetaConnectMode(null);
      }
    },
    [
      activeWorkspaceId,
      clearProviderErrors,
      closeActivePopup,
      completeProviderAction,
      refreshMetaAdsState,
      refreshMetaIntegrationState,
      stopPopupPolling,
    ]
  );

  const pollForPopupResolution = useCallback(
    async (
      snapshot: PopupStatusSnapshot,
      input?: {
        cacheBustBase?: number;
        timeoutMs?: number;
      }
    ) => {
      const cacheBustBase = input?.cacheBustBase ?? Date.now();
      const timeoutMs = input?.timeoutMs ?? 10000;
      const deadline = Date.now() + timeoutMs;
      let lastResolvedStatus = snapshot.status;
      let lastConnected = snapshot.connected;
      let lastAssetCount = snapshot.assetCount;
      let attempt = 0;

      while (Date.now() < deadline && !popupCallbackReceivedRef.current) {
        const cacheBust = cacheBustBase + attempt;
        const requestStartedAt = Date.now();

        if (snapshot.provider === "facebook_pages") {
          const metaResult = await refreshMetaIntegrationState(cacheBust);
          lastResolvedStatus = metaResult.facebookPagesStatus;
          lastConnected = metaResult.facebookPagesConnected;
          lastAssetCount = metaResult.facebookPagesCount;
        } else if (snapshot.provider === "instagram_business") {
          const instagramStatusResult = await fetchInstagramBusinessStatus(
            {
              workspaceId: activeWorkspaceId,
              cacheBust,
            }
          );
          lastResolvedStatus = normalizeProviderStatus(instagramStatusResult.status);
          lastConnected = normalizeMetaProviderStatus({
            provider: "instagram_business",
            status: lastResolvedStatus,
            connected: instagramStatusResult.connected,
            assetCount: instagramStatusResult.assetCount,
            lastSyncedAt: instagramStatusResult.lastSyncedAt,
          }).connected;
          lastAssetCount = instagramStatusResult.assetCount || 0;
          const instagramUiStatus = normalizeMetaProviderStatus({
            provider: "instagram_business",
            status: lastResolvedStatus,
            connected: lastConnected,
            assetCount: lastAssetCount,
            lastSyncedAt: instagramStatusResult.lastSyncedAt,
          });

          if (!shouldIgnoreProviderStatus("instagram_business", requestStartedAt, instagramUiStatus)) {
            setInstagramBusinessStatus(lastResolvedStatus);
            setInstagramBusinessConnected(lastConnected);
            setInstagramBusinessAssetCount(lastAssetCount);
            markProviderStatus("instagram_business", lastResolvedStatus);
          } else {
            lastResolvedStatus = providerRuntimeStateRef.current.instagram_business.status;
            lastConnected = false;
            lastAssetCount = 0;
          }
        } else {
          const metaAdsResult = await refreshMetaAdsState(cacheBust);
          lastResolvedStatus = normalizeProviderStatus(metaAdsResult.status);
          lastConnected = metaAdsResult.connected;
          lastAssetCount = metaAdsResult.accountsCount;
        }

        if (isPopupResolvedStatus(lastResolvedStatus) || lastConnected) {
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
      markProviderStatus,
      refreshMetaAdsState,
      refreshMetaIntegrationState,
      shouldIgnoreProviderStatus,
    ]
  );

  const facebookPagesRuntimeState = providerRuntimeState.facebook_pages;
  const instagramBusinessRuntimeState = providerRuntimeState.instagram_business;
  const metaAdsRuntimeState = providerRuntimeState.meta_ads;
  const facebookPagesUiStatus = normalizeMetaProviderStatus({
    provider: "facebook_pages",
    status: facebookPagesStatus,
    connected: metaConnected,
    loading:
      facebookPagesRuntimeState.isActionInFlight ||
      (metaStatusLoading && !facebookPagesStatus && !metaConnected),
    assetCount: facebookPagesCount,
  });
  const instagramBusinessUiStatus = normalizeMetaProviderStatus({
    provider: "instagram_business",
    status: instagramBusinessStatus,
    connected: instagramBusinessConnected,
    loading:
      instagramBusinessRuntimeState.isActionInFlight ||
      (instagramBusinessStatusLoading &&
        !instagramBusinessStatus &&
        !instagramBusinessConnected) ||
      (metaLoading &&
        metaConnectChoiceVariant === "instagram_business" &&
        !instagramBusinessStatus &&
        !instagramBusinessConnected),
    assetCount: instagramBusinessAssetCount,
  });
  const metaAdsUiStatus = normalizeMetaProviderStatus({
    provider: "meta_ads",
    status: metaAdsStatus,
    connected: metaAdsConnected,
    loading:
      metaAdsRuntimeState.isActionInFlight ||
      (metaAdsStatusLoading && !metaAdsStatus && !metaAdsConnected),
    assetCount: metaAdsAccountsCount,
    lastSyncedAt: metaAdsLastSyncedAt,
  });
  const facebookPagesCardStatus = facebookPagesUiStatus.badge;
  const instagramCardStatus = instagramBusinessUiStatus.badge;
  const metaAdsCardStatus = metaAdsUiStatus.badge;
  const hasAnyConnectedIntegration =
    facebookPagesUiStatus.connected ||
    instagramBusinessUiStatus.connected ||
    metaAdsUiStatus.connected;
  const anyCardChecking =
    facebookPagesUiStatus.loading ||
    instagramBusinessUiStatus.loading ||
    metaAdsUiStatus.loading;
  const connectedButNoAuthorizedPages =
    facebookPagesUiStatus.connected &&
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
        setInstagramBusinessStatusLoading(true);
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
          setInstagramBusinessStatusLoading(false);
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
          setMetaAdsStatusLoading(false);
          return;
        }

        if (!active) {
          return;
        }

        setMetaAdsStatusLoading(true);
        await refreshMetaAdsState();
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta ads status load error:", error);
        setMetaAdsConnected(false);
        setMetaAdsAccountsCount(0);
        setMetaAdsStatus("");
      } finally {
        if (active) {
          setMetaAdsStatusLoading(false);
        }
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
        await handleIntegrationOAuthComplete(event.data);
        return;
      }

      if (!isMetaOAuthWindowMessage(event.data)) {
        return;
      }
      await handleIntegrationOAuthComplete({
        type: "measurable:integration-oauth-complete",
        provider: resolveOAuthMessageProvider(event.data),
        source: event.data.source,
        integration_type: event.data.integration_type,
        status:
          event.data.status ||
          (event.data.type === "MEASURABLE_META_CONNECT_SUCCESS"
            ? "connected"
            : "error"),
        integrationId:
          "integrationId" in event.data ? event.data.integrationId : undefined,
        message: event.data.message,
        error:
          event.data.type === "MEASURABLE_META_CONNECT_ERROR"
            ? event.data.message
            : undefined,
      });
    }

    window.addEventListener("message", handleMetaWindowMessage);

    return () => {
      stopPopupPolling();
      window.removeEventListener("message", handleMetaWindowMessage);
    };
  }, [
    handleIntegrationOAuthComplete,
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
    let popup: Window | null = null;
    let attemptedProvider: PopupProvider = "facebook_pages";

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

      if (isMetaOrganicFrontendIntegrationKey(source)) {
        setMetaConnectChoiceVariant(source);
        attemptedProvider = source;
      }
      setPendingMetaSource(source);
      beginProviderAction(attemptedProvider, "connect");

      if (typeof window === "undefined") {
        throw new Error("We could not open the Facebook Pages connection window. Please try again.");
      }

      popup = window.open(
        "about:blank",
        "measurable_facebook_pages_oauth",
        META_OAUTH_POPUP_FEATURES
      );

      if (!popup) {
        throw new Error("Please allow popups to connect this integration.");
      }

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

      if (popup.closed) {
        throw new Error("The connection window was closed before authorization was completed.");
      }

      if (typeof window !== "undefined") {
        markMetaRedirectStarted();
        logMetaOAuthDev("popup opened", {
          route: "/integrations",
          source,
        });
        popupWindowRef.current = popup;
        popupStatusSnapshotRef.current = getPopupStatusSnapshot(source);
        popup.location.href = authUrl;
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
              const resolution = await pollForPopupResolution(snapshot, {
                timeoutMs: POPUP_STATUS_POLL_MS,
              });
              const result = await refreshMetaIntegrationState();
              if (resolution.resolved && result.facebookPagesConnected) {
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
                completeProviderAction(source);
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
            completeProviderAction(source);
          }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
        }, 500);
        return;
      }
    } catch (err: unknown) {
      console.error("meta connect error:", err);
      if (!popupStarted) {
        try {
          popup?.close();
        } catch {
          // Ignore cross-browser popup close failures.
        }
      }
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
        completeProviderAction(attemptedProvider);
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
      const provider: PopupProvider = "facebook_pages";

      try {
        beginProviderAction(provider, "disconnect");
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
        markProviderDisconnected(provider);
        setMetaCatalogsResolved(false);
        setMetaReconnectMessage("");
        setMetaStatusMessage("Integration disconnected successfully.");
      } catch (error) {
        console.error("meta disconnect error:", error);
        setMetaError("We couldn’t disconnect Meta right now. Please try again.");
        updateProviderRuntimeState(provider, {
          isActionInFlight: false,
          error: "We couldn’t disconnect Meta right now. Please try again.",
        });
      } finally {
        setDisconnectLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        setMetaLoading(false);
        completeProviderAction(provider);
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
      beginProviderAction("instagram_business", "connect");
      setMetaLoading(true);
      setMetaConnectChoiceVariant("instagram_business");
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
      const authUrl = normalizeMetaAuthUrl(rawAuthUrl, "instagram_business");
      const validation = validateMetaAuthUrl(authUrl, "instagram_business");

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
          setInstagramBusinessStatusLoading(false);
          setMetaConnectMode(null);
          let resolution: Awaited<ReturnType<typeof pollForPopupResolution>> | null = null;

          try {
            setInstagramBusinessStatusLoading(true);
            const refreshKey = Date.now();
            resolution = await pollForPopupResolution(snapshot, {
              cacheBustBase: refreshKey,
              timeoutMs: POPUP_STATUS_POLL_MS,
            });
            const statusResult = await fetchInstagramBusinessStatus({
              workspaceId: input.workspaceId,
              cacheBust: refreshKey + 100,
            });
            const refreshResult = await refreshMetaIntegrationState(refreshKey + 200);
            const message = getInstagramBusinessStatusMessage({
              status: statusResult.status,
              connected:
                statusResult.connected || refreshResult.instagramBusinessConnected,
              assetCount:
                statusResult.assetCount || refreshResult.instagramAccountsCount,
              missingScopes: statusResult.missingScopes,
              message: statusResult.message,
            });

            const resolvedConnected =
              normalizeMetaProviderStatus({
                provider: "instagram_business",
                status: statusResult.status,
                connected:
                  statusResult.connected ||
                  refreshResult.instagramBusinessConnected,
                assetCount:
                  statusResult.assetCount ||
                  refreshResult.instagramAccountsCount,
              }).connected;

            if (resolvedConnected) {
              setInstagramBusinessError("");
              setMetaReconnectMessage("");
              setMetaStatusMessage(message || "Instagram Business connected successfully.");
              completeProviderAction("instagram_business");
              return;
            }

            if (
              resolution?.resolved &&
              isPopupResolvedStatus(statusResult.status)
            ) {
              setInstagramBusinessError("");
              setMetaReconnectMessage("");
              setMetaStatusMessage(
                message || "Connected, but no assets were found."
              );
              completeProviderAction("instagram_business");
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
              completeProviderAction("instagram_business");
              return;
            }
          } catch (error) {
            console.error("instagram business popup closed refresh error:", error);
          } finally {
            setInstagramBusinessStatusLoading(false);
          }

          setMetaStatusMessage("");
          if (!resolution?.resolved && isAvailableProviderStatus(resolution?.status)) {
            setInstagramBusinessError(
              "The connection window was closed before authorization was completed."
            );
          }
          completeProviderAction("instagram_business");
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
        setInstagramBusinessStatusLoading(false);
        completeProviderAction("instagram_business");
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

    setMetaConnectChoiceVariant(reconnectSource);
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
        beginProviderAction("meta_ads", "connect");
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
              resolution = await pollForPopupResolution(snapshot, {
                timeoutMs: POPUP_STATUS_POLL_MS,
              });
              const result = await refreshMetaAdsState();
              if (result.connected) {
                setMetaAdsError("");
                setMetaAdsStatusMessage("Meta Ads connected successfully.");
                completeProviderAction("meta_ads");
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
                  completeProviderAction("meta_ads");
                  return;
                }

                setMetaAdsError("");
                setMetaAdsStatusMessage(nextMessage);
                completeProviderAction("meta_ads");
                return;
              }
            } catch (error) {
              console.error("meta ads popup closed refresh error:", error);
            }

            setMetaAdsStatusMessage("");
            if (!resolution?.resolved && isAvailableProviderStatus(resolution?.status)) {
              setMetaAdsError(
                "The connection window was closed before authorization was completed."
              );
            }
            completeProviderAction("meta_ads");
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
          completeProviderAction("meta_ads");
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
      const provider: PopupProvider = "instagram_business";

      try {
        beginProviderAction(provider, "disconnect");
        setMetaConnectChoiceVariant("instagram_business");
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
        setInstagramAccountsCount(0);
        markProviderDisconnected(provider);
        setMetaStatusMessage("Integration disconnected successfully.");
      } catch (error) {
        console.error("instagram business disconnect error:", error);
        const message = "We couldn’t disconnect Instagram Business right now. Please try again.";
        setInstagramBusinessError(message);
        updateProviderRuntimeState(provider, {
          isActionInFlight: false,
          error: message,
        });
      } finally {
        setMetaLoading(false);
        setMetaStatusLoading(false);
        setMetaCatalogsLoading(false);
        completeProviderAction(provider);
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
      const provider: PopupProvider = "meta_ads";

      try {
        beginProviderAction(provider, "disconnect");
        setMetaAdsDisconnectLoading(true);
        setMetaAdsError("");
        setMetaAdsStatusMessage("");
        await disconnectMetaAdsIntegration({
          workspaceId: activeWorkspaceId || undefined,
        });
        markProviderDisconnected(provider);
        setMetaAdsStatusMessage("Meta Ads disconnected successfully.");
      } catch (error) {
        console.error("meta ads disconnect error:", error);
        const message = "We couldn’t disconnect Meta Ads right now. Please try again.";
        setMetaAdsError(message);
        updateProviderRuntimeState(provider, {
          isActionInFlight: false,
          error: message,
        });
      } finally {
        setMetaAdsDisconnectLoading(false);
        completeProviderAction(provider);
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

      {!anyCardChecking && !hasAnyConnectedIntegration ? (
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
            ? facebookPagesUiStatus.actionLabel
            : isInstagramBusiness
              ? instagramBusinessUiStatus.actionLabel
              : isMetaAds
                ? metaAdsUiStatus.actionLabel
                : integration.actionLabel;
          const onAction = isFacebookPages
            ? facebookPagesUiStatus.actionLabel === "Disconnect"
              ? handleMetaDisconnect
              : facebookPagesUiStatus.actionLabel === "Reconnect"
                ? () => handleMetaReconnect("facebook_pages")
              : handleFacebookPagesConnectRequest
            : isInstagramBusiness
              ? instagramBusinessUiStatus.actionLabel === "Reconnect"
                  ? () => handleMetaReconnect("instagram_business")
                  : instagramBusinessUiStatus.actionLabel === "Disconnect"
                  ? handleInstagramBusinessDisconnect
                  : handleInstagramBusinessConnect
              : isMetaAds
                ? metaAdsUiStatus.actionLabel === "Reconnect"
                  ? () => handleMetaAdsConnect(true)
                  : metaAdsUiStatus.actionLabel === "Disconnect"
                  ? handleMetaAdsDisconnect
                  : () => handleMetaAdsConnect(false)
                : undefined;
          const disabled = isFacebookPages
            ? facebookPagesUiStatus.loading ||
              facebookPagesRuntimeState.isActionInFlight ||
              (metaLoading && metaConnectChoiceVariant === "facebook_pages") ||
              disconnectLoading
            : isInstagramBusiness
              ? instagramBusinessUiStatus.loading ||
                instagramBusinessRuntimeState.isActionInFlight ||
                (metaLoading && metaConnectChoiceVariant === "instagram_business")
              : isMetaAds
                ? metaAdsUiStatus.loading ||
                  metaAdsRuntimeState.isActionInFlight ||
                  metaAdsLoading ||
                  metaAdsDisconnectLoading
                : true;
          const loading = isFacebookPages
            ? facebookPagesRuntimeState.isActionInFlight ||
              (metaLoading && metaConnectChoiceVariant === "facebook_pages")
            : isInstagramBusiness
              ? instagramBusinessRuntimeState.isActionInFlight ||
                (metaLoading && metaConnectChoiceVariant === "instagram_business")
              : isMetaAds
                ? metaAdsRuntimeState.isActionInFlight || metaAdsLoading
                : false;
          const helperText = isFacebookPages
            ? facebookPagesUiStatus.helperText
            : isInstagramBusiness
              ? instagramBusinessUiStatus.helperText
              : isMetaAds
                ? metaAdsUiStatus.helperText
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
