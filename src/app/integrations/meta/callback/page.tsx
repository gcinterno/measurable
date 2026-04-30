"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  clearPendingMetaSource,
  getIntegrationReportContext,
  getPendingMetaSource,
  isPendingMetaSource,
  setIntegrationReportContext,
} from "@/lib/integrations/session";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

export const dynamic = "force-dynamic";

function CallbackRedirectFallback() {
  return null;
}

function MetaIntegrationCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    async function finishCallback() {
      const storedContext = getIntegrationReportContext();
      const querySource = searchParams.get("source");
      const pendingMetaSource = getPendingMetaSource();
      const resolvedSource =
        (isPendingMetaSource(querySource) && querySource) ||
        pendingMetaSource ||
        (isPendingMetaSource(storedContext?.source) ? storedContext.source : null);
      const status = searchParams.get("status");
      const integrationId = searchParams.get("integration_id");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        clearPendingMetaSource();
        router.replace(storedContext?.postConnectRedirect || "/integrations");
        return;
      }

      if (status === "connected" && integrationId) {
        setIntegrationReportContext({
          source: resolvedSource || storedContext?.source || "",
          integration: "meta",
          workspaceId:
            storedContext?.workspaceId || getActiveWorkspaceId() || "1",
          integrationId,
          pageId: storedContext?.pageId,
          pageName: storedContext?.pageName,
          datasetId: undefined,
          synced: false,
          requestedSlides: storedContext?.requestedSlides,
          aiMode: storedContext?.aiMode,
        });
        clearPendingMetaSource();
        router.replace(
          resolvedSource
            ? `/reports/new/flow/sync?integration=${resolvedSource}`
            : "/integrations"
        );
        return;
      }

      clearPendingMetaSource();
      router.replace(storedContext?.postConnectRedirect || "/integrations");
    }

    void finishCallback();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return null;
}

export default function MetaIntegrationCallbackPage() {
  return (
    <Suspense fallback={<CallbackRedirectFallback />}>
      <MetaIntegrationCallbackContent />
    </Suspense>
  );
}
