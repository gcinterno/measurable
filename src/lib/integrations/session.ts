"use client";

import type { MetaTimeframeSelection } from "@/lib/integrations/timeframes";

const INTEGRATION_REPORT_CONTEXT_KEY = "integrationReportContext";
const PENDING_META_SOURCE_KEY = "pendingMetaSource";

export type PendingMetaSource = "facebook_pages" | "instagram_business";

export type IntegrationReportContext = {
  source: string;
  integration: string;
  workspaceId: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  timeframeSelection?: MetaTimeframeSelection;
  integrationId?: string;
  datasetId?: string;
  businessId?: string;
  adAccountId?: string;
  pageId?: string;
  pageName?: string;
  synced?: boolean;
  requestedSlides?: number;
  aiMode?: "standard" | "agents";
  postConnectRedirect?: string;
};

export function isPendingMetaSource(
  value: string | null | undefined
): value is PendingMetaSource {
  return value === "facebook_pages" || value === "instagram_business";
}

export function getIntegrationReportContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(INTEGRATION_REPORT_CONTEXT_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as IntegrationReportContext;
  } catch {
    return null;
  }
}

export function setIntegrationReportContext(
  context: IntegrationReportContext
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    INTEGRATION_REPORT_CONTEXT_KEY,
    JSON.stringify(context)
  );
}

export function clearIntegrationReportContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(INTEGRATION_REPORT_CONTEXT_KEY);
}

export function getPendingMetaSource() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(PENDING_META_SOURCE_KEY);
  return isPendingMetaSource(rawValue) ? rawValue : null;
}

export function setPendingMetaSource(source: PendingMetaSource) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PENDING_META_SOURCE_KEY, source);
}

export function clearPendingMetaSource() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PENDING_META_SOURCE_KEY);
}
