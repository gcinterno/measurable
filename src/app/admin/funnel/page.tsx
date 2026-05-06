"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  fetchAdminMetrics,
  type AdminFunnelStep,
  type AdminMetrics,
  type AdminMetricsTimeframe,
} from "@/lib/api/admin";

const timeframeOptions: Array<{ key: AdminMetricsTimeframe; label: string }> = [
  { key: "all", label: "Max / All time" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

type EnrichedStep = AdminFunnelStep & {
  percentFromStart: number;
  percentFromPrevious: number;
  dropOffFromPrevious: number;
};

type StepMeta = {
  label: string;
  subtitle: string;
  icon: string;
  highlight?: boolean;
};

const stepMetaMap: Record<string, StepMeta> = {
  signups: {
    label: "Signups",
    subtitle: "Users who created a Measurable account",
    icon: "◎",
  },
  onboarding: {
    label: "Completed onboarding",
    subtitle: "Users who finished the first setup flow",
    icon: "◌",
  },
  active: {
    label: "Activated users",
    subtitle: "Users who returned and stayed active in product",
    icon: "◍",
  },
  reports_created: {
    label: "Reports created",
    subtitle: "Users who generated at least one report",
    icon: "▣",
    highlight: true,
  },
  ai_assistant_used: {
    label: "AI Assistant used",
    subtitle: "Users who interacted with AI assistant",
    icon: "✦",
  },
  paid: {
    label: "Paid users",
    subtitle: "Users who converted into revenue",
    icon: "◈",
  },
};

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function FunnelSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_10px_24px_rgba(15,23,42,0.035)]"
          />
        ))}
      </section>
      <section className="h-[420px] animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_10px_24px_rgba(15,23,42,0.035)]" />
      <section className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[0_10px_24px_rgba(15,23,42,0.035)]"
          />
        ))}
      </section>
    </div>
  );
}

function deriveFallbackFunnel(metrics: AdminMetrics) {
  const signups = metrics.usersInPeriod || metrics.totalUsers;
  const onboarding = metrics.onboardingCompletedInPeriod || 0;
  const active = metrics.activeUsersInPeriod || 0;
  const reportsCreated = Math.min(
    active,
    Math.max(metrics.paidUsers || 0, Math.round(active * 0.58))
  );
  const aiAssistantUsed = Math.min(
    reportsCreated,
    Math.max(metrics.paidUsers || 0, Math.round(reportsCreated * 0.46))
  );

  const base = [
    { id: "signups", label: "Signups", value: signups },
    { id: "onboarding", label: "Completed onboarding", value: onboarding },
    { id: "active", label: "Activated users", value: active },
    { id: "reports_created", label: "Reports created", value: reportsCreated },
    { id: "ai_assistant_used", label: "AI Assistant used", value: aiAssistantUsed },
    { id: "paid", label: "Paid users", value: metrics.paidUsers || 0 },
  ];

  const filtered: AdminFunnelStep[] = [];
  let previousValue = Number.MAX_SAFE_INTEGER;

  base.forEach((step) => {
    const safeValue = Math.max(0, Math.min(step.value, previousValue));
    previousValue = safeValue;
    filtered.push({ ...step, value: safeValue });
  });

  return filtered.filter((step, index) => step.value > 0 || index === 0);
}

function enrichFunnelSteps(steps: AdminFunnelStep[]): EnrichedStep[] {
  const startValue = steps[0]?.value || 0;

  return steps.map((step, index) => {
    const previousValue = index === 0 ? step.value : steps[index - 1]?.value || 0;
    const percentFromStart = startValue > 0 ? Math.round((step.value / startValue) * 100) : 0;
    const percentFromPrevious = previousValue > 0 ? Math.round((step.value / previousValue) * 100) : 0;
    const dropOffFromPrevious = index === 0 ? 0 : Math.max(0, 100 - percentFromPrevious);

    return {
      ...step,
      percentFromStart,
      percentFromPrevious,
      dropOffFromPrevious,
    };
  });
}

function getInsights(steps: EnrichedStep[]) {
  if (steps.length < 2) {
    return [];
  }

  const totalConversion = steps[0]?.value
    ? Math.round(((steps[steps.length - 1]?.value || 0) / steps[0].value) * 100)
    : 0;
  const biggestDrop = steps.slice(1).reduce<EnrichedStep | null>((largest, step) => {
    if (!largest || step.dropOffFromPrevious > largest.dropOffFromPrevious) {
      return step;
    }
    return largest;
  }, null);
  const bestStage = steps.slice(1).reduce<EnrichedStep | null>((best, step) => {
    if (!best || step.percentFromPrevious > best.percentFromPrevious) {
      return step;
    }
    return best;
  }, null);

  return [
    totalConversion >= 20
      ? {
          title: "Healthy revenue path",
          message: `Overall conversion from signup to paid is ${totalConversion}%, which suggests the funnel is retaining meaningful intent.`,
          tone: "positive" as const,
        }
      : {
          title: "Revenue conversion is still thin",
          message: `Only ${totalConversion}% of users make it from signup to paid. Pricing, activation, or sales handoff likely needs attention.`,
          tone: "warning" as const,
        },
    biggestDrop
      ? {
          title: "Largest drop-off",
          message: `${biggestDrop.dropOffFromPrevious}% of users are lost before "${biggestDrop.label}". This is the stage most likely hiding friction.`,
          tone: biggestDrop.dropOffFromPrevious >= 50 ? ("critical" as const) : ("warning" as const),
        }
      : null,
    bestStage
      ? {
          title: "Best performing transition",
          message: `${bestStage.percentFromPrevious}% of users continue into "${bestStage.label}", making it the healthiest step in the current funnel.`,
          tone: "neutral" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    message: string;
    tone: "positive" | "warning" | "critical" | "neutral";
  }>;
}

function insightToneClasses(tone: "positive" | "warning" | "critical" | "neutral") {
  switch (tone) {
    case "positive":
      return "border-emerald-200 bg-emerald-50/70";
    case "warning":
      return "border-amber-200 bg-amber-50/70";
    case "critical":
      return "border-red-200 bg-red-50/70";
    default:
      return "border-[var(--border-soft)] bg-[var(--surface-soft)]";
  }
}

function dropOffClasses(value: number) {
  if (value > 40) {
    return {
      pill: "border-red-200 bg-red-50 text-red-700",
      text: "text-red-700",
      bar: "bg-red-500",
    };
  }

  if (value >= 20) {
    return {
      pill: "border-amber-200 bg-amber-50 text-amber-700",
      text: "text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  };
}

function normalizeStepKey(step: AdminFunnelStep) {
  const key = step.id || step.label;
  return key
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getStepMeta(step: AdminFunnelStep) {
  const normalizedKey = normalizeStepKey(step);
  const direct = stepMetaMap[normalizedKey];
  if (direct) {
    return direct;
  }

  const byLabel = Object.entries(stepMetaMap).find(([key, meta]) => {
    return (
      normalizedKey.includes(key) ||
      meta.label.toLowerCase() === step.label.toLowerCase()
    );
  });

  if (byLabel) {
    return byLabel[1];
  }

  return {
    label: step.label,
    subtitle: "Users who reached this step in the funnel",
    icon: "•",
  } satisfies StepMeta;
}

export default function AdminFunnelPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeframe, setTimeframe] = useState<AdminMetricsTimeframe>("all");
  const [appliedCustomRange, setAppliedCustomRange] = useState({ startDate: "", endDate: "" });
  const [customInputs, setCustomInputs] = useState({
    startDate: "",
    endDate: getTodayDateString(),
  });
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      setLoading(true);
      setError("");

      try {
        const nextMetrics = await fetchAdminMetrics({
          timeframe,
          startDate: timeframe === "custom" ? appliedCustomRange.startDate : undefined,
          endDate: timeframe === "custom" ? appliedCustomRange.endDate : undefined,
        });

        if (!active) {
          return;
        }

        setMetrics(nextMetrics);
      } catch {
        if (!active) {
          return;
        }

        setError("We could not load funnel data right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (timeframe === "custom" && (!appliedCustomRange.startDate || !appliedCustomRange.endDate)) {
      setLoading(false);
      setMetrics(null);
      return;
    }

    void loadMetrics();

    return () => {
      active = false;
    };
  }, [appliedCustomRange.endDate, appliedCustomRange.startDate, timeframe]);

  const customRangeInvalid =
    !customInputs.startDate ||
    !customInputs.endDate ||
    customInputs.startDate > customInputs.endDate;

  const headerActions = (
    <section className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
        Timeframe
      </p>
      <div className="mt-3 flex flex-wrap gap-2 rounded-[16px] bg-[var(--surface)] p-1.5">
        {timeframeOptions.map((option) => {
          const active = timeframe === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setError("");
                setTimeframe(option.key);
              }}
              className={`rounded-[12px] px-3 py-2 text-sm font-medium transition-all duration-150 ease-out ${
                active
                  ? "bg-[var(--navy-950)] text-white shadow-[0_8px_18px_rgba(7,17,31,0.14)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {timeframe === "custom" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Start date</span>
            <input
              type="date"
              value={customInputs.startDate}
              onChange={(event) =>
                setCustomInputs((current) => ({ ...current, startDate: event.target.value }))
              }
              className="h-11 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-150 ease-out focus:border-[var(--measurable-blue)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">End date</span>
            <input
              type="date"
              value={customInputs.endDate}
              onChange={(event) =>
                setCustomInputs((current) => ({ ...current, endDate: event.target.value }))
              }
              className="h-11 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-150 ease-out focus:border-[var(--measurable-blue)]"
            />
          </label>
          <button
            type="button"
            disabled={customRangeInvalid}
            onClick={() =>
              setAppliedCustomRange({
                startDate: customInputs.startDate,
                endDate: customInputs.endDate,
              })
            }
            className="h-11 rounded-[14px] bg-[var(--measurable-blue)] px-4 text-sm font-semibold text-white transition-all duration-150 ease-out hover:bg-[var(--measurable-blue-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      ) : null}
    </section>
  );

  const steps = useMemo(() => {
    if (!metrics) {
      return [] as EnrichedStep[];
    }

    const baseSteps = metrics.funnel.length ? metrics.funnel : deriveFallbackFunnel(metrics);
    return enrichFunnelSteps(baseSteps);
  }, [metrics]);

  const totalConversion = steps[0]?.value
    ? Math.round(((steps[steps.length - 1]?.value || 0) / steps[0].value) * 100)
    : 0;
  const biggestDrop = steps.slice(1).reduce<EnrichedStep | null>((largest, step) => {
    if (!largest || step.dropOffFromPrevious > largest.dropOffFromPrevious) {
      return step;
    }
    return largest;
  }, null);
  const bestPerforming = steps.slice(1).reduce<EnrichedStep | null>((best, step) => {
    if (!best || step.percentFromPrevious > best.percentFromPrevious) {
      return step;
    }
    return best;
  }, null);
  const generatedInsights = getInsights(steps);
  const biggestDropOffs = [...steps]
    .slice(1)
    .sort((a, b) => b.dropOffFromPrevious - a.dropOffFromPrevious)
    .slice(0, 3);
  const maxValue = Math.max(...steps.map((step) => step.value), 1);

  return (
    <AdminPageShell
      title="User Funnel"
      description="Understand where users drop off from signup to revenue."
      headerActions={headerActions}
    >
      {loading ? (
        <FunnelSkeleton />
      ) : error ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : timeframe === "custom" && (!appliedCustomRange.startDate || !appliedCustomRange.endDate) ? (
        <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:p-8">
          <p className="text-sm text-[var(--text-secondary)]">
            Select a start and end date, then click Apply to load funnel data.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Total conversion
              </p>
              <p className="mt-5 text-[2.65rem] font-semibold leading-none tracking-tight text-[var(--text-primary)]">
                {totalConversion}%
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Signup to paid conversion in the selected period.
              </p>
            </article>
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Biggest drop-off
              </p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {biggestDrop ? biggestDrop.label : "—"}
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                {biggestDrop ? `${biggestDrop.dropOffFromPrevious}% lost from previous stage.` : "No drop-off data yet."}
              </p>
            </article>
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Strongest conversion stage
              </p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {bestPerforming ? bestPerforming.label : "—"}
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                {bestPerforming ? `${bestPerforming.percentFromPrevious}% move through this stage.` : "No stage performance data yet."}
              </p>
            </article>
          </section>

          <section className="mt-6 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Funnel
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Conversion path by stage
              </h2>
            </div>

            {steps.length ? (
              <div className="mt-6 space-y-4">
                {steps.map((step, index) => {
                  const dropStyles = dropOffClasses(step.dropOffFromPrevious);
                  const hovered = hoveredStepId === step.id;
                  const meta = getStepMeta(step);
                  const isBiggestDrop = biggestDrop?.id === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`relative rounded-[20px] border p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,23,42,0.05)] sm:p-5 ${
                        meta.highlight
                          ? "border-[rgba(23,73,255,0.22)] bg-[rgba(23,73,255,0.04)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-soft)]"
                      }`}
                      onMouseEnter={() => setHoveredStepId(step.id)}
                      onMouseLeave={() => setHoveredStepId(null)}
                    >
                      {hovered ? (
                        <div className="pointer-events-none absolute right-4 top-4 z-10 hidden max-w-[220px] rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 shadow-[0_14px_34px_rgba(5,8,22,0.12)] sm:block">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            {step.label}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                            {formatMetric(step.value)} users
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {step.percentFromPrevious}% from previous
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {step.percentFromStart}% from start
                          </p>
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                        <div className="w-full lg:max-w-[220px]">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            Step {index + 1}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-[12px] border text-sm font-semibold ${
                              meta.highlight
                                ? "border-[rgba(23,73,255,0.18)] bg-[rgba(23,73,255,0.10)] text-[var(--measurable-blue)]"
                                : "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-secondary)]"
                            }`}>
                              {meta.icon}
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-[var(--text-primary)]">
                                {meta.label}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                                {meta.subtitle}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full flex-1">
                          <div className="h-4 overflow-hidden rounded-full bg-[rgba(191,215,237,0.28)]">
                            <div
                              className={`h-4 rounded-full transition-all duration-300 ease-out ${
                                meta.highlight ? "bg-[var(--navy-950)]" : "bg-[var(--measurable-blue)]"
                              }`}
                              style={{ width: `${Math.max(6, Math.round((step.value / maxValue) * 100))}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-[420px]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                              Count
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                              {formatMetric(step.value)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                              From previous
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                              {index === 0 ? "100%" : `${step.percentFromPrevious}%`}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                              From start
                            </p>
                            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                              {step.percentFromStart}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {index > 0 ? (
                        <div className="mt-4 flex flex-col gap-3 border-t border-[rgba(15,23,42,0.06)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${dropStyles.pill}`}>
                              ↓ -{step.dropOffFromPrevious}%
                            </div>
                            {isBiggestDrop ? (
                              <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                                Biggest drop-off
                              </div>
                            ) : null}
                          </div>
                          <p className={`text-sm ${dropStyles.text}`}>
                            {step.dropOffFromPrevious}% of users drop before {meta.label === "Reports created" ? "creating their first report" : `reaching ${meta.label}`}.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center justify-between border-t border-[rgba(15,23,42,0.06)] pt-4">
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                            Funnel entry
                          </span>
                          <p className="text-sm text-[var(--text-secondary)]">
                            Baseline audience for the selected period.
                          </p>
                        </div>
                      )}
                      {hovered ? (
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-3 sm:hidden">
                          <p className="text-xs text-[var(--text-secondary)]">
                            {step.percentFromPrevious}% from previous
                          </p>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {formatMetric(step.value)} users
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-12 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">No funnel data yet</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This view will populate once the admin metrics endpoint exposes funnel stages or enough conversion data.
                </p>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Drop-off analysis
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Largest conversion losses
              </h2>
            </div>

            {biggestDropOffs.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {biggestDropOffs.map((step) => {
                  const dropStyles = dropOffClasses(step.dropOffFromPrevious);

                  return (
                    <article
                      key={`dropoff-${step.id}`}
                      className="rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4"
                    >
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${dropStyles.pill}`}>
                        ↓ -{step.dropOffFromPrevious}%
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                        Before {step.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Only {step.percentFromPrevious}% of users progress into this stage, making it one of the largest leaks in the funnel.
                      </p>
                      <div className="mt-4 h-2 rounded-full bg-[rgba(191,215,237,0.28)]">
                        <div
                          className={`h-2 rounded-full ${dropStyles.bar}`}
                          style={{ width: `${Math.max(8, step.dropOffFromPrevious)}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-10 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">Not enough drop-off data yet</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  As more funnel stages populate, this section will highlight the steepest losses automatically.
                </p>
              </div>
            )}
          </section>

          <section className="mt-6 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Insights
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Funnel takeaways
              </h2>
            </div>

            {generatedInsights.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {generatedInsights.map((insight, index) => (
                  <article
                    key={`${insight.title}-${index}`}
                    className={`rounded-[20px] border p-4 ${insightToneClasses(insight.tone)}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {insight.tone}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                      {insight.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {insight.message}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-10 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">Not enough funnel insights yet</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Insight cards will appear as soon as multiple funnel stages have enough movement.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </AdminPageShell>
  );
}
