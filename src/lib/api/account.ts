import { apiFetch } from "@/lib/api";

type AccountSummaryPayload = {
  reports_created_count?: number | string | null;
  reports_available_count?: number | string | null;
  reports_remaining_this_month?: number | string | null;
  reports_limit_this_month?: number | string | null;
  integrations_connected_count?: number | string | null;
  integrations_total_available?: number | string | null;
  current_plan_name?: string | null;
  current_plan_code?: string | null;
  is_free_plan?: boolean | null;
  can_use_custom_branding?: boolean | null;
  report_branding_mode?: string | null;
  account_display_name?: string | null;
  account_display_name_effective?: string | null;
};

type AccountSummaryResponse = AccountSummaryPayload | { data?: AccountSummaryPayload };

function parseOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function normalizeSummary(
  response: AccountSummaryResponse
) {
  const payload =
    ("data" in response && response.data ? response.data : response) as AccountSummaryPayload;

  return {
    reportsCreatedCount: parseOptionalNumber(payload.reports_created_count) ?? 0,
    reportsAvailableCount: parseOptionalNumber(payload.reports_available_count),
    reportsRemainingThisMonth:
      parseOptionalNumber(payload.reports_remaining_this_month) ?? 0,
    reportsLimitThisMonth: parseOptionalNumber(payload.reports_limit_this_month),
    integrationsConnectedCount:
      parseOptionalNumber(payload.integrations_connected_count) ?? 0,
    integrationsTotalAvailable:
      parseOptionalNumber(payload.integrations_total_available) ?? 0,
    currentPlanName: payload.current_plan_name?.trim() || "Free",
    currentPlanCode: payload.current_plan_code?.trim() || "free",
    isFreePlan: Boolean(payload.is_free_plan),
    canUseCustomBranding: Boolean(payload.can_use_custom_branding),
    reportBrandingMode: payload.report_branding_mode?.trim() || "",
    accountDisplayName: payload.account_display_name?.trim() || "",
    accountDisplayNameEffective:
      payload.account_display_name_effective?.trim() ||
      payload.account_display_name?.trim() ||
      "Measurable",
  };
}

export type AccountSummary = ReturnType<typeof normalizeSummary>;

export async function fetchAccountSummary(options?: { signal?: AbortSignal }) {
  const response = await apiFetch<AccountSummaryResponse>("/account/summary", {
    cache: "no-store",
    signal: options?.signal,
  });

  return normalizeSummary(response);
}

export async function updateAccountDisplayName(
  accountDisplayName: string,
  options?: { signal?: AbortSignal }
) {
  const payload = {
    account_display_name: accountDisplayName,
  };
  const endpoints = ["/me/workspace", "/workspace"];
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      await apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
        signal: options?.signal,
      });
      return;
    } catch (error) {
      lastError = error;
      console.error("account display name update error:", {
        endpoint,
        payload,
        error,
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Account name update failed");
}
