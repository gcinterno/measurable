"use client";

import { BILLING_PLANS, type BillingPlanCode } from "@/lib/billing/plans";
import type { BillingSummary } from "@/lib/api/billing";

import { UpgradeCTA } from "@/components/billing/UpgradeCTA";

type PlanPaywallProps = {
  billing?: BillingSummary | null;
  loadingPlanCode?: string;
  onSelectPlan: (planCode: BillingPlanCode) => void;
  onSelectFree: () => void;
};

function formatPlanTagline(planCode: BillingPlanCode) {
  switch (planCode) {
    case "free":
      return "Start simple";
    case "starter":
      return "For consistent monthly reporting";
    case "pro":
      return "For teams scaling client delivery";
    case "advanced":
      return "For high-volume reporting ops";
  }
}

export function PlanPaywall({
  billing,
  loadingPlanCode,
  onSelectPlan,
  onSelectFree,
}: PlanPaywallProps) {
  const currentPlanCode = billing?.planCode || "free";

  return (
    <section className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-4">
        {BILLING_PLANS.map((plan) => {
          const isFree = plan.code === "free";
          const isCurrent = currentPlanCode === plan.code;
          const isLoading = loadingPlanCode === plan.code;
          const headerClasses = isFree
            ? "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-950"
            : "border-blue-600/20 bg-[linear-gradient(135deg,#1749ff_0%,#0f67ff_52%,#60a5fa_100%)] text-white";

          return (
            <article
              key={plan.code}
              className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
            >
              {plan.recommended ? (
                <div className="absolute right-5 top-5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_24px_rgba(16,185,129,0.32)]">
                  RECOMMENDED
                </div>
              ) : null}

              <div className={`border-b px-6 py-6 ${headerClasses}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isFree ? "text-slate-500" : "text-blue-100"}`}>
                  {formatPlanTagline(plan.code)}
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                  {plan.name}
                </h2>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={`pb-1 text-sm ${isFree ? "text-slate-500" : "text-blue-100"}`}>
                    {plan.cadence}
                  </span>
                </div>
                <p className={`mt-4 text-sm leading-6 ${isFree ? "text-slate-600" : "text-blue-50"}`}>
                  {plan.reportScopeLabel}
                </p>
              </div>

              <div className="space-y-5 px-6 py-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 stroke-current">
                          <path d="M4.75 10.5 8 13.75l7.25-7.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span>Slides per report</span>
                    <span className="font-semibold text-slate-950">{plan.slidesPerReport}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span>Scheduled reports</span>
                    <span className="font-semibold text-slate-950">
                      {plan.scheduledReportsLimit === null
                        ? "Unlimited"
                        : plan.scheduledReportsLimit > 0
                          ? String(plan.scheduledReportsLimit)
                          : "Not included"}
                    </span>
                  </div>
                </div>

                <UpgradeCTA
                  label={
                    isCurrent
                      ? `Current plan: ${plan.name}`
                      : plan.cta
                  }
                  loading={isLoading}
                  disabled={isCurrent}
                  variant={isFree ? "secondary" : "primary"}
                  onClick={() => (isFree ? onSelectFree() : onSelectPlan(plan.code))}
                  className="w-full justify-center rounded-2xl py-3.5"
                  analytics={
                    !isFree && !isCurrent
                      ? {
                          currentPlan: currentPlanCode,
                          targetPlan: plan.code,
                          ctaLocation: "plan_paywall",
                        }
                      : undefined
                  }
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
