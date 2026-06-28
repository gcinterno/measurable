"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  fetchIntegrationsConnectionStatus,
  fetchMetaPages,
  fetchMetaInstagramAccounts,
} from "@/lib/api/integrations";
import {
  META_OAUTH_CONNECT_ERROR,
  META_OAUTH_CONNECT_SUCCESS,
  getMetaOAuthScopesForSource,
  getMissingMetaOAuthScopes,
  postMetaOAuthMessageToOpener,
  type MetaOAuthSource,
} from "@/lib/integrations/meta-oauth";
import {
  clearPendingMetaSource,
  getIntegrationReportContext,
  getPendingMetaSource,
  isPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { clearPendingMetaOAuth } from "@/lib/integrations/meta-oauth";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

export const dynamic = "force-dynamic";

function CallbackRedirectFallback() {
  return null;
}

export function MetaIntegrationCallbackContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const callbackRoute = pathname?.includes("/instagram-business/")
    ? "/integrations/instagram-business/callback"
    : "/integrations/meta/callback";
  const [title, setTitle] = useState("Completing Meta connection...");
  const [description, setDescription] = useState(
    "We’re validating the authorization to complete the connection."
  );
  const [isError, setIsError] = useState(false);
  const [returnHref, setReturnHref] = useState("/integrations");

  useEffect(() => {
    let cancelled = false;

    function updateFallback(input: {
      title: string;
      description: string;
      isError?: boolean;
      returnHref?: string;
    }) {
      if (!cancelled) {
        setTitle(input.title);
        setDescription(input.description);
        setIsError(Boolean(input.isError));
        if (input.returnHref) {
          setReturnHref(input.returnHref);
        }
      }
    }

    function notifyAndClose(input: {
      type: typeof META_OAUTH_CONNECT_SUCCESS | typeof META_OAUTH_CONNECT_ERROR;
      integrationId?: string;
      pagesCount?: number;
      message?: string;
      redirectTo?: string;
    }) {
      const sent = postMetaOAuthMessageToOpener(
        input.type === META_OAUTH_CONNECT_SUCCESS
          ? {
              type: META_OAUTH_CONNECT_SUCCESS,
              provider: "meta",
              integrationId: input.integrationId,
              pagesCount: input.pagesCount,
              redirectTo: input.redirectTo,
            }
          : {
              type: META_OAUTH_CONNECT_ERROR,
              provider: "meta",
              message:
                input.message || "We couldn’t complete the Meta connection.",
            }
      );

      if (!sent) {
        return false;
      }

      window.setTimeout(() => {
        window.close();
      }, 600);
      window.setTimeout(() => {
        updateFallback({
          title:
            input.type === META_OAUTH_CONNECT_SUCCESS
              ? "Integration connected successfully."
              : "We couldn’t complete the Meta connection.",
          description:
            input.type === META_OAUTH_CONNECT_SUCCESS
              ? "You can close this tab."
              : "You can close this tab or return to Measurable to try again.",
          isError: input.type === META_OAUTH_CONNECT_ERROR,
          returnHref: input.redirectTo || "/integrations",
        });
      }, 1000);

      return true;
    }

    async function finishCallback() {
      const storedContext = getIntegrationReportContext();
      const querySource = searchParams.get("source");
      const pendingMetaSource = getPendingMetaSource();
      const routeSource = callbackRoute.includes("/instagram-business/")
        ? "instagram_business"
        : null;
      const resolvedSource =
        routeSource ||
        (isPendingMetaSource(querySource) && querySource) ||
        pendingMetaSource ||
        (isPendingMetaSource(storedContext?.source) ? storedContext.source : null);
      const resolvedMetaSource: MetaOAuthSource =
        resolvedSource === "instagram_business"
          ? "instagram_business"
          : "facebook_pages";
      const status = searchParams.get("status");
      const integrationId = searchParams.get("integration_id");
      const errorParam = searchParams.get("error");
      const message = searchParams.get("message");
      const fallbackReturnHref = storedContext?.postConnectRedirect || "/integrations";
      const callbackErrorMessage =
        message?.trim() ||
        errorParam?.trim() ||
        "We couldn’t complete the Meta connection. Please try again.";

      console.info("META_OAUTH_CALLBACK_RECEIVED", {
        route: callbackRoute,
        integration_type: resolvedMetaSource,
        status,
        integration_id: integrationId || null,
        source: querySource || null,
        pending_source: pendingMetaSource || null,
        error: errorParam || null,
      });

      if (resolvedMetaSource === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_CALLBACK_RECEIVED", {
          route: callbackRoute,
          integration_type: "instagram_business",
          status,
          integration_id: integrationId || null,
          source: querySource || null,
          pending_source: pendingMetaSource || null,
          error: errorParam || null,
        });
      }

      updateFallback({
        title: "Completing Meta connection...",
        description: "We’re validating the authorization to complete the connection.",
        returnHref: fallbackReturnHref,
      });

      console.info("META_CALLBACK_QUERY", {
        status,
        integration_id: integrationId,
        source: querySource,
        pending_source: pendingMetaSource,
        error: errorParam,
        message,
      });

      if (errorParam) {
        clearPendingMetaOAuth();
        clearPendingMetaSource();

        if (resolvedMetaSource === "instagram_business") {
          console.info("INSTAGRAM_BUSINESS_CONNECT_FAILED", {
            route: callbackRoute,
            integration_type: "instagram_business",
            integration_id: integrationId || null,
            reason: callbackErrorMessage,
          });
        }

        if (
          typeof window !== "undefined" &&
          window.opener &&
          notifyAndClose({
            type: META_OAUTH_CONNECT_ERROR,
            message: callbackErrorMessage,
            redirectTo: fallbackReturnHref,
          })
        ) {
          return;
        }

        updateFallback({
          title: "We couldn’t complete the Meta connection.",
          description:
            "You can close this tab or return to Measurable to try again.",
          isError: true,
          returnHref: fallbackReturnHref,
        });

        router.replace(
          `/integrations/meta?meta_error=${encodeURIComponent(
            callbackErrorMessage
          )}`
        );
        return;
      }

      if (status === "connected") {
        const resolvedWorkspaceId =
          storedContext?.workspaceId || getActiveWorkspaceId() || "";
        let refreshedIntegrationId = integrationId || "";
        let metaConnected = false;
        let pagesCount = 0;
        let instagramAccountsCount = 0;
        let tokenScopes: string[] = [];

        try {
          const refreshResult = await fetchIntegrationsConnectionStatus();
          metaConnected = refreshResult.metaConnected;
          refreshedIntegrationId =
            refreshedIntegrationId || refreshResult.integrationId || "";
          tokenScopes = refreshResult.tokenScopes || [];

          console.info("META_OAUTH_TOKEN_SCOPES_RECEIVED", {
            route: callbackRoute,
            integration_type: resolvedMetaSource,
            integration_id: refreshedIntegrationId || null,
            token_scopes: tokenScopes.length > 0 ? tokenScopes : null,
          });

          if (metaConnected && refreshedIntegrationId && resolvedWorkspaceId) {
            if (resolvedMetaSource === "instagram_business") {
              const authorizedInstagramAccounts = await fetchMetaInstagramAccounts(
                refreshedIntegrationId,
                resolvedWorkspaceId
              );
              instagramAccountsCount = authorizedInstagramAccounts.length;
            } else {
              const authorizedPages = await fetchMetaPages(
                refreshedIntegrationId,
                resolvedWorkspaceId
              );
              pagesCount = authorizedPages.length;
            }
          }

          console.info("META_CALLBACK_REFRESH_RESULT", {
            meta_connected: metaConnected,
            integration_id: refreshedIntegrationId || null,
            workspace_id: resolvedWorkspaceId || null,
            pages_count: pagesCount,
            instagram_accounts_count: instagramAccountsCount,
          });
          console.info("META_CONNECTED_ASSETS_DISCOVERED", {
            route: callbackRoute,
            integration_type: resolvedMetaSource,
            integration_id: refreshedIntegrationId || null,
            workspace_id: resolvedWorkspaceId || null,
            page_name: storedContext?.pageName || null,
            page_count: pagesCount,
            instagram_accounts_count: instagramAccountsCount,
            asset_connected: pagesCount > 0 || instagramAccountsCount > 0,
          });

          const missingScopes = getMissingMetaOAuthScopes(
            tokenScopes,
            resolvedMetaSource
          );
          const expectedScopes = getMetaOAuthScopesForSource(resolvedMetaSource);

          if (missingScopes.length > 0) {
            console.info("META_PERMISSION_MISSING", {
              route: callbackRoute,
              integration_type: resolvedMetaSource,
              integration_id: refreshedIntegrationId || null,
              missing_scopes: missingScopes,
              expected_scopes: expectedScopes,
            });
          }
        } catch (error) {
          console.error("meta callback refresh error:", error);
          console.info("META_CALLBACK_REFRESH_RESULT", {
            meta_connected: false,
            integration_id: refreshedIntegrationId || null,
            workspace_id: resolvedWorkspaceId || null,
            pages_count: 0,
            error: error instanceof Error ? error.message : "unknown_error",
          });
          if (resolvedMetaSource === "instagram_business") {
            console.info("INSTAGRAM_BUSINESS_CONNECT_FAILED", {
              route: callbackRoute,
              integration_type: "instagram_business",
              integration_id: integrationId || null,
              reason: error instanceof Error ? error.message : "unknown_error",
            });
          }
          clearPendingMetaOAuth();
          clearPendingMetaSource();

          if (
            typeof window !== "undefined" &&
            window.opener &&
            notifyAndClose({
              type: META_OAUTH_CONNECT_ERROR,
              message:
                "We could not verify the Meta connection after the callback. Try reconnecting.",
              redirectTo: fallbackReturnHref,
            })
          ) {
            return;
          }

          updateFallback({
            title: "We couldn’t complete the Meta connection.",
            description:
              "We couldn’t verify the connection after the callback. You can close this tab or return to Measurable.",
            isError: true,
            returnHref: fallbackReturnHref,
          });

          router.replace(
            `/integrations/meta?meta_error=${encodeURIComponent(
              "We could not verify the Meta connection after the callback. Try reconnecting."
            )}`
          );
          return;
        }

        const hasAuthorizedPages = pagesCount > 0;
        const hasAuthorizedInstagramAccounts = instagramAccountsCount > 0;
        const hasAuthorizedAssets = hasAuthorizedPages || hasAuthorizedInstagramAccounts;

        if (!metaConnected || !refreshedIntegrationId || !hasAuthorizedAssets) {
          clearPendingMetaOAuth();
          clearPendingMetaSource();

          if (
            typeof window !== "undefined" &&
            window.opener &&
            notifyAndClose({
              type: META_OAUTH_CONNECT_ERROR,
              message:
                "Meta returned from OAuth, but the integration was not confirmed by the backend.",
              redirectTo: fallbackReturnHref,
            })
          ) {
            return;
          }

          updateFallback({
            title: "We couldn’t complete the Meta connection.",
            description:
              hasAuthorizedAssets
                ? "Meta returned from OAuth, but the connection was not confirmed. You can close this tab or return to Measurable."
                : "Meta returned from OAuth, but no authorized assets were returned. Reconnect and approve at least one page or account.",
            isError: true,
            returnHref: fallbackReturnHref,
          });

          router.replace(
            `/integrations/meta?meta_error=${encodeURIComponent(
              hasAuthorizedAssets
                ? "Meta returned from OAuth, but the integration was not confirmed by the backend."
                : "Meta returned from OAuth, but no authorized assets were returned."
            )}`
          );
          return;
        }

        setIntegrationReportContext({
          source: resolvedSource || storedContext?.source || "",
          integration: "meta",
          workspaceId: resolvedWorkspaceId,
          integrationId: refreshedIntegrationId,
          pageId: undefined,
          pageName: undefined,
          datasetId: undefined,
          synced: false,
          requestedSlides: storedContext?.requestedSlides,
          aiMode: storedContext?.aiMode,
        });
        clearPendingMetaOAuth();
        clearPendingMetaSource();

        const discoveredAssetsCount = hasAuthorizedPages
          ? pagesCount
          : instagramAccountsCount;

        if (resolvedMetaSource === "instagram_business") {
          console.info("INSTAGRAM_BUSINESS_CONNECT_SUCCESS", {
            route: callbackRoute,
            integration_type: "instagram_business",
            integration_id: refreshedIntegrationId || null,
            account_count: discoveredAssetsCount,
          });
        }

        if (
          typeof window !== "undefined" &&
          window.opener &&
          notifyAndClose({
            type: META_OAUTH_CONNECT_SUCCESS,
            integrationId: refreshedIntegrationId,
            pagesCount: discoveredAssetsCount,
            redirectTo: fallbackReturnHref,
          })
        ) {
          return;
        }

        updateFallback({
          title: "Integracion conectada correctamente.",
          description: "You can close this tab and return to Measurable.",
          returnHref: fallbackReturnHref,
        });

        router.replace(
          fallbackReturnHref
        );
        return;
      }

      if (resolvedMetaSource === "instagram_business") {
        console.info("INSTAGRAM_BUSINESS_CONNECT_FAILED", {
          route: callbackRoute,
          integration_type: "instagram_business",
          integration_id: integrationId || null,
          source: querySource || null,
          pending_source: pendingMetaSource || null,
        });
      }

      clearPendingMetaSource();
      clearPendingMetaOAuth();
      router.replace(storedContext?.postConnectRedirect || "/integrations");
    }

    void finishCallback();
    return () => {
      cancelled = true;
    };
  }, [callbackRoute, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_45%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Image
            src="/brand/measurable-logo.svg"
            alt="Measurable"
            width={34}
            height={34}
            className="h-8 w-8 object-contain"
            unoptimized
          />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Measurable
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {description}
        </p>
        {isError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            We couldn’t complete the Meta connection.
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Cerrar pestana
          </button>
          <Link
            href={returnHref}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver a Measurable
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MetaIntegrationCallbackPage() {
  return (
    <Suspense fallback={<CallbackRedirectFallback />}>
      <MetaIntegrationCallbackContent />
    </Suspense>
  );
}
