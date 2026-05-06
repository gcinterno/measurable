"use client";

import { useEffect, useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import {
  fetchAdminMetrics,
  type AdminMetricGrowthKey,
  type AdminOverviewInsight,
  type AdminMetricsSeriesPoint,
  type AdminMetrics,
  type AdminMetricsTimeframe,
} from "@/lib/api/admin";

const timeframeOptions: Array<{ key: AdminMetricsTimeframe; label: string }> = [
  { key: "all", label: "Max / All time" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

const metricCards: Array<{ key: keyof AdminMetrics; label: string; format?: "currency" | "percent" }> = [
  { key: "totalUsers", label: "Total users" },
  { key: "usersInPeriod", label: "Users in selected period" },
  { key: "activeUsersInPeriod", label: "Active users in selected period" },
  { key: "reportsGenerated", label: "Reports generated" },
  { key: "reportsInPeriod", label: "Reports in selected period" },
  { key: "onboardingCompletedInPeriod", label: "Onboarding completed in selected period" },
  { key: "onboardingCompletionRate", label: "Onboarding completion rate", format: "percent" },
  { key: "freeUsers", label: "Free users" },
  { key: "paidUsers", label: "Paid users" },
  { key: "mrr", label: "MRR", format: "currency" },
];

const chartCards: Array<{
  key: "dailyUsers" | "dailyReports" | "cumulativeUsers";
  title: string;
  description: string;
  metricLabel: string;
  variant: "bar" | "line";
}> = [
  {
    key: "dailyUsers",
    title: "New users over time",
    description: "Tracks daily acquisition inside the selected timeframe.",
    metricLabel: "users",
    variant: "bar",
  },
  {
    key: "dailyReports",
    title: "Reports generated over time",
    description: "Shows report creation activity trend across the period.",
    metricLabel: "reports",
    variant: "bar",
  },
  {
    key: "cumulativeUsers",
    title: "Cumulative user growth",
    description: "Visualizes total user base expansion over time.",
    metricLabel: "total users",
    variant: "line",
  },
];

function formatMetric(value: number, format?: "currency" | "percent") {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (format === "percent") {
    return `${value}%`;
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatGrowth(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return { label: "No change data", tone: "muted" as const };
  }

  if (value > 0) {
    return { label: `+${value}%`, tone: "positive" as const };
  }

  if (value < 0) {
    return { label: `${value}%`, tone: "negative" as const };
  }

  return { label: "0%", tone: "muted" as const };
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (!points.length) {
    return "";
  }

  return [
    `M ${points[0]?.x} ${baselineY}`,
    ...points.map((point, index) => `${index === 0 ? "L" : "L"} ${point.x} ${point.y}`),
    `L ${points[points.length - 1]?.x} ${baselineY}`,
    "Z",
  ].join(" ");
}

function formatReadableDate(value: string) {
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

function formatAxisDate(value: string, mode: "short" | "month") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", mode === "month"
    ? {
        month: "short",
      }
    : {
        month: "short",
        day: "numeric",
      }).format(date);
}

function getAxisIndexes(data: AdminMetricsSeriesPoint[]) {
  if (data.length <= 1) {
    return [0];
  }

  if (data.length <= 5) {
    return data.map((_, index) => index);
  }

  if (data.length <= 16) {
    return [0, Math.floor((data.length - 1) / 2), data.length - 1];
  }

  return [0, Math.floor((data.length - 1) / 3), Math.floor(((data.length - 1) * 2) / 3), data.length - 1];
}

function getAxisDateMode(data: AdminMetricsSeriesPoint[]) {
  if (data.length > 45) {
    return "month" as const;
  }

  const first = new Date(data[0]?.label ?? "");
  const last = new Date(data[data.length - 1]?.label ?? "");

  if (!Number.isNaN(first.getTime()) && !Number.isNaN(last.getTime())) {
    const diffDays = Math.abs(last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 45 ? "month" : "short";
  }

  return "short" as const;
}

function getMetricSummary(data: AdminMetricsSeriesPoint[], variant: "bar" | "line", metricLabel: string) {
  if (!data.length) {
    return "Not enough data yet";
  }

  if (variant === "line") {
    const latest = data[data.length - 1]?.value ?? 0;
    return `${formatMetric(latest)} ${metricLabel}`;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  return `${formatMetric(total)} ${metricLabel} in selected period`;
}

function getMetricSummaryValue(data: AdminMetricsSeriesPoint[], variant: "bar" | "line") {
  if (!data.length) {
    return "0";
  }

  if (variant === "line") {
    return formatMetric(data[data.length - 1]?.value ?? 0);
  }

  return formatMetric(data.reduce((sum, item) => sum + item.value, 0));
}

function SimpleTrendChart({
  data,
  title,
  metricLabel,
  variant,
}: {
  data: AdminMetricsSeriesPoint[];
  title: string;
  metricLabel: string;
  variant: "bar" | "line";
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const meaningfulData =
    data.length >= 2 && data.some((item) => item.value > 0);

  if (!meaningfulData) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Not enough data yet
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {title} will appear once this timeframe has more activity.
          </p>
        </div>
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const left = 20;
  const right = 20;
  const top = 18;
  const bottom = 42;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  const linePoints = data.map((item, index) => ({
    x: left + step * index,
    y: top + innerHeight - (item.value / maxValue) * innerHeight,
  }));
  const barWidth = Math.max(12, Math.min(28, innerWidth / Math.max(data.length * 1.7, 8)));
  const axisTicks = [0, 0.33, 0.66, 1].map((factor) => Math.round(maxValue * factor));
  const labelIndexes = getAxisIndexes(data);
  const axisDateMode = getAxisDateMode(data);
  const hoverItem = hoveredIndex !== null ? data[hoveredIndex] ?? null : null;
  const hoverPoint = hoveredIndex !== null ? linePoints[hoveredIndex] ?? null : null;
  const summary = getMetricSummary(data, variant, metricLabel);
  const summaryValue = getMetricSummaryValue(data, variant);
  const baselineY = top + innerHeight;

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {summaryValue}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Selected period
          </p>
        </div>
        <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {metricLabel}
        </div>
      </div>
      {hoverItem && hoverPoint ? (
        <div
          className="pointer-events-none absolute z-10 hidden max-w-[180px] -translate-x-1/2 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 shadow-[0_14px_34px_rgba(5,8,22,0.12)] sm:block"
          style={{
            left: `${Math.min(88, Math.max(14, (hoverPoint.x / width) * 100))}%`,
            top: "18px",
          }}
        >
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">
            {formatReadableDate(hoverItem.label)}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {formatMetric(hoverItem.value)} {metricLabel}
          </p>
        </div>
      ) : null}
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{summary}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full sm:h-[260px]" preserveAspectRatio="none">
        {axisTicks.map((tick, index) => {
          const y = top + innerHeight - (tick / maxValue) * innerHeight;

          return (
            <g key={`${tick}-${index}`}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.22)"
                strokeDasharray="3 6"
              />
              <text
                x={left}
                y={Math.max(12, y - 8)}
                fontSize="11"
                fill="var(--text-muted)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {variant === "line" ? (
          <path
            d={buildAreaPath(linePoints, baselineY)}
            fill="rgba(23,73,255,0.10)"
            stroke="none"
          />
        ) : null}

        {variant === "line" && hoverPoint ? (
          <line
            x1={hoverPoint.x}
            x2={hoverPoint.x}
            y1={top}
            y2={top + innerHeight}
            stroke="rgba(23,73,255,0.18)"
            strokeDasharray="4 6"
          />
        ) : null}

        {variant === "bar"
          ? data.map((item, index) => {
              const x = left + (innerWidth / data.length) * index + ((innerWidth / data.length) - barWidth) / 2;
              const barHeight = (item.value / maxValue) * innerHeight;
              const y = top + innerHeight - barHeight;
              const isHovered = hoveredIndex === index;

              return (
                <rect
                  key={`${item.label}-${index}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 4)}
                  rx="10"
                  fill={isHovered ? "rgba(15,59,230,1)" : "rgba(23,73,255,0.72)"}
                  style={{
                    filter: isHovered ? "drop-shadow(0 10px 18px rgba(23,73,255,0.22))" : "none",
                    transition: "all 150ms ease",
                  }}
                />
              );
            })
          : (
            <>
              <path
                d={buildLinePath(linePoints)}
                fill="none"
                stroke="var(--measurable-blue)"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{
                  filter: "drop-shadow(0 8px 18px rgba(23,73,255,0.14))",
                }}
              />
              {linePoints.map((point, index) => (
                <circle
                  key={`${data[index]?.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === index ? "5.5" : "0"}
                  fill="var(--surface)"
                  stroke="var(--measurable-blue)"
                  strokeWidth="3"
                  style={{
                    transition: "all 150ms ease",
                  }}
                />
              ))}
            </>
          )}

        {data.map((item, index) => {
          const segmentWidth =
            variant === "bar"
              ? innerWidth / data.length
              : data.length > 1
                ? innerWidth / (data.length - 1)
                : innerWidth;
          const x =
            variant === "bar"
              ? left + segmentWidth * index
              : (linePoints[index]?.x ?? left) - segmentWidth / 2;

          return (
            <rect
              key={`${item.label}-hover-zone`}
              x={Math.max(left, x)}
              y={top}
              width={variant === "bar" ? segmentWidth : Math.max(segmentWidth, 24)}
              height={innerHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}

        {labelIndexes.map((index) => {
          const item = data[index];
          if (!item) {
            return null;
          }

          const x =
            variant === "bar"
              ? left + (innerWidth / data.length) * index + (innerWidth / data.length) / 2
              : linePoints[index]?.x ?? left;

          return (
            <text
              key={`${item.label}-label`}
              x={x}
              y={height - 12}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-muted)"
            >
              {formatAxisDate(item.label, axisDateMode)}
            </text>
          );
        })}
      </svg>
      {hoverItem ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-3 sm:hidden">
          <p className="text-xs text-[var(--text-secondary)]">
            {formatReadableDate(hoverItem.label)}
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {formatMetric(hoverItem.value)} {metricLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <article className="brand-card p-5">
      <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      <div className="mt-3 h-4 w-36 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      <div className="mt-5 h-[260px] animate-pulse rounded-[20px] bg-[var(--surface-soft)]" />
    </article>
  );
}

function insightStyles(severity: AdminOverviewInsight["severity"]) {
  switch (severity) {
    case "positive":
      return {
        icon: "↗",
        label: "Growth",
        action: "Double down on the channels driving this momentum.",
        card: "border-emerald-200 bg-emerald-50/70",
        iconWrap: "bg-emerald-100 text-emerald-700",
        title: "text-emerald-900",
      };
    case "warning":
      return {
        icon: "!",
        label: "Attention",
        action: "Review the funnel and remove friction in the next step.",
        card: "border-amber-200 bg-amber-50/70",
        iconWrap: "bg-amber-100 text-amber-700",
        title: "text-amber-900",
      };
    case "critical":
      return {
        icon: "!",
        label: "Critical",
        action: "Prioritize remediation before the issue impacts more accounts.",
        card: "border-red-200 bg-red-50/70",
        iconWrap: "bg-red-100 text-red-700",
        title: "text-red-900",
      };
    default:
      return {
        icon: "•",
        label: "Insight",
        action: "Monitor this trend and compare it against the next reporting period.",
        card: "border-[var(--border-soft)] bg-[var(--surface-soft)]",
        iconWrap: "bg-[var(--surface)] text-[var(--text-secondary)]",
        title: "text-[var(--text-primary)]",
      };
  }
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeframe, setTimeframe] = useState<AdminMetricsTimeframe>("all");
  const [appliedCustomRange, setAppliedCustomRange] = useState(() => ({
    startDate: "",
    endDate: "",
  }));
  const [customInputs, setCustomInputs] = useState(() => ({
    startDate: "",
    endDate: getTodayDateString(),
  }));

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

        setError("We could not load admin metrics right now.");
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

  const timeframeControls = (
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
                setCustomInputs((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
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
                setCustomInputs((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              className="h-11 rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-150 ease-out focus:border-[var(--measurable-blue)]"
            />
          </label>
          <button
            type="button"
            disabled={customRangeInvalid}
            onClick={() => {
              setError("");
              setAppliedCustomRange({
                startDate: customInputs.startDate,
                endDate: customInputs.endDate,
              });
            }}
            className="h-11 rounded-[14px] bg-[var(--measurable-blue)] px-4 text-sm font-semibold text-white transition-all duration-150 ease-out hover:bg-[var(--measurable-blue-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      ) : null}
    </section>
  );

  return (
    <AdminPageShell
      title="Admin overview"
      description="Monitor core SaaS health, growth, onboarding, and monetization metrics."
      headerActions={timeframeControls}
    >
      {loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="brand-card p-5">
              <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-soft)]" />
              <div className="mt-4 h-10 w-24 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" />
            </div>
          ))}
        </section>
      ) : error ? (
        <section className="brand-card p-6 sm:p-8">
          <p className="text-sm text-red-600">{error}</p>
        </section>
      ) : timeframe === "custom" && (!appliedCustomRange.startDate || !appliedCustomRange.endDate) ? (
        <section className="brand-card p-6 sm:p-8">
          <p className="text-sm text-[var(--text-secondary)]">
            Select a start and end date, then click Apply to load metrics.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <article
              key={card.key}
              className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    {card.label}
                  </p>
                </div>
                {(() => {
                  const growth = formatGrowth(
                    metrics?.growth?.[card.key as AdminMetricGrowthKey]
                  );
                  const toneClasses =
                    growth.tone === "positive"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : growth.tone === "negative"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-secondary)]";

                  return (
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>
                      {growth.label}
                    </span>
                  );
                })()}
              </div>
              <p className="mt-10 text-[2.65rem] font-semibold leading-none tracking-tight text-[var(--text-primary)]">
                {formatMetric(metrics?.[card.key] || 0, card.format)}
              </p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Updated for the currently selected timeframe.
              </p>
            </article>
          ))}
        </section>
      )}

      {loading ? (
        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <ChartSkeleton key={index} />
          ))}
        </section>
      ) : !error && metrics ? (
        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          {chartCards.map((chart) => (
            <article key={chart.key} className="brand-card p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
                {chart.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {chart.description}
              </p>
              <div className="mt-5">
                <SimpleTrendChart
                  data={metrics[chart.key]}
                  title={chart.title}
                  metricLabel={chart.metricLabel}
                  variant={chart.variant}
                />
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="mt-6 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
              Insights
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Decision signals from your admin data
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Use these prompts to spot momentum, friction, and monetization opportunities earlier.
            </p>
          </div>

          {metrics?.insights?.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {metrics.insights.map((insight) => {
                const styles = insightStyles(insight.severity);

                return (
                  <article
                    key={insight.id}
                    className={`rounded-[18px] border p-4 transition-all duration-150 ease-out ${styles.card}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold ${styles.iconWrap}`}>
                        {styles.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            {styles.label}
                          </p>
                          <span className="inline-flex rounded-full border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.6)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            {insight.severity}
                          </span>
                        </div>
                        <h3 className={`mt-2 text-base font-semibold ${styles.title}`}>
                          {styles.label}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                          {insight.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {insight.message}
                        </p>
                        <div className="mt-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.55)] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                            Suggested action
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-primary)]">
                            {styles.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[18px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No insights yet.
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Data will appear as your platform grows.
              </p>
            </div>
          )}
        </section>
      ) : null}
    </AdminPageShell>
  );
}
