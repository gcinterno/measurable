"use client";

import { useState } from "react";

import { ChartBlock } from "@/components/reports/primitives/ChartBlock";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { getTemplateTone } from "@/components/reports/slides/template";
import {
  MetricDailyChart,
  ReportWatermarkBadge,
  SlideHeaderLogo,
} from "@/components/reports/slides/shared";
import { formatDisplayNumber, formatNumber } from "@/lib/formatters";
import type { ReportTemplateId } from "@/lib/reports/template-selection";

type ImpressionsDailyPoint = {
  date: string;
  value: number;
};

type ImpressionsSlideProps = {
  impressions_total: number;
  formatted_total?: string;
  is_available?: boolean;
  unavailable_reason?: string;
  impressions_daily: ImpressionsDailyPoint[];
  branding: {
    logoUrl: string | null;
    brandName: string;
    workspaceId?: string | null;
    watermarkEnabled?: boolean;
    watermarkLabel?: string;
    watermarkLogoLightUrl?: string | null;
    watermarkLogoDarkUrl?: string | null;
  };
  reach_total: number;
  timeframe_since?: string;
  timeframe_until?: string;
  metric_label?: string;
  average_daily?: number;
  highest_day?: { date: string; value: number } | null;
  lowest_day?: { date: string; value: number } | null;
  frequency?: number;
  insight_text?: string;
  impressions_daily_count?: number;
  title?: string;
  impressions_slide_present?: boolean;
  unavailable?: boolean;
  source_metric_name?: string;
  timeframe_source?: string;
  source_caption?: string;
  unavailable_message?: string;
  templateId?: ReportTemplateId;
};

type ChartPoint = {
  date: string;
  label: string;
  value: number;
};

/*
 * LEGACY: this slide still keeps local preprocessing helpers from the earlier renderer.
 * Source of truth for daily-series rendering is normalizeDailySeries() plus MetricDailyChart.
 */
const CHART_WIDTH = 560;
const CHART_HEIGHT = 280;
const CHART_PADDING_X = 12;
const CHART_PADDING_Y = 10;

function formatInsightDate(value: string) {
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

function formatTooltipDate(value: string) {
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

function formatShortDayLabel(value: string) {
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(isoCandidate);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMetricValue(value: number) {
  return formatNumber(value, 0);
}

function formatMetricDisplayValue(value: number) {
  return formatDisplayNumber(value);
}

function getExtremes(points: ChartPoint[]) {
  if (points.length === 0) {
    return { highest: null, lowest: null } as const;
  }

  const highest = points.reduce((current, point) =>
    point.value > current.value ? point : current
  );
  const lowest = points.reduce((current, point) =>
    point.value < current.value ? point : current
  );

  return { highest, lowest } as const;
}

function buildChartPath(
  points: ChartPoint[],
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

function buildChartAreaPath(
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
  point: ChartPoint,
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

function getTrendText(points: ChartPoint[]) {
  if (points.length < 2) {
    return "se mantuvieron relativamente estables frente al inicio del periodo";
  }

  const start = points[0].value;
  const end = points[points.length - 1].value;

  if (start === 0 && end === 0) {
    return "se mantuvieron estables frente al inicio del periodo";
  }

  const base = Math.max(Math.abs(start), 1);
  const deltaRatio = (end - start) / base;

  if (deltaRatio > 0.08) {
    return "cerraron por encima del arranque del periodo";
  }

  if (deltaRatio < -0.08) {
    return "cerraron por debajo del arranque del periodo";
  }

  return "cerraron prácticamente en línea con el arranque del periodo";
}

function getFrequencyInterpretation(frequency: number) {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return "La frecuencia todavía no es concluyente por falta de alcance útil para compararla.";
  }

  if (frequency >= 3) {
    return "La frecuencia sugiere repetición alta y posible saturación en parte de la audiencia.";
  }

  if (frequency >= 1.8) {
    return "La frecuencia apunta a una exposición consistente, con repetición suficiente para reforzar el mensaje sin una saturación extrema.";
  }

  return "La frecuencia sigue en una zona moderada, lo que sugiere alcance relativamente eficiente con menor repetición por usuario.";
}

function buildInsight(
  impressionsTotal: number,
  points: ChartPoint[],
  reachTotal: number
) {
  const dailyAverage =
    points.length > 0 ? Math.round(impressionsTotal / points.length) : 0;
  const { highest, lowest } = getExtremes(points);
  const frequency = reachTotal > 0 ? impressionsTotal / reachTotal : 0;
  const trendText = getTrendText(points);
  const frequencyText = getFrequencyInterpretation(frequency);

  return `Las impresiones totales del periodo fueron ${formatMetricValue(impressionsTotal)}, con un promedio diario de ${formatMetricValue(dailyAverage)}. El pico más alto se registró el ${highest ? formatInsightDate(highest.date) : "periodo sin dato disponible"} con ${highest ? formatMetricValue(highest.value) : "N/A"} impresiones, mientras que el punto más bajo fue el ${lowest ? formatInsightDate(lowest.date) : "periodo sin dato disponible"} con ${lowest ? formatMetricValue(lowest.value) : "N/A"}. Frente al inicio del periodo, las impresiones ${trendText}. La frecuencia promedio fue de ${reachTotal > 0 ? frequency.toFixed(2) : "0.00"}x, lo que indica cuántas veces, en promedio, cada usuario vio el contenido. ${frequencyText}`;
}

function ImpressionsChart({
  points,
  metricLabel,
  dark = true,
}: {
  points: ChartPoint[];
  metricLabel: string;
  dark?: boolean;
}) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className={`relative overflow-visible rounded-[30px] border p-6 ${dark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"}`}>
        <div className={`pointer-events-none absolute inset-0 ${dark ? "bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]" : "bg-[linear-gradient(180deg,rgba(14,165,233,0.06)_0%,transparent_100%)]"}`} />
        <div className="relative">
          <div className="grid h-[280px] grid-rows-4 gap-0">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className={dark ? "border-b border-white/10" : "border-b border-slate-200"} />
            ))}
          </div>
          <p className={`mt-5 text-sm leading-6 ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Daily impressions series is not available for this report yet.
          </p>
        </div>
      </div>
    );
  }

  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const paddingX = CHART_PADDING_X;
  const paddingY = CHART_PADDING_Y;
  const maxValue = Math.max(...points.map((point) => point.value), 0);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const plotHeight = height - paddingY * 2;
  const baselineY = height - paddingY;
  const path = buildChartPath(points, width, height, paddingX, paddingY);
  const areaPath = buildChartAreaPath(path, paddingX, width - paddingX, baselineY);
  const pointCoordinates = points.map((point, index) =>
    getPointPosition(
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
  const activePoint =
    activePointIndex === null ? null : (points[activePointIndex] ?? null);
  const activeCoordinates =
    activePoint && activePointIndex !== null
      ? getPointPosition(
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
  const midIndex = Math.floor(points.length / 2);
  const lastIndex = points.length - 1;
  const xAxisPadding = `${(paddingX / width) * 100}%`;

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

  return (
    <div className={`relative overflow-visible rounded-[30px] border p-6 ${dark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"}`}>
      <div className={`pointer-events-none absolute inset-0 ${dark ? "bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]" : "bg-[linear-gradient(180deg,rgba(14,165,233,0.06)_0%,transparent_100%)]"}`} />
      <div className="relative">
        {activePoint && activeCoordinates ? (
          <div
            className={`absolute z-[9999] pointer-events-none rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md ${dark ? "border-sky-300/30 bg-slate-950/92 text-white" : "border-sky-200 bg-white/95 text-slate-950"}`}
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
              {formatTooltipDate(activePoint.date)}
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
                  className={`absolute inset-x-0 ${dark ? "border-b border-white/10" : "border-b border-slate-200"}`}
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
                <path d={areaPath} fill={dark ? "rgba(56,189,248,0.10)" : "rgba(14,165,233,0.10)"} />
                <path
                  d={path}
                  fill="none"
                  stroke={dark ? "rgba(125,211,252,0.9)" : "rgba(2,132,199,0.9)"}
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
                      stroke={dark ? "rgba(125,211,252,0.95)" : "rgba(2,132,199,0.95)"}
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
                      stroke={dark ? "rgba(125,211,252,0.28)" : "rgba(2,132,199,0.28)"}
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                    />
                    <circle
                      cx={activeCoordinates.x}
                      cy={activeCoordinates.y}
                      r="7"
                      fill={dark ? "rgba(125,211,252,0.22)" : "rgba(2,132,199,0.18)"}
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
                onMouseLeave={() => setActivePointIndex(null)}
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

export function ImpressionsSlide({
  impressions_total,
  formatted_total,
  is_available = true,
  impressions_daily,
  branding,
  reach_total,
  timeframe_since,
  timeframe_until,
  metric_label = "Visualizaciones",
  highest_day,
  lowest_day,
  frequency,
  insight_text,
  title,
  unavailable = false,
  timeframe_source,
  source_caption = "Based on synchronized social data",
  unavailable_message = "Impressions data was not available with enough detail for this reporting period.",
  templateId = "executive",
}: ImpressionsSlideProps) {
  const tone = getTemplateTone(templateId);
  const points = impressions_daily
    .filter((point) => point && typeof point.value === "number" && Boolean(point.date))
    .map((point) => ({
      date: point.date,
      label: formatShortDayLabel(point.date),
      value: point.value,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const continuousPoints = points;
  console.info("[MetaTimeframe][render.impressions]", {
    source: timeframe_source || (
      timeframe_since && timeframe_until
        ? "blocks.data_json.timeframe"
        : "legacy.periodLabel"
    ),
    label: title || metric_label,
    timeframe: {
      since: timeframe_since || null,
      until: timeframe_until || null,
    },
    impressionsDailyCount: continuousPoints.length,
  });
  const normalizedImpressionsTotal = impressions_total;
  const displayTotal = unavailable || is_available === false
    ? "N/A"
    : formatted_total || formatMetricDisplayValue(normalizedImpressionsTotal);
  const normalizedReachTotal =
    reach_total > 0 ? reach_total : Math.round(normalizedImpressionsTotal / 2.14);
  const extremes = unavailable || is_available === false
    ? { highest: null, lowest: null } as const
    : getExtremes(continuousPoints);
  const normalizedFrequency =
    frequency !== undefined && Number.isFinite(frequency)
      ? frequency
      : normalizedReachTotal > 0
        ? normalizedImpressionsTotal / normalizedReachTotal
        : 0;
  const resolvedHighestDay = highest_day || extremes.highest;
  const resolvedLowestDay = lowest_day || extremes.lowest;
  const insight =
    insight_text ||
    buildInsight(
      normalizedImpressionsTotal,
      continuousPoints,
      normalizedReachTotal
    );
  const insightText =
    unavailable || is_available === false
      ? unavailable_message ||
        "Dato no disponible en este momento con los permisos actuales de Meta."
      : insight || "Dato no disponible en este momento.";

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric slide]", {
      slideNumber: "03",
      metricKey: "impressions",
      title: title || metric_label,
      total: displayTotal,
      dailySeriesLength: continuousPoints.length,
      values: continuousPoints.map((point) => point.value),
    });
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[346px_minmax(0,1fr)] gap-6">
        <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
          <div className="flex items-start justify-between gap-4">
            <SlideHeaderLogo
              logoUrl={branding.logoUrl}
              brandName={branding.brandName}
              workspaceId={branding.workspaceId}
              slideNumber="03"
              dark={tone.dark}
              watermarkEnabled={branding.watermarkEnabled}
              watermarkLogoLightUrl={branding.watermarkLogoLightUrl}
              watermarkLogoDarkUrl={branding.watermarkLogoDarkUrl}
            />
            <ReportWatermarkBadge
              enabled={branding.watermarkEnabled}
              label={branding.watermarkLabel}
              logoLightUrl={branding.watermarkLogoLightUrl}
              logoDarkUrl={branding.watermarkLogoDarkUrl}
              workspaceId={branding.workspaceId}
              dark={tone.dark}
              className="mt-0.5 shrink-0"
            />
          </div>
          <div className="mt-4">
          <h2 className={`max-w-[14rem] text-4xl font-semibold tracking-[-0.05em] ${tone.title}`}>
            {title || metric_label}
          </h2>
          <p className={`mt-2 text-xs ${tone.subtle}`}>
            {source_caption}
          </p>
          <p className={`mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
            Total de {metric_label.toLowerCase()} del periodo
          </p>
          <p className={`mt-3 break-words text-[3.2rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
            {displayTotal}
          </p>
          {unavailable || is_available === false ? (
            <p className={`mt-2 text-sm leading-6 ${tone.subtle}`}>
              {unavailable_message}
            </p>
          ) : null}
          </div>

          <InsightBox
            text={insightText}
            label="AI INSIGHT"
            className="mt-7 max-h-[214px]"
            bodyClassName="leading-[1.62]"
            clampLines={5}
            templateId={templateId}
          />
        </div>

        <ChartBlock className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
          {unavailable || is_available === false ? (
            <MetricDailyChart
              points={[]}
              isAvailable={false}
              metricLabel={metric_label}
              dark={tone.dark}
              slideNumber="03"
              metricKey="impressions"
              placeholderText={unavailable_message}
            />
          ) : (
            <>
              <MetricDailyChart
                points={continuousPoints}
                isAvailable={continuousPoints.length > 0}
                metricLabel={metric_label}
                dark={tone.dark}
                slideNumber="03"
                metricKey="impressions"
                placeholderText="Daily series is not available for this metric yet."
              />
              <KPIGrid columns={3}>
                <KPICard
                  label="Highest day"
                  value={resolvedHighestDay ? formatInsightDate(resolvedHighestDay.date) : "Not available"}
                  meta={
                    resolvedHighestDay
                      ? `${formatMetricValue(resolvedHighestDay.value)} ${metric_label.toLowerCase()}`
                      : "No daily series available yet."
                  }
                  templateId={templateId}
                />
                <KPICard
                  label="Lowest day"
                  value={resolvedLowestDay ? formatInsightDate(resolvedLowestDay.date) : "Not available"}
                  meta={
                    resolvedLowestDay
                      ? `${formatMetricValue(resolvedLowestDay.value)} ${metric_label.toLowerCase()}`
                      : "No daily series available yet."
                  }
                  templateId={templateId}
                />
                <KPICard
                  label="Frequency"
                  value={Number.isFinite(normalizedFrequency) ? `${normalizedFrequency.toFixed(2)}x` : "0.00x"}
                  meta="avg times each user saw the content"
                  templateId={templateId}
                />
              </KPIGrid>
            </>
          )}
        </ChartBlock>
    </div>
  );
}
