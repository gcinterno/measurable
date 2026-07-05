"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  INTEGRATION_OAUTH_COMPLETE_MESSAGE_TYPE,
  postIntegrationOAuthCompleteToOpener,
} from "@/lib/integrations/meta-oauth";

export const dynamic = "force-dynamic";

function MetaAdsCallbackContent() {
  const searchParams = useSearchParams();
  const [closeBlocked, setCloseBlocked] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "meta_ads";
    const integrationId = searchParams.get("integration_id") || "";
    const workspaceId = searchParams.get("workspace_id") || "";
    const message = searchParams.get("message") || "";
    const error = searchParams.get("error") || "";

    postIntegrationOAuthCompleteToOpener({
      type: INTEGRATION_OAUTH_COMPLETE_MESSAGE_TYPE,
      provider: source === "instagram_business" ? "instagram_business" : "meta_ads",
      status,
      integrationId: integrationId || undefined,
      workspaceId: workspaceId || undefined,
      message: message || undefined,
      error: error || undefined,
    });

    const closeTimer = window.setTimeout(() => {
      window.close();
    }, 500);
    const fallbackTimer = window.setTimeout(() => {
      if (!window.closed) {
        setCloseBlocked(true);
      }
    }, 1000);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [searchParams]);

  if (closeBlocked) {
    return (
      <div className="p-6 text-sm text-slate-600">
        Connection completed. You can close this window.
      </div>
    );
  }

  return <div className="p-6 text-sm text-slate-600">Completing connection...</div>;
}

export default function MetaAdsCallbackPage() {
  return (
    <Suspense>
      <MetaAdsCallbackContent />
    </Suspense>
  );
}
