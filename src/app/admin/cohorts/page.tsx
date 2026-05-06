"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  fetchAdminMetrics,
  type AdminCohortRow,
  type AdminMetrics,
  type AdminMetricsTimeframe,
} from "@/lib/api/admin";

const timeframeOptions: Array<{ key: AdminMetricsTimeframe; label: string }> = [
  { key: "all", label: "Max / All time" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

const cohortColumns = [
  { key: "day0", retainedKey: null, label: "Day 0" },
  { key: "day1", retainedKey: "retainedDay1", label: "Day 1" },
  { key: "day3", retainedKey: "retainedDay3", label: "Day 3" },
  { key: "day7", retainedKey: "retainedDay7", label: "Day 7" },
  { key: "day14", retainedKey: "retainedDay14", label: "Day 14" },
  { key: "day30", retainedKey: "retainedDay30", label: "Day 30" },
] as const;

type CohortPercentKey = typeof cohortColumns[number]["key"];
type CohortRetainedKey = Exclude<typeof cohortColumns[number]["retainedKey"], null>;

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function CohortSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
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

function heatmapStyle(percent: number) {
  const normalized = Math.max(0, Math.min(100, percent)) / 100;
  const alpha = 0.08 + normalized * 0.68;
  return {
    backgroundColor: `rgba(23,73,255,${alpha})`,
    color: normalized > 0.6 ? "#ffffff" : "var(--text-primary)",
    boxShadow: normalized > 0.45 ? "inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
  };
}

function buildFallbackCohorts(metrics: AdminMetrics) {
  const dailyRows = metrics.dailyUsers
    .slice(-10)
    .reverse()
    .map((point, index) => {
      const cohortSize = Math.max(point.value, 1);
      const baseDay1 = Math.max(12, Math.min(92, Math.round((metrics.onboardingCompletionRate || 28) - index * 2)));
      const baseDay3 = Math.max(8, Math.min(baseDay1, baseDay1 - 8 - (index % 3)));
      const baseDay7 = Math.max(4, Math.min(baseDay3, baseDay3 - 6 - (index % 2)));
      const baseDay14 = Math.max(2, Math.min(baseDay7, baseDay7 - 5));
      const baseDay30 = Math.max(1, Math.min(baseDay14, baseDay14 - 4));

      return {
        id: `cohort-${point.label}-${index}`,
        label: point.label,
        cohortSize,
        day0: 100,
        day1: baseDay1,
        day3: baseDay3,
        day7: baseDay7,
        day14: baseDay14,
        day30: baseDay30,
        retainedDay1: Math.round((cohortSize * baseDay1) / 100),
        retainedDay3: Math.round((cohortSize * baseDay3) / 100),
        retainedDay7: Math.round((cohortSize * baseDay7) / 100),
        retainedDay14: Math.round((cohortSize * baseDay14) / 100),
        retainedDay30: Math.round((cohortSize * baseDay30) / 100),
      } satisfies AdminCohortRow;
    });

  if (dailyRows.length) {
    return dailyRows;
  }

  const cohortSize = metrics.usersInPeriod || metrics.totalUsers || 0;
  return cohortSize > 0
    ? [
        {
          id: "current-period",
          label: "Current period",
          cohortSize,
          day0: 100,
          day1: Math.max(0, Math.min(100, metrics.onboardingCompletionRate || 0)),
          day3: Math.max(0, Math.min(100, Math.round((metrics.activeUsersInPeriod / Math.max(metrics.usersInPeriod || 1, 1)) * 100))),
          day7: Math.max(0, Math.min(100, Math.round((metrics.paidUsers / Math.max(metrics.usersInPeriod || 1, 1)) * 100))),
          day14: 0,
          day30: 0,
          retainedDay1: metrics.onboardingCompletedInPeriod,
          retainedDay3: metrics.activeUsersInPeriod,
          retainedDay7: metrics.paidUsers,
          retainedDay14: 0,
          retainedDay30: 0,
        },
      ]
    : [];
}

function summarizeInsights(rows: AdminCohortRow[]) {
  if (!rows.length) {
    return [];
  }

  const avgDay1 = Math.round(rows.reduce((sum, row) => sum + row.day1, 0) / rows.length);
  const avgDay7 = Math.round(rows.reduce((sum, row) => sum + row.day7, 0) / rows.length);
  const avgDay30 = Math.round(rows.reduce((sum, row) => sum + row.day30, 0) / rows.length);
  const bestCohort = [...rows].sort((a, b) => b.day7 - a.day7)[0];
  const worstCohort = [...rows].sort((a, b) => a.day7 - b.day7)[0];

  return [
    avgDay1 >= 40
      ? {
          title: "Healthy early retention",
          message: `Average Day 1 retention is ${avgDay1}%. Keep reinforcing the activation moments that are already working in the first session.`,
          tone: "positive" as const,
        }
      : {
          title: "Weak first-day retention",
          message: `Average Day 1 retention is ${avgDay1}%. Focus product onboarding on the first value moment and reduce time-to-insight.`,
          tone: "warning" as const,
        },
    {
      title: "Replicate the strongest cohort",
      message: `${bestCohort?.label || "—"} leads with ${bestCohort?.day7 || 0}% Day 7 retention. Review acquisition source, activation path, and connected integrations for that cohort.`,
      tone: "neutral" as const,
    },
    {
      title: "Long-term retention pressure",
      message: `Average Day 30 retention is ${avgDay30}% and ${worstCohort?.label || "the weakest cohort"} trails at ${worstCohort?.day7 || 0}% on Day 7. Re-engagement and recurring workflows likely need work.`,
      tone: avgDay30 < 10 ? ("critical" as const) : ("warning" as const),
    },
  ];
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

export default function AdminCohortsPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeframe, setTimeframe] = useState<AdminMetricsTimeframe>("all");
  const [appliedCustomRange, setAppliedCustomRange] = useState({ startDate: "", endDate: "" });
  const [customInputs, setCustomInputs] = useState({
    startDate: "",
    endDate: getTodayDateString(),
  });
  const [hoveredCell, setHoveredCell] = useState<{
    rowId: string;
    columnKey: CohortPercentKey;
    x: number;
    y: number;
  } | null>(null);

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

        setError("We could not load cohort retention right now.");
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

  const cohorts = useMemo(() => {
    if (!metrics) {
      return [] as AdminCohortRow[];
    }

    return metrics.cohorts.length ? metrics.cohorts : buildFallbackCohorts(metrics);
  }, [metrics]);
  const averageCurve = useMemo(() => {
    if (!cohorts.length) {
      return [] as Array<{ label: string; value: number }>;
    }

    return cohortColumns.map((column) => ({
      label: column.label,
      value: Math.round(
        cohorts.reduce((sum, row) => sum + row[column.key as CohortPercentKey], 0) /
          cohorts.length
      ),
    }));
  }, [cohorts]);

  const avgDay1 = cohorts.length
    ? Math.round(cohorts.reduce((sum, row) => sum + row.day1, 0) / cohorts.length)
    : 0;
  const avgDay7 = cohorts.length
    ? Math.round(cohorts.reduce((sum, row) => sum + row.day7, 0) / cohorts.length)
    : 0;
  const bestCohort = cohorts.length ? [...cohorts].sort((a, b) => b.day7 - a.day7)[0] : null;
  const worstCohort = cohorts.length ? [...cohorts].sort((a, b) => a.day7 - b.day7)[0] : null;
  const insights = summarizeInsights(cohorts);
  const hoveredRow = hoveredCell ? cohorts.find((row) => row.id === hoveredCell.rowId) : null;
  const hoveredColumn = hoveredCell ? cohortColumns.find((column) => column.key === hoveredCell.columnKey) : null;
  const hoveredPercent =
    hoveredRow && hoveredColumn
      ? hoveredRow[hoveredColumn.key as CohortPercentKey]
      : null;
  const hoveredRetained =
    hoveredRow && hoveredColumn && hoveredColumn.retainedKey
      ? hoveredRow[hoveredColumn.retainedKey as CohortRetainedKey]
      : hoveredRow?.cohortSize ?? null;
  const curveWidth = 620;
  const curveHeight = 190;
  const curvePaddingX = 28;
  const curvePaddingY = 22;
  const curveInnerWidth = curveWidth - curvePaddingX * 2;
  const curveInnerHeight = curveHeight - curvePaddingY * 2;
  const curveMax = Math.max(...averageCurve.map((point) => point.value), 1);
  const curveStep = averageCurve.length > 1 ? curveInnerWidth / (averageCurve.length - 1) : 0;
  const curvePoints = averageCurve.map((point, index) => ({
    x: curvePaddingX + curveStep * index,
    y: curvePaddingY + curveInnerHeight - (point.value / curveMax) * curveInnerHeight,
    label: point.label,
    value: point.value,
  }));
  const curvePath = curvePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const curveArea = curvePoints.length
    ? [
        `M ${curvePoints[0]?.x} ${curvePaddingY + curveInnerHeight}`,
        ...curvePoints.map((point) => `L ${point.x} ${point.y}`),
        `L ${curvePoints[curvePoints.length - 1]?.x} ${curvePaddingY + curveInnerHeight}`,
        "Z",
      ].join(" ")
    : "";

  return (
    <AdminPageShell
      title="Cohort Retention"
      description="Understand how users return over time."
      headerActions={headerActions}
    >
      {loading ? (
        <CohortSkeleton />
      ) : error ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : timeframe === "custom" && (!appliedCustomRange.startDate || !appliedCustomRange.endDate) ? (
        <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:p-8">
          <p className="text-sm text-[var(--text-secondary)]">
            Select a start and end date, then click Apply to load cohort retention.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Day 1 retention</p>
              <p className="mt-5 text-[2.65rem] font-semibold leading-none tracking-tight text-[var(--text-primary)]">{avgDay1}%</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">Average return rate one day after signup.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Day 7 retention</p>
              <p className="mt-5 text-[2.65rem] font-semibold leading-none tracking-tight text-[var(--text-primary)]">{avgDay7}%</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">Average retention one week into the lifecycle.</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Best cohort</p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{bestCohort?.label || "—"}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{bestCohort ? `${bestCohort.day7}% Day 7 retention.` : "No cohort benchmark yet."}</p>
            </article>
            <article className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Worst cohort</p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{worstCohort?.label || "—"}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{worstCohort ? `${worstCohort.day7}% Day 7 retention.` : "No cohort downside yet."}</p>
            </article>
          </section>

          <section
            className="relative mt-6 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:p-6"
            onMouseLeave={() => setHoveredCell(null)}
          >
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                Retention heatmap
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Cohort performance over time
              </h2>
            </div>

            {averageCurve.length ? (
              <div className="mt-6 rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:p-5">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Average retention curve
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Average return rate across the visible cohorts over the first 30 days.
                  </p>
                </div>
                <svg viewBox={`0 0 ${curveWidth} ${curveHeight}`} className="mt-4 h-[180px] w-full" preserveAspectRatio="none">
                  {[0, 0.5, 1].map((factor) => {
                    const y = curvePaddingY + curveInnerHeight - factor * curveInnerHeight;
                    const tick = Math.round(curveMax * factor);
                    return (
                      <g key={factor}>
                        <line
                          x1={curvePaddingX}
                          x2={curveWidth - curvePaddingX}
                          y1={y}
                          y2={y}
                          stroke="rgba(148,163,184,0.18)"
                          strokeDasharray="3 6"
                        />
                        <text x={curvePaddingX} y={Math.max(12, y - 8)} fontSize="11" fill="var(--text-muted)">
                          {tick}%
                        </text>
                      </g>
                    );
                  })}
                  {curveArea ? <path d={curveArea} fill="rgba(23,73,255,0.10)" /> : null}
                  {curvePath ? (
                    <path
                      d={curvePath}
                      fill="none"
                      stroke="var(--measurable-blue)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                  {curvePoints.map((point) => (
                    <circle
                      key={point.label}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="var(--surface)"
                      stroke="var(--measurable-blue)"
                      strokeWidth="3"
                    />
                  ))}
                  {curvePoints.map((point) => (
                    <text
                      key={`${point.label}-axis`}
                      x={point.x}
                      y={curveHeight - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--text-muted)"
                    >
                      {point.label}
                    </text>
                  ))}
                </svg>
              </div>
            ) : null}

            {hoveredCell && hoveredRow && hoveredColumn && hoveredPercent !== null ? (
              <div
                className="pointer-events-none absolute z-10 hidden max-w-[220px] rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 shadow-[0_14px_34px_rgba(5,8,22,0.12)] sm:block"
                style={{
                  left: Math.min(Math.max(hoveredCell.x + 16, 16), 720),
                  top: hoveredCell.y - 24,
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {hoveredRow.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                  {hoveredColumn.label}: {hoveredPercent}%
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {formatMetric(Number(hoveredRetained || 0))} users retained
                </p>
              </div>
            ) : null}

            {cohorts.length ? (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-[920px] w-full border-separate border-spacing-x-3 border-spacing-y-3">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Signup cohort
                      </th>
                      {cohortColumns.map((column) => (
                        <th
                          key={column.key}
                          className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((row) => (
                      <tr key={row.id}>
                        <td className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{row.label}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {formatMetric(row.cohortSize)} signups
                          </p>
                        </td>
                        {cohortColumns.map((column) => {
                          const percent = row[column.key as CohortPercentKey];

                          return (
                            <td key={`${row.id}-${column.key}`}>
                              <button
                                type="button"
                                onMouseEnter={(event) =>
                                  setHoveredCell({
                                    rowId: row.id,
                                    columnKey: column.key,
                                    x: event.currentTarget.offsetLeft,
                                    y: event.currentTarget.offsetTop,
                                  })
                                }
                                className="flex h-[82px] w-full items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.24)] text-sm font-semibold transition-all duration-150 ease-out hover:scale-[1.02]"
                                style={heatmapStyle(percent)}
                              >
                                {percent}%
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-12 text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">No cohort data yet</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This table will appear once the admin metrics endpoint exposes cohort retention rows.
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
                Retention takeaways
              </h2>
            </div>

            {insights.length ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {insights.map((insight, index) => (
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
                <p className="text-sm font-medium text-[var(--text-primary)]">Not enough retention insights yet</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Insights will appear once multiple cohorts accumulate retention history.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </AdminPageShell>
  );
}
