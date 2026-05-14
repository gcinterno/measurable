"use client";

import Image from "next/image";
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
  fetchMetaInstagramAccounts,
  fetchMetaPages,
  selectMetaPage,
  syncMetaInstagramAccount,
  syncMetaPages,
} from "@/lib/api/integrations";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  createEmptySelectedAccountsBySource,
  getIntegrationReportContext,
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
};

function getSourceConfig(sourceKey: SourceKey) {
  const integration = integrationCatalog.find(
    (item) => item.integrationKey === sourceKey
  );

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

function NewReportFlowSyncPageContent() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    searchParams.get("integration") || storedIntegrationContext?.source || "";
  const storedSelectedSourcesKey = (storedIntegrationContext?.selectedSources || []).join("|");
  const selectedSources = useMemo(
    () =>
      (
        storedIntegrationContext?.selectedSources?.length
          ? storedIntegrationContext.selectedSources
          : integrationSource
            ? [integrationSource]
            : []
      ).filter((source): source is SourceKey => isMetaFrontendIntegrationKey(source)),
    [integrationSource, storedIntegrationContext?.source, storedSelectedSourcesKey]
  );
  const hasSelectedSources = selectedSources.length > 0;
  const selectedIntegration = useMemo(
    () =>
      integrationCatalog.find(
        (integration) => integration.integrationKey === selectedSources[0]
      ),
    [selectedSources]
  );
  const integrationId = storedIntegrationContext?.integrationId || "";
  const workspaceId = storedIntegrationContext?.workspaceId || "";
  const currentStep = 2;
  const previousStepHref = "/reports/new/flow";

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
      : "last_28_days"
  );
  const [startDate, setStartDate] = useState(
    storedIntegrationContext?.sharedTimeframe?.startDate || storedIntegrationContext?.startDate || ""
  );
  const [endDate, setEndDate] = useState(
    storedIntegrationContext?.sharedTimeframe?.endDate || storedIntegrationContext?.endDate || ""
  );
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [syncingSource, setSyncingSource] = useState<SourceKey | null>(null);
  const [error, setError] = useState("");
  const hasLoadedRef = useRef(false);
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

  useEffect(() => {
    console.info("[SyncFlow][mount]", {
      integrationSource,
      selectedSources,
      integrationId,
    });
  }, [integrationId, integrationSource, selectedSources]);

  function normalizeCurrentTimeframe() {
    return normalizeMetaTimeframeSelection({
      preset: selectedTimeframe,
      startDate,
      endDate,
    });
  }

  function buildNextContext(nextAccountsBySource: typeof selectedAccountsBySource) {
    const normalizedSelection = normalizeCurrentTimeframe();
    const firstSource = selectedSources[0] || "";
    const firstSourceAccount = firstSource
      ? nextAccountsBySource[firstSource]
      : undefined;

    return {
      source: firstSource,
      integration: "meta",
      workspaceId,
      integrationId:
        firstSourceAccount?.integrationId ||
        storedIntegrationContext?.integrationId ||
        integrationId,
      pageId: firstSourceAccount?.accountId || undefined,
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
  }

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

    const progressSteps = [0, 20, 40, 60, 80, 90];
    let stepIndex = 0;

    const intervalId = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, progressSteps.length - 1);
      setLoadingProgress(progressSteps[stepIndex]);
    }, 350);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading]);

  const loadPages = useCallback(async (sourceKey?: SourceKey, force = false) => {
    if (!force && hasLoadedRef.current) {
      console.info("[SyncFlow][load.skip.already_loaded]", {
        sourceKey: sourceKey || null,
        selectedSources,
      });
      return;
    }

    if (!hasSelectedSources) {
      setLoading(false);
      return;
    }

    const sourceKeys = sourceKey ? [sourceKey] : selectedSources;

    console.info("[SyncFlow][load.start]", {
      sourceKey: sourceKey || null,
      selectedSources: sourceKeys,
      integrationId,
    });

    if (!integrationId) {
      hasLoadedRef.current = true;
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

    try {
      hasLoadedRef.current = true;
      setLoading(true);
      setSourceState((current) => {
        const nextState = { ...current };
        sourceKeys.forEach((selectedSource) => {
          nextState[selectedSource] = {
            ...nextState[selectedSource],
            loading: true,
            error: "",
          };
        });
        return nextState;
      });

      const responses = await Promise.all(
        sourceKeys.map(async (selectedSource) => {
          const accountData =
            selectedSource === "instagram_business"
              ? await fetchMetaInstagramAccounts(integrationId)
              : await fetchMetaPages(integrationId);

          return [selectedSource, accountData] as const;
        })
      );

      setSourceState((current) => {
        const nextState = { ...current };

        responses.forEach(([selectedSource, accountData]) => {
          nextState[selectedSource] = {
            accounts: accountData,
            loading: false,
            error: "",
          };
        });

        return nextState;
      });

      console.info("[SyncFlow][load.success]", {
        sourceKey: sourceKey || null,
        selectedSources: sourceKeys,
        counts: Object.fromEntries(
          responses.map(([selectedSource, accountData]) => [
            selectedSource,
            accountData.length,
          ])
        ),
      });
    } catch (err: unknown) {
      hasLoadedRef.current = true;
      console.info("[SyncFlow][load.error]", {
        sourceKey: sourceKey || null,
        selectedSources: sourceKeys,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error("flow sync pages load error:", err);
      setSourceState((current) => {
        const nextState = { ...current };
        sourceKeys.forEach((selectedSource) => {
          nextState[selectedSource] = {
            accounts: [],
            loading: false,
            error: messages.reports.loadPagesError,
          };
        });
        return nextState;
      });
    } finally {
      setLoading(false);
    }
  }, [
    hasSelectedSources,
    integrationId,
    messages.reports.loadPagesError,
    messages.reports.missingIntegration,
    selectedSources,
  ]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (selectedSources.length === 0) {
      return;
    }

    setIntegrationReportContext(buildNextContext(selectedAccountsBySource));
  }, [endDate, selectedAccountsBySource, selectedSources, selectedTimeframe, startDate]);

  function handleSelectAccount(sourceKey: SourceKey, accountId: string) {
    const selectedAccount = sourceState[sourceKey].accounts.find((account) => account.id === accountId);
    const nextAccountsBySource = {
      ...selectedAccountsBySource,
      [sourceKey]: {
        ...selectedAccountsBySource[sourceKey],
        accountId,
        accountName: selectedAccount?.name || "",
        integrationId,
        integrationAccountId: accountId || undefined,
        datasetId: undefined,
        syncStatus: accountId ? "idle" : "error",
        error: accountId ? undefined : messages.reports.selectPageBeforeSync,
      },
    };

    setSelectedAccountsBySource(nextAccountsBySource);
    setError("");
  }

  async function handleSync(sourceKey: SourceKey) {
    if (!integrationId) {
      setError(
        "We could not find the Meta integration_id in the current session. Reconnect the integration and try again."
      );
      return;
    }

    const selectedAccount = selectedAccountsBySource[sourceKey];

    if (!selectedAccount.accountId) {
      setError(messages.reports.selectPageBeforeSync);
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
        integrationId,
        timeframe: normalizedSelection.key,
        startDate: normalizedSelection.startDate,
        endDate: normalizedSelection.endDate,
      };
      const response =
        sourceKey === "instagram_business"
          ? await syncMetaInstagramAccount({
              ...syncInput,
              accountId: selectedAccount.accountId,
            })
          : await (async () => {
              await selectMetaPage({
                integrationId,
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
          integrationId: response.integrationId || integrationId,
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
      <div className="space-y-5 sm:space-y-6">
        <MobileFlowHeader
          currentStep={currentStep}
          totalSteps={flowSteps.length}
          title={messages.reports.syncData}
          description={messages.reports.completeSelectionDescription}
          backHref={previousStepHref}
        />
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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

          <div className="mt-8 space-y-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
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

                    return (
                      <section
                        key={sourceKey}
                        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                            {config.logoUrl ? (
                              <Image
                                src={config.logoUrl}
                                alt={config.logoAlt}
                                width={24}
                                height={24}
                                className="h-6 w-6"
                                unoptimized
                              />
                            ) : null}
                          </div>
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                              {config.displayName}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-slate-950">
                              {config.selectorTitle}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {config.selectorDescription}
                            </p>
                          </div>
                        </div>

                        {isSourceLoading ? (
                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6">
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
                          </div>
                        ) : sourceSelectorState.error ? (
                          <div className="mt-5 rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
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
                                  hasLoadedRef.current = false;
                                  void loadPages(sourceKey, true);
                                }}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                Retry
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5">
                            <AdAccountSelector
                              accounts={sourceSelectorState.accounts}
                              value={selectedAccount.accountId}
                              onChange={(value) => handleSelectAccount(sourceKey, value)}
                              loading={isSourceSyncing}
                              eyebrow={config.selectorEyebrow}
                              title=""
                              description=""
                              selectedLabel={config.selectedLabel}
                              emptyMessage={config.emptyMessage}
                            />
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void handleSync(sourceKey)}
                            disabled={isSourceLoading || isSourceSyncing || !selectedAccount.accountId}
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
                          {selectedAccount.syncStatus === "synced" ? <SuccessBadge /> : null}
                        </div>
                        {selectedAccount.error ? (
                          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {selectedAccount.error}
                          </div>
                        ) : null}
                      </section>
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
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        </AppShell>
      }
    >
      <NewReportFlowSyncPageContent />
    </Suspense>
  );
}
