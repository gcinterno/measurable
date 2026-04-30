"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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
  syncMetaPages,
} from "@/lib/api/integrations";
import {
  integrationCatalog,
  isMetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  getIntegrationReportContext,
  setIntegrationReportContext,
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

function NewReportFlowSyncPageContent() {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const integrationSource =
    searchParams.get("integration") || storedIntegrationContext?.source || "";
  const selectedIntegration = integrationCatalog.find(
    (integration) => integration.integrationKey === integrationSource
  );
  const isMetaSource = isMetaFrontendIntegrationKey(integrationSource);
  const integrationId = storedIntegrationContext?.integrationId || "";
  const workspaceId = storedIntegrationContext?.workspaceId || "1";
  const currentStep = 2;
  const previousStepHref =
    integrationSource
      ? `/reports/new/flow?integration=${integrationSource}`
      : "/reports/new/flow";

  const [pages, setPages] = useState<MetaOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState(
    storedIntegrationContext?.pageId || ""
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState<MetaTimeframeOptionId>(
    isMetaTimeframeOptionId(storedIntegrationContext?.timeframe)
      ? storedIntegrationContext.timeframe
      : "last_28_days"
  );
  const [startDate, setStartDate] = useState(storedIntegrationContext?.startDate || "");
  const [endDate, setEndDate] = useState(storedIntegrationContext?.endDate || "");
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pagesError, setPagesError] = useState("");
  const [error, setError] = useState("");
  const sourceConfig =
    integrationSource === "instagram_business"
      ? {
          loadingLabel: "Loading available Instagram Business accounts...",
          errorEyebrow: "Instagram Business",
          errorTitle: "We could not load your Instagram Business accounts",
          selectorEyebrow: "Instagram Business",
          selectorTitle: "Select an Instagram Business account",
          selectorDescription:
            "Choose the Instagram Business account you want to sync for this report.",
          selectedLabel: "Selected account",
          emptyMessage:
            "No Instagram Business accounts found. Make sure your Instagram account is Business/Creator and linked to a Facebook Page.",
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
        };
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

  const loadPages = useCallback(async () => {
    if (!isMetaSource) {
      setLoading(false);
      return;
    }

    if (!integrationId) {
      setLoading(false);
      setPages([]);
      setPagesError(messages.reports.missingIntegration);
      return;
    }

    try {
      setLoading(true);
      setPagesError("");
      const pageData =
        integrationSource === "instagram_business"
          ? await fetchMetaInstagramAccounts(integrationId)
          : await fetchMetaPages(integrationId);

      setPages(pageData);
    } catch (err: unknown) {
      console.error("flow sync pages load error:", err);
      setPages([]);
      setPagesError(messages.reports.loadPagesError);
    } finally {
      setLoading(false);
    }
  }, [
    integrationId,
    integrationSource,
    isMetaSource,
    messages.reports.loadPagesError,
    messages.reports.missingIntegration,
  ]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  useEffect(() => {
    if (loading || !selectedPageId) {
      return;
    }

    const selectedPageStillExists = pages.some((page) => page.id === selectedPageId);

    if (selectedPageStillExists) {
      return;
    }

    setSelectedPageId("");

    if (!storedIntegrationContext) {
      return;
    }

    setIntegrationReportContext({
      ...storedIntegrationContext,
      pageId: undefined,
      pageName: undefined,
      datasetId: undefined,
      synced: false,
    });
  }, [loading, pages, selectedPageId, storedIntegrationContext]);

  useEffect(() => {
    if (!storedIntegrationContext || storedIntegrationContext.pageName || !selectedPageId) {
      return;
    }

    const selectedPage = pages.find((page) => page.id === selectedPageId);

    if (!selectedPage) {
      return;
    }

    const normalizedSelection = normalizeMetaTimeframeSelection({
      preset: selectedTimeframe,
      startDate,
      endDate,
    });
    const selectionChanged =
      storedIntegrationContext.timeframe !== normalizedSelection.key ||
      storedIntegrationContext.startDate !== normalizedSelection.startDate ||
      storedIntegrationContext.endDate !== normalizedSelection.endDate ||
      storedIntegrationContext.pageId !== selectedPageId;

    if (selectionChanged && (storedIntegrationContext.datasetId || storedIntegrationContext.synced)) {
      console.info("[MetaTimeframe][flow.sync.invalidate]", {
        reason: "timeframe_or_page_changed",
        previousDatasetId: storedIntegrationContext.datasetId,
        previousSynced: storedIntegrationContext.synced,
        previousPageId: storedIntegrationContext.pageId,
        nextPageId: selectedPageId,
        previousTimeframe: storedIntegrationContext.timeframe,
        nextTimeframe: normalizedSelection.key,
        previousStartDate: storedIntegrationContext.startDate,
        nextStartDate: normalizedSelection.startDate,
        previousEndDate: storedIntegrationContext.endDate,
        nextEndDate: normalizedSelection.endDate,
      });
    }

    setIntegrationReportContext({
      ...storedIntegrationContext,
      pageId: selectedPageId,
      pageName: selectedPage.name,
      timeframe: normalizedSelection.key,
      startDate: normalizedSelection.startDate,
      endDate: normalizedSelection.endDate,
      timeframeSelection: normalizedSelection,
      datasetId: selectionChanged ? undefined : storedIntegrationContext.datasetId,
      synced: selectionChanged ? false : storedIntegrationContext.synced,
    });
  }, [endDate, pages, selectedPageId, selectedTimeframe, startDate, storedIntegrationContext]);

  useEffect(() => {
    if (!storedIntegrationContext) {
      return;
    }

    const normalizedSelection = normalizeMetaTimeframeSelection({
      preset: selectedTimeframe,
      startDate,
      endDate,
    });
    const selectionChanged =
      storedIntegrationContext.timeframe !== normalizedSelection.key ||
      storedIntegrationContext.startDate !== normalizedSelection.startDate ||
      storedIntegrationContext.endDate !== normalizedSelection.endDate;

    if (selectionChanged && (storedIntegrationContext.datasetId || storedIntegrationContext.synced)) {
      console.info("[MetaTimeframe][flow.sync.invalidate]", {
        reason: "timeframe_changed",
        previousDatasetId: storedIntegrationContext.datasetId,
        previousSynced: storedIntegrationContext.synced,
        previousTimeframe: storedIntegrationContext.timeframe,
        nextTimeframe: normalizedSelection.key,
        previousStartDate: storedIntegrationContext.startDate,
        nextStartDate: normalizedSelection.startDate,
        previousEndDate: storedIntegrationContext.endDate,
        nextEndDate: normalizedSelection.endDate,
      });
    }

    setIntegrationReportContext({
      ...storedIntegrationContext,
      timeframe: normalizedSelection.key,
      startDate: normalizedSelection.startDate,
      endDate: normalizedSelection.endDate,
      timeframeSelection: normalizedSelection,
      datasetId: selectionChanged ? undefined : storedIntegrationContext.datasetId,
      synced: selectionChanged ? false : storedIntegrationContext.synced,
    });
  }, [endDate, selectedTimeframe, startDate, storedIntegrationContext]);

  async function handleSync() {
    if (!integrationId) {
      setError(
        "We could not find the Meta integration_id in the current session. Reconnect the integration and try again."
      );
      return;
    }

    if (!selectedPageId) {
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
      setSyncLoading(true);
      setError("");
      const selectedPage = pages.find((page) => page.id === selectedPageId);
      const normalizedSelection = normalizeMetaTimeframeSelection({
        preset: selectedTimeframe,
        startDate,
        endDate,
      });
      const syncInput = {
        integrationId,
        pageId: selectedPageId,
        timeframe: normalizedSelection.key,
        startDate: normalizedSelection.startDate,
        endDate: normalizedSelection.endDate,
      };

      console.info("[MetaTimeframe][flow.sync.before]", {
        selectedTimeframe: normalizedSelection.key,
        startDate: normalizedSelection.startDate,
        endDate: normalizedSelection.endDate,
        selectedPageId,
        previousDatasetId: storedIntegrationContext?.datasetId,
        previousSynced: storedIntegrationContext?.synced,
        persistedContext: storedIntegrationContext,
        timeframeSelection: normalizedSelection,
        syncInput,
      });

      console.log("SYNC PAYLOAD", {
        integrationId,
        selectedPageId,
      });

      await selectMetaPage({
        integrationId,
        pageId: selectedPageId,
      });

      const response = await syncMetaPages(syncInput);

      const nextIntegrationId = response.integrationId || integrationId;
      const nextDatasetId = response.datasetId || "";

      if (!nextDatasetId) {
        throw new Error("Sync completed without dataset_id.");
      }

      const nextContext = {
        source: integrationSource || storedIntegrationContext?.source || "facebook_pages",
        integration: "meta",
        workspaceId,
        integrationId: nextIntegrationId,
        pageId: selectedPageId,
        pageName: selectedPage?.name || storedIntegrationContext?.pageName,
        timeframe: normalizedSelection.key,
        startDate: normalizedSelection.startDate,
        endDate: normalizedSelection.endDate,
        timeframeSelection: normalizedSelection,
        datasetId: nextDatasetId,
        synced: true,
        requestedSlides: storedIntegrationContext?.requestedSlides,
        aiMode: storedIntegrationContext?.aiMode,
      };

      console.info("[MetaTimeframe][flow.sync.after]", {
        responseDatasetId: response.datasetId,
        nextDatasetId,
        nextSynced: true,
        responseIntegrationId: response.integrationId,
        persistedContext: nextContext,
        raw: response.raw,
      });

      setIntegrationReportContext(nextContext);

      router.replace(
        `/reports/new/flow/generate?integration=${integrationSource || "facebook_pages"}`
      );
    } catch (err: unknown) {
      console.error("flow meta sync error:", err);
      if (isLimitError(err)) {
        setError(err.message || messages.reports.syncPageDataError);
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError(messages.reports.syncPageDataError);
      }
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <AppShell>
      {syncLoading ? (
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
                {selectedIntegration?.name || messages.reports.selectedSource}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Period: {formatMetaTimeframeLabel({
                  timeframe: selectedTimeframe,
                  startDate,
                  endDate,
                })}
              </p>
            </div>

            {isMetaSource ? (
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
                            setEndDate(event.target.value);
                            setError("");
                          }}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        />
                      </label>
                    </div>
                  ) : null}
                </section>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">
                        {sourceConfig.loadingLabel}
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
                    <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400">
                      <span>0%</span>
                      <span>20%</span>
                      <span>40%</span>
                      <span>60%</span>
                      <span>80%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : pagesError ? (
                  <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
                      {sourceConfig.errorEyebrow}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                      {sourceConfig.errorTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {pagesError}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void loadPages()}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <AdAccountSelector
                    accounts={pages}
                    value={selectedPageId}
                    onChange={(value) => {
                      setSelectedPageId(value);
                      setError("");
                    }}
                    loading={syncLoading}
                    eyebrow={sourceConfig.selectorEyebrow}
                    title={sourceConfig.selectorTitle}
                    description={sourceConfig.selectorDescription}
                    selectedLabel={sourceConfig.selectedLabel}
                    emptyMessage={sourceConfig.emptyMessage}
                  />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={loading || syncLoading || !selectedPageId}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {syncLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : null}
                    {syncLoading ? messages.reports.syncing : messages.reports.syncData}
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
