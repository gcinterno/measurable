import { apiFetch } from "@/lib/api";

type AccountSummaryPayload = {
  reports_used?: number | string | null;
  reports_limit?: number | string | null;
  reports_remaining?: number | string | null;
  limit_reached?: boolean | null;
  period_start?: string | null;
  period_end?: string | null;
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

  const reportsUsed =
    parseOptionalNumber(payload.reports_used) ??
    (() => {
      const limit = parseOptionalNumber(payload.reports_limit_this_month);
      const remaining = parseOptionalNumber(payload.reports_remaining_this_month);

      if (
        typeof limit === "number" &&
        Number.isFinite(limit) &&
        typeof remaining === "number" &&
        Number.isFinite(remaining)
      ) {
        return Math.max(limit - remaining, 0);
      }

      return parseOptionalNumber(payload.reports_created_count);
    })();
  const reportsLimit =
    parseOptionalNumber(payload.reports_limit) ??
    parseOptionalNumber(payload.reports_limit_this_month);
  const reportsRemaining =
    parseOptionalNumber(payload.reports_remaining) ??
    parseOptionalNumber(payload.reports_remaining_this_month) ??
    parseOptionalNumber(payload.reports_available_count);
  const limitReached =
    typeof payload.limit_reached === "boolean"
      ? payload.limit_reached
      : typeof reportsLimit === "number" &&
          Number.isFinite(reportsLimit) &&
          typeof reportsUsed === "number" &&
          Number.isFinite(reportsUsed)
        ? reportsUsed >= reportsLimit
        : false;

  return {
    reportsUsed,
    reportsLimit,
    reportsRemaining,
    limitReached,
    periodStart: payload.period_start?.trim() || null,
    periodEnd: payload.period_end?.trim() || null,
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

type AccountSummaryListener = (summary: AccountSummary) => void;

const accountSummaryListeners = new Set<AccountSummaryListener>();
let lastAccountSummary: AccountSummary | null = null;

function publishAccountSummary(summary: AccountSummary) {
  lastAccountSummary = summary;
  accountSummaryListeners.forEach((listener) => listener(summary));
}

export async function fetchAccountSummary(options?: { signal?: AbortSignal }) {
  const response = await apiFetch<AccountSummaryResponse>("/account/summary", {
    cache: "no-store",
    signal: options?.signal,
  });

  const summary = normalizeSummary(response);
  publishAccountSummary(summary);
  return summary;
}

export function getLastAccountSummary() {
  return lastAccountSummary;
}

export function subscribeAccountSummary(listener: AccountSummaryListener) {
  accountSummaryListeners.add(listener);

  return () => {
    accountSummaryListeners.delete(listener);
  };
}

export async function refreshAccountSummary(options?: { signal?: AbortSignal }) {
  return fetchAccountSummary(options);
}

export function applyAccountSummaryQuota(input: {
  reportsUsed?: number | null;
  reportsLimit?: number | null;
  reportsRemaining?: number | null;
  limitReached?: boolean | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}) {
  const base =
    lastAccountSummary ||
    normalizeSummary({});
  const nextSummary: AccountSummary = {
    ...base,
    reportsUsed:
      typeof input.reportsUsed === "number" && Number.isFinite(input.reportsUsed)
        ? input.reportsUsed
        : base.reportsUsed,
    reportsLimit:
      typeof input.reportsLimit === "number" && Number.isFinite(input.reportsLimit)
        ? input.reportsLimit
        : base.reportsLimit,
    reportsRemaining:
      typeof input.reportsRemaining === "number" && Number.isFinite(input.reportsRemaining)
        ? input.reportsRemaining
        : base.reportsRemaining,
    limitReached:
      typeof input.limitReached === "boolean" ? input.limitReached : base.limitReached,
    periodStart: input.periodStart?.trim() || base.periodStart,
    periodEnd: input.periodEnd?.trim() || base.periodEnd,
  };

  publishAccountSummary(nextSummary);
  return nextSummary;
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
