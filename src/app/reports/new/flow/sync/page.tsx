"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { AdAccountSelector } from "@/components/integrations/AdAccountSelector";
import { useI18n } from "@/components/providers/LanguageProvider";
import { DesktopFlowSteps } from "@/components/reports/flow/DesktopFlowSteps";
import { FlowLoadingOverlay } from "@/components/reports/flow/FlowLoadingOverlay";
import { MobileFlowHeader } from "@/components/reports/flow/MobileFlowHeader";
import { ApiError, isLimitError } from "@/lib/api";
import {
  fetchMetaAdsAccounts,
  fetchMetaBusinessSuiteInstagramAccounts,
  fetchMetaBusinessSuiteStatus,
  fetchMetaPages,
  isMetaAssetDiscoveryComplete,
  refreshMetaPages,
  selectMetaAdsAccount,
  selectMetaPage,
  syncMetaAdsAccount,
  syncMetaInstagramAccount,
  syncMetaPages,
} from "@/lib/api/integrations";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  clearMetaIntegrationSessionState,
  createEmptySelectedAccountsBySource,
  getIntegrationReportContext,
  META_SELECTOR_CACHE_KEY,
  setIntegrationReportContext,
  type SourceKey,
} from "@/lib/integrations/session";
import {
  formatMetaTimeframeLabel,
  isMetaTimeframeOptionId,
  META_TIMEFRAME_OPTIONS,
  normalizeMetaTimeframeSelection,
  type MetaTimeframeOptionId,
  validateMetaTimeframe,
} from "@/lib/integrations/timeframes";

type MetaOption = {
  id: string;
  name: string;
};

type SourceSelectorState = {
  accounts: MetaOption[];
  loading: boolean;
  error: string;
  lastUpdatedAt?: number;
  loadingSlow?: boolean;
  refreshing?: boolean;
  manualRefreshRequired?: boolean;
  manualRefreshMessage?: string;
};

const EMPTY_SOURCE_SELECTOR_STATE: Record<SourceKey, SourceSelectorState> = {
  facebook_pages: {
    accounts: [],
    loading: true,
    error: "",
  },
  instagram_business: {
    accounts: [],
    loading: true,
    error: "",
  },
  meta_ads: {
    accounts: [],
    loading: true,
    error: "",
  },
};

type SourceCacheRecord = {
  accounts: MetaOption[];
  lastUpdatedAt: number;
};

type SelectorCache = Partial<Record<SourceKey, SourceCacheRecord>>;

type SourceAccountLoadResult = {
  accounts: MetaOption[];
  discoveryPending?: boolean;
  manualRefreshRequired?: boolean;
  manualRefreshMessage?: string;
};

function getSourceConfig(sourceKey: SourceKey) {
  const integration = integrationCatalog.find(
    (item) => item.integrationKey === sourceKey
  );

  if (sourceKey === "meta_ads") {
    return {
      loadingLabel: "Loading available Meta Ads ad accounts...",
      errorEyebrow: "Meta Ads",
      errorTitle: "We could not load your Meta Ads accounts",
      selectorEyebrow: "Meta Ads",
      selectorTitle: "Select an ad account",
      selectorDescription:
        "Choose the Meta Ads account whose paid media performance you want to sync.",
      selectedLabel: "Selected ad account",
      emptyMessage:
        "No Meta Ads ad accounts found. Check permissions and account access, then reconnect if needed.",
      displayName: "Meta Ads",
      assetPlural: "ad accounts",
      loadingSlowMessage:
        "We’re loading your Meta Ads ad accounts. This may take longer if you have many connected accounts.",
      readyWithCacheLabel: "Your saved Meta Ads ad accounts are ready.",
      readyLabel: "Your Meta Ads ad accounts are ready.",
      refreshLabel: "Refresh ad accounts",
      refreshingLabel: "Refreshing...",
      multipleHint:
        "You have multiple connected ad accounts. Use search to find the right one.",
      emptySavedMessage:
        "We couldn’t find any saved ad accounts. Load your ad accounts from Meta to continue.",
      loadFromMetaLabel: "Load ad accounts from Meta",
      loadError: "We could not load the available ad accounts. Try again.",
      refreshError:
        "We’ll use the saved ad accounts. You can try refreshing again.",
      selectBeforeSyncMessage: "Select an ad account before syncing.",
      searchPlaceholder: "Search ad account...",
      logoUrl: integration?.logoUrl || "",
      logoAlt: integration?.logoAlt || "Meta Ads logo",
    };
  }

  return sourceKey === "instagram_business"
    ? {
        loadingLabel: "Loading available Instagram Business accounts...",
        errorEyebrow: "Instagram Business",
        errorTitle: "We could not load your Instagram Business accounts",
        selectorEyebrow: "Instagram Business",
        selectorTitle: "Select an Instagram Business account",
        selectorDescription:
          "Choose the Instagram Business account whose insights you want to sync.",
        selectedLabel: "Selected account",
        emptyMessage:
          "No Instagram Business accounts found. Make sure your Instagram account is Business/Creator and linked to a Facebook Page.",
        displayName: "Instagram Business",
        assetPlural: "Instagram Business accounts",
        loadingSlowMessage:
          "Still preparing Instagram Business accounts...",
        readyWithCacheLabel: "Your saved Instagram Business accounts are ready.",
        readyLabel: "Your Instagram Business accounts are ready.",
        refreshLabel: "Refresh accounts",
        refreshingLabel: "Refreshing...",
        multipleHint:
          "You have multiple connected Instagram Business accounts. Use search to find the right one.",
        emptySavedMessage:
          "We couldn’t find any saved Instagram Business accounts. Load your accounts from Meta to continue.",
        loadFromMetaLabel: "Refresh Instagram accounts",
        loadError:
          "We could not load the Instagram Business accounts. Try again.",
        refreshError:
          "We’ll use the saved Instagram Business accounts. You can try refreshing again.",
        selectBeforeSyncMessage:
          "Select an Instagram Business account before syncing.",
        searchPlaceholder: "Search Instagram account...",
        logoUrl: integration?.logoUrl || "",
        logoAlt: integration?.logoAlt || "Instagram logo",
      }
    : {
        loadingLabel: "Loading available Facebook Pages...",
        errorEyebrow: "Facebook Pages",
        errorTitle: "We could not load your pages",
        selectorEyebrow: "Facebook Pages",
        selectorTitle: "Select a page",
        selectorDescription:
          "Choose the Facebook Page you want to sync for this report.",
        selectedLabel: "Selected page",
        emptyMessage:
          "No Facebook Pages found. Reconnect Facebook and select at least one Page.",
        displayName: "Facebook Pages",
        assetPlural: "pages",
        loadingSlowMessage:
          "We’re loading your pages. This may take longer if you have many connected accounts.",
        readyWithCacheLabel: "Your saved pages are ready.",
        readyLabel: "Your pages are ready.",
        refreshLabel: "Refresh pages",
        refreshingLabel: "Refreshing...",
        multipleHint:
          "You have multiple connected pages. Use search to find the right one.",
        emptySavedMessage:
          "We couldn’t find any saved pages. Load your pages from Meta to continue.",
        loadFromMetaLabel: "Load pages from Meta",
        loadError: "We could not load the available pages. Try again.",
        refreshError:
          "We’ll use the saved pages. You can try refreshing again.",
        selectBeforeSyncMessage: "Select a Facebook Page before syncing.",
        searchPlaceholder: "Search page...",
        logoUrl: integration?.logoUrl || "",
        logoAlt: integration?.logoAlt || "Facebook logo",
      };
}

function SuccessBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.257a1 1 0 0 1-1.42 0L4.79 10.66a1 1 0 1 1 1.414-1.414l2.596 2.595 6.493-6.545a1 1 0 0 1 1.411-.006Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      Successfully synced
    </div>
  );
}

function FailedBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-2.97-10.97a.75.75 0 0 1 1.06 0L10 8.94l1.91-1.9a.75.75 0 1 1 1.06 1.06L11.06 10l1.9 1.91a.75.75 0 0 1-1.06 1.06L10 11.06l-1.91 1.9a.75.75 0 0 1-1.06-1.06L8.94 10l-1.9-1.91a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      Failed to sync
    </div>
  );
}

function readSelectorCache() {
  if (typeof window === "undefined") {
    return {};
  }

  const rawValue = window.localStorage.getItem(META_SELECTOR_CACHE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue) as SelectorCache;
  } catch {
    return {};
  }
}

function writeSelectorCache(sourceKey: SourceKey, accounts: MetaOption[]) {
  if (typeof window === "undefined") {
    return;
  }

  const currentCache = readSelectorCache();
  currentCache[sourceKey] = {
    accounts,
    lastUpdatedAt: Date.now(),
  };
  window.localStorage.setItem(META_SELECTOR_CACHE_KEY, JSON.stringify(currentCache));
}

function formatRelativeLastUpdated(timestamp?: number) {
  if (!timestamp) {
    return "";
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return `${elapsedHours}h ago`;
}

async function getPendingDiscoverySources(
  sourceKeys: SourceKey[],
  workspaceId?: string
) {
  const suiteStatus = await fetchMetaBusinessSuiteStatus({
    workspaceId: workspaceId || undefined,
    refresh: false,
    cacheBust: Date.now(),
  });
  const pendingSources = new Set<SourceKey>();

  sourceKeys.forEach((sourceKey) => {
    const childStatus = suiteStatus.children[sourceKey];
    const discoveryStatus =
      childStatus.discoveryStatus || suiteStatus.discoveryStatus;
    const hasKnownAssetsWithoutList =
      childStatus.assetCount > 0 && childStatus.entities.length === 0;

    if (
      childStatus.connected &&
      ((childStatus.assetCount === 0 &&
        !isMetaAssetDiscoveryComplete(discoveryStatus)) ||
        hasKnownAssetsWithoutList)
    ) {
      pendingSources.add(sourceKey);
    }
  });

  return pendingSources;
}

function NewReportFlowSyncPageContent() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const [selectedSources] = useState<SourceKey[]>(() => {
    const routeIntegration = searchParams.get("integration");

    if (isMetaFrontendIntegrationKey(routeIntegration)) {
      return [routeIntegration];
    }

    const preferredSources =
      storedIntegrationContext?.selectedSources?.filter((source): source is SourceKey =>
        isMetaFrontendIntegrationKey(source)
      ) || [];

    if (preferredSources.length > 0) {
      return preferredSources;
    }

    return isMetaFrontendIntegrationKey(storedIntegrationContext?.source)
      ? [storedIntegrationContext.source]
      : [];
  });
  const hasSelectedSources = selectedSources.length > 0;
  const selectedIntegration = useMemo(
    () =>
      integrationCatalog.find(
        (integration) => integration.integrationKey === selectedSources[0]
      ),
    [selectedSources]
  );
  const workspaceId = storedIntegrationContext?.workspaceId || "";
  const currentStep = 2;
  const previousStepHref = "/reports/new/flow?resume=1";
  const primarySourceConfig = hasSelectedSources
    ? getSourceConfig(selectedSources[0])
    : null;

  const [selectedAccountsBySource, setSelectedAccountsBySource] = useState(
    storedIntegrationContext?.selectedAccountsBySource || createEmptySelectedAccountsBySource()
  );
  const [sourceState, setSourceState] =
    useState<Record<SourceKey, SourceSelectorState>>(EMPTY_SOURCE_SELECTOR_STATE);
  const [selectedTimeframe, setSelectedTimeframe] = useState<MetaTimeframeOptionId>(
    isMetaTimeframeOptionId(storedIntegrationContext?.sharedTimeframe?.preset)
      ? storedIntegrationContext.sharedTimeframe.preset
      : isMetaTimeframeOptionId(storedIntegrationContext?.timeframe)
        ? storedIntegrationContext.timeframe
      : "last_30d"
  );
  const [startDate, setStartDate] = useState(
    storedIntegrationContext?.sharedTimeframe?.startDate || storedIntegrationContext?.startDate || ""
  );
  const [endDate, setEndDate] = useState(
    storedIntegrationContext?.sharedTimeframe?.endDate || storedIntegrationContext?.endDate || ""
  );
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [resolvedIntegrationId, setResolvedIntegrationId] = useState("");
  const [syncingSource, setSyncingSource] = useState<SourceKey | null>(null);
  const [metaDisconnected, setMetaDisconnected] = useState(false);
  const [error, setError] = useState("");
  const inFlightRequestKeysRef = useRef(new Set<string>());
  const loadedRequestKeysRef = useRef(new Set<string>());
  const failedRequestKeysRef = useRef(new Set<string>());
  const flowSteps = [
    {
      id: 1,
      title: messages.reports.chooseSource,
      description: messages.reports.chooseSourceDescription,
    },
    {
      id: 2,
      title: messages.reports.syncData,
      description: messages.reports.syncDataDescription,
    },
    {
      id: 3,
      title: messages.reports.generateReport,
      description: messages.reports.generateReportDescription,
    },
    {
      id: 4,
      title: messages.reports.reviewResult,
      description: messages.reports.reviewResultDescription,
    },
  ] as const;

  const normalizeCurrentTimeframe = useCallback(() => {
    return normalizeMetaTimeframeSelection({
      preset: selectedTimeframe,
      startDate,
      endDate,
    });
  }, [endDate, selectedTimeframe, startDate]);

  const buildNextContext = useCallback((nextAccountsBySource: typeof selectedAccountsBySource) => {
    const normalizedSelection = normalizeCurrentTimeframe();
    const firstSource = selectedSources[0] || "";
    const firstSourceAccount = firstSource
      ? nextAccountsBySource[firstSource]
      : undefined;

    return {
      source: firstSource,
      integration: firstSource === "meta_ads" ? "meta_ads" : "meta",
      workspaceId,
      integrationId:
        firstSourceAccount?.integrationId ||
        storedIntegrationContext?.integrationId ||
        resolvedIntegrationId,
      adAccountId:
        firstSource === "meta_ads" ? firstSourceAccount?.accountId || undefined : undefined,
      pageId:
        firstSource === "meta_ads" ? undefined : firstSourceAccount?.accountId || undefined,
      pageName: firstSourceAccount?.accountName || undefined,
      timeframe: normalizedSelection.key,
      startDate: normalizedSelection.startDate,
      endDate: normalizedSelection.endDate,
      timeframeSelection: normalizedSelection,
      sharedTimeframe: normalizedSelection,
      datasetId: firstSourceAccount?.datasetId,
      synced:
        selectedSources.length > 0 &&
        selectedSources.every(
          (sourceKey) => nextAccountsBySource[sourceKey].syncStatus === "synced"
        ),
      requestedSlides: storedIntegrationContext?.requestedSlides,
      aiMode: storedIntegrationContext?.aiMode,
      templateId: storedIntegrationContext?.templateId,
      postConnectRedirect: storedIntegrationContext?.postConnectRedirect,
      selectedSources,
      selectedAccountsBySource: nextAccountsBySource,
      reportKind:
        selectedSources.length > 1
          ? ("multi_source" as const)
          : ("single_source" as const),
    };
  }, [
    normalizeCurrentTimeframe,
    resolvedIntegrationId,
    selectedSources,
    storedIntegrationContext?.aiMode,
    storedIntegrationContext?.integrationId,
    storedIntegrationContext?.postConnectRedirect,
    storedIntegrationContext?.requestedSlides,
    storedIntegrationContext?.templateId,
    workspaceId,
  ]);

  const buildSourceRequestKey = useCallback(
    (sourceKey: SourceKey, integrationId: string) =>
      `${sourceKey}:${workspaceId || "no-workspace"}:${integrationId || "no-integration"}`,
    [workspaceId]
  );

  const loadInstagramBusinessAccountsFromSuite = useCallback(async () => {
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const suiteStatus = await fetchMetaBusinessSuiteStatus({
        workspaceId: workspaceId || undefined,
        refresh: false,
        cacheBust: Date.now() + attempt,
      });
      const instagramStatus = suiteStatus.children.instagram_business;
      const discoveryStatus =
        instagramStatus.discoveryStatus || suiteStatus.discoveryStatus;
      const statusAccounts = instagramStatus.entities;

      if (statusAccounts.length > 0) {
        return {
          accounts: statusAccounts,
          discoveryPending: false,
        } satisfies SourceAccountLoadResult;
      }

      let endpointAccounts: MetaOption[] = [];

      try {
        endpointAccounts = await fetchMetaBusinessSuiteInstagramAccounts({
          workspaceId: workspaceId || undefined,
          refresh: false,
          cacheBust: Date.now() + attempt,
        });
      } catch (accountError) {
        if (process.env.NODE_ENV !== "production" && attempt === 0) {
          console.debug("[MetaSuite][instagram_accounts.request_failed]", {
            message:
              accountError instanceof Error
                ? accountError.message
                : String(accountError),
          });
        }
      }

      if (endpointAccounts.length > 0) {
        return {
          accounts: endpointAccounts,
          discoveryPending: false,
        } satisfies SourceAccountLoadResult;
      }

      const hasKnownAssetsWithoutList =
        instagramStatus.assetCount > 0;
      const discoveryPending =
        instagramStatus.connected &&
        (!isMetaAssetDiscoveryComplete(discoveryStatus) ||
          hasKnownAssetsWithoutList);

      if (!discoveryPending) {
        return {
          accounts: [],
          discoveryPending: false,
        } satisfies SourceAccountLoadResult;
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    }

    return {
      accounts: [] as MetaOption[],
      discoveryPending: false,
      manualRefreshRequired: true,
      manualRefreshMessage:
        "Instagram accounts were discovered, but the selectable list is still being prepared.",
    } satisfies SourceAccountLoadResult;
  }, [workspaceId]);

  function invalidateSyncedSources() {
    const nextAccountsBySource = { ...selectedAccountsBySource };

    selectedSources.forEach((sourceKey) => {
      nextAccountsBySource[sourceKey] = {
        ...nextAccountsBySource[sourceKey],
        datasetId: undefined,
        syncStatus: nextAccountsBySource[sourceKey].accountId ? "idle" : "error",
        error: undefined,
      };
    });

    setSelectedAccountsBySource(nextAccountsBySource);
  }

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(0);

    const progressSteps = [0, 24, 48, 72, 86];
    let stepIndex = 0;

    const intervalId = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, progressSteps.length - 1);
      setLoadingProgress(progressSteps[stepIndex]);
    }, 350);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading]);

  useEffect(() => {
    let active = true;

    async function validateMetaConnection() {
      if (!hasSelectedSources) {
        setMetaDisconnected(false);
        return;
      }

      try {
        const requiresMetaAds = selectedSources.includes("meta_ads");
        const requiresFacebookPages = selectedSources.includes("facebook_pages");
        const requiresInstagramBusiness =
          selectedSources.includes("instagram_business");
        const suiteStatus = await fetchMetaBusinessSuiteStatus({
          workspaceId: workspaceId || undefined,
          refresh: false,
        });

        if (!active) {
          return;
        }

        const facebookPagesProvider = suiteStatus.children.facebook_pages;
        const instagramBusinessProvider =
          suiteStatus.children.instagram_business;
        const metaAdsProvider = suiteStatus.children.meta_ads;
        const facebookPagesIntegrationId =
          facebookPagesProvider.integrationId || suiteStatus.integrationId || "";
        const instagramBusinessIntegrationId =
          instagramBusinessProvider.integrationId || suiteStatus.integrationId || "";
        const metaAdsIntegrationId =
          metaAdsProvider.integrationId || suiteStatus.integrationId || "";
        const facebookPagesMissing =
          requiresFacebookPages &&
          (!suiteStatus.connected ||
            !facebookPagesProvider.connected ||
            !facebookPagesIntegrationId);
        const instagramBusinessMissing =
          requiresInstagramBusiness &&
          (!suiteStatus.connected ||
            !instagramBusinessProvider.connected ||
            !instagramBusinessIntegrationId);
        const metaAdsMissing =
          requiresMetaAds &&
          (!suiteStatus.connected || !metaAdsProvider.connected || !metaAdsIntegrationId);

        if (facebookPagesMissing || instagramBusinessMissing || metaAdsMissing) {
          clearMetaIntegrationSessionState();
          setMetaDisconnected(true);
          setResolvedIntegrationId("");
          setSelectedAccountsBySource(createEmptySelectedAccountsBySource());
          setSourceState({
            facebook_pages: {
              accounts: [],
              loading: false,
              error: "",
            },
            instagram_business: {
              accounts: [],
              loading: false,
              error: "",
            },
            meta_ads: {
              accounts: [],
              loading: false,
              error: "",
            },
          });
          setLoading(false);
          setError("");
          return;
        }

        setMetaDisconnected(false);
        setLoading(true);
        setError("");
        const firstSource = selectedSources[0];
        const firstIntegrationId =
          firstSource === "meta_ads"
            ? metaAdsIntegrationId
            : firstSource === "instagram_business"
              ? instagramBusinessIntegrationId
              : facebookPagesIntegrationId;
        setSelectedAccountsBySource((current) => ({
          ...current,
          facebook_pages: {
            ...current.facebook_pages,
            integrationId: requiresFacebookPages
              ? facebookPagesIntegrationId
              : current.facebook_pages.integrationId,
          },
          instagram_business: {
            ...current.instagram_business,
            integrationId: requiresInstagramBusiness
              ? instagramBusinessIntegrationId
              : current.instagram_business.integrationId,
          },
          meta_ads: {
            ...current.meta_ads,
            integrationId: requiresMetaAds
              ? metaAdsIntegrationId
              : current.meta_ads.integrationId,
          },
        }));
        setResolvedIntegrationId(
          firstIntegrationId
        );
      } catch (connectionError) {
        if (!active) {
          return;
        }

        console.error("sync flow connection status error:", connectionError);
        setError("We couldn’t validate the Meta status. Please try again.");
        setLoading(false);
      }
    }

    void validateMetaConnection();

    return () => {
      active = false;
    };
  }, [hasSelectedSources, selectedSources, workspaceId]);

  const loadPages = useCallback(async (sourceKey?: SourceKey, force = false) => {
    if (metaDisconnected) {
      setLoading(false);
      return;
    }

    if (!hasSelectedSources) {
      setLoading(false);
      return;
    }

    const requestedSourceKeys = sourceKey ? [sourceKey] : selectedSources;
    const sourceKeys = requestedSourceKeys.filter((selectedSource) => {
      const sourceIntegrationId =
        selectedAccountsBySource[selectedSource]?.integrationId ||
        resolvedIntegrationId;
      const requestKey = buildSourceRequestKey(
        selectedSource,
        sourceIntegrationId
      );

      if (force) {
        failedRequestKeysRef.current.delete(requestKey);
        loadedRequestKeysRef.current.delete(requestKey);
        inFlightRequestKeysRef.current.delete(requestKey);
        return true;
      }

      if (inFlightRequestKeysRef.current.has(requestKey)) {
        return false;
      }

      if (failedRequestKeysRef.current.has(requestKey)) {
        return false;
      }

      if (loadedRequestKeysRef.current.has(requestKey)) {
        return false;
      }

      return true;
    });
    const selectorCache = readSelectorCache();

    if (sourceKeys.length === 0) {
      setLoading(false);
      return;
    }

    if (!resolvedIntegrationId) {
      setLoading(false);
      setSourceState((current) => {
        const nextState = { ...current };
        sourceKeys.forEach((selectedSource) => {
          nextState[selectedSource] = {
            accounts: [],
            loading: false,
            error: messages.reports.missingIntegration,
          };
        });
        return nextState;
      });
      return;
    }

    let slowLoadTimer: number | null = null;
    const requestKeys = sourceKeys.map((selectedSource) =>
      buildSourceRequestKey(
        selectedSource,
        selectedAccountsBySource[selectedSource]?.integrationId || resolvedIntegrationId
      )
    );

    try {
      requestKeys.forEach((requestKey) => {
        inFlightRequestKeysRef.current.add(requestKey);
      });
      setLoading(true);
      setSourceState((current) => {
        const nextState = { ...current };
        sourceKeys.forEach((selectedSource) => {
          const cached = selectorCache[selectedSource];
          nextState[selectedSource] = {
            accounts: cached?.accounts || nextState[selectedSource].accounts,
            loading: true,
            error: "",
            lastUpdatedAt: cached?.lastUpdatedAt || nextState[selectedSource].lastUpdatedAt,
            loadingSlow: false,
            refreshing: nextState[selectedSource].refreshing || false,
            manualRefreshRequired: false,
            manualRefreshMessage: "",
          };
        });
        return nextState;
      });

      slowLoadTimer = window.setTimeout(() => {
        setSourceState((current) => {
          const nextState = { ...current };
          sourceKeys.forEach((selectedSource) => {
            nextState[selectedSource] = {
              ...nextState[selectedSource],
              loadingSlow: true,
            };
          });
          return nextState;
        });
      }, 2300);

      const responses = await Promise.all(
        sourceKeys.map(async (selectedSource) => {
          const sourceIntegrationId =
            selectedAccountsBySource[selectedSource]?.integrationId ||
            resolvedIntegrationId;

          if (!sourceIntegrationId) {
            throw new Error(messages.reports.missingIntegration);
          }

          const loadResult: SourceAccountLoadResult =
            selectedSource === "meta_ads"
              ? {
                  accounts: await fetchMetaAdsAccounts({
                    integrationId: sourceIntegrationId,
                    workspaceId: workspaceId || undefined,
                  }),
                }
              : selectedSource === "instagram_business"
              ? await loadInstagramBusinessAccountsFromSuite()
              : {
                  accounts: await fetchMetaPages(sourceIntegrationId),
                };

          return [selectedSource, loadResult] as const;
        })
      );
      const zeroResultSources = responses
        .filter(
          ([, loadResult]) =>
            loadResult.accounts.length === 0 &&
            !loadResult.discoveryPending &&
            !loadResult.manualRefreshRequired
        )
        .map(([selectedSource]) => selectedSource);
      const pendingDiscoverySources =
        zeroResultSources.length > 0
          ? await getPendingDiscoverySources(zeroResultSources, workspaceId)
          : new Set<SourceKey>();
      responses.forEach(([selectedSource, loadResult]) => {
        if (loadResult.discoveryPending) {
          pendingDiscoverySources.add(selectedSource);
        }
      });

      setSourceState((current) => {
        const nextState = { ...current };

        responses.forEach(([selectedSource, loadResult]) => {
          const cached = selectorCache[selectedSource];
          const discoveryPending = pendingDiscoverySources.has(selectedSource);
          const accountData = loadResult.accounts;
          const displayAccounts =
            discoveryPending && cached?.accounts.length
              ? cached.accounts
              : accountData;

          if (
            accountData.length > 0 ||
            (!discoveryPending && !loadResult.manualRefreshRequired)
          ) {
            writeSelectorCache(selectedSource, accountData);
          }

          const requestKey = buildSourceRequestKey(
            selectedSource,
            selectedAccountsBySource[selectedSource]?.integrationId || resolvedIntegrationId
          );

          if (!discoveryPending) {
            if (loadResult.manualRefreshRequired) {
              failedRequestKeysRef.current.add(requestKey);
            } else {
              loadedRequestKeysRef.current.add(requestKey);
              failedRequestKeysRef.current.delete(requestKey);
            }
          }

          nextState[selectedSource] = {
            accounts: displayAccounts,
            loading:
              discoveryPending &&
              displayAccounts.length === 0 &&
              !loadResult.manualRefreshRequired,
            error: "",
            lastUpdatedAt:
              displayAccounts === cached?.accounts
                ? cached.lastUpdatedAt
                : Date.now(),
            loadingSlow:
              discoveryPending &&
              displayAccounts.length === 0 &&
              !loadResult.manualRefreshRequired,
            refreshing: false,
            manualRefreshRequired: loadResult.manualRefreshRequired,
            manualRefreshMessage: loadResult.manualRefreshMessage,
          };
        });

        return nextState;
      });
    } catch (err: unknown) {
      console.error("flow sync asset load error:", err);
      sourceKeys.forEach((selectedSource) => {
        const sourceIntegrationId =
          selectedAccountsBySource[selectedSource]?.integrationId ||
          resolvedIntegrationId;
        failedRequestKeysRef.current.add(
          buildSourceRequestKey(selectedSource, sourceIntegrationId)
        );
      });
      let pendingDiscoverySources = new Set<SourceKey>();

      try {
        pendingDiscoverySources = await getPendingDiscoverySources(
          sourceKeys,
          workspaceId
        );
      } catch (statusError) {
        console.error("flow sync discovery status check error:", statusError);
      }

      setSourceState((current) => {
        const nextState = { ...current };
        sourceKeys.forEach((selectedSource) => {
          const cached = selectorCache[selectedSource];
          const config = getSourceConfig(selectedSource);
          const discoveryPending = pendingDiscoverySources.has(selectedSource);

          nextState[selectedSource] = {
            accounts: cached?.accounts || [],
            loading: discoveryPending,
            error: discoveryPending ? "" : config.loadError,
            lastUpdatedAt: cached?.lastUpdatedAt || nextState[selectedSource].lastUpdatedAt,
            loadingSlow: discoveryPending,
            refreshing: false,
            manualRefreshRequired: false,
            manualRefreshMessage: "",
          };
        });
        return nextState;
      });
    } finally {
      requestKeys.forEach((requestKey) => {
        inFlightRequestKeysRef.current.delete(requestKey);
      });
      if (slowLoadTimer !== null) {
        window.clearTimeout(slowLoadTimer);
      }
      setLoading(false);
    }
  }, [
    buildSourceRequestKey,
    hasSelectedSources,
    loadInstagramBusinessAccountsFromSuite,
    metaDisconnected,
    messages.reports.missingIntegration,
    resolvedIntegrationId,
    selectedAccountsBySource,
    selectedSources,
    workspaceId,
  ]);

  useEffect(() => {
    const sourceKey = selectedSources[0];

    if (!sourceKey || !resolvedIntegrationId || metaDisconnected) {
      return;
    }

    const requestKey = buildSourceRequestKey(sourceKey, resolvedIntegrationId);

    if (
      inFlightRequestKeysRef.current.has(requestKey) ||
      loadedRequestKeysRef.current.has(requestKey) ||
      failedRequestKeysRef.current.has(requestKey)
    ) {
      return;
    }

    void loadPages(sourceKey, false);
  }, [
    buildSourceRequestKey,
    loadPages,
    metaDisconnected,
    resolvedIntegrationId,
    selectedSources,
  ]);

  useEffect(() => {
    if (selectedSources.length === 0) {
      return;
    }

    setIntegrationReportContext(buildNextContext(selectedAccountsBySource));
  }, [buildNextContext, selectedAccountsBySource, selectedSources.length]);

  function handleSelectAccount(sourceKey: SourceKey, accountId: string) {
    const selectedAccount = sourceState[sourceKey].accounts.find((account) => account.id === accountId);
    const config = getSourceConfig(sourceKey);
    const nextAccountsBySource = {
      ...selectedAccountsBySource,
      [sourceKey]: {
        ...selectedAccountsBySource[sourceKey],
        accountId,
        accountName: selectedAccount?.name || "",
        integrationId: resolvedIntegrationId,
        integrationAccountId: accountId || undefined,
        datasetId: undefined,
        syncStatus: accountId ? "idle" : "error",
        error: accountId ? undefined : config.selectBeforeSyncMessage,
      },
    };

    setSelectedAccountsBySource(nextAccountsBySource);
    setError("");
  }

  async function handleRefreshSource(sourceKey: SourceKey) {
    if (!resolvedIntegrationId) {
      setError(messages.reports.missingIntegration);
      return;
    }

    try {
      setSourceState((current) => ({
        ...current,
        [sourceKey]: {
          ...current[sourceKey],
          refreshing: true,
          error: "",
        },
      }));

      if (sourceKey === "facebook_pages") {
        await refreshMetaPages({
          integrationId: resolvedIntegrationId,
          workspaceId: workspaceId || undefined,
        });
      } else if (sourceKey === "instagram_business") {
        await fetchMetaBusinessSuiteStatus({
          workspaceId: workspaceId || undefined,
          refresh: true,
          cacheBust: Date.now(),
        });
      }

      await loadPages(sourceKey, true);
      setError("");
    } catch (refreshError) {
      const config = getSourceConfig(sourceKey);

      console.error("meta asset refresh error:", refreshError);
      setError(config.refreshError);
      setSourceState((current) => ({
        ...current,
        [sourceKey]: {
          ...current[sourceKey],
          refreshing: false,
        },
      }));
    }
  }

  async function handleSync(sourceKey: SourceKey) {
    if (!resolvedIntegrationId) {
      setError(
        "We could not find the Meta integration_id in the current session. Reconnect the integration and try again."
      );
      return;
    }

    const selectedAccount = selectedAccountsBySource[sourceKey];

    if (!selectedAccount.accountId) {
      const config = getSourceConfig(sourceKey);

      setError(config.selectBeforeSyncMessage);
      return;
    }

    if (
      sourceKey === "meta_ads" &&
      (sourceState.meta_ads.loading ||
        !sourceState.meta_ads.accounts.some(
          (account) => account.id === selectedAccount.accountId
        ))
    ) {
      setError("Select an ad account before syncing.");
      return;
    }

    const timeframeError = validateMetaTimeframe({
      timeframe: selectedTimeframe,
      startDate,
      endDate,
    });

    if (timeframeError) {
      setError(timeframeError);
      return;
    }

    try {
      setSyncingSource(sourceKey);
      setError("");
      const normalizedSelection = normalizeCurrentTimeframe();
      const syncInput = {
        integrationId: resolvedIntegrationId,
        timeframe: normalizedSelection.key,
        startDate: normalizedSelection.startDate,
        endDate: normalizedSelection.endDate,
      };
      const response =
        sourceKey === "meta_ads"
          ? await (async () => {
              await selectMetaAdsAccount({
                integrationId: resolvedIntegrationId,
                accountId: selectedAccount.accountId,
                workspaceId: workspaceId || undefined,
              });

              return syncMetaAdsAccount({
                integrationId: resolvedIntegrationId,
                accountId: selectedAccount.accountId,
                timeframe: normalizedSelection.key,
                startDate: normalizedSelection.startDate,
                endDate: normalizedSelection.endDate,
                workspaceId: workspaceId || undefined,
              });
            })()
          : sourceKey === "instagram_business"
          ? await syncMetaInstagramAccount({
              ...syncInput,
              accountId: selectedAccount.accountId,
            })
          : await (async () => {
              await selectMetaPage({
                integrationId: resolvedIntegrationId,
                pageId: selectedAccount.accountId,
              });

              return syncMetaPages({
                ...syncInput,
                pageId: selectedAccount.accountId,
              });
            })();
      const nextDatasetId = response.datasetId || "";

      if (!nextDatasetId) {
        throw new Error("Sync completed without dataset_id.");
      }

      const nextAccountsBySource = {
        ...selectedAccountsBySource,
        [sourceKey]: {
          ...selectedAccount,
          integrationId: response.integrationId || resolvedIntegrationId,
          integrationAccountId: selectedAccount.accountId,
          datasetId: nextDatasetId,
          syncStatus: "synced" as const,
          error: undefined,
        },
      };

      setSelectedAccountsBySource(nextAccountsBySource);
      setIntegrationReportContext(buildNextContext(nextAccountsBySource));
    } catch (err: unknown) {
      console.error("flow meta sync error:", err);
      setSelectedAccountsBySource((current) => ({
        ...current,
        [sourceKey]: {
          ...current[sourceKey],
          syncStatus: "error",
          error:
            isLimitError(err)
              ? err.message || messages.reports.syncPageDataError
              : err instanceof ApiError && err.message
                ? err.message
                : messages.reports.syncPageDataError,
        },
      }));

      if (isLimitError(err)) {
        setError(err.message || messages.reports.syncPageDataError);
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(messages.reports.syncPageDataError);
      }
    } finally {
      setSyncingSource(null);
    }
  }

  function handleContinueToGenerate() {
    if (selectedSources.includes("meta_ads") && selectedSources.length > 1) {
      setError("Meta Ads currently supports single-source reports only.");
      return;
    }

    const hasMissingAccount = selectedSources.some(
      (sourceKey) => !selectedAccountsBySource[sourceKey].accountId
    );
    const hasUnsyncedSource = selectedSources.some(
      (sourceKey) => selectedAccountsBySource[sourceKey].syncStatus !== "synced"
    );
    const hasMissingDataset = selectedSources.some(
      (sourceKey) => !selectedAccountsBySource[sourceKey].datasetId
    );

    if (selectedSources.length === 0) {
      setError("Select at least one source before continuing.");
      return;
    }

    if (hasMissingAccount) {
      setError("Select an account for each source before continuing.");
      return;
    }

    if (hasUnsyncedSource || hasMissingDataset) {
      setError("Sync each selected source before continuing.");
      return;
    }

    router.replace(
      `/reports/new/flow/generate?integration=${selectedSources[0] || "facebook_pages"}`
    );
  }

  const allSourcesSynced =
    selectedSources.length > 0 &&
    selectedSources.every(
      (sourceKey) =>
        selectedAccountsBySource[sourceKey].syncStatus === "synced" &&
        Boolean(selectedAccountsBySource[sourceKey].datasetId)
    );
  return (
    <AppShell>
      {syncingSource ? (
        <FlowLoadingOverlay
          title={messages.reports.syncing}
          description="We are syncing your Meta data. This can take a moment."
        />
      ) : null}
      <div className="-mx-4 -mt-4 space-y-5 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.reports.syncData}
          description={messages.reports.completeSelectionDescription}
          backHref={previousStepHref}
        />
        <section className="p-5 sm:p-8">
          <div className="hidden max-w-3xl md:block">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.review.guidedFlow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {messages.reports.syncData}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {messages.reports.completeSelectionDescription}
            </p>
          </div>

          <DesktopFlowSteps
            steps={flowSteps}
            currentStep={currentStep}
            stepLabel={messages.common.step}
            clickableHrefMap={{ 1: previousStepHref }}
          />

          <div className="mt-8 space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                {messages.reports.confirmedIntegration}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                {selectedSources.length > 1
                  ? selectedSources
                      .map(
                        (sourceKey) =>
                          integrationCatalog.find(
                            (integration) => integration.integrationKey === sourceKey
                          )?.name || sourceKey
                      )
                      .join(" + ")
                  : selectedIntegration?.name || messages.reports.selectedSource}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Period: {formatMetaTimeframeLabel({
                  timeframe: selectedTimeframe,
                  startDate,
                  endDate,
                })}
              </p>
            </div>

            {hasSelectedSources ? (
              <>
                {metaDisconnected ? (
                  <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                      Meta disconnected
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                      {`Connect Meta to load your ${
                        primarySourceConfig?.assetPlural || "assets"
                      } and create reports.`}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Meta Business Suite must be reconnected before continuing.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Link
                        href="/reports/new/flow"
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Connect Meta
                      </Link>
                    </div>
                  </section>
                ) : null}

                {!metaDisconnected ? (
                  <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                    {messages.reports.timeframe}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {META_TIMEFRAME_OPTIONS.map((option) => {
                      const active = option.id === selectedTimeframe;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            if (option.id !== selectedTimeframe) {
                              invalidateSyncedSources();
                            }
                            setSelectedTimeframe(option.id);
                            setError("");

                            if (option.id !== "custom") {
                              setStartDate("");
                              setEndDate("");
                            }
                          }}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            active
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-950 hover:bg-slate-100"
                          }`}
                        >
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p
                            className={`mt-1 text-sm ${
                              active ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {option.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {selectedTimeframe === "custom" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          Start date
                        </span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(event) => {
                            invalidateSyncedSources();
                            setStartDate(event.target.value);
                            setError("");
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                          End date
                        </span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(event) => {
                            invalidateSyncedSources();
                            setEndDate(event.target.value);
                            setError("");
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        />
                      </label>
                    </div>
                  ) : null}
                </section>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {selectedSources.map((sourceKey) => {
                    const config = getSourceConfig(sourceKey);
                    const sourceSelectorState = sourceState[sourceKey];
                    const selectedAccount = selectedAccountsBySource[sourceKey];
                    const isSourceLoading = sourceSelectorState.loading || loading;
                    const isSourceSyncing = syncingSource === sourceKey;
                    const hasCachedAccounts = sourceSelectorState.accounts.length > 0;
                    const showUsableCachedSelector = hasCachedAccounts;
                    const manualRefreshRequired =
                      sourceSelectorState.manualRefreshRequired === true;

                    return (
                      <div key={sourceKey}>
                        {isSourceLoading && !showUsableCachedSelector ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6">
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <span className="font-medium text-slate-700">
                                {config.loadingLabel}
                              </span>
                              <span className="font-semibold text-sky-700">
                                {loadingProgress}%
                              </span>
                            </div>
                            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0284c7_100%)] transition-[width] duration-300"
                                style={{ width: `${loadingProgress}%` }}
                              />
                            </div>
                            {sourceSelectorState.loadingSlow ? (
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                                <p>
                                  {config.loadingSlowMessage}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void loadPages(sourceKey, true);
                                  }}
                                  className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  Try again
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : sourceSelectorState.error ? (
                          <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
                              {config.errorEyebrow}
                            </p>
                            <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                              {config.errorTitle}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {sourceSelectorState.error}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  void loadPages(sourceKey, true);
                                }}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {showUsableCachedSelector ? (
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-slate-900">
                                      {sourceSelectorState.lastUpdatedAt
                                        ? config.readyWithCacheLabel
                                        : config.readyLabel}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {sourceSelectorState.lastUpdatedAt
                                        ? `Last updated: ${formatRelativeLastUpdated(sourceSelectorState.lastUpdatedAt)}`
                                        : "You can refresh them if you made recent changes in Meta."}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void handleRefreshSource(sourceKey)}
                                    disabled={Boolean(sourceSelectorState.refreshing)}
                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {sourceSelectorState.refreshing
                                      ? config.refreshingLabel
                                      : config.refreshLabel}
                                  </button>
                                </div>
                                {sourceSelectorState.accounts.length > 10 ? (
                                  <p className="mt-2 text-xs text-slate-500">
                                    {config.multipleHint}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}

                            {sourceSelectorState.accounts.length === 0 && !isSourceLoading ? (
                              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                  {config.selectorEyebrow}
                                </p>
                                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                                  {config.selectorTitle}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                  {manualRefreshRequired
                                    ? sourceSelectorState.manualRefreshMessage ||
                                      "Refresh Instagram accounts to load the selectable list."
                                    : config.emptySavedMessage}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleRefreshSource(sourceKey)}
                                  disabled={Boolean(sourceSelectorState.refreshing)}
                                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {sourceSelectorState.refreshing
                                    ? "Loading..."
                                    : manualRefreshRequired
                                      ? "Refresh Instagram accounts"
                                      : config.loadFromMetaLabel}
                                </button>
                              </div>
                            ) : (
                              <AdAccountSelector
                                accounts={sourceSelectorState.accounts}
                                value={selectedAccount.accountId}
                                onChange={(value) => handleSelectAccount(sourceKey, value)}
                                loading={isSourceSyncing}
                                eyebrow={config.selectorEyebrow}
                                title={config.selectorTitle}
                                description={config.selectorDescription}
                                selectedLabel={config.selectedLabel}
                                emptyMessage={config.emptyMessage}
                                searchPlaceholder={config.searchPlaceholder}
                                logoUrl={config.logoUrl}
                                logoAlt={config.logoAlt}
                                footer={
                                  <>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => void handleSync(sourceKey)}
                                        disabled={isSourceSyncing || !selectedAccount.accountId}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                      >
                                        {isSourceSyncing ? (
                                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        ) : null}
                                        {isSourceSyncing
                                          ? messages.reports.syncing
                                          : selectedAccount.syncStatus === "synced"
                                            ? "Sync again"
                                            : `${messages.reports.syncData} ${config.displayName}`}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleRefreshSource(sourceKey)}
                                        disabled={Boolean(sourceSelectorState.refreshing)}
                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {sourceSelectorState.refreshing
                                          ? config.refreshingLabel
                                          : config.refreshLabel}
                                      </button>
                                      {selectedAccount.syncStatus === "synced" ? <SuccessBadge /> : null}
                                      {selectedAccount.syncStatus === "error" ? <FailedBadge /> : null}
                                    </div>
                                    {selectedAccount.error ? (
                                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {selectedAccount.error}
                                      </div>
                                    ) : null}
                                  </>
                                }
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleContinueToGenerate}
                    disabled={!allSourcesSynced}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Continue
                  </button>
                  <Link
                    href="/reports/new/flow"
                    className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-700"
                  >
                    {messages.common.back}
                  </Link>
                </div>
                  </>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                {messages.reports.metaOnlySync}
              </div>
            )}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default function NewReportFlowSyncPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="-mx-4 -mt-4 bg-white px-4 pt-4 pb-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 sm:pb-8">
            <section className="p-5 sm:p-8">
              <div className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
              </div>
            </section>
          </div>
        </AppShell>
      }
    >
      <NewReportFlowSyncPageContent />
    </Suspense>
  );
}
