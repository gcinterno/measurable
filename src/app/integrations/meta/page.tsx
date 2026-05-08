"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdAccountSelector } from "@/components/integrations/AdAccountSelector";
import { MetaStatusCard } from "@/components/integrations/MetaStatusCard";
import { AppShell } from "@/components/layout/AppShell";
import { PlanLimitsSummary } from "@/components/workspace/PlanLimitsSummary";
import { ApiError, isLimitError } from "@/lib/api";
import {
  connectMetaIntegration,
  fetchMetaPages,
  validateMetaAuthUrl,
  selectMetaPage,
  syncMetaPages,
} from "@/lib/api/integrations";
import {
  clearMetaOAuthDebugUrl,
  getMetaOAuthDebugUrl,
  hasMetaConnectPrerequisites,
  showMetaOAuthReadyBanner,
  storeMetaOAuthDebugUrl,
} from "@/lib/integrations/meta-oauth";
import { createMetaPagesReport } from "@/lib/api/reports";
import { formatNumber } from "@/lib/formatters";
import {
  clearStoredMetaIntegrationState,
  getIntegrationReportContext,
  isPendingMetaSource,
  setPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { DEFAULT_REPORT_TEMPLATE } from "@/lib/reports/templates/default";
import {
  getSlidesLimit,
  isSlideEstimateNearLimit,
  shouldShowUpgradeCta,
} from "@/lib/workspace/plan-limits";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

type MetaOption = {
  id: string;
  name: string;
};

type MetaUiState =
  | "not_connected"
  | "connected_no_pages"
  | "connected"
  | "pages_loaded"
  | "page_selected"
  | "syncing"
  | "synced"
  | "generating_report"
  | "error";

function MetaIntegrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedContext = getIntegrationReportContext();
  const { workspace, reportsUsedThisMonth, loading: workspaceLoading } = useActiveWorkspace({
    includeReportsUsage: true,
  });
  const workspaceId = workspace?.id || null;
  const [pages, setPages] = useState<MetaOption[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [createReportLoading, setCreateReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [hasNoAuthorizedPages, setHasNoAuthorizedPages] = useState(false);
  const [oauthUrlReady, setOauthUrlReady] = useState("");
  const [pageSelected, setPageSelected] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const connectInFlightRef = useRef(false);
  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId),
    [pages, selectedPageId]
  );
  const estimatedSlides = DEFAULT_REPORT_TEMPLATE.slides.length;
  const slidesLimit = getSlidesLimit(workspace);
  const slideLimitWarning =
    syncCompleted &&
    Boolean(slidesLimit && isSlideEstimateNearLimit(workspace, estimatedSlides));
  const showUpgradeCta = shouldShowUpgradeCta({
    workspace,
    reportsUsedThisMonth,
    estimatedSlides,
  });
  const currentMetaSource = isPendingMetaSource(storedContext?.source)
    ? storedContext.source
    : "facebook_pages";

  useEffect(() => {
    setOauthUrlReady(getMetaOAuthDebugUrl());
  }, []);

  useEffect(() => {
    if (!storedContext || storedContext.integration !== "meta") {
      return;
    }

    if (storedContext.integrationId) {
      setIntegrationId(storedContext.integrationId);
    }

    if (storedContext.datasetId) {
      setDatasetId(storedContext.datasetId);
    }

    if (storedContext.pageId) {
      setSelectedPageId(storedContext.pageId);
      setPageSelected(true);
    }

    if (storedContext.synced) {
      setSyncCompleted(true);
    }
  }, [storedContext]);

  useEffect(() => {
    const metaState = searchParams.get("meta_state");
    const callbackIntegrationId = searchParams.get("integration_id");
    const pagesCount = Number(searchParams.get("pages_count") || "0");
    const message = searchParams.get("message");
    const metaError = searchParams.get("meta_error");

    if (!metaState && !metaError) {
      return;
    }

    setError(metaError || "");
    setSyncCompleted(false);
    setPageSelected(false);
    setSelectedPageId("");
    setDatasetId("");

    if (callbackIntegrationId) {
      setIntegrationId(callbackIntegrationId);
    }

    if (metaState === "connected") {
      setConnected(pagesCount > 0);
      setHasNoAuthorizedPages(pagesCount === 0);
      setStatusMessage(
        message || "Connection completed. Now choose the page you want to use."
      );
    } else if (metaState === "no_authorized_pages") {
      setConnected(false);
      setHasNoAuthorizedPages(true);
      setPages([]);
      setStatusMessage(
        message ||
          "Meta connected but no authorized pages were returned. Reconnect and approve at least one page."
      );
    } else if (metaError) {
      setConnected(false);
      setHasNoAuthorizedPages(false);
      setStatusMessage("");
    }

    router.replace("/integrations/meta");
  }, [
    currentMetaSource,
    router,
    searchParams,
  ]);

  useEffect(() => {
    let active = true;

    async function loadMetaPages() {
      if (!integrationId) {
        if (active) {
          setLoading(false);
          setPages([]);

          if (!connected) {
            setStatusMessage("");
          } else {
            setStatusMessage(
              "Connection detected. Waiting for integration_id to load the pages."
            );
          }
        }

        return;
      }

      try {
        setLoading(true);
        setError("");
        setStatusMessage("");

        const pageData = await fetchMetaPages(
          integrationId,
          workspaceId || storedContext?.workspaceId || ""
        );

        if (!active) {
          return;
        }

        setPages(pageData);
        setConnected(pageData.length > 0);
        setHasNoAuthorizedPages(pageData.length === 0);
        setPageSelected((current) =>
          pageData.some((page) => page.id === selectedPageId) ? current : false
        );
        if (!pageData.some((page) => page.id === selectedPageId)) {
          setSelectedPageId("");
        }
        console.info("META_AUTHORIZED_PAGES_COUNT", {
          integration_id: integrationId,
          pages_count: pageData.length,
          route: "/integrations/meta",
        });

        if (pageData.length === 0) {
          setStatusMessage(
            "Connected but no authorized pages were found. Reconnect and approve at least one page."
          );
        }
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        console.error("meta pages load error:", err);
        setError(
          "We could not load the Facebook pages. Try refreshing the view."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMetaPages();

    return () => {
      active = false;
    };
  }, [connected, integrationId, selectedPageId, workspaceId]);

  useEffect(() => {
    if (!storedContext || storedContext.pageName || !selectedPageId) {
      return;
    }

    if (!selectedPage) {
      return;
    }

    setIntegrationReportContext({
      ...storedContext,
      pageId: selectedPageId,
      pageName: selectedPage.name,
    });
  }, [selectedPage, selectedPageId, storedContext]);

  const uiState = useMemo<MetaUiState>(() => {
    if (error) {
      return "error";
    }

    if (createReportLoading) {
      return "generating_report";
    }

    if (syncLoading) {
      return "syncing";
    }

    if (syncCompleted) {
      return "synced";
    }

    if (pageSelected && selectedPageId) {
      return "page_selected";
    }

    if (pages.length > 0) {
      return "pages_loaded";
    }

    if (connected) {
      return "connected";
    }

    if (hasNoAuthorizedPages) {
      return "connected_no_pages";
    }

    return "not_connected";
  }, [
    connected,
    createReportLoading,
    error,
    hasNoAuthorizedPages,
    pageSelected,
    pages.length,
    selectedPageId,
    syncCompleted,
    syncLoading,
  ]);

  async function handleConnect() {
    if (connectInFlightRef.current) {
      console.warn("META_CONNECT_DUPLICATE_IGNORED", {
        route: "/integrations/meta",
      });
      return;
    }

    try {
      connectInFlightRef.current = true;
      setConnectLoading(true);
      setError("");
      setStatusMessage("");
      const storedContext = getIntegrationReportContext();
      const { tokenReady } = hasMetaConnectPrerequisites();
      clearMetaOAuthDebugUrl();
      setOauthUrlReady("");
      setPendingMetaSource(currentMetaSource);
      clearStoredMetaIntegrationState();
      setConnected(false);
      setHasNoAuthorizedPages(false);
      setPages([]);
      setSelectedPageId("");
      setPageSelected(false);
      setDatasetId("");
      setSyncCompleted(false);

      if (storedContext?.integration === "meta") {
        setIntegrationReportContext({
          ...storedContext,
          integrationId: undefined,
          datasetId: undefined,
          pageId: undefined,
          pageName: undefined,
          synced: false,
          postConnectRedirect: undefined,
        });
      }

      const connectWorkspaceId = workspaceId || storedContext?.workspaceId || "";

      if (!tokenReady) {
        setError("Your session is not ready yet. Refresh and try again.");
        return;
      }

      if (!connectWorkspaceId || workspaceLoading) {
        setError(
          "No active workspace selected. Please choose a workspace and try again."
        );
        return;
      }

      console.info("META_CONNECT_START", {
        workspace_id: connectWorkspaceId,
        source: currentMetaSource,
        route: "/integrations/meta",
      });

      const response = await connectMetaIntegration({
        workspaceId: connectWorkspaceId,
        source: currentMetaSource,
      });

      const authUrl = response.authUrlFromBackend || response.redirectUrl;
      const validation = validateMetaAuthUrl(authUrl);

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: connectWorkspaceId,
        source: currentMetaSource,
        auth_url: authUrl || null,
        integration_id: response.integrationId || null,
      });

      console.info("META_CONNECT_AUTH_URL_FINAL", {
        workspace_id: connectWorkspaceId,
        source: currentMetaSource,
        auth_url: authUrl || null,
        starts_with_facebook: validation.startsWithFacebook,
        contains_dialog_oauth: validation.containsDialogOAuth,
      });

      if (!validation.isValid) {
        console.error("META_CONNECT_INVALID_AUTH_URL", {
          workspace_id: connectWorkspaceId,
          source: currentMetaSource,
          auth_url: authUrl || null,
          starts_with_facebook: validation.startsWithFacebook,
          contains_dialog_oauth: validation.containsDialogOAuth,
        });
        throw new Error(
          "The backend did not return a valid Meta OAuth URL with /dialog/oauth."
        );
      }

      storeMetaOAuthDebugUrl(authUrl);
      await showMetaOAuthReadyBanner();

      if (typeof window !== "undefined") {
        window.location.href = authUrl;
        return;
      }
    } catch (err: unknown) {
      console.error("meta connect pages error:", err);
      setConnected(false);
      setHasNoAuthorizedPages(false);
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : "We could not start the Facebook Pages connection. Try again."
      );
    } finally {
      connectInFlightRef.current = false;
      setConnectLoading(false);
    }
  }

  async function handleSelectPage() {
    if (!selectedPageId) {
      setError("Select a page before continuing.");
      return;
    }

    if (!integrationId) {
      setError(
        "We could not find the Meta integration_id. Reconnect Facebook Pages and try again."
      );
      return;
    }

    try {
      setSelectLoading(true);
      setError("");
      const response = await selectMetaPage({
        integrationId,
        pageId: selectedPageId,
      });

      if (response.integrationId) {
        setIntegrationId(response.integrationId);
      }

      if (response.datasetId) {
        setDatasetId(response.datasetId);
      }

      setPageSelected(true);
      setSyncCompleted(false);
      setStatusMessage(
        "Page selected successfully. You can now sync the data."
      );
      setIntegrationReportContext({
        source: currentMetaSource,
        integration: "meta",
        workspaceId: workspaceId || storedContext?.workspaceId || "",
        integrationId: response.integrationId || integrationId,
        datasetId: response.datasetId || datasetId || undefined,
        pageId: selectedPageId,
        pageName: selectedPage?.name,
        synced: false,
      });
    } catch (err: unknown) {
      console.error("meta select page error:", err);
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : "We could not save the selected page. Review the selection and try again."
      );
    } finally {
      setSelectLoading(false);
    }
  }

  async function handleSync() {
    if (!selectedPageId) {
      setError("Select a page before syncing.");
      return;
    }

    if (!integrationId) {
      setError(
        "We could not find the Meta integration_id. Reconnect Facebook Pages and try again."
      );
      return;
    }

    try {
      setSyncLoading(true);
      setError("");
      setStatusMessage("");
      const response = await syncMetaPages({
        pageId: selectedPageId,
        integrationId,
        workspaceId: workspaceId || storedContext?.workspaceId || "",
      });

      const nextIntegrationId = response.integrationId || integrationId;
      const nextDatasetId = response.datasetId || datasetId;

      setIntegrationId(nextIntegrationId);
      setDatasetId(nextDatasetId);
      setSyncCompleted(true);
      setStatusMessage(
          response.message ||
          response.detail ||
          "Data synced successfully. You can now generate the report."
      );

      setIntegrationReportContext({
        source: currentMetaSource,
        integration: "meta",
        workspaceId: workspaceId || storedContext?.workspaceId || "",
        integrationId: nextIntegrationId,
        datasetId: nextDatasetId,
        pageId: selectedPageId,
        pageName: selectedPage?.name,
        synced: true,
      });
    } catch (err: unknown) {
      console.error("meta pages sync error:", err);
      if (isLimitError(err)) {
        setError(err.message || "We could not sync the page data. Try again in a few seconds.");
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError("We could not sync the page data. Try again in a few seconds.");
      }
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!datasetId) {
      setError(
        "There is no synced dataset yet. Sync the data before generating the report."
      );
      return;
    }

    try {
      setCreateReportLoading(true);
      setError("");
      setStatusMessage("");
      const report = await createMetaPagesReport({ datasetId });
      router.replace(`/reports/${report.reportId}`);
    } catch (err: unknown) {
      console.error("meta pages create report error:", err);
      if (isLimitError(err)) {
        setError(err.message || "We could not generate the report with the synced data. Try again.");
      } else if (err instanceof ApiError && err.message) {
        setError(err.message);
      } else {
        setError("We could not generate the report with the synced data. Try again.");
      }
    } finally {
      setCreateReportLoading(false);
    }
  }

  const primaryAction = (() => {
    if (!connected) {
      return {
        label: connectLoading
          ? "Connecting..."
          : hasNoAuthorizedPages
            ? "Reconnect Facebook Pages"
            : "Connect Facebook Pages",
        onClick: handleConnect,
        disabled: connectLoading || loading,
      };
    }

    if (!pageSelected) {
      return {
        label:
          selectLoading ? "Saving page..." : "Save selected page",
        onClick: handleSelectPage,
        disabled:
          selectLoading || syncLoading || createReportLoading || !selectedPageId,
      };
    }

    if (!syncCompleted) {
      return {
        label: syncLoading ? "Syncing data..." : "Sync data",
        onClick: handleSync,
        disabled: syncLoading || createReportLoading || !selectedPageId,
      };
    }

    return {
      label: createReportLoading ? "Generating report..." : "Generate report",
      onClick: handleGenerateReport,
      disabled: createReportLoading || !selectedPageId,
    };
  })();

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <MetaStatusCard
          state={uiState}
          workspaceId={workspaceId}
          onAction={primaryAction.onClick}
          actionLabel={primaryAction.label}
          actionDisabled={primaryAction.disabled}
          error={error}
        />
        {oauthUrlReady ? (
          <p className="text-xs text-slate-500 break-all">
            OAuth URL ready: {oauthUrlReady}
          </p>
        ) : null}

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        ) : (
          <AdAccountSelector
            accounts={pages}
            value={selectedPageId}
            onChange={(value) => {
              setSelectedPageId(value);
              setPageSelected(false);
              setSyncCompleted(false);
              setStatusMessage("");
              setError("");
            }}
            loading={selectLoading || syncLoading || createReportLoading}
          />
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Meta Pages flow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Connect, sync, and generate your report
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              This flow is already connected to the real backend. You only need to move step by step until the report is generated.
            </p>
            <ol className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
              <li>1. Connect Facebook Pages to the current workspace.</li>
              <li>2. Choose the correct page and save the selection.</li>
              <li>3. Sync the real data from that page.</li>
              <li>4. Generate the report and open it inside the platform.</li>
            </ol>

            {statusMessage ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </div>
            ) : null}

            {datasetId ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Data ready to generate the report.
              </div>
            ) : null}
            {slideLimitWarning ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">This report may exceed your slide limit.</p>
                <p className="mt-1">
                  This flow prepares {estimatedSlides} slides and your current plan supports up to {slidesLimit} per report.
                </p>
                {showUpgradeCta ? (
                  <Link
                    href="/plans"
                    className="mt-3 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Upgrade plan
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>

          <aside className="space-y-6">
            <PlanLimitsSummary
              workspace={workspace}
              reportsUsedThisMonth={reportsUsedThisMonth}
              estimatedSlides={estimatedSlides}
            />
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Current status
              </h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Workspace: {workspaceId || "No workspace"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Connected: {connected ? "Yes" : "No"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Pages loaded: {formatNumber(pages.length, 0)}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Page: {selectedPageId || "Not selected"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Integration ID: {integrationId || "No integration_id"}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Dataset ID: {datasetId || "No dataset"}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-lg font-semibold text-slate-950">
                Confirmations
              </h3>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {connected
                    ? "Facebook Pages connection is active."
                    : "Facebook Pages still needs to be connected."}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {pageSelected && selectedPageId
                    ? "Page selected and saved successfully."
                    : "You have not confirmed a page yet."}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {syncCompleted
                    ? "Data synced and ready for the next step."
                    : "The sync has not been completed yet."}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {datasetId
                    ? "Data ready to generate the report."
                    : "The report will be enabled when a synced dataset exists."}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

export default function MetaIntegrationPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="space-y-5 sm:space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
                <div className="h-24 animate-pulse rounded-[24px] bg-slate-100" />
              </div>
            </section>
          </div>
        </AppShell>
      }
    >
      <MetaIntegrationPageContent />
    </Suspense>
  );
}
