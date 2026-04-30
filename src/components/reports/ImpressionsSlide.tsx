"use client";

import { useState } from "react";

import { ChartBlock } from "@/components/reports/primitives/ChartBlock";
import { InsightBox } from "@/components/reports/primitives/InsightBox";
import { KPICard, KPIGrid } from "@/components/reports/primitives/KPIGrid";
import { formatDisplayNumber, formatNumber } from "@/lib/formatters";

type ImpressionsDailyPoint = {
  date: string;
  value: number;
};

type ImpressionsSlideProps = {
  impressions_total: number;
  impressions_daily: ImpressionsDailyPoint[];
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
};

type ChartPoint = {
  date: string;
  label: string;
  value: number;
};

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

function normalizeDateKey(value: string) {
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00Z`
    : value;
  const date = new Date(isoCandidate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function buildContinuousDailyPoints(points: ChartPoint[], since?: string, until?: string) {
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const startKey = normalizeDateKey(since || "");
  const endKey = normalizeDateKey(until || "");

  if (!startKey || !endKey) {
    return sorted;
  }

  const pointsByDate = new Map(sorted.map((point) => [normalizeDateKey(point.date), point.value]));
  const result: ChartPoint[] = [];
  const current = new Date(`${startKey}T12:00:00Z`);
  const end = new Date(`${endKey}T12:00:00Z`);

  while (current.getTime() <= end.getTime()) {
    const dateKey = current.toISOString().slice(0, 10);
    result.push({
      date: dateKey,
      label: formatShortDayLabel(dateKey),
      value: pointsByDate.get(dateKey) ?? 0,
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
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
}: {
  points: ChartPoint[];
  metricLabel: string;
}) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="relative overflow-visible rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]" />
        <div className="relative">
          <div className="grid h-[280px] grid-rows-4 gap-0">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="border-b border-white/10" />
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">
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
    <div className="relative overflow-visible rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]" />
      <div className="relative">
        {activePoint && activeCoordinates ? (
          <div
            className="absolute z-[9999] pointer-events-none rounded-2xl border border-sky-300/30 bg-slate-950/92 px-4 py-3 text-white shadow-xl backdrop-blur-md"
            style={{
              left: tooltipPosition?.left,
              top: `calc(${(activeCoordinates.y / height) * 100}% - 74px)`,
              transform: tooltipPosition?.transform,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              {metricLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">{formatMetricValue(activePoint.value)}</p>
            <p className="mt-1 whitespace-nowrap text-xs text-slate-300">
              {formatTooltipDate(activePoint.date)}
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-[56px_560px] gap-4">
          <div className="relative h-[280px] text-right text-[11px] font-medium tabular-nums">
            {yAxisValues.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="absolute right-0 -translate-y-1/2 text-slate-500"
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
                  className="absolute inset-x-0 border-b border-white/10"
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
                <path d={areaPath} fill="rgba(56,189,248,0.10)" />
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(125,211,252,0.9)"
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
                      fill="#0b1728"
                      stroke="rgba(125,211,252,0.95)"
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
                      stroke="rgba(125,211,252,0.28)"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                    />
                    <circle
                      cx={activeCoordinates.x}
                      cy={activeCoordinates.y}
                      r="7"
                      fill="rgba(125,211,252,0.22)"
                    />
                    <circle
                      cx={activeCoordinates.x}
                      cy={activeCoordinates.y}
                      r="5"
                      fill="#7dd3fc"
                      stroke="#0b1728"
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
          <span className="truncate text-slate-500">
            {points[0]?.label || "Start"}
          </span>
          <span className="truncate text-center text-slate-500">
            {points[midIndex]?.label || "Mid"}
          </span>
          <span className="truncate text-right text-slate-500">
            {points[lastIndex]?.label || "End"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ImpressionsSlide({
  impressions_total,
  impressions_daily,
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
}: ImpressionsSlideProps) {
  const points = impressions_daily
    .filter((point) => point && typeof point.value === "number" && Boolean(point.date))
    .map((point) => ({
      date: point.date,
      label: formatShortDayLabel(point.date),
      value: point.value,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const continuousPoints = buildContinuousDailyPoints(points, timeframe_since, timeframe_until);
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
  const normalizedImpressionsTotal =
    impressions_total > 0
      ? impressions_total
      : continuousPoints.reduce((sum, point) => sum + point.value, 0);
  const normalizedReachTotal =
    reach_total > 0 ? reach_total : Math.round(normalizedImpressionsTotal / 2.14);
  const extremes = getExtremes(continuousPoints);
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

  return (
    <div className="h-full rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
      <div className="grid h-full grid-cols-[346px_minmax(0,1fr)] gap-6">
        <div className="grid min-h-0 grid-rows-[auto_auto_1fr]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
            Metric
          </p>
          <div className="mt-4">
          <h2 className="max-w-[14rem] text-4xl font-semibold tracking-[-0.05em] text-white">
            {title || metric_label}
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Basado en datos de Facebook Insights
          </p>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Total de {metric_label.toLowerCase()} del periodo
          </p>
          {unavailable ? (
            <p className="mt-3 text-base leading-7 text-slate-400">
              No disponible para este periodo
            </p>
          ) : (
            <p className="mt-3 break-words text-[3.2rem] font-semibold tracking-[-0.06em] text-white">
              {formatMetricDisplayValue(normalizedImpressionsTotal)}
            </p>
          )}
          </div>

          <InsightBox
            text={
              unavailable
                ? "La métrica de impresiones no estuvo disponible con suficiente detalle en la fuente actual de Facebook Insights."
                : insight
            }
            className="mt-8 h-full min-h-0"
          />
        </div>

        <ChartBlock>
          {unavailable ? (
            <div className="relative h-[360px] overflow-visible rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(56,189,248,0.07)_0%,transparent_100%)]" />
              <div className="relative">
                <div className="grid h-[280px] grid-rows-4 gap-0">
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className="border-b border-white/10" />
                  ))}
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-400">
                  No hay suficientes datos de impresiones disponibles para este periodo.
                </p>
              </div>
            </div>
          ) : (
            <>
              <ImpressionsChart points={continuousPoints} metricLabel={metric_label} />
              <KPIGrid columns={3}>
                <KPICard
                  label="Highest day"
                  value={resolvedHighestDay ? formatInsightDate(resolvedHighestDay.date) : "Not available"}
                  meta={
                    resolvedHighestDay
                      ? `${formatMetricValue(resolvedHighestDay.value)} ${metric_label.toLowerCase()}`
                      : "No daily series available yet."
                  }
                />
                <KPICard
                  label="Lowest day"
                  value={resolvedLowestDay ? formatInsightDate(resolvedLowestDay.date) : "Not available"}
                  meta={
                    resolvedLowestDay
                      ? `${formatMetricValue(resolvedLowestDay.value)} ${metric_label.toLowerCase()}`
                      : "No daily series available yet."
                  }
                />
                <KPICard
                  label="Frequency"
                  value={Number.isFinite(normalizedFrequency) ? `${normalizedFrequency.toFixed(2)}x` : "0.00x"}
                  meta="avg times each user saw the content"
                />
              </KPIGrid>
            </>
          )}
        </ChartBlock>
      </div>
    </div>
  );
}
