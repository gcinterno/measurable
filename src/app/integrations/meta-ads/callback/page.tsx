"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  fetchMetaAdsAccounts,
  fetchMetaAdsStatus,
} from "@/lib/api/integrations";
import {
  META_OAUTH_CONNECT_ERROR,
  META_OAUTH_CONNECT_SUCCESS,
  getMetaOAuthScopesForSource,
  getMissingMetaOAuthScopes,
  getMetaAdsStatusMessage,
  postMetaOAuthMessageToOpener,
} from "@/lib/integrations/meta-oauth";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

function getCallbackMissingScopes(searchParams: URLSearchParams) {
  const combined = [
    searchParams.get("missing_scopes"),
    searchParams.get("missingScopes"),
  ]
    .filter(Boolean)
    .join(",");

  return combined
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function MetaAdsCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finishCallback() {
      const status = (searchParams.get("status") || "").toLowerCase();
      const integrationId = searchParams.get("integration_id") || "";
      const error = searchParams.get("error") || searchParams.get("message") || "";
      const missingScopes = getCallbackMissingScopes(searchParams);
      const workspaceId = getActiveWorkspaceId();
      const hasPopupOpener = typeof window !== "undefined" && Boolean(window.opener);

      console.info("META_OAUTH_CALLBACK_RECEIVED", {
        route: "/integrations/meta-ads/callback",
        integration_type: "meta_ads",
        status,
        integration_id: integrationId || null,
        error: error || null,
      });

      const backendMessage = getMetaAdsStatusMessage({
        status,
        message: error,
        missingScopes,
      });

      if (status === "config_missing") {
        if (hasPopupOpener) {
          postMetaOAuthMessageToOpener({
            type: META_OAUTH_CONNECT_ERROR,
            provider: "meta_ads",
            message: backendMessage || "Meta Ads OAuth is not fully configured.",
            status,
            missingScopes,
          });
          window.setTimeout(() => {
            window.close();
          }, 600);
          return;
        }

        router.replace("/integrations");
        return;
      }

      if (status === "needs_permission" || status === "connected_no_assets" || status === "no_authorized_assets" || status === "no_token" || status === "disconnected" || status === "error") {
        if (hasPopupOpener) {
          postMetaOAuthMessageToOpener({
            type: META_OAUTH_CONNECT_ERROR,
            provider: "meta_ads",
            message:
              backendMessage ||
              error ||
              "We couldn’t complete the Meta Ads connection.",
            status,
            missingScopes,
          });
          window.setTimeout(() => {
            window.close();
          }, 600);
          return;
        }

        router.replace("/integrations");
        return;
      }

      if (status !== "connected") {
        if (hasPopupOpener) {
          postMetaOAuthMessageToOpener({
            type: META_OAUTH_CONNECT_ERROR,
            provider: "meta_ads",
            message:
              backendMessage ||
              error ||
              "We couldn’t complete the Meta Ads connection.",
            status: status || undefined,
            missingScopes,
          });
          window.setTimeout(() => {
            window.close();
          }, 600);
          return;
        }

        router.replace("/integrations");
        return;
      }

      try {
        const statusResult = await fetchMetaAdsStatus(workspaceId || undefined);
        const resolvedIntegrationId = integrationId || statusResult.integrationId || "";
        const tokenScopes = statusResult.tokenScopes || [];
        const resolvedStatus = (statusResult.status || status || "connected").toLowerCase();
        const resolvedMissingScopes =
          statusResult.missingScopes && statusResult.missingScopes.length > 0
            ? statusResult.missingScopes
            : missingScopes;

        if (cancelled) {
          return;
        }

        console.info("META_OAUTH_TOKEN_SCOPES_RECEIVED", {
          route: "/integrations/meta-ads/callback",
          integration_type: "meta_ads",
          integration_id: resolvedIntegrationId || null,
          token_scopes: tokenScopes.length > 0 ? tokenScopes : null,
        });

        const accounts = resolvedIntegrationId
          ? await fetchMetaAdsAccounts({
              integrationId: resolvedIntegrationId,
              workspaceId: workspaceId || undefined,
            })
          : [];

        if (cancelled) {
          return;
        }

        console.info("META_CONNECTED_ASSETS_DISCOVERED", {
          route: "/integrations/meta-ads/callback",
          integration_type: "meta_ads",
          integration_id: resolvedIntegrationId || null,
          workspace_id: workspaceId || null,
          ad_accounts_count: accounts.length,
          asset_connected: accounts.length > 0,
        });

        const computedMissingScopes = getMissingMetaOAuthScopes(tokenScopes, "meta_ads");

        if (computedMissingScopes.length > 0) {
          console.info("META_PERMISSION_MISSING", {
            route: "/integrations/meta-ads/callback",
            integration_type: "meta_ads",
            integration_id: resolvedIntegrationId || null,
            missing_scopes: computedMissingScopes,
            expected_scopes: getMetaOAuthScopesForSource("meta_ads"),
          });
        }

        const finalStatus = resolvedStatus || (statusResult.connected ? "connected" : "error");
        const hasAccounts = accounts.length > 0;
        const normalizedFinalStatus =
          finalStatus === "connected" && !hasAccounts
            ? "connected_no_assets"
            : finalStatus;
        const success =
          normalizedFinalStatus === "connected" &&
          Boolean(statusResult.connected && resolvedIntegrationId && hasAccounts);
        const statusMessage = getMetaAdsStatusMessage({
          status: normalizedFinalStatus,
          message: error || statusResult.message || "",
          missingScopes: resolvedMissingScopes,
        });

        if (!success) {
          if (hasPopupOpener) {
            postMetaOAuthMessageToOpener({
              type: META_OAUTH_CONNECT_ERROR,
              provider: "meta_ads",
              message:
                statusMessage ||
                "Meta Ads returned from OAuth, but no authorized ad accounts were found.",
              status: normalizedFinalStatus,
              missingScopes: resolvedMissingScopes,
            });
            window.setTimeout(() => {
              window.close();
            }, 600);
            return;
          }

          router.replace("/integrations");
          return;
        }

        if (hasPopupOpener) {
          postMetaOAuthMessageToOpener({
            type: META_OAUTH_CONNECT_SUCCESS,
            provider: "meta_ads",
            integrationId: resolvedIntegrationId,
            redirectTo: "/integrations",
            status: "connected",
          });

          window.setTimeout(() => {
            window.close();
          }, 500);
          return;
        }

        router.replace("/integrations?meta_ads=connected");
      } catch (callbackError) {
        console.error("meta ads callback validation error:", callbackError);

        if (hasPopupOpener) {
          postMetaOAuthMessageToOpener({
            type: META_OAUTH_CONNECT_ERROR,
            provider: "meta_ads",
            message:
              "We could not verify the Meta Ads connection after the callback. Try reconnecting.",
          });
          window.setTimeout(() => {
            window.close();
          }, 600);
          return;
        }

        router.replace("/integrations");
      }
    }

    void finishCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-slate-600">Completing Meta Ads connection...</div>;
}

export default function MetaAdsCallbackPage() {
  return (
    <Suspense>
      <MetaAdsCallbackContent />
    </Suspense>
  );
}
