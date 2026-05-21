"use client";

import { useState } from "react";

import type { ExecutiveDarkSeriesPoint } from "@/components/reports/report-view.helpers";
import { MEASURABLE_BRAND_LOGO_URL } from "@/lib/branding";
import { getLogoContentAspectRatio } from "@/lib/reports/logo";
import { formatNumber } from "@/lib/formatters";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 280;
const CHART_PADDING_X = 12;
const CHART_PADDING_Y = 10;

type MetricChartSeries = {
  label: string;
  sourceType?: string;
  points: ExecutiveDarkSeriesPoint[];
};

type ResolvedChartSeries = {
  label: string;
  sourceType?: string;
  color: string;
  values: Array<number | null>;
};

const CHART_COLOR_PALETTE = [
  "#3b82f6",
  "#a855f7",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
] as const;

export function formatInsightDate(value: string) {
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(isoCandidate);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatReachTooltipDate(value: string) {
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(isoCandidate);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMetricValue(value: number) {
  return formatNumber(value, 0);
}

function buildReachPath(
  values: Array<number | null>,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
  minValue: number,
  range: number
) {
  if (values.length === 0) {
    return "";
  }

  const plotWidth = Math.max(width - paddingX * 2, 1);
  const plotHeight = Math.max(height - paddingY * 2, 1);
  const commands: string[] = [];
  let hasStarted = false;

  values.forEach((pointValue, index) => {
      if (pointValue === null) {
        hasStarted = false;
        return;
      }

      const x =
        values.length === 1
          ? paddingX + plotWidth / 2
          : paddingX + (index / (values.length - 1)) * plotWidth;
      const y = paddingY + plotHeight - ((pointValue - minValue) / range) * plotHeight;
      commands.push(`${hasStarted ? "L" : "M"} ${x} ${y}`);
      hasStarted = true;
    })
  ;

  return commands.join(" ");
}

function buildReachAreaPath(
  path: string,
  startX: number,
  endX: number,
  baselineY: number
) {
  if (!path) {
    return "";
  }

  return `${path} L ${endX} ${baselineY} L ${startX} ${baselineY} Z`;
}

function getPointPosition(
  pointValue: number,
  index: number,
  totalPoints: number,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number,
  minValue: number,
  range: number
) {
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const x =
    totalPoints === 1
      ? paddingX + plotWidth / 2
      : paddingX + (index / (totalPoints - 1)) * plotWidth;
  const y = paddingY + plotHeight - ((pointValue - minValue) / range) * plotHeight;

  return { x, y };
}

function getNearestPointIndex(
  clientX: number,
  bounds: DOMRect,
  pointsLength: number,
  chartWidth: number,
  paddingX: number
) {
  if (pointsLength <= 1) {
    return 0;
  }

  const relativeX = ((clientX - bounds.left) / bounds.width) * chartWidth;
  const clampedX = Math.min(Math.max(relativeX, paddingX), chartWidth - paddingX);
  const plotWidth = chartWidth - paddingX * 2;
  const ratio = (clampedX - paddingX) / plotWidth;

  return Math.min(
    pointsLength - 1,
    Math.max(0, Math.round(ratio * (pointsLength - 1)))
  );
}

function getTooltipPosition(x: number, width: number) {
  const percentage = (x / width) * 100;

  if (percentage <= 18) {
    return {
      left: `calc(${percentage}% + 12px)`,
      transform: "translateX(0)",
    };
  }

  if (percentage >= 82) {
    return {
      left: `calc(${percentage}% - 12px)`,
      transform: "translateX(-100%)",
    };
  }

  return {
    left: `${percentage}%`,
    transform: "translateX(-50%)",
  };
}

function resolveSeriesColor(label: string, sourceType: string | undefined, index: number) {
  const haystack = `${sourceType || ""} ${label}`.toLowerCase();

  if (haystack.includes("facebook")) {
    return "#3b82f6";
  }

  if (haystack.includes("instagram")) {
    return "#a855f7";
  }

  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length];
}

function buildMultiSeriesInput(
  points: ExecutiveDarkSeriesPoint[],
  series: MetricChartSeries[] | undefined
) {
  if (!series || series.length < 2) {
    return null;
  }

  const labels = new Map<string, { date: string; label: string }>();

  series.forEach((entry) => {
    entry.points.forEach((point) => {
      const key = point.date || point.label;

      if (!labels.has(key)) {
        labels.set(key, {
          date: point.date,
          label: point.label || point.date,
        });
      }
    });
  });

  if (labels.size === 0 && points.length > 0) {
    points.forEach((point) => {
      const key = point.date || point.label;
      labels.set(key, {
        date: point.date,
        label: point.label || point.date,
      });
    });
  }

  const categories = Array.from(labels.values());
  const resolvedSeries = series.map((entry, index) => {
    const pointMap = new Map(
      entry.points.map((point) => [point.date || point.label, point.value] as const)
    );

    return {
      label: entry.label,
      sourceType: entry.sourceType,
      color: resolveSeriesColor(entry.label, entry.sourceType, index),
      values: categories.map((category) => {
        const key = category.date || category.label;
        return pointMap.has(key) ? pointMap.get(key) ?? null : null;
      }),
    } satisfies ResolvedChartSeries;
  });

  return {
    categories,
    resolvedSeries,
  };
}

export function MetricDailyChart({
  points,
  series,
  isAvailable,
  metricLabel = "Espectadores",
  dark = true,
  slideNumber,
  metricKey,
  placeholderText,
}: {
  points: ExecutiveDarkSeriesPoint[];
  series?: MetricChartSeries[];
  isAvailable: boolean;
  metricLabel?: string;
  dark?: boolean;
  slideNumber?: string;
  metricKey?: string;
  placeholderText?: string;
}) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const multiSeriesInput = buildMultiSeriesInput(points, series);
  const hasMultiSeries = Boolean(
    multiSeriesInput && multiSeriesInput.resolvedSeries.length >= 2
  );
  const categories = multiSeriesInput?.categories || points;
  const resolvedSeries = multiSeriesInput?.resolvedSeries || [];
  const missingSeriesMessages = resolvedSeries
    .filter((entry) => entry.values.every((value) => value === null))
    .map((entry) => `${entry.label} did not provide daily trend data for this period.`);
  const hasAnyMultiSeriesData = resolvedSeries.some((entry) =>
    entry.values.some((value) => value !== null)
  );

  if (process.env.NODE_ENV === "development") {
    console.info("[ReportChart][metric.daily]", {
      slide_number: slideNumber || null,
      metric_key: metricKey || metricLabel,
      daily_series_length: points.length,
      daily_series_values: points.map((point) => point.value),
      chart_props_recibidos: {
        isAvailable,
        metricLabel,
        seriesCount: series?.length || 0,
        hasMultiSeries,
        hasAnyMultiSeriesData,
      },
    });
  }

  if ((!isAvailable || points.length === 0) && !hasAnyMultiSeriesData) {
    return (
      <div
        className={`relative overflow-visible rounded-[30px] border p-6 ${
          dark
            ? "border-white/10 bg-white/[0.04]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            dark
              ? "bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]"
              : "bg-[linear-gradient(180deg,rgba(14,165,233,0.06)_0%,transparent_100%)]"
          }`}
        />
        <div className="relative">
          <div className="grid h-[280px] grid-rows-4 gap-0">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className={dark ? "border-b border-white/10" : "border-b border-slate-200"}
              />
            ))}
          </div>
          <p className={`mt-5 text-sm leading-6 ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {placeholderText || "Daily metric series is not available for this report yet."}
          </p>
        </div>
      </div>
    );
  }

  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const paddingX = CHART_PADDING_X;
  const paddingY = CHART_PADDING_Y;
  const baselineY = height - paddingY;
  const categoryCount = categories.length;
  const midIndex = Math.floor(categoryCount / 2);
  const lastIndex = categoryCount - 1;
  const numericValues = hasMultiSeries
    ? resolvedSeries.flatMap((entry) => entry.values.filter((value): value is number => value !== null))
    : points.map((point) => point.value);
  const maxValue = Math.max(...numericValues, 0);
  const minValue = Math.min(...numericValues, 0);
  const range = Math.max(maxValue - minValue, 1);
  const plotHeight = height - paddingY * 2;
  const xAxisPadding = `${(paddingX / width) * 100}%`;
  const activeCategory =
    activePointIndex === null ? null : (categories[activePointIndex] ?? null);
  const activeValues = activePointIndex === null
    ? []
    : hasMultiSeries
      ? resolvedSeries
          .map((entry) => ({
            label: entry.label,
            color: entry.color,
            value: entry.values[activePointIndex] ?? null,
          }))
          .filter((entry) => entry.value !== null)
      : [];
  const activePrimaryValue =
    activePointIndex === null
      ? null
      : hasMultiSeries
        ? activeValues[0]?.value ?? null
        : points[activePointIndex]?.value ?? null;
  const activeCoordinates =
    activePrimaryValue !== null && activePointIndex !== null
      ? getPointPosition(
          activePrimaryValue,
          activePointIndex,
          categoryCount,
          width,
          height,
          paddingX,
          paddingY,
          minValue,
          range
        )
      : null;
  const tooltipPosition = activeCoordinates
    ? getTooltipPosition(activeCoordinates.x, width)
    : null;
  const yAxisValues = [
    maxValue,
    Math.round(maxValue * 0.66),
    Math.round(maxValue * 0.33),
    0,
  ];
  const pointCoordinates = points.map((point, index) =>
    getPointPosition(
      point.value,
      index,
      points.length,
      width,
      height,
      paddingX,
      paddingY,
      minValue,
      range
    )
  );
  const multiSeriesCoordinates = resolvedSeries.map((entry) =>
    entry.values.map((value, index) =>
      value === null
        ? null
        : getPointPosition(
            value,
            index,
            categoryCount,
            width,
            height,
            paddingX,
            paddingY,
            minValue,
            range
          )
    )
  );

  function handleChartMove(event: React.MouseEvent<HTMLDivElement>) {
    setActivePointIndex(
      getNearestPointIndex(
        event.clientX,
        event.currentTarget.getBoundingClientRect(),
        categoryCount,
        width,
        paddingX
      )
    );
  }

  function clearActivePoint() {
    setActivePointIndex(null);
  }

  return (
    <div
      className={`relative overflow-visible rounded-[30px] border p-6 ${
        dark
          ? "border-white/10 bg-white/[0.04]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          dark
            ? "bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]"
            : "bg-[linear-gradient(180deg,rgba(14,165,233,0.06)_0%,transparent_100%)]"
        }`}
      />
      <div className="relative">
        {activeCategory && activeCoordinates ? (
          <div
            className={`absolute z-[9999] pointer-events-none rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md ${
              dark
                ? "border-sky-300/30 bg-slate-950/92 text-white"
                : "border-sky-200 bg-white/95 text-slate-950"
            }`}
            style={{
              left: tooltipPosition?.left,
              top: `calc(${(activeCoordinates.y / height) * 100}% - 74px)`,
              transform: tooltipPosition?.transform,
            }}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-sky-300" : "text-sky-700"}`}>
              {metricLabel}
            </p>
            {hasMultiSeries ? (
              <div className="mt-2 space-y-1.5">
                {activeValues.map((entry) => (
                  <div key={entry.label} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className={dark ? "text-slate-200" : "text-slate-700"}>{entry.label}</span>
                    <span className="font-semibold">{formatMetricValue(entry.value as number)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-lg font-semibold">{formatMetricValue(activePrimaryValue ?? 0)}</p>
            )}
            <p className={`mt-1 whitespace-nowrap text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>
              {formatReachTooltipDate(activeCategory?.date || activeCategory?.label || "")}
            </p>
          </div>
        ) : null}
        {hasMultiSeries ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {resolvedSeries.map((entry) => (
              <div
                key={entry.label}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  dark
                    ? "border-white/10 bg-white/[0.04] text-slate-200"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.label}
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-[56px_560px] gap-4">
          <div className="relative h-[280px] text-right text-[11px] font-medium tabular-nums">
            {yAxisValues.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className={`absolute right-0 -translate-y-1/2 ${dark ? "text-slate-500" : "text-slate-400"}`}
                style={{
                  top: `${((paddingY + (index / (yAxisValues.length - 1)) * plotHeight) / height) * 100}%`,
                }}
              >
                {formatMetricValue(value)}
              </span>
            ))}
          </div>
          <div className="relative" style={{ width: `${CHART_WIDTH}px` }}>
            <div className="relative" style={{ width: `${CHART_WIDTH}px`, height: `${CHART_HEIGHT}px` }}>
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className={`absolute inset-x-0 border-b ${dark ? "border-white/10" : "border-slate-200"}`}
                  style={{
                    top: `${((paddingY + (row / 3) * plotHeight) / height) * 100}%`,
                  }}
                />
              ))}
              <svg
                viewBox={`0 0 ${width} ${height}`}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                className="absolute inset-0"
                aria-hidden="true"
              >
                {hasMultiSeries ? (
                  <>
                    {resolvedSeries.map((entry, seriesIndex) => {
                      const path = buildReachPath(
                        entry.values,
                        width,
                        height,
                        paddingX,
                        paddingY,
                        minValue,
                        range
                      );

                      return (
                        <g key={`${entry.label}-${seriesIndex}`}>
                          <path
                            d={path}
                            fill="none"
                            stroke={entry.color}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {multiSeriesCoordinates[seriesIndex]?.map((coordinate, pointIndex) => {
                            if (!coordinate) {
                              return null;
                            }

                            const pointValue = entry.values[pointIndex];

                            if (pointValue === null) {
                              return null;
                            }

                            return (
                              <circle
                                key={`${entry.label}-${pointIndex}`}
                                cx={coordinate.x}
                                cy={coordinate.y}
                                r="4.5"
                                fill={dark ? "#0b1728" : "#ffffff"}
                                stroke={entry.color}
                                strokeWidth="2"
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <path
                      d={buildReachAreaPath(
                        buildReachPath(
                          points.map((point) => point.value),
                          width,
                          height,
                          paddingX,
                          paddingY,
                          minValue,
                          range
                        ),
                        paddingX,
                        width - paddingX,
                        baselineY
                      )}
                      fill={dark ? "rgba(56,189,248,0.10)" : "rgba(14,165,233,0.12)"}
                    />
                    <path
                      d={buildReachPath(
                        points.map((point) => point.value),
                        width,
                        height,
                        paddingX,
                        paddingY,
                        minValue,
                        range
                      )}
                      fill="none"
                      stroke={dark ? "rgba(125,211,252,0.9)" : "rgba(2,132,199,0.85)"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pointCoordinates.map(({ x, y }, index) => {
                      const point = points[index];
                      return (
                        <circle
                          key={`${point.date}-${index}`}
                          cx={x}
                          cy={y}
                          r="4.5"
                          fill={dark ? "#0b1728" : "#ffffff"}
                          stroke={dark ? "rgba(125,211,252,0.95)" : "rgba(2,132,199,0.9)"}
                          strokeWidth="2"
                        />
                      );
                    })}
                  </>
                )}
                {activeCategory && activeCoordinates ? (
                  <>
                    <line
                      x1={activeCoordinates.x}
                      y1={paddingY}
                      x2={activeCoordinates.x}
                      y2={baselineY}
                      stroke={dark ? "rgba(125,211,252,0.28)" : "rgba(2,132,199,0.22)"}
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                    />
                    <circle
                      cx={activeCoordinates.x}
                      cy={activeCoordinates.y}
                      r="7"
                      fill={dark ? "rgba(125,211,252,0.22)" : "rgba(2,132,199,0.16)"}
                    />
                    <circle
                      cx={activeCoordinates.x}
                      cy={activeCoordinates.y}
                      r="5"
                      fill={dark ? "#7dd3fc" : "#0284c7"}
                      stroke={dark ? "#0b1728" : "#ffffff"}
                      strokeWidth="2"
                    />
                  </>
                ) : null}
              </svg>
              <div
                className="absolute inset-0"
                onMouseMove={handleChartMove}
                onMouseEnter={handleChartMove}
                onMouseLeave={clearActivePoint}
              />
            </div>
          </div>
        </div>
        <div
          className="mt-5 grid grid-cols-3 items-center text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ paddingLeft: xAxisPadding, paddingRight: xAxisPadding }}
        >
          <span className={`truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {categories[0]?.label || "Start"}
          </span>
          <span className={`truncate text-center ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {categories[midIndex]?.label || "Mid"}
          </span>
          <span className={`truncate text-right ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {categories[lastIndex]?.label || "End"}
          </span>
        </div>
        {missingSeriesMessages.length > 0 ? (
          <div className="mt-4 space-y-2">
            {missingSeriesMessages.map((message) => (
              <p
                key={message}
                className={`text-sm leading-6 ${dark ? "text-slate-400" : "text-slate-500"}`}
              >
                {message}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CoverLogo({
  logoDataUrl,
  dark = true,
}: {
  logoDataUrl: string | null;
  dark?: boolean;
}) {
  const resolvedLogoUrl = logoDataUrl?.trim() || MEASURABLE_BRAND_LOGO_URL;
  const [logoRatio, setLogoRatio] = useState(1);
  const isSquareLogo = logoRatio >= 0.72 && logoRatio <= 1.32;
  const isHorizontalLogo = logoRatio > 1.32;
  const frameWidth = isSquareLogo ? 1440 : isHorizontalLogo ? 1890 : 1530;
  const frameHeight = isSquareLogo ? 1440 : isHorizontalLogo ? 810 : 1440;
  const imageWidth = isSquareLogo ? 1440 : isHorizontalLogo ? 1890 : 1530;
  const imageHeight = isSquareLogo ? 1440 : isHorizontalLogo ? 810 : 1440;

  return (
    <div
      className="pointer-events-none absolute right-0 top-1/2 flex w-[46%] -translate-y-1/2 items-center justify-end"
    >
      <div
        className={`flex items-center justify-center rounded-[40px] border p-10 ${
          dark
            ? "border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] shadow-[0_30px_80px_rgba(2,6,23,0.28)]"
            : "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_18px_40px_rgba(37,99,235,0.10)]"
        }`}
        style={{
          width: `${frameWidth}px`,
          height: `${frameHeight}px`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedLogoUrl}
          alt="Brand logo"
          data-report-logo="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="block h-full w-full object-contain object-center"
          style={{
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
          }}
          onLoad={(event) =>
            setLogoRatio(getLogoContentAspectRatio(event.currentTarget))
          }
        />
      </div>
    </div>
  );
}
