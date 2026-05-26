import { apiFetch } from "@/lib/api";
import {
  getBillingPlanDefinition,
  normalizeBillingPlanCode,
  type BillingPlanCode,
} from "@/lib/billing/plans";

type BillingPayload = Record<string, unknown> | { data?: Record<string, unknown> };
type BillingSessionPayload = Record<string, unknown> | { data?: Record<string, unknown> };
export type CheckoutSessionMode = "checkout" | "updated" | "already_on_plan";
export type CheckoutSessionResult = {
  mode: CheckoutSessionMode;
  checkoutUrl: string;
  planCode: BillingPlanCode;
  billingStatus: string;
};

export type BillingSummary = {
  planCode: BillingPlanCode;
  planName: string;
  billingStatus: string;
  reportsUsedThisMonth: number;
  reportsMonthlyLimit: number | null;
  slidesPerReportLimit: number;
  exportOptions: string[];
  brandingEnabled: boolean;
  scheduledReportsLimit: number | null;
  scheduledReportsEnabled: boolean;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
};

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getBoolean(value: unknown) {
  return value === true || value === "true";
}

function getExportOptions(record: Record<string, unknown>, planCode: BillingPlanCode) {
  const rawOptions =
    (Array.isArray(record.export_options) ? record.export_options : null) ||
    (Array.isArray(record.exportOptions) ? record.exportOptions : null);

  if (rawOptions) {
    return rawOptions.map((item) => String(item)).filter(Boolean);
  }

  const plan = getBillingPlanDefinition(planCode);
  return plan.canExportPptx ? ["PDF", "PPTX"] : ["PDF"];
}

function normalizeBillingSummary(input: BillingPayload): BillingSummary {
  const source = ("data" in input && input.data ? input.data : input) as Record<string, unknown>;
  const subscription =
    getRecord(source.subscription) ||
    getRecord(source.billing) ||
    getRecord(source.plan) ||
    {};

  const planCode = normalizeBillingPlanCode(
    getString(source.plan_code) ||
      getString(source.current_plan_code) ||
      getString(subscription.plan_code) ||
      getString(subscription.code) ||
      getString(subscription.planCode)
  );
  const plan = getBillingPlanDefinition(planCode);
  const reportsMonthlyLimit =
    getNumber(source.reports_monthly_limit) ??
    getNumber(source.reports_limit_this_month) ??
    getNumber(source.reportsLimitThisMonth) ??
    getNumber(subscription.reports_monthly_limit) ??
    plan.reportsPerMonth;
  const slidesPerReportLimit =
    getNumber(source.slides_per_report_limit) ??
    getNumber(source.max_slides_per_report) ??
    getNumber(source.maxSlidesPerReport) ??
    getNumber(subscription.slides_per_report_limit) ??
    plan.slidesPerReport;
  const brandingEnabled =
    getBoolean(source.branding_enabled) ||
    getBoolean(source.can_use_custom_branding) ||
    getBoolean(source.canUseCustomBranding) ||
    plan.canUseCustomBranding;
  const scheduledReportsLimit =
    getNumber(source.scheduled_reports_limit) ??
    getNumber(source.automated_reports_limit) ??
    getNumber(source.scheduledReportsLimit) ??
    plan.scheduledReportsLimit;
  const billingStatus =
    getString(source.billing_status) ||
    getString(source.status) ||
    getString(subscription.status) ||
    (planCode === "free" ? "free" : "inactive");

  return {
    planCode,
    planName: plan.name,
    billingStatus,
    reportsUsedThisMonth:
      getNumber(source.reports_used_this_month) ??
      getNumber(source.reports_created_count) ??
      getNumber(source.reportsUsedThisMonth) ??
      0,
    reportsMonthlyLimit,
    slidesPerReportLimit,
    exportOptions: getExportOptions(source, planCode),
    brandingEnabled,
    scheduledReportsLimit,
    scheduledReportsEnabled:
      scheduledReportsLimit === null || (scheduledReportsLimit ?? 0) > 0,
    currentPeriodEnd:
      getString(source.current_period_end) ||
      getString(source.currentPeriodEnd) ||
      getString(subscription.current_period_end) ||
      "",
    cancelAtPeriodEnd:
      getBoolean(source.cancel_at_period_end) ||
      getBoolean(source.cancelAtPeriodEnd) ||
      getBoolean(subscription.cancel_at_period_end),
    isActive:
      billingStatus === "active" ||
      billingStatus === "trialing" ||
      planCode === "free",
  };
}

function getSessionUrl(input: BillingSessionPayload, candidates: string[]) {
  const source = ("data" in input && input.data ? input.data : input) as Record<string, unknown>;

  for (const candidate of candidates) {
    const value = source[candidate];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export async function fetchBillingSummary(options?: { signal?: AbortSignal }) {
  const response = await apiFetch<BillingPayload>("/billing/me", {
    cache: "no-store",
    signal: options?.signal,
  });

  return normalizeBillingSummary(response);
}

export async function createCheckoutSession(planCode: BillingPlanCode) {
  const response = await apiFetch<BillingSessionPayload>("/billing/create-checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
  const source = ("data" in response && response.data ? response.data : response) as Record<string, unknown>;
  const mode = getString(source.mode) as CheckoutSessionMode;

  return {
    mode: mode === "updated" || mode === "already_on_plan" ? mode : "checkout",
    checkoutUrl: getSessionUrl(response, ["checkout_url", "checkoutUrl", "url"]),
    planCode: normalizeBillingPlanCode(getString(source.plan_code) || getString(source.planCode) || planCode),
    billingStatus: getString(source.billing_status) || getString(source.billingStatus) || "",
  } satisfies CheckoutSessionResult;
}

export async function createPortalSession() {
  const response = await apiFetch<BillingSessionPayload>("/billing/create-portal-session", {
    method: "POST",
    body: JSON.stringify({}),
  });

  return getSessionUrl(response, ["portal_url", "portalUrl", "url"]);
}
