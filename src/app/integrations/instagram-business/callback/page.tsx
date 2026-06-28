"use client";

import { Suspense } from "react";

import {
  MetaIntegrationCallbackContent,
} from "@/app/integrations/meta/callback/page";

function CallbackRedirectFallback() {
  return null;
}

export const dynamic = "force-dynamic";

export default function InstagramBusinessCallbackPage() {
  return (
    <Suspense fallback={<CallbackRedirectFallback />}>
      <MetaIntegrationCallbackContent />
    </Suspense>
  );
}
