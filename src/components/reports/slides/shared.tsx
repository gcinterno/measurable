"use client";

import { useState } from "react";

import type { ExecutiveDarkSeriesPoint } from "@/components/reports/report-view.helpers";
import { getLogoContentAspectRatio } from "@/lib/reports/logo";
import { formatNumber } from "@/lib/formatters";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 280;
const CHART_PADDING_X = 12;
const CHART_PADDING_Y = 10;

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
  points: ExecutiveDarkSeriesPoint[],
  width: number,
  height: number,
  paddingX: number,
  paddingY: number
) {
  if (points.length === 0) {
    return "";
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const plotWidth = Math.max(width - paddingX * 2, 1);
  const plotHeight = Math.max(height - paddingY * 2, 1);

  return points
    .map((point, index) => {
      const x =
        points.length === 1
          ? paddingX + plotWidth / 2
          : paddingX + (index / (points.length - 1)) * plotWidth;
      const y = paddingY + plotHeight - ((point.value - minValue) / range) * plotHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
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

function getReachPointPosition(
  point: ExecutiveDarkSeriesPoint,
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
  const y = paddingY + plotHeight - ((point.value - minValue) / range) * plotHeight;

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

export function MetricDailyChart({
  points,
  isAvailable,
  metricLabel = "Espectadores",
  dark = true,
}: {
  points: ExecutiveDarkSeriesPoint[];
  isAvailable: boolean;
  metricLabel?: string;
  dark?: boolean;
}) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (!isAvailable || points.length === 0) {
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
            Daily metric series is not available for this report yet.
          </p>
        </div>
      </div>
    );
  }

  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const paddingX = CHART_PADDING_X;
  const paddingY = CHART_PADDING_Y;
  const path = buildReachPath(points, width, height, paddingX, paddingY);
  const baselineY = height - paddingY;
  const areaPath = buildReachAreaPath(path, paddingX, width - paddingX, baselineY);
  const midIndex = Math.floor(points.length / 2);
  const lastIndex = points.length - 1;
  const maxValue = Math.max(...points.map((point) => point.value), 0);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const plotHeight = height - paddingY * 2;
  const xAxisPadding = `${(paddingX / width) * 100}%`;
  const activePoint =
    activePointIndex === null ? null : (points[activePointIndex] ?? null);
  const activeCoordinates =
    activePoint && activePointIndex !== null
      ? getReachPointPosition(
          activePoint,
          activePointIndex,
          points.length,
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
    getReachPointPosition(
      point,
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

  function handleChartMove(event: React.MouseEvent<HTMLDivElement>) {
    setActivePointIndex(
      getNearestPointIndex(
        event.clientX,
        event.currentTarget.getBoundingClientRect(),
        points.length,
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
        {activePoint && activeCoordinates ? (
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
            <p className="mt-1 text-lg font-semibold">{formatMetricValue(activePoint.value)}</p>
            <p className={`mt-1 whitespace-nowrap text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>
              {formatReachTooltipDate(activePoint.date)}
            </p>
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
                <path
                  d={areaPath}
                  fill={dark ? "rgba(56,189,248,0.10)" : "rgba(14,165,233,0.12)"}
                />
                <path
                  d={path}
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
                {activePoint && activeCoordinates ? (
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
            {points[0]?.label || "Start"}
          </span>
          <span className={`truncate text-center ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {points[midIndex]?.label || "Mid"}
          </span>
          <span className={`truncate text-right ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {points[lastIndex]?.label || "End"}
          </span>
        </div>
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
      {logoDataUrl ? (
        <div
          className="flex items-center justify-center"
          style={{
            width: `${frameWidth}px`,
            height: `${frameHeight}px`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            alt="Brand logo"
            data-report-logo="true"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="block object-contain object-right"
            style={{
              width: `${imageWidth}px`,
              height: `${imageHeight}px`,
            }}
            onLoad={(event) =>
              setLogoRatio(getLogoContentAspectRatio(event.currentTarget))
            }
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-[32px] border border-dashed p-8 text-center ${
            dark ? "border-white/15 bg-white/5" : "border-slate-300 bg-slate-50"
          }`}
          style={{
            width: `${frameWidth}px`,
            height: `${frameHeight}px`,
          }}
        >
          <p className={`max-w-[180px] text-sm font-medium leading-6 ${dark ? "text-slate-300" : "text-slate-500"}`}>
            Set up your logo in Settings
          </p>
        </div>
      )}
    </div>
  );
}
