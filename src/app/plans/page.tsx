"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { PlanLimitsSummary } from "@/components/workspace/PlanLimitsSummary";
import { FEATURES } from "@/config/features";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

const plans = [
  {
    name: "Free",
    subtitle: "Try Measurable",
    price: "$0 USD",
    cadence: "/ month",
    description: "Start with the essentials for your first automated reports.",
    features: [
      "2 Reports / month",
      "5 Slides per report",
      "Connect 1 Data Source",
      "Facebook, Instagram, or TikTok",
      "Measurable Watermark",
      "1 GB Storage",
      "Export PDF",
    ],
    cta: "Get Started for Free",
    note: "*No credit card required.",
    highlight: false,
  },
  {
    name: "Starter",
    subtitle: "For Freelancers",
    price: "$19 USD",
    cadence: "/ month",
    description: "For freelancers who need more reports and branded exports.",
    features: [
      "10 Reports / month",
      "10 Slides per report",
      "Connect Multiple Data Sources",
      "Facebook + Instagram + TikTok",
      "Personalized Branding",
      "3 GB Storage",
      FEATURES.ENABLE_PPTX_EXPORT ? "Export PDF/PPTX" : "Export PDF",
    ],
    cta: "Get Started with Starter",
    note: "",
    highlight: false,
  },
  {
    name: "Core",
    subtitle: "For growing agencies",
    price: "$39 USD",
    cadence: "/ month",
    description: "For growing agencies that need deeper reports and more capacity.",
    features: [
      "30 Reports / month",
      "15 Slides per report",
      "Connect Multiple Data Sources",
      "Personalized Branding",
      "5 GB Storage",
      FEATURES.ENABLE_PPTX_EXPORT ? "Export PDF/PPTX" : "Export PDF",
    ],
    cta: "Get Started with Core",
    note: "",
    highlight: true,
  },
  {
    name: "Advanced",
    subtitle: "Scaling organizations",
    price: "$99 USD",
    cadence: "/ month",
    description: "For scaling organizations that need automation and maximum capacity.",
    features: [
      "Unlimited Reports / month",
      "30 Slides per report",
      "Connect Multiple Data Sources",
      "Personalized Branding",
      "10 GB Storage",
      FEATURES.ENABLE_PPTX_EXPORT ? "Export PDF/PPTX" : "Export PDF",
      "Automated Scheduled Reports",
    ],
    cta: "Get Started with Advanced",
    note: "",
    highlight: false,
  },
] as const;

const comparisonRows = [
  {
    label: "Reports Limit",
    values: ["2 Reports / month", "10 Reports / month", "30 Reports / month", "Unlimited"],
  },
  {
    label: "Slides per report",
    values: ["5 Slides", "10 Slides", "15 Slides", "Up to 30 Slides"],
  },
  {
    label: "Data Source Integrations",
    values: ["1 Integration per account", "All Integrations", "All Integrations", "All Integrations"],
  },
  {
    label: "AI Chat with Data",
    values: ["Included", "Included", "Included", "Included"],
  },
  {
    label: "Storage",
    values: ["1 GB", "3 GB", "5 GB", "10 GB"],
  },
  {
    label: "Exporting Options",
    values: FEATURES.ENABLE_PPTX_EXPORT
      ? ["PDF", "PDF/PPTX", "PDF/PPTX", "PDF/PPTX"]
      : ["PDF", "PDF", "PDF", "PDF"],
  },
  {
    label: "Brand Personalization",
    values: ["Watermark", "Included", "Included", "Included"],
  },
  {
    label: "Scheduled Reports",
    values: ["-", "-", "-", "Included"],
  },
  {
    label: "Trial on new features",
    values: ["-", "Included", "Included", "Included"],
  },
] as const;

function ComparisonCell({ value, highlight }: { value: string; highlight?: boolean }) {
  const { messages } = useI18n();
  const isIncluded = value === "Included";

  return (
    <td
      className={`px-4 py-4 text-sm ${
        highlight ? "bg-sky-50/60" : "bg-white"
      }`}
    >
      {isIncluded ? (
        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          {messages.plansPage.included}
        </span>
      ) : (
        <span className="font-medium text-slate-700">{value}</span>
      )}
    </td>
  );
}

export default function PlansPage() {
  const { messages } = useI18n();
  const { workspace, reportsUsedThisMonth } = useActiveWorkspace({
    includeReportsUsage: true,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="px-1 py-1 sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_55%,#eef6ff_100%)] sm:p-8 sm:shadow-sm">
          <p className="hidden text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 sm:block">
            {messages.plansPage.eyebrow}
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:mt-3 sm:text-4xl">
            {messages.plansPage.title}
          </h1>
          <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-slate-500 sm:block sm:text-base">
            {messages.plansPage.description}
          </p>
          {workspace ? (
            <PlanLimitsSummary
              workspace={workspace}
              reportsUsedThisMonth={reportsUsedThisMonth}
              variant="plans"
            />
          ) : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[28px] border p-5 shadow-sm transition ${
                plan.highlight
                  ? "border-sky-300 bg-[linear-gradient(180deg,rgba(14,165,233,0.14)_0%,rgba(255,255,255,0.96)_28%,#ffffff_100%)] shadow-[0_0_0_1px_rgba(125,211,252,0.4)]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-slate-950">{plan.name}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                    {plan.subtitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {plan.description}
                  </p>
                </div>
                {plan.highlight ? (
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                    {messages.plansPage.recommended}
                  </span>
                ) : null}
              </div>

              <div className="mt-6">
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">
                    {plan.price}
                  </p>
                  <p className="pb-1 text-sm text-slate-500">{plan.cadence}</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-slate-950 !text-white hover:bg-slate-800"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {plan.cta}
              </button>

              {plan.note ? (
                <p className="mt-3 text-xs text-slate-400">{plan.note}</p>
              ) : null}
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.plansPage.comparison}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {messages.plansPage.compareFeatures}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-slate-950 sm:px-6">
                    {messages.plansPage.features}
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      className={`px-4 py-4 text-left text-sm font-semibold text-slate-950 sm:px-6 ${
                        plan.highlight ? "bg-sky-50/60" : ""
                      }`}
                    >
                      <div>{plan.name}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">
                        {plan.price} {plan.cadence}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-950 sm:px-6">
                      {row.label}
                    </td>
                    {row.values.map((value, index) => (
                      <ComparisonCell
                        key={`${row.label}-${plans[index].name}`}
                        value={value}
                        highlight={plans[index].highlight}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
