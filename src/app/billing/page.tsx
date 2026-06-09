"use client";

import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { UpgradeCTA } from "@/components/billing/UpgradeCTA";
import { trackEvent } from "@/lib/analytics";
import { useAccountSummary } from "@/lib/account/useAccountSummary";
import { useBilling } from "@/lib/billing/useBilling";

function formatPeriodEnd(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatStatus(value: string) {
  if (!value) {
    return "Active";
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPlanDescription({
  currentPeriodEnd,
  isFreePlan,
  isActive,
  cancelAtPeriodEnd,
}: {
  currentPeriodEnd: string;
  isFreePlan: boolean;
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
}) {
  if (isFreePlan) {
    return "Upgrade to unlock more reports.";
  }

  const formattedDate = formatPeriodEnd(currentPeriodEnd);

  if (cancelAtPeriodEnd && formattedDate) {
    return `Your plan will end on ${formattedDate}.`;
  }

  if (formattedDate) {
    return `Your plan renews on ${formattedDate}.`;
  }

  return isActive ? "Your plan is active." : "We are confirming your billing status.";
}

function BillingSkeleton() {
  return (
    <section className="mx-auto max-w-[1020px]">
      <div className="rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="h-10 w-36 animate-pulse rounded-2xl bg-slate-200" />
        <div className="mt-6 h-px w-full bg-slate-200" />
        <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="h-12 w-48 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-6 w-72 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200 sm:w-56" />
        </div>
        <div className="mt-8 h-px w-full bg-slate-200" />
        <div className="mt-8 space-y-5">
          <div className="h-7 w-40 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-6 w-48 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="mt-8 h-px w-full bg-slate-200" />
        <div className="mt-8 space-y-4">
          <div className="h-7 w-44 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded-[24px] bg-slate-100" />
          <div className="h-16 w-full animate-pulse rounded-[24px] bg-slate-100" />
        </div>
      </div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-5 text-sm text-slate-500">
      {message}
    </div>
  );
}

export default function BillingPage() {
  const { billing, loading, error, portalLoading, openPortal, refresh } = useBilling();
  const { accountSummary } = useAccountSummary();

  const isFreePlan = billing?.planCode === "free";
  const reportsUsed =
    typeof accountSummary?.reportsUsed === "number"
      ? accountSummary.reportsUsed
      : (billing?.reportsUsedThisMonth ?? 0);
  const reportLimit =
    typeof accountSummary?.reportsLimit === "number"
      ? accountSummary.reportsLimit
      : (billing?.reportsMonthlyLimit ?? null);
  const usageLabel = reportLimit === null ? `${reportsUsed} used` : `${reportsUsed} / ${reportLimit} used`;
  const usageProgress =
    reportLimit && reportLimit > 0 ? Math.min((reportsUsed / reportLimit) * 100, 100) : 0;
  const usageBarTone =
    reportLimit !== null && reportLimit > 0 && reportsUsed >= reportLimit ? "bg-amber-500" : "bg-[var(--measurable-blue)]";

  return (
    <AppShell>
      <section className="mx-auto max-w-[1020px]">
        {loading ? (
          <BillingSkeleton />
        ) : error ? (
          <div className="rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Billing</h1>
            <div className="mt-6 h-px w-full bg-slate-200" />
            <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              We couldn&apos;t load billing information right now.
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--measurable-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--measurable-blue-hover)]"
              >
                Retry
              </button>
              <Link
                href="/pricing"
                onClick={() =>
                  trackEvent("upgrade_click", {
                    current_plan: "unknown",
                    target_plan: "unknown",
                    cta_location: "billing_page",
                  })
                }
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View pricing
              </Link>
            </div>
          </div>
        ) : billing ? (
          <div className="rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
            <header>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Billing</h1>
            </header>

            <div className="mt-6 h-px w-full bg-slate-200" />

            <section className="py-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.35rem]">
                    {billing.planName}
                  </p>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    {buildPlanDescription({
                      currentPeriodEnd: billing.currentPeriodEnd,
                      isFreePlan,
                      isActive: billing.isActive,
                      cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
                    })}
                  </p>
                  <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    {formatStatus(billing.billingStatus)}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:justify-end">
                  {isFreePlan ? (
                    <Link
                      href="/pricing"
                      onClick={() =>
                        trackEvent("upgrade_click", {
                          current_plan: billing.planCode || "unknown",
                          target_plan: "unknown",
                          cta_location: "billing_page",
                        })
                      }
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--measurable-blue)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(23,73,255,0.22)] transition hover:bg-[var(--measurable-blue-hover)]"
                    >
                      Upgrade
                    </Link>
                  ) : (
                    <UpgradeCTA
                      label="Manage subscription"
                      loading={portalLoading}
                      disabled={portalLoading}
                      onClick={() => void openPortal()}
                      className="min-h-12 px-5"
                    />
                  )}
                  <Link
                    href="/pricing"
                    onClick={() =>
                      trackEvent("upgrade_click", {
                        current_plan: billing.planCode || "unknown",
                        target_plan: "unknown",
                        cta_location: "billing_page",
                      })
                    }
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View pricing
                  </Link>
                </div>
              </div>
            </section>

            <div className="h-px w-full bg-slate-200" />

            <section className="py-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Usage this month</h2>
                  <p className="mt-2 text-sm text-slate-500">Reports</p>
                </div>
                <p className="text-lg font-semibold text-slate-950">{usageLabel}</p>
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${usageBarTone}`}
                  style={{ width: `${usageProgress}%` }}
                />
              </div>
              <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>{reportLimit === null ? "Unlimited monthly usage" : "Current monthly cycle"}</span>
                {reportLimit !== null ? <span>{Math.max(reportLimit - reportsUsed, 0)} reports remaining</span> : null}
              </div>
            </section>

            <div className="h-px w-full bg-slate-200" />

            <section className="py-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Billing history</h2>
                  <p className="mt-2 text-sm text-slate-500">Invoices and payments will appear here when available.</p>
                </div>
              </div>
              <div className="mt-5">
                <EmptyState message="No invoices yet." />
              </div>
            </section>

            <div className="h-px w-full bg-slate-200" />

            <section className="py-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Billing information</h2>
                  <p className="mt-2 text-sm text-slate-500">Customer details will appear here when available.</p>
                </div>
                {!isFreePlan ? (
                  <button
                    type="button"
                    onClick={() => void openPortal()}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">Name</p>
                  <p className="mt-2 text-base text-slate-900">Not available</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Email</p>
                  <p className="mt-2 text-base text-slate-900">Not available</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium text-slate-500">Address</p>
                  <p className="mt-2 text-base text-slate-900">Not available</p>
                </div>
              </div>
            </section>

            <div className="h-px w-full bg-slate-200" />

            <section className="py-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Payment methods</h2>
                  <p className="mt-2 text-sm text-slate-500">Manage your payment methods in Stripe.</p>
                </div>
                {!isFreePlan ? (
                  <UpgradeCTA
                    label="Manage subscription"
                    loading={portalLoading}
                    disabled={portalLoading}
                    onClick={() => void openPortal()}
                    variant="secondary"
                    className="min-h-11 px-4"
                  />
                ) : null}
              </div>
              <div className="mt-5">
                <EmptyState message="No payment methods available here yet." />
              </div>
            </section>

            <div className="h-px w-full bg-slate-200" />

            <section className="pt-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Cancel plan</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                    {isFreePlan
                      ? "You can upgrade or change plans anytime from the pricing page."
                      : "If you cancel, you’ll keep full access to your plan features until the end of your billing period."}
                  </p>
                </div>
                {isFreePlan ? (
                  <Link
                    href="/pricing"
                    onClick={() =>
                      trackEvent("upgrade_click", {
                        current_plan: billing.planCode || "unknown",
                        target_plan: "unknown",
                        cta_location: "billing_page",
                      })
                    }
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View pricing
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void openPortal()}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
