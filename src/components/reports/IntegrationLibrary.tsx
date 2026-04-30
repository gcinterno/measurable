"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useI18n } from "@/components/providers/LanguageProvider";
import {
  connectMetaIntegration,
  fetchMetaInstagramAccounts,
  fetchMetaPages,
} from "@/lib/api/integrations";
import {
  isMetaFrontendIntegrationKey,
  type IntegrationCatalogItem,
  type MetaFrontendIntegrationKey,
} from "@/lib/integrations/catalog";
import {
  clearPendingMetaSource,
  clearIntegrationReportContext,
  getIntegrationReportContext,
  setPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";

type IntegrationLibraryProps = {
  integrations: readonly IntegrationCatalogItem[];
  selectedIntegrationKey?: string;
  embedded?: boolean;
  connectedIntegrationKey?: string;
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

export function IntegrationLibrary({
  integrations,
  selectedIntegrationKey,
  embedded = false,
  connectedIntegrationKey,
}: IntegrationLibraryProps) {
  const { messages } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedIntegrationContext = getIntegrationReportContext();
  const [connectingIntegrationKey, setConnectingIntegrationKey] = useState<string | null>(null);
  const [metaFlowState, setMetaFlowState] = useState<MetaFlowState>("not_connected");
  const [metaCounts, setMetaCounts] = useState<Record<MetaFrontendIntegrationKey, number>>({
    facebook_pages: 0,
    instagram_business: 0,
  });
  const [metaIntegrationId, setMetaIntegrationId] = useState(
    storedIntegrationContext?.integration === "meta"
      ? storedIntegrationContext.integrationId || ""
      : ""
  );

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
          fetchMetaPages(metaIntegrationId),
          fetchMetaInstagramAccounts(metaIntegrationId),
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
  }, [embedded, metaIntegrationId]);

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

    try {
      setConnectingIntegrationKey(integration.integrationKey);
      const currentContext = getIntegrationReportContext();

      if (embedded) {
        setPendingMetaSource(integration.integrationKey);
        setIntegrationReportContext({
          source: integration.integrationKey,
          integration: "meta",
          workspaceId: currentContext?.workspaceId || "1",
          integrationId:
            currentContext?.integration === "meta"
              ? currentContext.integrationId
              : undefined,
          pageId: undefined,
          pageName: undefined,
          datasetId: undefined,
          synced: false,
          requestedSlides: currentContext?.requestedSlides,
          aiMode: currentContext?.aiMode,
          postConnectRedirect: `/reports/new/flow/sync?integration=${integration.integrationKey}`,
        });
      }

      const response = await connectMetaIntegration();

      if (response.redirectUrl) {
        console.info("[MetaOAuth][redirect]", {
          auth_url_from_backend: response.authUrlFromBackend || response.redirectUrl,
          final_auth_url_used: response.finalAuthUrlUsed || response.redirectUrl,
        });
        window.location.href = response.redirectUrl;
      }
    } catch (error) {
      console.error("direct integration connect error:", error);
    } finally {
      setConnectingIntegrationKey(null);
    }
  }

  function handleMetaSelect(integrationKey: MetaFrontendIntegrationKey) {
    const nextContext = getIntegrationReportContext();

    setIntegrationReportContext({
      source: integrationKey,
      integration: "meta",
      workspaceId: nextContext?.workspaceId || "1",
      integrationId: metaIntegrationId,
      pageId: undefined,
      pageName: undefined,
      datasetId: undefined,
      synced: false,
      requestedSlides: nextContext?.requestedSlides,
      aiMode: nextContext?.aiMode,
    });

    router.push(`/reports/new/flow/sync?integration=${integrationKey}`);
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

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const selected = integration.integrationKey === selectedIntegrationKey;
          const connected = integration.integrationKey === connectedIntegrationKey;
          const isMeta = isMetaFrontendIntegrationKey(integration.integrationKey);
          const metaConnected = isMeta && metaFlowState === "connected";
          const canDirectConnect =
            embedded &&
            isMeta &&
            metaFlowState === "not_connected";
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
              ? getMetaDescriptionSuffix(integration.integrationKey, metaCounts)
              : "";

          return (
            <article
              key={integration.integrationKey}
              className={`rounded-[24px] border p-4 transition ${
                selected
                  ? "border-sky-300 bg-sky-50/60 shadow-[0_0_0_1px_rgba(125,211,252,0.45)]"
                  : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
              }`}
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
                {isMeta && embedded && metaConnected ? (
                  <button
                    type="button"
                    onClick={() => handleMetaSelect(integration.integrationKey)}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
                  >
                    Select
                  </button>
                ) : null}
                {isMeta && embedded && metaConnected ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearPendingMetaSource();
                      clearIntegrationReportContext();
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
                ) : isMeta && embedded && metaFlowState === "checking" ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400"
                  >
                    {messages.integrationsPage.connecting}
                  </button>
                ) : !isMeta && connected && embedded ? (
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
                ) : canDirectConnect ? (
                  <button
                    type="button"
                    onClick={() => void handleDirectConnect(integration)}
                    disabled={isConnecting || metaFlowState === "checking"}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isConnecting || metaFlowState === "checking"
                      ? messages.integrationsPage.connecting
                      : messages.common.connect}
                  </button>
                ) : (
                  blockedComingSoon ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 opacity-70 blur-[0.2px]"
                    >
                      {messages.common.comingSoon}
                    </button>
                  ) : (
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
                  )
                )}
              </div>

            </article>
          );
        })}
      </div>
    </section>
  );
}
