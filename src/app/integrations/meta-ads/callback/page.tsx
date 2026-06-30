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
  postMetaOAuthMessageToOpener,
} from "@/lib/integrations/meta-oauth";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

function MetaAdsCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finishCallback() {
      const status = searchParams.get("status");
      const integrationId = searchParams.get("integration_id") || "";
      const error = searchParams.get("error") || searchParams.get("message") || "";
      const workspaceId = getActiveWorkspaceId();
      const hasPopupOpener = typeof window !== "undefined" && Boolean(window.opener);

      console.info("META_OAUTH_CALLBACK_RECEIVED", {
        route: "/integrations/meta-ads/callback",
        integration_type: "meta_ads",
        status,
        integration_id: integrationId || null,
        error: error || null,
      });

      if (error || status !== "connected") {
        if (hasPopupOpener) {
          postMetaOAuthMessageToOpener({
            type: META_OAUTH_CONNECT_ERROR,
            provider: "meta_ads",
            message: error || "We couldn’t complete the Meta Ads connection.",
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

        const missingScopes = getMissingMetaOAuthScopes(tokenScopes, "meta_ads");

        if (missingScopes.length > 0) {
          console.info("META_PERMISSION_MISSING", {
            route: "/integrations/meta-ads/callback",
            integration_type: "meta_ads",
            integration_id: resolvedIntegrationId || null,
            missing_scopes: missingScopes,
            expected_scopes: getMetaOAuthScopesForSource("meta_ads"),
          });
        }

        const connected = Boolean(statusResult.connected && resolvedIntegrationId && accounts.length > 0);

        if (!connected) {
          const message =
            "Meta Ads returned from OAuth, but no authorized ad accounts were found.";

          if (hasPopupOpener) {
            postMetaOAuthMessageToOpener({
              type: META_OAUTH_CONNECT_ERROR,
              provider: "meta_ads",
              message,
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
