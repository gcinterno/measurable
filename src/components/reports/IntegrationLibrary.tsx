"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/providers/LanguageProvider";
import {
  connectMetaBusinessSuiteIntegration,
  disconnectMetaBusinessSuiteIntegration,
  fetchMetaBusinessSuiteStatus,
  isMetaAssetDiscoveryComplete,
  normalizeMetaProviderStatus,
  type MetaBusinessSuiteConnectionStatus,
  type MetaProviderUiStatus,
} from "@/lib/api/integrations";
import {
  clearPendingMetaOAuth,
  consumePendingMetaOAuthForRetry,
  createPendingMetaOAuth,
  clearMetaOAuthDebugUrl,
  hasMetaConnectPrerequisites,
  isIntegrationOAuthCompleteMessage,
  isMetaOAuthWindowMessage,
  markMetaRedirectStarted,
  META_OAUTH_POPUP_CLOSE_GRACE_MS,
  META_OAUTH_POPUP_FEATURES,
  showMetaOAuthReadyBanner,
  storeMetaOAuthDebugUrl,
} from "@/lib/integrations/meta-oauth";
import {
  isMetaOrganicFrontendIntegrationKey,
  isMetaFrontendIntegrationKey,
  META_REPORT_SOURCE_KEYS,
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

type MetaProviderConnectionState = {
  status: string;
  connected: boolean;
  integrationId: string;
  assetCount: number;
  discoveryStatus: string;
  assetDiscoveryInFlight: boolean;
  loading: boolean;
  isActionInFlight: boolean;
  lastUserAction: "connect" | "disconnect" | null;
  lastActionAt: number;
  lastUpdatedAt: number;
  error: string;
  lastSyncedAt: string;
  missingScopes: string[];
};

const META_PROVIDER_POPUP_STATUS_POLL_MS = 30000;
const DISCONNECT_STATUS_PROTECTION_MS = 10000;

function createMetaProviderConnectionState(
  loading = false
): MetaProviderConnectionState {
  return {
    status: "",
    connected: false,
    integrationId: "",
    assetCount: 0,
    discoveryStatus: "",
    assetDiscoveryInFlight: false,
    loading,
    isActionInFlight: false,
    lastUserAction: null,
    lastActionAt: 0,
    lastUpdatedAt: 0,
    error: "",
    lastSyncedAt: "",
    missingScopes: [],
  };
}

function createMetaProviderConnectionStateMap(loading = false) {
  return {
    facebook_pages: createMetaProviderConnectionState(loading),
    instagram_business: createMetaProviderConnectionState(loading),
    meta_ads: createMetaProviderConnectionState(loading),
  } satisfies Record<MetaFrontendIntegrationKey, MetaProviderConnectionState>;
}

function createEmptyMetaBusinessSuiteStatus(): MetaBusinessSuiteConnectionStatus {
  return {
    provider: "meta_business_suite",
    status: "",
    connected: false,
    integrationId: "",
    assetCount: 0,
    discoveryStatus: "",
    tokenScopes: [],
    missingScopes: [],
    lastSyncedAt: "",
    message: "",
    children: {
      facebook_pages: {
        provider: "facebook_pages",
        status: "",
        connected: false,
        integrationId: "",
        assetCount: 0,
        discoveryStatus: "",
        tokenScopes: [],
        missingScopes: [],
        lastSyncedAt: "",
        message: "",
      },
      instagram_business: {
        provider: "instagram_business",
        status: "",
        connected: false,
        integrationId: "",
        assetCount: 0,
        discoveryStatus: "",
        tokenScopes: [],
        missingScopes: [],
        lastSyncedAt: "",
        message: "",
      },
      meta_ads: {
        provider: "meta_ads",
        status: "",
        connected: false,
        integrationId: "",
        assetCount: 0,
        discoveryStatus: "",
        tokenScopes: [],
        missingScopes: [],
        lastSyncedAt: "",
        message: "",
      },
    },
  };
}

function getSuiteChildDiscoveryStatus(
  suiteStatus: MetaBusinessSuiteConnectionStatus,
  provider: MetaFrontendIntegrationKey
) {
  return suiteStatus.children[provider].discoveryStatus || suiteStatus.discoveryStatus;
}

function isSuiteChildAssetDiscoverySettled(
  suiteStatus: MetaBusinessSuiteConnectionStatus,
  provider: MetaFrontendIntegrationKey
) {
  const childStatus = suiteStatus.children[provider];

  return (
    childStatus.assetCount > 0 ||
    isMetaAssetDiscoveryComplete(getSuiteChildDiscoveryStatus(suiteStatus, provider))
  );
}

function isSuiteAssetDiscoverySettled(status: MetaBusinessSuiteConnectionStatus) {
  return META_REPORT_SOURCE_KEYS.every((provider) =>
    isSuiteChildAssetDiscoverySettled(status, provider)
  );
}

function mergeMetaSuiteStatusForDisplay(
  current: MetaBusinessSuiteConnectionStatus,
  next: MetaBusinessSuiteConnectionStatus
) {
  const mergedStatus: MetaBusinessSuiteConnectionStatus = {
    ...next,
    children: {
      facebook_pages: { ...next.children.facebook_pages },
      instagram_business: { ...next.children.instagram_business },
      meta_ads: { ...next.children.meta_ads },
    },
  };

  META_REPORT_SOURCE_KEYS.forEach((provider) => {
    const currentChild = current.children[provider];
    const nextChild = mergedStatus.children[provider];
    const discoveryStatus =
      nextChild.discoveryStatus || mergedStatus.discoveryStatus;

    if (
      currentChild.assetCount > 0 &&
      nextChild.assetCount === 0 &&
      !isMetaAssetDiscoveryComplete(discoveryStatus)
    ) {
      mergedStatus.children[provider] = {
        ...nextChild,
        assetCount: currentChild.assetCount,
      };
    }
  });

  mergedStatus.assetCount = Object.values(mergedStatus.children).reduce(
    (total, childStatus) => total + childStatus.assetCount,
    0
  );

  return mergedStatus;
}

function normalizeSuiteChildStatus(input: {
  provider: MetaFrontendIntegrationKey;
  suiteStatus: MetaBusinessSuiteConnectionStatus;
  loading?: boolean;
}) {
  const childStatus = input.suiteStatus.children[input.provider];
  const suiteUiStatus = normalizeMetaProviderStatus({
    provider: input.provider,
    status: input.suiteStatus.status,
    connected: input.suiteStatus.connected,
  });
  const childUiStatus = normalizeMetaProviderStatus({
    provider: input.provider,
    status: childStatus.status,
    connected: childStatus.connected,
    assetCount: childStatus.assetCount,
    lastSyncedAt: childStatus.lastSyncedAt || input.suiteStatus.lastSyncedAt,
  });
  const suiteConnected = suiteUiStatus.connected;
  const childNeedsPermission = childUiStatus.status === "needs_permission";
  const discoverySettled = isSuiteChildAssetDiscoverySettled(
    input.suiteStatus,
    input.provider
  );
  const connected = suiteConnected && !childNeedsPermission;
  let status = suiteUiStatus.status || childUiStatus.status;

  if (childNeedsPermission) {
    status = "needs_permission";
  } else if (connected && childStatus.assetCount === 0 && discoverySettled) {
    status = "connected_no_assets";
  } else if (connected) {
    status = "connected";
  } else if (suiteConnected) {
    status = childUiStatus.status || "connected";
  }

  return normalizeMetaProviderStatus({
    provider: input.provider,
    status,
    connected,
    loading: input.loading,
    assetCount: childStatus.assetCount,
    lastSyncedAt: childStatus.lastSyncedAt || input.suiteStatus.lastSyncedAt,
  });
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
  ].map((value) => (value || "").trim().toLowerCase());

  if (candidates.includes("instagram_business")) {
    return "instagram_business" as const;
  }

  if (candidates.includes("meta_ads")) {
    return "meta_ads" as const;
  }

  return "facebook_pages" as const;
}

function isMetaBusinessSuiteOAuthMessage(message: {
  provider?: string;
  source?: string;
  integration_type?: string;
}) {
  return [message.provider, message.source, message.integration_type].some(
    (value) => (value || "").trim().toLowerCase() === "meta_business_suite"
  );
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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
  status: IntegrationCatalogItem["status"] | MetaProviderUiStatus["badge"]
) {
  switch (status) {
    case "Connected":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Checking":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    case "Available":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "Needs permission":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
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
  const [providerConnections, setProviderConnections] = useState<
    Record<MetaFrontendIntegrationKey, MetaProviderConnectionState>
  >(
    () =>
      createMetaProviderConnectionStateMap(
        embedded && mode === "report-flow"
      )
  );
  const [, setMetaSuiteStatus] =
    useState<MetaBusinessSuiteConnectionStatus>(createEmptyMetaBusinessSuiteStatus);
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
  const providerConnectionsRef = useRef(providerConnections);
  const metaSuiteStatusRef = useRef<MetaBusinessSuiteConnectionStatus>(
    createEmptyMetaBusinessSuiteStatus()
  );
  const lastMetaSuiteStatusAppliedAtRef = useRef(0);
  const popupCallbackReceivedRef = useRef(false);
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

  const setProviderConnection = useCallback(
    (
      provider: MetaFrontendIntegrationKey,
      nextConnection: Partial<MetaProviderConnectionState>
    ) => {
      const current = providerConnectionsRef.current;
      const nextState = {
        ...current,
        [provider]: {
          ...current[provider],
          ...nextConnection,
        },
      };

      providerConnectionsRef.current = nextState;
      setProviderConnections(nextState);
    },
    []
  );

  const beginProviderAction = useCallback(
    (
      provider: MetaFrontendIntegrationKey,
      action: "connect" | "disconnect"
    ) => {
      setProviderConnection(provider, {
        isActionInFlight: true,
        lastUserAction: action,
        lastActionAt: Date.now(),
        error: "",
      });
    },
    [setProviderConnection]
  );

  const completeProviderAction = useCallback(
    (
      provider: MetaFrontendIntegrationKey,
      nextConnection: Partial<MetaProviderConnectionState> = {}
    ) => {
      setProviderConnection(provider, {
        isActionInFlight: false,
        ...nextConnection,
      });
    },
    [setProviderConnection]
  );

  const shouldIgnoreProviderStatus = useCallback(
    (
      provider: MetaFrontendIntegrationKey,
      requestStartedAt: number,
      nextStatus: MetaProviderUiStatus
    ) => {
      const current = providerConnectionsRef.current[provider];

      if (current.lastActionAt > 0 && requestStartedAt < current.lastActionAt) {
        return true;
      }

      if (requestStartedAt < lastMetaSuiteStatusAppliedAtRef.current) {
        return true;
      }

      if (
        current.lastUserAction === "disconnect" &&
        Date.now() - current.lastActionAt < DISCONNECT_STATUS_PROTECTION_MS &&
        nextStatus.connected
      ) {
        return true;
      }

      return false;
    },
    []
  );

  const applyMetaSuiteStatus = useCallback(
    (
      suiteStatus: MetaBusinessSuiteConnectionStatus,
      requestStartedAt: number
    ) => {
      if (requestStartedAt < lastMetaSuiteStatusAppliedAtRef.current) {
        const currentConnections = providerConnectionsRef.current;

        return META_REPORT_SOURCE_KEYS.reduce((accumulator, provider) => {
          const current = currentConnections[provider];

          accumulator[provider] = normalizeMetaProviderStatus({
            provider,
            status: current.status,
            connected: current.connected,
            assetCount: current.assetCount,
            lastSyncedAt: current.lastSyncedAt,
          });

          return accumulator;
        }, {} as Record<MetaFrontendIntegrationKey, MetaProviderUiStatus>);
      }

      const displaySuiteStatus = mergeMetaSuiteStatusForDisplay(
        metaSuiteStatusRef.current,
        suiteStatus
      );
      const nextCounts = {
        facebook_pages: displaySuiteStatus.children.facebook_pages.assetCount,
        instagram_business: displaySuiteStatus.children.instagram_business.assetCount,
        meta_ads: displaySuiteStatus.children.meta_ads.assetCount,
      };
      const nextUiStatuses = {} as Record<
        MetaFrontendIntegrationKey,
        MetaProviderUiStatus
      >;
      const nextProviderConnections = {
        ...providerConnectionsRef.current,
      };

      META_REPORT_SOURCE_KEYS.forEach((provider) => {
        const childStatus = displaySuiteStatus.children[provider];
        const uiStatus = normalizeSuiteChildStatus({
          provider,
          suiteStatus: displaySuiteStatus,
        });

        if (shouldIgnoreProviderStatus(provider, requestStartedAt, uiStatus)) {
          const current = nextProviderConnections[provider];

          nextUiStatuses[provider] = normalizeMetaProviderStatus({
            provider,
            status: current.status,
            connected: current.connected,
            assetCount: current.assetCount,
            lastSyncedAt: current.lastSyncedAt,
          });
          return;
        }

        nextUiStatuses[provider] = uiStatus;
        const discoverySettled = isSuiteChildAssetDiscoverySettled(
          displaySuiteStatus,
          provider
        );
        nextProviderConnections[provider] = {
          ...nextProviderConnections[provider],
          status: uiStatus.status,
          connected: uiStatus.connected,
          integrationId: childStatus.integrationId || displaySuiteStatus.integrationId,
          assetCount: childStatus.assetCount,
          discoveryStatus:
            childStatus.discoveryStatus || displaySuiteStatus.discoveryStatus,
          loading: false,
          isActionInFlight: false,
          assetDiscoveryInFlight: discoverySettled
            ? false
            : nextProviderConnections[provider].assetDiscoveryInFlight,
          lastUpdatedAt: Date.now(),
          error: uiStatus.connected ? "" : nextProviderConnections[provider].error,
          lastSyncedAt: childStatus.lastSyncedAt || displaySuiteStatus.lastSyncedAt,
          missingScopes: childStatus.missingScopes.length
            ? childStatus.missingScopes
            : displaySuiteStatus.missingScopes,
        };
      });

      metaSuiteStatusRef.current = displaySuiteStatus;
      lastMetaSuiteStatusAppliedAtRef.current = Date.now();
      providerConnectionsRef.current = nextProviderConnections;
      setProviderConnections(nextProviderConnections);
      setMetaSuiteStatus(displaySuiteStatus);
      setMetaCounts(nextCounts);
      setMetaIntegrationId(
        displaySuiteStatus.children.facebook_pages.integrationId ||
          displaySuiteStatus.children.instagram_business.integrationId ||
          displaySuiteStatus.integrationId
      );
      setMetaAdsIntegrationId(
        displaySuiteStatus.children.meta_ads.integrationId || displaySuiteStatus.integrationId
      );

      return nextUiStatuses;
    },
    [shouldIgnoreProviderStatus]
  );

  const refreshMetaSuiteProviderStates = useCallback(
    async (
      cacheBust?: number,
      loadingProviders: readonly MetaFrontendIntegrationKey[] = META_REPORT_SOURCE_KEYS,
      refresh = false,
      assetDiscoveryProviders: readonly MetaFrontendIntegrationKey[] = []
    ) => {
      const requestStartedAt = Date.now();

      if (!embedded) {
        const suiteStatus = createEmptyMetaBusinessSuiteStatus();

        return applyMetaSuiteStatus(suiteStatus, requestStartedAt);
      }

      setProviderConnections((current) => {
        const nextState = { ...current };

        loadingProviders.forEach((provider) => {
          nextState[provider] = {
            ...nextState[provider],
            loading: true,
          };
        });
        assetDiscoveryProviders.forEach((provider) => {
          nextState[provider] = {
            ...nextState[provider],
            assetDiscoveryInFlight: true,
          };
        });

        providerConnectionsRef.current = nextState;
        return nextState;
      });

      try {
        const suiteStatus = await fetchMetaBusinessSuiteStatus({
          workspaceId: activeWorkspaceId,
          refresh,
          cacheBust,
        });

        return applyMetaSuiteStatus(suiteStatus, requestStartedAt);
      } catch (error) {
        setProviderConnections((current) => {
          const nextState = { ...current };

          META_REPORT_SOURCE_KEYS.forEach((provider) => {
            nextState[provider] = {
              ...nextState[provider],
              loading: false,
              assetDiscoveryInFlight: false,
              connected: false,
              status: "",
              assetCount: 0,
            };
          });

          providerConnectionsRef.current = nextState;
          return nextState;
        });
        throw error;
      }
    },
    [activeWorkspaceId, applyMetaSuiteStatus, embedded]
  );

  const refreshProviderState = useCallback(
    async (provider: MetaFrontendIntegrationKey, cacheBust?: number) => {
      const uiStatuses = await refreshMetaSuiteProviderStates(cacheBust, [provider]);

      return uiStatuses[provider];
    },
    [refreshMetaSuiteProviderStates]
  );

  const clearAssetDiscoveryInFlight = useCallback(() => {
    setProviderConnections((current) => {
      const nextState = { ...current };

      META_REPORT_SOURCE_KEYS.forEach((provider) => {
        nextState[provider] = {
          ...nextState[provider],
          assetDiscoveryInFlight: false,
        };
      });

      providerConnectionsRef.current = nextState;
      return nextState;
    });
  }, []);

  const pollMetaSuiteAssetsAfterOAuth = useCallback(async () => {
    const deadline = Date.now() + META_PROVIDER_POPUP_STATUS_POLL_MS;
    let attempt = 0;

    try {
      while (Date.now() < deadline) {
        await refreshMetaSuiteProviderStates(
          Date.now() + attempt,
          [],
          true,
          META_REPORT_SOURCE_KEYS
        );

        if (isSuiteAssetDiscoverySettled(metaSuiteStatusRef.current)) {
          break;
        }

        attempt += 1;
        await delay(1500);
      }
    } catch (error) {
      console.error("meta suite report-flow asset refresh error:", error);
    } finally {
      clearAssetDiscoveryInFlight();
    }
  }, [clearAssetDiscoveryInFlight, refreshMetaSuiteProviderStates]);

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

    async function loadProviderStates() {
      if (!embedded) {
        return;
      }

      try {
        await refreshMetaSuiteProviderStates();
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta provider flow status load error:", error);
      }
    }

    void loadProviderStates();

    return () => {
      active = false;
    };
  }, [embedded, refreshMetaSuiteProviderStates]);

  const handleOAuthCompleteMessage = useCallback(
    async (message: {
      provider?: string;
      source?: string;
      integration_type?: string;
      status?: string;
      message?: string;
      error?: string;
      missingScopes?: string[];
      missing_scopes?: string[];
      integrationId?: string;
    }) => {
      const provider =
        isMetaBusinessSuiteOAuthMessage(message) &&
        isMetaFrontendIntegrationKey(connectingIntegrationKey || "")
          ? (connectingIntegrationKey as MetaFrontendIntegrationKey)
          : resolveOAuthMessageProvider(message);

      popupCallbackReceivedRef.current = true;
      stopPopupPolling();
      clearPendingMetaOAuth();
      connectInFlightRef.current = false;
      setConnectingIntegrationKey(null);
      setConnectError("");

      if (message.integrationId) {
        if (provider === "meta_ads") {
          setMetaAdsIntegrationId(message.integrationId);
        } else {
          setMetaIntegrationId(message.integrationId);
        }
      }

      try {
        const uiStatuses = await refreshMetaSuiteProviderStates(
          Date.now(),
          [],
          true,
          META_REPORT_SOURCE_KEYS
        );
        const uiStatus = uiStatuses[provider];

        if (uiStatus.connected) {
          void trackMetaEvent("MetaConnected", {
            source: provider,
            surface: "report_flow",
          });
          setConnectError("");
          completeProviderAction(provider, { status: uiStatus.status });
          void pollMetaSuiteAssetsAfterOAuth();
          return;
        }

        if (uiStatus.status === "needs_permission") {
          setConnectError(uiStatus.helperText);
          completeProviderAction(provider, {
            status: uiStatus.status,
            error: uiStatus.helperText,
          });
          return;
        }

        if (message.status === "error" || message.error) {
          setConnectError(
            message.error ||
              message.message ||
              "We couldn’t complete the Meta connection."
          );
        }
        completeProviderAction(provider);
      } catch (error) {
        console.error("integration library popup refresh error:", error);
        setConnectError("The connection finished, but we couldn’t refresh the status.");
        completeProviderAction(provider, {
          error: "The connection finished, but we couldn’t refresh the status.",
        });
      }
    },
    [
      completeProviderAction,
      connectingIntegrationKey,
      pollMetaSuiteAssetsAfterOAuth,
      refreshMetaSuiteProviderStates,
      stopPopupPolling,
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function handleMetaWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (isIntegrationOAuthCompleteMessage(event.data)) {
        await handleOAuthCompleteMessage(event.data);
        return;
      }

      if (!isMetaOAuthWindowMessage(event.data)) {
        return;
      }

      await handleOAuthCompleteMessage({
        provider:
          event.data.provider === "meta"
            ? "facebook_pages"
            : event.data.provider,
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
        missingScopes: event.data.missingScopes,
        missing_scopes: event.data.missing_scopes,
      });
    }

    window.addEventListener("message", handleMetaWindowMessage);

    return () => {
      stopPopupPolling();
      window.removeEventListener("message", handleMetaWindowMessage);
    };
  }, [handleOAuthCompleteMessage, stopPopupPolling]);

  const pollProviderStatusAfterPopup = useCallback(
    async (provider: MetaFrontendIntegrationKey, cacheBustBase = Date.now()) => {
      const deadline = Date.now() + META_PROVIDER_POPUP_STATUS_POLL_MS;
      let attempt = 0;
      let lastUiStatus = normalizeMetaProviderStatus({
        provider,
        ...providerConnections[provider],
      });

      while (Date.now() < deadline && !popupCallbackReceivedRef.current) {
        lastUiStatus = await refreshProviderState(provider, cacheBustBase + attempt);

        if (lastUiStatus.connected || lastUiStatus.status === "needs_permission") {
          return lastUiStatus;
        }

        attempt += 1;
        await delay(1000);
      }

      return lastUiStatus;
    },
    [providerConnections, refreshProviderState]
  );

  async function handleDirectConnect(integration: IntegrationCatalogItem) {
    if (!isMetaFrontendIntegrationKey(integration.integrationKey)) {
      return;
    }
    const provider = integration.integrationKey;

    if (connectInFlightRef.current) {
      console.warn("META_CONNECT_DUPLICATE_IGNORED", {
        route: "IntegrationLibrary",
        source: integration.integrationKey,
      });
      return;
    }

    let popupStarted = false;
    let popup: Window | null = null;

    try {
      connectInFlightRef.current = true;
      popupCallbackReceivedRef.current = false;
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
      beginProviderAction(provider, "connect");

      if (typeof window === "undefined") {
        throw new Error("We could not open the connection window. Please try again.");
      }

      popup = window.open(
        "about:blank",
        `measurable_${integration.integrationKey}_oauth`,
        META_OAUTH_POPUP_FEATURES
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }

      console.info("META_CONNECT_START", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        route: "IntegrationLibrary",
      });

      if (integration.integrationKey === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_CONNECT_REQUESTED", {
          route: "IntegrationLibrary",
          integration_type: "instagram_business",
          workspace_id: contextWorkspaceId,
        });
        console.info("INSTAGRAM_BUSINESS_CONNECT_CLICKED", {
          route: "IntegrationLibrary",
          integration_type: "instagram_business",
          workspace_id: contextWorkspaceId,
        });
      }

      const response = await connectMetaBusinessSuiteIntegration({
        workspaceId: contextWorkspaceId,
        reconnect: true,
      });
      const authUrl = response.authUrlFromBackend || response.redirectUrl;

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        integration_type: "meta_business_suite",
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
        console.info("INSTAGRAM_BUSINESS_AUTH_URL_CREATED", {
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
        integration_type: "meta_business_suite",
        auth_url: authUrl || null,
      });

      if (!authUrl) {
        throw new Error(
          "The backend did not return a valid Meta Business Suite OAuth URL."
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

      if (popup.closed) {
        throw new Error("The connection window was closed before authorization was completed.");
      }

      markMetaRedirectStarted();
      popup.location.href = authUrl;
      popupStarted = true;
      stopPopupPolling();
      popupTimeoutRef.current = window.setTimeout(() => {
        setConnectError(
          "This is taking longer than expected. Finish the Meta flow in the popup and we’ll update the connection automatically."
        );
      }, 90000);
      popupPollRef.current = window.setInterval(() => {
        if (!popup || !popup.closed) {
          return;
        }

        stopPopupPolling();
        window.setTimeout(async () => {
          if (popupCallbackReceivedRef.current) {
            return;
          }

          clearPendingMetaOAuth();
          connectInFlightRef.current = false;
          setConnectingIntegrationKey(null);

          try {
            const uiStatus = await pollProviderStatusAfterPopup(provider);

            if (uiStatus.connected) {
              void trackMetaEvent("MetaConnected", {
                source: provider,
                surface: "report_flow",
              });
              setConnectError("");
              completeProviderAction(provider, { status: uiStatus.status });
              void pollMetaSuiteAssetsAfterOAuth();
              return;
            }

            if (uiStatus.status === "needs_permission") {
              setConnectError(uiStatus.helperText);
              completeProviderAction(provider, {
                status: uiStatus.status,
                error: uiStatus.helperText,
              });
              return;
            }

          } catch (error) {
            console.error("integration library popup closed refresh error:", error);
          }

          setConnectError(
            "Authorization is still being processed. Refresh this page in a few seconds."
          );
          completeProviderAction(provider, {
            error: "Authorization is still being processed. Refresh this page in a few seconds.",
          });
        }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
      }, 500);
    } catch (error) {
      console.error("direct integration connect error:", error);
      if (!popupStarted) {
        try {
          popup?.close();
        } catch {
          // Ignore popup close failures.
        }
      }
      if (integration.integrationKey === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_CONNECT_FAILED", {
          route: "IntegrationLibrary",
          integration_type: "instagram_business",
          workspace_id: contextWorkspaceId,
          reason: error instanceof Error ? error.message : "unknown_error",
        });
      }
      setConnectError(
        error instanceof Error && error.message
          ? error.message
          : "We could not start Meta Business Suite authorization. Try again."
      );
    } finally {
      if (!popupStarted) {
        connectInFlightRef.current = false;
        setConnectingIntegrationKey(null);
        completeProviderAction(provider);
      }
    }
  }

  const getIntegrationIdForProvider = useCallback(
    (provider: MetaFrontendIntegrationKey) =>
      providerConnections[provider].integrationId ||
      (provider === "meta_ads" ? metaAdsIntegrationId : metaIntegrationId),
    [metaAdsIntegrationId, metaIntegrationId, providerConnections]
  );

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
          getIntegrationIdForProvider(integrationKey) ||
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
        integrationId: getIntegrationIdForProvider(integrationKey),
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
        integrationId: currentSelectedSources[0]
          ? getIntegrationIdForProvider(currentSelectedSources[0])
          : "",
        selectedSources: currentSelectedSources,
        selectedAccountsBySource,
      })
    );
    router.push(`/reports/new/flow/sync?integration=${currentSelectedSources[0]}`);
  }

  async function handleMetaDisconnect() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Meta Business Suite? This will disconnect Facebook Pages, Instagram Business, and Meta Ads from this workspace. Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const currentContext = getIntegrationReportContext();
      const disconnectedAt = Date.now();
      const disconnectedSuiteStatus = {
        ...createEmptyMetaBusinessSuiteStatus(),
        status: "disconnected",
      };

      setDisconnectingIntegrationKey("meta_business_suite");
      setConnectError("");
      META_REPORT_SOURCE_KEYS.forEach((provider) => {
        beginProviderAction(provider, "disconnect");
      });
      await disconnectMetaBusinessSuiteIntegration({
        workspaceId: activeWorkspaceId || currentContext?.workspaceId || "",
      });
      clearMetaIntegrationSessionState();
      setCurrentSelectedSources([]);
      setMetaIntegrationId("");
      setMetaAdsIntegrationId("");
      metaSuiteStatusRef.current = disconnectedSuiteStatus;
      lastMetaSuiteStatusAppliedAtRef.current = disconnectedAt;
      setMetaSuiteStatus(disconnectedSuiteStatus);
      setMetaCounts({
        facebook_pages: 0,
        instagram_business: 0,
        meta_ads: 0,
      });
      META_REPORT_SOURCE_KEYS.forEach((provider) => {
        setProviderConnection(provider, {
          status: "disconnected",
          connected: false,
          integrationId: "",
          assetCount: 0,
          discoveryStatus: "",
          loading: false,
          isActionInFlight: false,
          assetDiscoveryInFlight: false,
          lastUserAction: "disconnect",
          lastActionAt: disconnectedAt,
          lastUpdatedAt: disconnectedAt,
          error: "",
        });
      });
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("resume");
      router.replace(`/reports/new/flow${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);

      try {
        await refreshMetaSuiteProviderStates(Date.now(), []);
      } catch (error) {
        console.error("integration library post-disconnect refresh error:", error);
      }
    } catch (error) {
      console.error("integration library disconnect error:", error);
      setConnectError("We couldn’t disconnect Meta Business Suite right now. Please try again.");
      META_REPORT_SOURCE_KEYS.forEach((provider) => {
        completeProviderAction(provider, {
          error: "We couldn’t disconnect Meta Business Suite right now. Please try again.",
        });
      });
    } finally {
      setDisconnectingIntegrationKey(null);
    }
  }

  async function handleMetaAdsDisconnect() {
    await handleMetaDisconnect();
  }

  function renderCardActions(input: {
    integration: IntegrationCatalogItem;
    isOrganicMeta: boolean;
    isMetaAds: boolean;
    isMetaConnected: boolean;
    canSelectMeta: boolean;
    isAssetPreparing: boolean;
    providerUiStatus?: MetaProviderUiStatus;
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
      canSelectMeta,
      isAssetPreparing,
      providerUiStatus,
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

      if ((isOrganicMeta || isMetaAds) && (canSelectMeta || isSelected)) {
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

      if ((isOrganicMeta || isMetaAds) && providerUiStatus?.loading) {
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

      if ((isOrganicMeta || isMetaAds) && providerUiStatus?.connected) {
        return (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
          >
            {isAssetPreparing ? "Preparing assets..." : "No assets found"}
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
              : providerUiStatus?.actionLabel || messages.common.connect}
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
            disabled={
              !canSelectMeta ||
              Boolean(disconnectingIntegrationKey)
            }
          >
            {canSelectMeta
              ? (isSelected ? "Selected" : "Select")
              : isAssetPreparing
                ? "Preparing assets..."
                : "No assets"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void (isMetaAds ? handleMetaAdsDisconnect() : handleMetaDisconnect());
            }}
            disabled={Boolean(disconnectingIntegrationKey)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disconnectingIntegrationKey ? "Disconnecting..." : "Disconnect"}
          </button>
        </>
      );
    }

      if (
        (isOrganicMeta || isMetaAds) &&
        embedded &&
        providerUiStatus?.loading
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
      (isOrganicMeta || isMetaAds) &&
      !isMetaConnected
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
            : providerUiStatus?.actionLabel || messages.common.connect}
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
          const providerKey = isMeta
            ? (integration.integrationKey as MetaFrontendIntegrationKey)
            : null;
          const providerConnection = providerKey
            ? providerConnections[providerKey]
            : null;
          const providerUiStatus =
            providerKey && embedded && providerConnection
              ? normalizeMetaProviderStatus({
                  provider: providerKey,
                  status: providerConnection.status,
                  connected: providerConnection.connected,
                  loading:
                    providerConnection.loading ||
                    providerConnection.isActionInFlight,
                  assetCount: providerConnection.assetCount,
                  lastSyncedAt: providerConnection.lastSyncedAt,
                })
              : null;
          const isOrganicMeta = isMetaOrganicFrontendIntegrationKey(
            integration.integrationKey
          );
          const isMetaAds = integration.integrationKey === "meta_ads";
          const metaConnected = Boolean(providerUiStatus?.connected);
          const canSelectMeta = Boolean(
            metaConnected && (providerConnection?.assetCount || 0) > 0
          );
          const isAssetPreparing = Boolean(
            metaConnected &&
              (providerConnection?.assetCount || 0) === 0 &&
              (providerConnection?.assetDiscoveryInFlight ||
                !isMetaAssetDiscoveryComplete(providerConnection?.discoveryStatus))
          );
          const blockedComingSoon =
            !isMeta && integration.status !== "Connected";
          const isConnecting = connectingIntegrationKey === integration.integrationKey;
          const badgeLabel = providerUiStatus?.badge || integration.status;
          const titleBadge =
            isMeta && embedded
              ? badgeLabel
              : selected
                ? messages.common.selected
                : badgeLabel;
          const metaDescriptionSuffix =
            isMeta &&
            embedded &&
            metaConnected &&
            (providerConnection?.assetCount || 0) > 0
              ? getMetaDescriptionSuffix(
                  integration.integrationKey as MetaFrontendIntegrationKey,
                  metaCounts
                )
              : "";
          const canToggleSelection =
            isReportFlowMode &&
            isMeta &&
            embedded &&
            (selected || canSelectMeta) &&
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
              {isAssetPreparing ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Preparing assets...
                </p>
              ) : providerUiStatus?.helperText &&
              (providerUiStatus.status === "connected_no_assets" ||
                providerUiStatus.status === "needs_permission") ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {providerUiStatus.helperText}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {renderCardActions({
                  integration,
                  isOrganicMeta,
                  isMetaAds,
                  isMetaConnected: metaConnected,
                  canSelectMeta,
                  isAssetPreparing,
                  providerUiStatus: providerUiStatus || undefined,
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
