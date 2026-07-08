"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import { AppShell } from "@/components/layout/AppShell";
import { UserSuggestionModal } from "@/components/suggestions/UserSuggestionModal";
import { ApiError } from "@/lib/api";
import {
  connectMetaBusinessSuiteIntegration,
  disconnectMetaBusinessSuiteIntegration,
  fetchMetaBusinessSuiteStatus,
  isMetaProviderConnectedStatus,
  normalizeMetaBusinessSuiteStatus,
  type MetaBusinessSuiteConnectionStatus,
} from "@/lib/api/integrations";
import {
  clearMetaOAuthDebugUrl,
  clearPendingMetaOAuth,
  createPendingMetaOAuth,
  hasMetaConnectPrerequisites,
  isIntegrationOAuthCompleteMessage,
  isMetaOAuthWindowMessage,
  markMetaRedirectStarted,
  META_OAUTH_POPUP_CLOSE_GRACE_MS,
  META_OAUTH_POPUP_FEATURES,
  META_OAUTH_POPUP_TIMEOUT_MS,
  showMetaOAuthReadyBanner,
  storeMetaOAuthDebugUrl,
} from "@/lib/integrations/meta-oauth";
import {
  clearMetaIntegrationSessionState,
  getIntegrationReportContext,
} from "@/lib/integrations/session";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

type SuiteUserAction = "connect" | "disconnect" | null;

type SuiteRuntimeState = {
  isActionInFlight: boolean;
  lastUserAction: SuiteUserAction;
  lastActionAt: number;
  error: string;
};

const POPUP_STATUS_POLL_MS = 30000;
const DISCONNECT_STATUS_PROTECTION_MS = 10000;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getBadgeClasses(status: "Available" | "Connected" | "Needs permission" | "Checking") {
  switch (status) {
    case "Connected":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Needs permission":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
    case "Checking":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    case "Available":
    default:
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  }
}

function getChildSummary(input: {
  label: string;
  emptyLabel: string;
  count: number;
  singular: string;
  plural: string;
}) {
  return {
    label: input.label,
    text:
      input.count > 0
        ? `${input.count} ${input.count === 1 ? input.singular : input.plural} ready`
        : input.emptyLabel,
  };
}

function createEmptySuiteStatus(): MetaBusinessSuiteConnectionStatus {
  return {
    provider: "meta_business_suite",
    status: "",
    connected: false,
    integrationId: "",
    assetCount: 0,
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
        tokenScopes: [],
        missingScopes: [],
        lastSyncedAt: "",
        message: "",
      },
    },
  };
}

function IntegrationsPageContent() {
  const { workspace, loading: workspaceLoading } = useActiveWorkspace();
  const activeWorkspaceId = workspace?.id || null;
  const [suiteStatus, setSuiteStatus] = useState<MetaBusinessSuiteConnectionStatus>(
    createEmptySuiteStatus
  );
  const [suiteLoading, setSuiteLoading] = useState(true);
  const [suiteMessage, setSuiteMessage] = useState("");
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [runtimeState, setRuntimeState] = useState<SuiteRuntimeState>({
    isActionInFlight: false,
    lastUserAction: null,
    lastActionAt: 0,
    error: "",
  });
  const runtimeStateRef = useRef(runtimeState);
  const popupWindowRef = useRef<Window | null>(null);
  const popupCallbackReceivedRef = useRef(false);
  const popupPollRef = useRef<number | null>(null);
  const popupCloseGraceRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);

  const setRuntime = useCallback((patch: Partial<SuiteRuntimeState>) => {
    const nextState = {
      ...runtimeStateRef.current,
      ...patch,
    };

    runtimeStateRef.current = nextState;
    setRuntimeState(nextState);
  }, []);

  const beginAction = useCallback(
    (action: Exclude<SuiteUserAction, null>) => {
      setRuntime({
        isActionInFlight: true,
        lastUserAction: action,
        lastActionAt: Date.now(),
        error: "",
      });
    },
    [setRuntime]
  );

  const completeAction = useCallback(
    (patch: Partial<SuiteRuntimeState> = {}) => {
      setRuntime({
        isActionInFlight: false,
        ...patch,
      });
    },
    [setRuntime]
  );

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

  const closePopup = useCallback(() => {
    const popup = popupWindowRef.current;
    popupWindowRef.current = null;

    if (!popup || popup.closed) {
      return;
    }

    try {
      popup.close();
    } catch {
      // Ignore popup close failures.
    }
  }, []);

  const shouldIgnoreStatus = useCallback((requestStartedAt: number, nextStatus: MetaBusinessSuiteConnectionStatus) => {
    const currentRuntime = runtimeStateRef.current;
    const nextUiStatus = normalizeMetaBusinessSuiteStatus({
      status: nextStatus.status,
      connected: nextStatus.connected,
      assetCount: nextStatus.assetCount,
      lastSyncedAt: nextStatus.lastSyncedAt,
    });

    if (currentRuntime.lastActionAt > 0 && requestStartedAt < currentRuntime.lastActionAt) {
      return true;
    }

    return (
      currentRuntime.lastUserAction === "disconnect" &&
      Date.now() - currentRuntime.lastActionAt < DISCONNECT_STATUS_PROTECTION_MS &&
      nextUiStatus.connected
    );
  }, []);

  const applySuiteStatus = useCallback(
    (nextStatus: MetaBusinessSuiteConnectionStatus, requestStartedAt: number) => {
      if (shouldIgnoreStatus(requestStartedAt, nextStatus)) {
        return false;
      }

      setSuiteStatus(nextStatus);

      if (isMetaProviderConnectedStatus(nextStatus.status) || nextStatus.connected) {
        completeAction({ error: "" });
      }

      return true;
    },
    [completeAction, shouldIgnoreStatus]
  );

  const refreshSuiteStatus = useCallback(
    async (cacheBust?: number) => {
      const requestStartedAt = Date.now();
      const status = await fetchMetaBusinessSuiteStatus({
        workspaceId: activeWorkspaceId,
        refresh: false,
        cacheBust,
      });

      applySuiteStatus(status, requestStartedAt);
      return status;
    },
    [activeWorkspaceId, applySuiteStatus]
  );

  const markSuiteDisconnected = useCallback(() => {
    const nextStatus = createEmptySuiteStatus();
    nextStatus.status = "disconnected";

    setSuiteStatus(nextStatus);
    clearMetaIntegrationSessionState();
    clearPendingMetaOAuth();
    clearMetaOAuthDebugUrl();
    setRuntime({
      isActionInFlight: false,
      lastUserAction: "disconnect",
      lastActionAt: Date.now(),
      error: "",
    });
  }, [setRuntime]);

  const pollSuiteStatusAfterPopup = useCallback(async () => {
    const deadline = Date.now() + POPUP_STATUS_POLL_MS;
    let attempt = 0;
    let lastStatus = suiteStatus;

    while (Date.now() < deadline && !popupCallbackReceivedRef.current) {
      lastStatus = await refreshSuiteStatus(Date.now() + attempt);

      if (isMetaProviderConnectedStatus(lastStatus.status) || lastStatus.connected) {
        return lastStatus;
      }

      attempt += 1;
      await delay(1000);
    }

    return lastStatus;
  }, [refreshSuiteStatus, suiteStatus]);

  useEffect(() => {
    let active = true;

    async function loadSuiteStatus() {
      try {
        setSuiteLoading(true);
        const requestStartedAt = Date.now();
        const status = await fetchMetaBusinessSuiteStatus({
          workspaceId: activeWorkspaceId,
          refresh: false,
        });

        if (active) {
          applySuiteStatus(status, requestStartedAt);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta business suite status load error:", error);
      } finally {
        if (active) {
          setSuiteLoading(false);
        }
      }
    }

    void loadSuiteStatus();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, applySuiteStatus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function handleOAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (!isIntegrationOAuthCompleteMessage(event.data) && !isMetaOAuthWindowMessage(event.data)) {
        return;
      }

      popupCallbackReceivedRef.current = true;
      stopPopupPolling();
      closePopup();
      clearPendingMetaOAuth();

      try {
        const status = await refreshSuiteStatus(Date.now());

        if (isMetaProviderConnectedStatus(status.status) || status.connected) {
          setSuiteMessage("Meta Business Suite connected successfully.");
          completeAction({ error: "" });
        } else {
          setSuiteMessage("Authorization is still being processed. Refresh this page in a few seconds.");
          completeAction();
        }
      } catch (error) {
        console.error("meta business suite callback refresh error:", error);
        completeAction({
          error: "The connection finished, but we couldn’t refresh the Meta Business Suite status.",
        });
      }
    }

    window.addEventListener("message", handleOAuthMessage);

    return () => {
      stopPopupPolling();
      window.removeEventListener("message", handleOAuthMessage);
    };
  }, [closePopup, completeAction, refreshSuiteStatus, stopPopupPolling]);

  async function handleConnect(reconnect = false) {
    if (runtimeStateRef.current.isActionInFlight) {
      return;
    }

    let popupStarted = false;
    let popup: Window | null = null;

    try {
      const workspaceId = activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "";
      const { tokenReady } = hasMetaConnectPrerequisites();

      if (!tokenReady) {
        setRuntime({ error: "Your session is not ready yet. Refresh and try again." });
        return;
      }

      if (!workspaceId || workspaceLoading) {
        setRuntime({
          error: "No active workspace selected. Please choose a workspace and try again.",
        });
        return;
      }

      if (typeof window === "undefined") {
        throw new Error("We could not open the Meta authorization window. Please try again.");
      }

      beginAction("connect");
      popupCallbackReceivedRef.current = false;
      setSuiteMessage(reconnect ? "Reconnecting Meta Business Suite..." : "Connecting Meta Business Suite...");
      popup = window.open(
        "about:blank",
        "measurable_meta_business_suite_oauth",
        META_OAUTH_POPUP_FEATURES
      );

      if (!popup) {
        throw new Error("Please allow popups to connect this integration.");
      }

      const response = await connectMetaBusinessSuiteIntegration({
        workspaceId,
        reconnect: true,
      });
      const authUrl = response.authUrlFromBackend || response.redirectUrl;

      if (!authUrl) {
        throw new Error("The backend did not return a valid Meta OAuth URL.");
      }

      createPendingMetaOAuth({
        authUrl,
        source: "facebook_pages",
        route: "/integrations",
        transport: "popup",
      });
      storeMetaOAuthDebugUrl(authUrl);
      await showMetaOAuthReadyBanner();
      markMetaRedirectStarted();

      if (popup.closed) {
        throw new Error("The connection window was closed before authorization was completed.");
      }

      popupWindowRef.current = popup;
      popup.location.href = authUrl;
      popupStarted = true;
      stopPopupPolling();
      popupTimeoutRef.current = window.setTimeout(() => {
        setSuiteMessage(
          "This is taking longer than expected. Finish the Meta flow in the popup and we’ll update the connection automatically."
        );
      }, META_OAUTH_POPUP_TIMEOUT_MS);
      popupPollRef.current = window.setInterval(() => {
        if (!popup || !popup.closed) {
          return;
        }

        stopPopupPolling();
        popupCloseGraceRef.current = window.setTimeout(async () => {
          if (popupCallbackReceivedRef.current) {
            return;
          }

          clearPendingMetaOAuth();

          try {
            const status = await pollSuiteStatusAfterPopup();

            if (isMetaProviderConnectedStatus(status.status) || status.connected) {
              setSuiteMessage("Meta Business Suite connected successfully.");
              completeAction({ error: "" });
              return;
            }
          } catch (error) {
            console.error("meta business suite popup closed refresh error:", error);
          }

          setSuiteMessage("Authorization is still being processed. Refresh this page in a few seconds.");
          completeAction();
        }, META_OAUTH_POPUP_CLOSE_GRACE_MS);
      }, 500);
    } catch (error) {
      console.error("meta business suite connect error:", error);

      try {
        popup?.close();
      } catch {
        // Ignore popup close failures.
      }

      popupWindowRef.current = null;
      setSuiteMessage("");
      completeAction({
        error:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : "We couldn’t start Meta Business Suite authorization. Please try again.",
      });
    } finally {
      if (!popupStarted) {
        completeAction();
      }
    }
  }

  async function handleDisconnect() {
    if (runtimeStateRef.current.isActionInFlight) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Do you want to disconnect Meta Business Suite from this workspace? Your existing reports will not be deleted."
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      const workspaceId = activeWorkspaceId || getIntegrationReportContext()?.workspaceId || "";

      beginAction("disconnect");
      setSuiteMessage("");
      await disconnectMetaBusinessSuiteIntegration({ workspaceId });
      markSuiteDisconnected();
      setSuiteMessage("Meta Business Suite disconnected successfully.");

      try {
        await refreshSuiteStatus(Date.now());
      } catch (error) {
        console.error("meta business suite post-disconnect refresh error:", error);
      }
    } catch (error) {
      console.error("meta business suite disconnect error:", error);
      completeAction({
        error: "We couldn’t disconnect Meta Business Suite right now. Please try again.",
      });
    }
  }

  const suiteUiStatus = normalizeMetaBusinessSuiteStatus({
    status: suiteStatus.status,
    connected: suiteStatus.connected,
    loading: suiteLoading && !suiteStatus.status,
    assetCount: suiteStatus.assetCount,
    lastSyncedAt: suiteStatus.lastSyncedAt,
  });
  const childSummaries = [
    getChildSummary({
      label: "Facebook Pages",
      emptyLabel: "No Facebook Pages found",
      count: suiteUiStatus.connected
        ? suiteStatus.children.facebook_pages.assetCount
        : 0,
      singular: "page",
      plural: "pages",
    }),
    getChildSummary({
      label: "Instagram Business",
      emptyLabel: "No Instagram accounts found",
      count: suiteUiStatus.connected
        ? suiteStatus.children.instagram_business.assetCount
        : 0,
      singular: "Instagram account",
      plural: "Instagram accounts",
    }),
    getChildSummary({
      label: "Meta Ads",
      emptyLabel: "No ad accounts found",
      count: suiteUiStatus.connected ? suiteStatus.children.meta_ads.assetCount : 0,
      singular: "ad account",
      plural: "ad accounts",
    }),
  ];
  const loading = runtimeState.isActionInFlight || suiteUiStatus.loading;
  const actionLabel = suiteUiStatus.loading
    ? "Checking"
    : suiteUiStatus.actionLabel;
  const handleAction =
    suiteUiStatus.actionLabel === "Disconnect"
      ? handleDisconnect
      : () => handleConnect(suiteUiStatus.actionLabel === "Reconnect");

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

      {suiteMessage ? (
        <section className="mb-5 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 sm:mb-6">
          {suiteMessage}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 sm:h-12 sm:w-12">
              <Image
                src="https://cdn.simpleicons.org/meta"
                alt="Meta logo"
                width={24}
                height={24}
                className="h-5 w-5 sm:h-6 sm:w-6"
                unoptimized
              />
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
                suiteUiStatus.badge
              )}`}
            >
              {suiteUiStatus.badge}
            </span>
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-950 sm:text-lg">
            Meta Business Suite
          </h2>
          <p className="mt-2 text-sm leading-5 text-slate-500 sm:leading-6">
            Connect Facebook Pages, Instagram Business, and Meta Ads through one secure Meta authorization.
          </p>
          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            {childSummaries.map((summary) => (
              <div key={summary.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{summary.label}</span>
                <span className="text-right text-slate-500">{summary.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAction}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border !border-[#081327] !bg-[#081327] px-3 py-2.5 text-sm font-semibold !text-white transition hover:!bg-[#0d1d39] disabled:cursor-not-allowed disabled:!border-slate-200 disabled:!bg-slate-100 disabled:!text-slate-400 sm:w-auto sm:px-4"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              ) : null}
              {actionLabel}
            </button>
          </div>
          {suiteUiStatus.helperText ? (
            <p className="mt-3 text-sm text-slate-500">{suiteUiStatus.helperText}</p>
          ) : null}
          {runtimeState.error ? (
            <p className="mt-3 text-sm text-red-600">{runtimeState.error}</p>
          ) : null}
        </section>
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
