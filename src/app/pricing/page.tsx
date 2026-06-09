"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { FEATURES } from "@/config/features";
import { trackEvent } from "@/lib/analytics";
import { useBilling } from "@/lib/billing/useBilling";
import { useAuthStore } from "@/lib/store/auth-store";
import type { BillingPlanCode } from "@/lib/billing/plans";

type PricingCard = {
  code: BillingPlanCode;
  name: string;
  price: string;
  audience: string;
  cta: string;
  recommended?: boolean;
  note?: string;
  reportsLimit: string;
  slidesPerReport: string;
  exportOptions: string;
  branding: string;
  scheduledReports: string;
  items: string[];
};

type ComparisonRow = {
  label: string;
  values: [string, string, string, string];
  checked?: boolean[];
};

const pricingCards: PricingCard[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    audience: "Try Measurable",
    cta: "Get Started for Free",
    note: "*No credit card required.",
    reportsLimit: "10 Reports / month (temporarily)",
    slidesPerReport: "5 Slides per report",
    exportOptions: "PDF",
    branding: "Watermark",
    scheduledReports: "—",
    items: [
      "10 Reports / month (temporarily)",
      "5 Slides per report",
      "Single Platform Reports",
      "Measurable Watermark",
      "Export PDF",
    ],
  },
  {
    code: "starter",
    name: "Starter",
    price: "$19",
    audience: "For Freelancers",
    cta: "Get Started with Starter",
    reportsLimit: "10 Reports / month",
    slidesPerReport: "10 Slides per report",
    exportOptions: "PDF/PPTX",
    branding: "Included",
    scheduledReports: "—",
    items: [
      "10 Reports / month",
      "10 Slides per report",
      "2 - 3 Platform Reports",
      "Personalized Branding",
      "Export PDF/PPTX",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    price: "$39",
    audience: "For growing agencies",
    cta: "Get Started with Pro",
    recommended: true,
    reportsLimit: "20 Reports / month",
    slidesPerReport: "15 Slides per report",
    exportOptions: "PDF/PPTX",
    branding: "Included",
    scheduledReports: "Included",
    items: [
      "20 Reports / month",
      "15 Slides per report",
      "Multi-Platform Reports",
      "Personalized Branding",
      "Export PDF/PPTX",
      "3 Automated Scheduled Reports",
    ],
  },
  {
    code: "advanced",
    name: "Advanced",
    price: "$99",
    audience: "Scaling organizations",
    cta: "Get Started with Advanced",
    reportsLimit: "Unlimited Reports / month",
    slidesPerReport: "30 Slides per report",
    exportOptions: "PDF/PPTX",
    branding: "Included",
    scheduledReports: "Included",
    items: [
      "Unlimited Reports / month",
      "30 Slides per report",
      "Multi-Platform Reports",
      "Personalized Branding",
      "Export PDF/PPTX",
      "Unlimited Automated Scheduled Reports",
    ],
  },
];

const comparisonRows: ComparisonRow[] = [
  {
    label: "Reports Limit",
    values: [
      "10 Reports / month (temporary)",
      "10 Reports / month",
      "20 Reports / month",
      "Unlimited",
    ],
  },
  {
    label: "Slides per report",
    values: ["5 Slides", "10 Slides", "15 Slides", "Up to 30 Slides"],
  },
  {
    label: "Multi-Source Report",
    values: [
      "1 Platform Reports",
      "2 - 3 Platform Reports",
      "Multi-Platform Reports",
      "Multi-Platform Reports",
    ],
  },
  {
    label: "AI Chat with Data",
    values: ["Included", "Included", "Included", "Included"],
    checked: [true, true, true, true],
  },
  {
    label: "Storage",
    values: ["1 GB", "3 GB", "5 GB", "10 GB"],
  },
  {
    label: "Exporting Options",
    values: ["PDF", "PDF/PPTX", "PDF/PPTX", "PDF/PPTX"],
  },
  {
    label: "Brand Personalization",
    values: ["Watermark", "Included", "Included", "Included"],
    checked: [false, true, true, true],
  },
  {
    label: "Scheduled Reports",
    values: ["-", "-", "Included", "Included"],
    checked: [false, false, true, true],
  },
  {
    label: "Trial on new features",
    values: ["-", "Included", "Included", "Included"],
    checked: [false, true, true, true],
  },
];

function CheckIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 stroke-current">
        <path d="M4.75 10.5 8 13.75l7.25-7.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function formatPeriodEnd(value: string) {
  if (!value) {
    return "Not available";
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

export default function PricingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [pendingPlanCode, setPendingPlanCode] = useState<BillingPlanCode | null>(null);
  const [updatedPlanCode, setUpdatedPlanCode] = useState<BillingPlanCode | null>(null);
  const {
    billing,
    loading,
    error,
    notice,
    noticeTone,
    startCheckout,
    checkoutLoadingPlan,
  } = useBilling();
  const currentPlanCode = billing?.planCode || "free";
  const currentPlan = pricingCards.find((plan) => plan.code === currentPlanCode) || pricingCards[0];
  const pendingPlan =
    pricingCards.find((plan) => plan.code === pendingPlanCode) || null;
  const updatedPlan =
    pricingCards.find((plan) => plan.code === updatedPlanCode) || null;
  const confirmLoading = Boolean(pendingPlanCode && checkoutLoadingPlan === pendingPlanCode);
  const isPaidUser = currentPlanCode !== "free";
  const postUpdateSummary = useMemo(() => {
    if (!updatedPlan || !billing) {
      return null;
    }

    return {
      planName: billing.planName,
      billingStatus: billing.billingStatus || "active",
      nextBillingDate: formatPeriodEnd(billing.currentPeriodEnd),
      monthlyPrice: updatedPlan.price,
    };
  }, [billing, updatedPlan]);

  function handleSelectFree() {
    if (!user) {
      router.push("/login");
      return;
    }

    if ((billing?.planCode || "free") === "free") {
      router.push("/dashboard");
      return;
    }

    router.push("/billing");
  }

  async function handleSelectPlan(planCode: BillingPlanCode) {
    if (planCode === "free") {
      handleSelectFree();
      return;
    }

    router.push("/wishlist");
  }

  async function handleConfirmPlanChange() {
    if (!pendingPlanCode) {
      return;
    }

    const result = await startCheckout(pendingPlanCode);

    if (!result) {
      return;
    }

    if (result.mode === "updated") {
      setUpdatedPlanCode(pendingPlanCode);
      setPendingPlanCode(null);
      return;
    }

    if (result.mode === "already_on_plan") {
      setPendingPlanCode(null);
      return;
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-10 pb-8 pt-8 lg:space-y-12 lg:pt-14">
        <section className="px-4 pt-6 text-center sm:px-6 lg:px-0">
          <div className="mx-auto max-w-[760px]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--measurable-blue)]">
              Plans &amp; Pricing
            </p>
            <h1 className="mt-5 text-[3.4rem] font-semibold leading-[0.94] tracking-[-0.07em] text-slate-950 lg:text-[4.55rem]">
              Plans &amp; Pricing
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-lg leading-8 text-slate-500">
              Get your team a Reporting Platform
            </p>
          </div>
        </section>

        {error ? (
          <section className="rounded-[26px] border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900">
            {error}
          </section>
        ) : null}

        {notice ? (
          <section
            className={`rounded-[26px] px-6 py-4 text-sm ${
              noticeTone === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-sky-200 bg-sky-50 text-sky-800"
            }`}
          >
            {notice}
          </section>
        ) : null}

        {postUpdateSummary ? (
          <section className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(180deg,#f2fbf6_0%,#ffffff_100%)] px-6 py-5 shadow-[0_16px_36px_rgba(16,185,129,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Plan updated
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                  {postUpdateSummary.planName}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Your next billing date is {postUpdateSummary.nextBillingDate}. Your plan price is now {postUpdateSummary.monthlyPrice}/month.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-emerald-100 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Current active plan
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{postUpdateSummary.planName}</p>
                </div>
                <div className="rounded-[22px] border border-emerald-100 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Billing status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{postUpdateSummary.billingStatus}</p>
                </div>
                <div className="rounded-[22px] border border-emerald-100 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Monthly price
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{postUpdateSummary.monthlyPrice}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-4">
          {pricingCards.map((plan) => {
            const isCurrent = currentPlanCode === plan.code;
            const isFree = plan.code === "free";
            const isLoading = checkoutLoadingPlan === plan.code;
            const paidHeader =
              plan.code === "starter"
                ? "bg-[linear-gradient(135deg,#2563eb_0%,#1749ff_100%)]"
                : plan.code === "pro"
                  ? "bg-[linear-gradient(135deg,#0f172a_0%,#1749ff_100%)]"
                  : "bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_45%,#0ea5e9_100%)]";

            return (
              <article
                key={plan.code}
                className="relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
              >
                {plan.recommended ? (
                  <div className="absolute right-5 top-5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(16,185,129,0.26)]">
                    Recommended
                  </div>
                ) : null}

                <div className={`px-7 py-8 ${isFree ? "bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]" : `${paidHeader} text-white`}`}>
                  <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${isFree ? "text-slate-500" : "text-blue-100/90"}`}>
                    {plan.audience}
                  </p>
                  <h2 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em]">
                    {plan.name}
                  </h2>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-[3rem] font-semibold tracking-[-0.06em]">{plan.price}</span>
                    <span className={`pb-2 text-base ${isFree ? "text-slate-500" : "text-blue-100/90"}`}>
                      / month
                    </span>
                  </div>
                </div>

                <div className="px-7 py-8">
                  <ul className="space-y-3.5">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <CheckIcon />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.note ? (
                    <p className="mt-5 text-xs font-medium text-slate-500">{plan.note}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      if (!isFree && !isCurrent && !isLoading) {
                        trackEvent("upgrade_click", {
                          current_plan: currentPlanCode,
                          target_plan: plan.code,
                          cta_location: "pricing_card",
                        });
                      }

                      void handleSelectPlan(plan.code);
                    }}
                    disabled={isCurrent || isLoading || (plan.code !== "free" && loading)}
                    className={`mt-8 inline-flex min-h-[3.5rem] w-full items-center justify-center rounded-[20px] px-5 py-3 text-sm font-semibold transition ${
                      isFree
                        ? "border border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
                        : "bg-[var(--measurable-blue)] text-white shadow-[0_16px_36px_rgba(23,73,255,0.22)] hover:bg-[var(--measurable-blue-hover)]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {isCurrent
                      ? `Current plan: ${plan.name}`
                      : isLoading
                        ? isPaidUser
                          ? "Updating plan..."
                          : "Redirecting to checkout..."
                        : plan.cta}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="space-y-5">
          <div className="max-w-3xl px-1">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--measurable-blue)]">
              Compare plans
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              Everything included by plan
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-500">
              Compare Measurable plans and reporting capabilities.
            </p>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_54px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[1.25fr_repeat(4,minmax(0,1fr))] text-sm">
                  <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-4 font-semibold text-slate-500">
                    Feature
                  </div>
                  {["Free", "Starter", "Pro", "Advanced"].map((column) => (
                    <div
                      key={column}
                      className="border-b border-l border-slate-200 bg-slate-50/70 px-6 py-4 text-center font-semibold text-slate-950"
                    >
                      {column}
                    </div>
                  ))}

                  {comparisonRows.map((row) => (
                    <div key={row.label} className="contents">
                      <div className="border-b border-slate-200 px-6 py-5 font-medium text-slate-700">
                        {row.label}
                      </div>
                      {row.values.map((value, index) => (
                        <div
                          key={`${row.label}-${index}`}
                          className="border-b border-l border-slate-200 px-6 py-5 text-center text-slate-600"
                        >
                          {row.checked ? (
                            row.checked[index] ? (
                              <div className="flex items-center justify-center gap-2">
                                <CheckIcon />
                                <span>{value}</span>
                              </div>
                            ) : (
                              <span>{value}</span>
                            )
                          ) : (
                            <span>{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[38px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-10 py-12 text-center shadow-[0_18px_54px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--measurable-blue)]">
            Ready to Measure?
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Start reporting with the right plan for your team
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Try Measurable for free and start to analyze &amp; lead great results for your clients/businesses.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleSelectFree}
              className="inline-flex min-h-[3.75rem] items-center justify-center rounded-[22px] bg-[var(--measurable-blue)] px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(23,73,255,0.24)] transition hover:bg-[var(--measurable-blue-hover)]"
            >
              Get Your First Reports For Free!
            </button>
          </div>
        </section>

        {!FEATURES.ENABLE_PPTX_EXPORT ? (
          <p className="text-center text-xs text-slate-500">
            PPTX availability still depends on your current product configuration.
          </p>
        ) : null}
      </div>

      {pendingPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-3 backdrop-blur-[10px] sm:px-5 sm:py-5">
          <div className="w-[92vw] max-w-[720px] overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(246,249,255,0.95)_100%)] shadow-[0_40px_120px_rgba(15,23,42,0.32)] transition duration-300 animate-[fade-in_180ms_ease-out]">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#081327_0%,#123b9c_48%,#1749ff_100%)] px-5 py-5 sm:px-8 sm:py-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.24),transparent_34%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="max-w-[420px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-blue-100/85">
                    Plan Change
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-white sm:mt-3 sm:text-[2.2rem]">
                    Switch to {pendingPlan.name}
                  </h2>
                  <p className="mt-1.5 max-w-[300px] text-sm leading-5 text-blue-50/88 sm:mt-2 sm:max-w-none sm:text-[15px] sm:leading-6">
                    Confirm the change before we start the Stripe billing flow for this subscription.
                  </p>
                  <div className="mt-3 flex items-center gap-2 sm:hidden">
                    {pendingPlan.code === "pro" ? (
                      <span className="rounded-full border border-white/15 bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                        Recommended
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/15 bg-white/12 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {pendingPlan.price}/month
                    </span>
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                  {pendingPlan.code === "pro" ? (
                    <span className="rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                      Recommended
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(8,19,39,0.18)] backdrop-blur">
                    {pendingPlan.price}/month
                  </span>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(88vh-136px)] overflow-y-auto overscroll-contain px-5 py-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:max-h-[80vh] sm:px-6 sm:py-6">
              <div className="sm:hidden rounded-[20px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-950">{currentPlan.name}</p>
                  <p className="text-xs text-slate-500">{currentPlan.reportsLimit}</p>
                  <p className="text-xs text-slate-500">{currentPlan.slidesPerReport}</p>
                </div>
                <div className="my-3 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.22em] text-[var(--measurable-blue)]">
                  ↓ upgrade to ↓
                </div>
                <div className="rounded-2xl bg-[linear-gradient(135deg,#1749ff_0%,#0f67ff_58%,#60a5fa_100%)] px-4 py-3 text-white shadow-[0_16px_34px_rgba(23,73,255,0.18)]">
                  <p className="text-sm font-semibold">{pendingPlan.name}</p>
                  <div className="mt-1.5 space-y-1 text-xs text-blue-50/92">
                    <p>{pendingPlan.reportsLimit}</p>
                    <p>{pendingPlan.slidesPerReport}</p>
                    <p>{pendingPlan.items[2]}</p>
                  </div>
                </div>
              </div>

              <div className="hidden gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Current
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">{currentPlan.name}</p>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>{currentPlan.reportsLimit}</p>
                    <p>{currentPlan.slidesPerReport}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center text-2xl font-semibold text-slate-300 transition duration-300 sm:px-1">
                  →
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-blue-300/25 bg-[linear-gradient(135deg,#1749ff_0%,#0f67ff_58%,#60a5fa_100%)] px-4 py-4 text-white shadow-[0_18px_42px_rgba(23,73,255,0.2)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(23,73,255,0.24)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%)]" />
                  <div className="relative">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/85">
                      New Plan
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{pendingPlan.name}</p>
                    <div className="mt-3 space-y-1 text-sm text-blue-50/92">
                      <p>{pendingPlan.reportsLimit}</p>
                      <p>{pendingPlan.slidesPerReport}</p>
                      <p>{pendingPlan.items[2]}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 sm:mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  What you unlock
                </p>
                <div className="mt-2 space-y-1.5 sm:hidden">
                  {[
                    pendingPlan.reportsLimit,
                    pendingPlan.slidesPerReport,
                    pendingPlan.items[2],
                    pendingPlan.scheduledReports === "Included" ? "Scheduled reports" : pendingPlan.scheduledReports,
                    pendingPlan.exportOptions === "PDF/PPTX" ? "PDF/PPTX export" : pendingPlan.exportOptions,
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2.5 py-1.5 text-sm text-slate-700"
                    >
                      <CheckIcon />
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-2">
                  {[
                    pendingPlan.reportsLimit,
                    pendingPlan.slidesPerReport,
                    pendingPlan.items[2],
                    pendingPlan.scheduledReports === "Included" ? "Scheduled reports" : pendingPlan.scheduledReports,
                    pendingPlan.exportOptions === "PDF/PPTX" ? "PDF/PPTX export" : pendingPlan.exportOptions,
                    pendingPlan.branding === "Included" ? "Brand personalization" : pendingPlan.branding,
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                    >
                      <CheckIcon />
                      <span className="text-sm font-medium text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 rounded-2xl border border-sky-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.92)_0%,rgba(232,244,255,0.82)_100%)] px-4 py-3 shadow-[0_12px_26px_rgba(23,73,255,0.06)] sm:mt-4 sm:py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Billing update
                </p>
                <div className="mt-1 space-y-1 text-xs leading-5 text-slate-600 sm:mt-2 sm:space-y-1.5 sm:text-sm sm:leading-6">
                  <p>Your subscription updates immediately. Stripe automatically handles prorated adjustments.</p>
                  {billing?.currentPeriodEnd ? (
                    <p className="font-medium text-slate-800">
                      Next billing date: {formatPeriodEnd(billing.currentPeriodEnd)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200/70 bg-white/90 px-5 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur sm:px-6 sm:py-4 sm:pb-4">
              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setPendingPlanCode(null)}
                  disabled={confirmLoading}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:rounded-2xl sm:px-5 sm:py-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmPlanChange()}
                  disabled={confirmLoading}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#1749ff_0%,#0f67ff_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(23,73,255,0.24)] transition duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:px-6 sm:py-3"
                >
                  {confirmLoading ? "Updating plan..." : `Confirm ${pendingPlan.name}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
