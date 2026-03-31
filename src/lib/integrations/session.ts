"use client";

const INTEGRATION_REPORT_CONTEXT_KEY = "integrationReportContext";

export type IntegrationReportContext = {
  source: string;
  integration: string;
  workspaceId: string;
  integrationId?: string;
  datasetId?: string;
  businessId?: string;
  adAccountId?: string;
  pageId?: string;
  synced?: boolean;
};

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
