"use client";

import { useState } from "react";

import { formatDisplayNumber, formatNumber } from "@/lib/formatters";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import { getLogoContentAspectRatio } from "@/lib/reports/logo";
import type { ReportDescriptionTimeframe, ReportVersionBlock } from "@/types/report";

type ReportSlidesDeckProps = {
  blocks: ReportVersionBlock[];
  theme?: string;
  descriptionTimeframe?: ReportDescriptionTimeframe | null;
  branding?: {
    logoUrl?: string | null;
  } | null;
};

type ReachChartPoint = {
  date: string;
  label: string;
  value: number;
};

function getTextValue(text: string | null | undefined) {
  return text?.trim() || "";
}

function getStatValue(value: ReportVersionBlock["data"]["value"]) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return formatDisplayNumber(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getBlockTimeframeDateRange(blocks: ReportVersionBlock[]) {
  const timeframeBlock = blocks.find(
    (block) => block.data.timeframe_since && block.data.timeframe_until
  );
  const since = String(timeframeBlock?.data.timeframe_since ?? "").trim();
  const until = String(timeframeBlock?.data.timeframe_until ?? "").trim();

  if (!since || !until) {
    return "";
  }

  return `${formatDate(since)} - ${formatDate(until)}`;
}

function getCoverBrandName(blocks: ReportVersionBlock[]) {
  const storedPageName = getIntegrationReportContext()?.pageName?.trim();

  if (storedPageName) {
    return storedPageName;
  }

  const title = getReportTitle(blocks).trim();

  if (
    !title ||
    title === "Generated report" ||
    title === "Meta Pages Overview" ||
    title === "Executive Monthly Report" ||
    title === "Report Meta"
  ) {
    return "Facebook Page";
  }

  return title
    .replace(/^marketing report\s*/i, "")
    .replace(/^meta pages overview\s*/i, "")
    .trim();
}

function getCoverTitle(blocks: ReportVersionBlock[]) {
  return `Marketing Report ${getCoverBrandName(blocks)}`;
}

function getCoverTimeframeLabel(
  blocks: ReportVersionBlock[],
  descriptionTimeframe?: ReportDescriptionTimeframe | null
) {
  if (descriptionTimeframe?.since && descriptionTimeframe.until) {
    const value = `${formatDate(descriptionTimeframe.since)} - ${formatDate(descriptionTimeframe.until)}`;

    console.info("[MetaTimeframe][render.cover]", {
      source: "report.description.timeframe",
      label: descriptionTimeframe.label,
      since: descriptionTimeframe.since,
      until: descriptionTimeframe.until,
      value,
    });

    return value;
  }

  if (descriptionTimeframe?.label) {
    console.info("[MetaTimeframe][render.cover]", {
      source: "report.description.timeframe.label",
      label: descriptionTimeframe.label,
      since: null,
      until: null,
      value: descriptionTimeframe.label,
    });

    return descriptionTimeframe.label;
  }

  const blockDateRange = getBlockTimeframeDateRange(blocks);

  if (blockDateRange) {
    const timeframeBlock = blocks.find(
      (block) => block.data.timeframe_since && block.data.timeframe_until
    );

    console.info("[MetaTimeframe][render.cover]", {
      source: "blocks.data_json.timeframe",
      label: null,
      since: String(timeframeBlock?.data.timeframe_since ?? "").trim() || null,
      until: String(timeframeBlock?.data.timeframe_until ?? "").trim() || null,
      value: blockDateRange,
    });

    return blockDateRange;
  }

  console.info("[MetaTimeframe][render.cover]", {
    source: "none",
    label: null,
    since: null,
    until: null,
    value: "",
  });

  return "";
}

function getCoverIntegrationLabel() {
  const integration = getIntegrationReportContext()?.integration?.trim().toLowerCase();

  if (integration === "meta") {
    return "Facebook Page";
  }

  if (!integration) {
    return "Facebook Page";
  }

  return integration
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getReportTitle(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return getTextValue(titleBlock?.data.text) || "Meta Pages Overview";
}

function getReachStatBlock(blocks: ReportVersionBlock[]) {
  return (
    blocks.find(
      (block) =>
        block.type === "stat" &&
        getTextValue(block.data.label).toLowerCase().includes("reach")
    ) || null
  );
}

function getReachInsight(textBlocks: string[]) {
  return (
    textBlocks.find((text) => /reach/i.test(text)) ||
    textBlocks[0] ||
    "Reach insight will appear here once the generated report includes the narrative for this metric."
  );
}

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

function formatInsightTextDates(text: string) {
  return text.replace(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    (match) => formatInsightDate(match)
  );
}

function getReachExtremes(points: ReachChartPoint[]) {
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

function formatShortDayLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getReachChartBlock(blocks: ReportVersionBlock[]) {
  return (
    blocks.find((block) => {
      if (block.type !== "chart") {
        return false;
      }

      const metric = getTextValue(String(block.data.metric ?? "")).toLowerCase();
      const label = getTextValue(block.data.label).toLowerCase();

      return metric === "reach" || label.includes("reach");
    }) || null
  );
}

function getReachChartData(blocks: ReportVersionBlock[]) {
  const chartBlock = getReachChartBlock(blocks);

  if (!chartBlock) {
    return { points: [] as ReachChartPoint[], isAvailable: false };
  }

  const rawPoints = Array.isArray(chartBlock.data.points)
    ? chartBlock.data.points
    : [];

  const points = rawPoints
    .map((point) => {
      if (!point || typeof point !== "object") {
        return null;
      }

      const date = getTextValue(String((point as { date?: unknown }).date ?? ""));
      const rawValue = (point as { value?: unknown }).value;
      const value =
        typeof rawValue === "number"
          ? rawValue
          : Number(String(rawValue ?? "").trim());

      if (!date || Number.isNaN(value)) {
        return null;
      }

      return {
        date,
        label: formatShortDayLabel(date),
        value,
      } satisfies ReachChartPoint;
    })
    .filter((point): point is ReachChartPoint => point !== null);

  return {
    points,
    isAvailable: Boolean(chartBlock.data.is_available) && points.length > 0,
  };
}

function formatMetricValue(value: number) {
  return formatNumber(value, 0);
}

function formatMetricDisplayValue(value: string) {
  return formatDisplayNumber(value);
}

function getReachTotalValue(
  reachStatBlock: ReportVersionBlock | null,
  reachPoints: ReachChartPoint[]
) {
  if (reachStatBlock) {
    return getStatValue(reachStatBlock.data.value);
  }

  if (reachPoints.length > 0) {
    return String(
      reachPoints.reduce((sum, point) => sum + point.value, 0)
    );
  }

  return "N/A";
}

function getTextBlocks(blocks: ReportVersionBlock[]) {
  return blocks
    .filter((block) => block.type === "text")
    .map((block) => getTextValue(block.data.text))
    .filter(Boolean);
}

function buildAnalysisText(textBlocks: string[]) {
  return textBlocks.slice(0, 2);
}

function SlideFrame({
  index,
  title,
  eyebrow,
  children,
}: {
  index: number;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const hasHeaderCopy = Boolean(eyebrow || title);

  return (
    <section className="rounded-[36px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] p-3 shadow-sm sm:p-5">
      <div className="mx-auto aspect-[16/9] w-[1120px] max-w-none overflow-hidden rounded-[30px] border border-slate-200 bg-[#fbfcfe] shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
        <div className="relative flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),transparent_26%,transparent_74%,rgba(148,163,184,0.08))]" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className={`flex items-start ${hasHeaderCopy ? "justify-between gap-4" : "justify-end"}`}>
            {hasHeaderCopy ? (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                  {eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-[2rem]">
                  {title}
                </h2>
              </div>
            ) : null}

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden items-center gap-1.5 sm:flex">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2.5 rounded-full transition ${
                      dot === index ? "w-7 bg-slate-950" : "w-2.5 bg-slate-300"
                    }`}
                  />
                ))}
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                {String(index).padStart(2, "0")} / 05
              </span>
            </div>
          </div>

          <div className={`${hasHeaderCopy ? "mt-7" : "mt-5"} relative min-h-0 flex-1`}>{children}</div>
        </div>
      </div>
    </section>
  );
}

function buildReachPath(
  points: ReachChartPoint[],
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
  point: ReachChartPoint,
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

function ReachDailyChart({
  points,
  isAvailable,
  dark = true,
}: {
  points: ReachChartPoint[];
  isAvailable: boolean;
  dark?: boolean;
}) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (!isAvailable || points.length === 0) {
    return (
      <div
        className={`relative overflow-hidden rounded-[30px] border p-6 ${
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
            Daily reach series is not available for this report yet.
          </p>
        </div>
      </div>
    );
  }

  const width = 560;
  const height = 280;
  const paddingX = 12;
  const paddingY = 10;
  const path = buildReachPath(points, width, height, paddingX, paddingY);
  const baselineY = height - paddingY;
  const areaPath = buildReachAreaPath(path, paddingX, width - paddingX, baselineY);
  const midIndex = Math.floor(points.length / 2);
  const lastIndex = points.length - 1;
  const maxValue = Math.max(...points.map((point) => point.value), 0);
  const minValue = Math.min(...points.map((point) => point.value), 0);
  const range = Math.max(maxValue - minValue, 1);
  const plotHeight = height - paddingY * 2;
  const activePoint = points[activePointIndex ?? lastIndex] || null;
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
      : activePoint
        ? getReachPointPosition(
            activePoint,
            lastIndex,
            points.length,
            width,
            height,
            paddingX,
            paddingY,
            minValue,
            range
          )
        : null;
  const yAxisValues = [
    maxValue,
    Math.round(maxValue * 0.66),
    Math.round(maxValue * 0.33),
    0,
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border p-6 ${
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
            className={`pointer-events-none absolute z-10 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
              dark
                ? "border-sky-300/30 bg-slate-950/92 text-white"
                : "border-sky-200 bg-white/95 text-slate-950"
            }`}
            style={{
              left: `calc(${(activeCoordinates.x / width) * 100}% + 4px)`,
              top: `calc(${(activeCoordinates.y / height) * 100}% - 74px)`,
              transform: "translateX(-50%)",
            }}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-sky-300" : "text-sky-700"}`}>
              Reach
            </p>
            <p className="mt-1 text-lg font-semibold">{formatMetricValue(activePoint.value)}</p>
            <p className={`mt-1 whitespace-nowrap text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>
              {formatReachTooltipDate(activePoint.date)}
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-4">
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
          <div className="relative">
            <div className="relative h-[280px]">
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className={`absolute inset-x-0 border-b ${dark ? "border-white/10" : "border-slate-200"}`}
                  style={{
                    top: `${((paddingY + (row / 3) * plotHeight) / height) * 100}%`,
                  }}
                />
              ))}
              <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
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
                {points.map((point, index) => {
                  const { x, y } = getReachPointPosition(
                    point,
                    index,
                    points.length,
                    width,
                    height,
                    paddingX,
                    paddingY,
                    minValue,
                    range
                  );

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
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
                {points.map((point, index) => (
                  <button
                    key={`${point.date}-hover-${index}`}
                    type="button"
                    aria-label={`${formatReachTooltipDate(point.date)} ${formatMetricValue(point.value)} reach`}
                    onMouseEnter={() => setActivePointIndex(index)}
                    onFocus={() => setActivePointIndex(index)}
                    onBlur={() => setActivePointIndex(null)}
                    onMouseLeave={() => setActivePointIndex(null)}
                    className="h-full w-full bg-transparent outline-none"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className="mt-5 grid items-center text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{
            gridTemplateColumns: `${paddingX}px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) ${paddingX}px`,
          }}
        >
          <span />
          <span className={`truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {points[0]?.label || "Start"}
          </span>
          <span className={`truncate text-center ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {points[midIndex]?.label || "Mid"}
          </span>
          <span className={`truncate text-right ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {points[lastIndex]?.label || "End"}
          </span>
          <span />
        </div>
      </div>
    </div>
  );
}

function CoverLogo({
  logoDataUrl,
  dark = true,
}: {
  logoDataUrl: string | null;
  dark?: boolean;
}) {
  const [logoRatio, setLogoRatio] = useState(1);
  const isSquareLogo = logoRatio >= 0.72 && logoRatio <= 1.32;
  const isHorizontalLogo = logoRatio > 1.32;
  const positionClass = isSquareLogo
    ? "lg:right-[-10rem]"
    : isHorizontalLogo
      ? "lg:right-[-3rem]"
      : "lg:right-[-4rem]";
  const sizeClass = isSquareLogo
    ? "h-[18rem] max-w-[340px] sm:h-[20rem] sm:max-w-[380px] lg:h-[21rem] lg:max-w-[400px]"
    : isHorizontalLogo
      ? "h-[10rem] max-w-[520px] sm:h-[11rem] sm:max-w-[560px] lg:h-[12rem] lg:max-w-[620px]"
      : "h-[18rem] max-w-[360px] sm:h-[20rem] sm:max-w-[400px] lg:h-[21rem] lg:max-w-[420px]";
  const placeholderClass = isSquareLogo
    ? "h-[18rem] max-w-[340px] sm:h-[20rem] sm:max-w-[380px] lg:h-[21rem] lg:max-w-[400px]"
    : "h-[14rem] max-w-[460px] sm:h-[15rem] sm:max-w-[500px] lg:h-[16rem] lg:max-w-[540px]";
  const imageClass = isSquareLogo
    ? "h-full w-full origin-right scale-[2] object-contain object-right"
    : "h-full w-full object-contain object-right";

  return (
    <div
      className={`pointer-events-none mt-8 flex items-center justify-center lg:absolute lg:top-1/2 lg:mt-0 lg:-translate-y-1/2 lg:justify-end ${positionClass}`}
    >
      {logoDataUrl ? (
        <div className={`flex w-full items-center justify-center p-2 ${sizeClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUrl}
            alt="Brand logo"
            className={imageClass}
            onLoad={(event) =>
              setLogoRatio(getLogoContentAspectRatio(event.currentTarget))
            }
          />
        </div>
      ) : (
        <div
          className={`flex w-full items-center justify-center rounded-[32px] border border-dashed p-8 text-center ${placeholderClass} ${
            dark ? "border-white/15 bg-white/5" : "border-slate-300 bg-slate-50"
          }`}
        >
          <p className={`max-w-[180px] text-sm font-medium leading-6 ${dark ? "text-slate-300" : "text-slate-500"}`}>
            Set up your logo in Settings
          </p>
        </div>
      )}
    </div>
  );
}

export function ReportSlidesDeck({
  blocks,
  theme = "minimalista",
  descriptionTimeframe,
  branding,
}: ReportSlidesDeckProps) {
  console.info("[AUDIT_RENDER_PATH][ReportSlidesDeck]", {
    used: true,
    slidesLength: 5,
    blocksLength: blocks.length,
    source: "blocks",
    theme,
  });
  const logoDataUrl = branding?.logoUrl?.trim() || null;
  const reportTitle = getReportTitle(blocks);
  const coverTitle = getCoverTitle(blocks);
  const coverIntegrationLabel = getCoverIntegrationLabel();
  const textBlocks = getTextBlocks(blocks);
  const reachStatBlock = getReachStatBlock(blocks);
  const reachInsight = formatInsightTextDates(getReachInsight(textBlocks));
  const reachChart = getReachChartData(blocks);
  const reachExtremes = getReachExtremes(reachChart.points);
  const reachTotalValue = getReachTotalValue(reachStatBlock, reachChart.points);
  const dateRange = getCoverTimeframeLabel(blocks, descriptionTimeframe);
  const coverTimeframeLabel = dateRange;
  const analysisBlocks = buildAnalysisText(textBlocks);
  const coverDescription =
    analysisBlocks[0] ||
    "Resumen ejecutivo con contexto de crecimiento, rendimiento y conclusiones clave.";
  const isModern = theme === "moderno";

  console.info("[MetaTimeframe][render.reach]", {
    source: descriptionTimeframe
      ? "report.description.timeframe"
      : reachChart.timeframeSince && reachChart.timeframeUntil
        ? "blocks.data_json.timeframe"
        : "legacy.periodLabel",
    label: descriptionTimeframe?.label || coverTimeframeLabel,
    since: descriptionTimeframe?.since || reachChart.timeframeSince || null,
    until: descriptionTimeframe?.until || reachChart.timeframeUntil || null,
    pointsLength: reachChart.points.length,
  });

  if (isModern) {
    return (
      <div className="space-y-6">
        <section className="rounded-[36px] border border-slate-800/80 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-[1120px] max-w-none overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="relative flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.2),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_24%,transparent_76%,rgba(255,255,255,0.04))]" />
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="flex justify-end">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  01 / 05
                </span>
              </div>

              <div className="relative mt-7 min-h-0 flex-1">
                <div className="flex h-full max-w-[62%] flex-col justify-center pr-10">
                  <h1 className="max-w-none text-[3.75rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[4.5rem] lg:text-[4.6rem]">
                    {coverTitle}
                  </h1>
                  <div className="mt-5 h-px w-28 bg-gradient-to-r from-sky-300 via-white/70 to-transparent" />
                  <p className="mt-5 text-[1.2rem] text-slate-300 sm:text-[1.4rem]">
                    {`${coverIntegrationLabel} Report - Summary & Insights`}
                  </p>
                  <p className="mt-4 text-[0.82rem] font-medium uppercase tracking-[0.18em] text-sky-300 sm:text-[0.95rem]">
                    {coverTimeframeLabel}
                  </p>
                </div>

                <CoverLogo logoDataUrl={logoDataUrl} dark />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-[1120px] max-w-none overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex justify-end">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  02 / 05
                </span>
              </div>

              <div className="mt-7 min-h-0 flex-1 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 sm:p-7">
                <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
                      Metric
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                      Reach
                    </h2>
                    <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Total reach this period
                    </p>
                    <p className="mt-3 break-words text-[2.6rem] font-semibold tracking-[-0.06em] text-white sm:text-[3.2rem]">
                      {formatMetricDisplayValue(reachTotalValue)}
                    </p>

                    <div className="mt-8 rounded-[26px] border border-white/10 bg-black/20 p-6">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Insight
                      </p>
                      <p className="mt-4 max-w-none text-sm leading-7 text-slate-300 sm:text-[15px]">
                        {reachInsight}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <ReachDailyChart
                      points={reachChart.points}
                      isAvailable={reachChart.isAvailable}
                      dark
                    />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                          Highest day
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {reachExtremes.highest
                            ? formatInsightDate(reachExtremes.highest.date)
                            : "Not available"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {reachExtremes.highest
                            ? `${formatMetricValue(reachExtremes.highest.value)} reach`
                            : "No daily series available yet."}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                          Lowest day
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {reachExtremes.lowest
                            ? formatInsightDate(reachExtremes.lowest.date)
                            : "Not available"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {reachExtremes.lowest
                            ? `${formatMetricValue(reachExtremes.lowest.value)} reach`
                            : "No daily series available yet."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-[1120px] max-w-none overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex justify-end">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  03 / 05
                </span>
              </div>

              <div className="mt-7 min-h-0 flex-1" />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-[1120px] max-w-none overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex justify-end">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  04 / 05
                </span>
              </div>

              <div className="mt-7 min-h-0 flex-1" />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-[1120px] max-w-none overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                    Cierre
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem]">
                    {reportTitle}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  05 / 05
                </span>
              </div>

              <div className="mt-7 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-7">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Slide final
                    </p>
                    <p className="mt-8 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">
                      Gracias.
                    </p>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                      {coverDescription}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Periodo analizado
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {dateRange}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Formato
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Presentación moderna
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex h-full min-h-[250px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/5 p-6 text-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Imagen final
                    </p>
                    <p className="mt-4 text-xl font-semibold tracking-tight text-white">
                      Espacio para logo o cierre visual
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Mantiene consistencia con la portada para cerrar la presentación con presencia de marca.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SlideFrame index={1} eyebrow="" title="">
        <div className="relative h-full">
          <div className="flex h-full max-w-[62%] flex-col justify-center pr-10">
            <h1 className="max-w-none text-[3.75rem] font-semibold leading-[0.92] tracking-[-0.04em] text-slate-950 sm:text-[4.5rem] lg:text-[4.6rem]">
              {coverTitle}
            </h1>
            <p className="mt-5 text-[1.2rem] text-slate-600 sm:text-[1.4rem]">
              {`${coverIntegrationLabel} Report - Summary & Insights`}
            </p>
            <p className="mt-4 text-[0.82rem] font-medium uppercase tracking-[0.18em] text-sky-700 sm:text-[0.95rem]">
              {coverTimeframeLabel}
            </p>
          </div>

          <CoverLogo logoDataUrl={logoDataUrl} dark={false} />
        </div>
      </SlideFrame>

      <SlideFrame index={2} eyebrow="" title="">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                Metric
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                Reach
              </h2>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Total reach this period
              </p>
              <p className="mt-3 break-words text-[2.6rem] font-semibold tracking-[-0.06em] text-slate-950 sm:text-[3.2rem]">
                {formatMetricDisplayValue(reachTotalValue)}
              </p>

              <div className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                  Insight
                </p>
                <p className="mt-4 max-w-none text-sm leading-7 text-slate-600 sm:text-[15px]">
                  {reachInsight}
                </p>
              </div>
            </div>

              <div className="min-w-0">
                <ReachDailyChart
                  points={reachChart.points}
                  isAvailable={reachChart.isAvailable}
                  dark={false}
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Highest day
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {reachExtremes.highest
                        ? formatInsightDate(reachExtremes.highest.date)
                        : "Not available"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {reachExtremes.highest
                        ? `${formatMetricValue(reachExtremes.highest.value)} reach`
                        : "No daily series available yet."}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                      Lowest day
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {reachExtremes.lowest
                        ? formatInsightDate(reachExtremes.lowest.date)
                        : "Not available"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {reachExtremes.lowest
                        ? `${formatMetricValue(reachExtremes.lowest.value)} reach`
                        : "No daily series available yet."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

        </div>
      </SlideFrame>

      <SlideFrame index={3} eyebrow="" title="">
        <div className="h-full" />
      </SlideFrame>

      <SlideFrame index={4} eyebrow="" title="">
        <div className="h-full" />
      </SlideFrame>

      <SlideFrame index={5} eyebrow="Cierre" title={reportTitle}>
        <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between rounded-[28px] bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                Slide final
              </p>
              <p className="mt-8 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Gracias.
              </p>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                {coverDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Periodo analizado
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {dateRange}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Formato
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  Presentación mensual
                </p>
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-[250px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Imagen final
              </p>
              <p className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                Espacio para logo o cierre visual
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Mantiene consistencia con la portada para cerrar la presentación con presencia de marca.
              </p>
            </div>
          </div>
        </div>
      </SlideFrame>
    </div>
  );
}
