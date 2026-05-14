"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/providers/LanguageProvider";
import {
  connectMetaIntegration,
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
  markMetaRedirectStarted,
  normalizeMetaAuthUrl,
  showMetaOAuthReadyBanner,
  storeMetaOAuthDebugUrl,
} from "@/lib/integrations/meta-oauth";
import {
  isMetaFrontendIntegrationKey,
  type IntegrationCatalogItem,
  type MetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  createEmptySelectedAccountsBySource,
  clearPendingMetaSource,
  clearIntegrationReportContext,
  clearStoredMetaIntegrationState,
  getIntegrationReportContext,
  type SelectedAccountsBySource,
  setPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
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
  if (integrationKey === "instagram_business") {
    const count = counts.instagram_business;
    return ` ${count} authorized account${count === 1 ? "" : "s"} ready to use.`;
  }

  const count = counts.facebook_pages;
  return ` ${count} authorized page${count === 1 ? "" : "s"} ready to use.`;
}

function getBadgeClasses(
  status: IntegrationCatalogItem["status"]
) {
  switch (status) {
    case "Connected":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "Available":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "Coming soon":
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
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
    integration: selectedSources.length > 0 ? "meta" : "",
    workspaceId: workspaceId || currentContext?.workspaceId || "",
    integrationId:
      firstSourceAccount?.integrationId ||
      integrationId ||
      currentContext?.integrationId,
    pageId: firstSourceAccount?.accountId || undefined,
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
  const [connectError, setConnectError] = useState("");
  const [metaFlowState, setMetaFlowState] = useState<MetaFlowState>("not_connected");
  const [metaCounts, setMetaCounts] = useState<Record<MetaFrontendIntegrationKey, number>>({
    facebook_pages: 0,
    instagram_business: 0,
  });
  const [currentSelectedSources, setCurrentSelectedSources] = useState<
    MetaFrontendIntegrationKey[]
  >(() => selectedIntegrationKeys.filter(isMetaFrontendIntegrationKey));
  const [metaIntegrationId, setMetaIntegrationId] = useState(
    storedIntegrationContext?.integration === "meta"
      ? storedIntegrationContext.integrationId || ""
      : ""
  );
  const activeWorkspaceId = workspace?.id || null;
  const connectInFlightRef = useRef(false);
  const maxSources = 2;
  const isReportFlowMode = mode === "report-flow";

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

      if (!metaIntegrationId) {
        if (active) {
          setMetaCounts({
            facebook_pages: 0,
            instagram_business: 0,
          });
          setMetaFlowState("not_connected");
        }
        return;
      }

      try {
        setMetaFlowState("checking");
        const [pages, instagramAccounts] = await Promise.all([
          fetchMetaPages(metaIntegrationId, activeWorkspaceId),
          fetchMetaInstagramAccounts(metaIntegrationId, activeWorkspaceId),
        ]);

        if (!active) {
          return;
        }

        setMetaCounts({
          facebook_pages: pages.length,
          instagram_business: instagramAccounts.length,
        });
        setMetaFlowState("connected");
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("meta flow status load error:", error);
        setMetaCounts({
          facebook_pages: 0,
          instagram_business: 0,
        });
        setMetaFlowState("connected");
      }
    }

    void loadMetaState();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId, embedded, metaIntegrationId]);

  const metaUi = useMemo(() => {
    switch (metaFlowState) {
      case "connected":
        return {
          badge: "Connected" as const,
        };
      case "checking":
        return {
          badge: "Available" as const,
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
        setPendingMetaSource(integration.integrationKey);
        setIntegrationReportContext({
          source: integration.integrationKey,
          integration: "meta",
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

      const response = await connectMetaIntegration({
        workspaceId: contextWorkspaceId,
        source: integration.integrationKey,
      });

      const rawAuthUrl = response.authUrlFromBackend || response.redirectUrl;
      const authUrl = normalizeMetaAuthUrl(rawAuthUrl);
      const validation = validateMetaAuthUrl(authUrl);

      console.info("META_CONNECT_AUTH_URL", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        auth_url: authUrl || null,
        integration_id: response.integrationId || null,
      });

      console.info("META_CONNECT_AUTH_URL_FINAL", {
        workspace_id: contextWorkspaceId,
        source: integration.integrationKey,
        auth_url: authUrl || null,
        starts_with_facebook: validation.startsWithFacebook,
        contains_dialog_oauth: validation.containsDialogOAuth,
      });

      if (!validation.isValid) {
        console.error("META_CONNECT_INVALID_AUTH_URL", {
          workspace_id: contextWorkspaceId,
          source: integration.integrationKey,
          auth_url: authUrl || null,
          starts_with_facebook: validation.startsWithFacebook,
          contains_dialog_oauth: validation.containsDialogOAuth,
        });
        throw new Error(
          "The backend did not return a valid Meta OAuth URL with /dialog/oauth."
        );
      }

      createPendingMetaOAuth({
        authUrl,
        source: integration.integrationKey,
        route: "IntegrationLibrary",
      });
      storeMetaOAuthDebugUrl(authUrl);
      await showMetaOAuthReadyBanner();

      if (typeof window !== "undefined") {
        markMetaRedirectStarted();
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("direct integration connect error:", error);
      setConnectError("We could not start the Facebook Pages connection. Try again.");
    } finally {
      connectInFlightRef.current = false;
      setConnectingIntegrationKey(null);
    }
  }

  function handleMetaSelect(integrationKey: MetaFrontendIntegrationKey) {
    const nextContext = getIntegrationReportContext();
    const existingSelectedSources = currentSelectedSources;
    const alreadySelected = existingSelectedSources.includes(integrationKey);
    const nextSelectedSources = alreadySelected
      ? existingSelectedSources.filter((sourceKey) => sourceKey !== integrationKey)
      : [...existingSelectedSources, integrationKey];

    if (!alreadySelected && nextSelectedSources.length > maxSources) {
      setConnectError(`You can select up to ${maxSources} sources for one report.`);
      return;
    }

    const selectedAccountsBySource = {
      ...(nextContext?.selectedAccountsBySource || createEmptySelectedAccountsBySource()),
    };

    if (!alreadySelected) {
      selectedAccountsBySource[integrationKey] = {
        ...selectedAccountsBySource[integrationKey],
        integrationId: metaIntegrationId || selectedAccountsBySource[integrationKey].integrationId,
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
        integrationId: metaIntegrationId,
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
        integrationId: metaIntegrationId,
        selectedSources: currentSelectedSources,
        selectedAccountsBySource,
      })
    );
    router.push(`/reports/new/flow/sync?integration=${currentSelectedSources[0]}`);
  }

  function renderCardActions(input: {
    integration: IntegrationCatalogItem;
    isMeta: boolean;
    isMetaConnected: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    isSelected: boolean;
    isComingSoon: boolean;
  }) {
    const {
      integration,
      isMeta,
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

      if (isMeta && isMetaConnected) {
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

      if (isMeta) {
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

    if (isMeta && embedded && isMetaConnected) {
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
          >
            {isSelected ? "Selected" : "Select"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              clearPendingMetaSource();
              clearIntegrationReportContext();
              setCurrentSelectedSources([]);
              setMetaIntegrationId("");
              setMetaCounts({
                facebook_pages: 0,
                instagram_business: 0,
              });
              setMetaFlowState("not_connected");
              const nextParams = new URLSearchParams(searchParams.toString());
              nextParams.set("integration", integration.integrationKey);
              router.replace(`/reports/new/flow?${nextParams.toString()}`);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Disconnect
          </button>
        </>
      );
    }

    if (isMeta && embedded && metaFlowState === "checking") {
      return (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
        >
          {messages.integrationsPage.connecting}
        </button>
      );
    }

    if (!isMeta && isConnected && embedded) {
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

    if (embedded && isMeta && metaFlowState === "not_connected") {
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
          const metaConnected = isMeta && metaFlowState === "connected";
          const blockedComingSoon =
            !isMeta && integration.status !== "Connected";
          const isConnecting = connectingIntegrationKey === integration.integrationKey;
          const badgeLabel = isMeta && embedded ? metaUi.badge : integration.status;
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

          return (
            <article
              key={integration.integrationKey}
              onClick={
                isReportFlowMode && isMeta && embedded && metaConnected
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
              } ${isReportFlowMode && isMeta && embedded && metaConnected ? "cursor-pointer" : ""}`}
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
                  isMeta,
                  isMetaConnected: metaConnected,
                  isConnected: connected,
                  isConnecting,
                  isSelected: selected,
                  isComingSoon: blockedComingSoon,
                })}
              </div>

            </article>
          );
        })}
      </div>

            {embedded && metaFlowState === "connected" ? (
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
