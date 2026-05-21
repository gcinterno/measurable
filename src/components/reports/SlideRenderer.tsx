"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { FooterMeta } from "@/components/reports/primitives/FooterMeta";
import { HeroBlock } from "@/components/reports/primitives/HeroBlock";
import { SlideDeckViewport } from "@/components/reports/SlideDeckViewport";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import type { ExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { CoverSlide } from "@/components/reports/slides/CoverSlide";
import { getTemplateTone } from "@/components/reports/slides/template";
import { CoverLogo, MetricDailyChart } from "@/components/reports/slides/shared";
import { formatMetaTimeframeDateRange } from "@/lib/integrations/timeframes";
import { resolveReportBranding } from "@/lib/reports/branding";
import { normalizeDailySeries } from "@/lib/reports/daily-series";
import type { ReportTemplateId } from "@/lib/reports/template-selection";
import { getReportTemplate } from "@/lib/reports/templates";
import { buildDefaultTemplateContext } from "@/lib/reports/templates/default-view-models";
import {
  REPORT_SLIDE_THEME,
  type ReportRenderMode,
} from "@/lib/reports/theme";
import { formatDisplayNumber } from "@/lib/formatters";
import type { ReportVersionBlock } from "@/types/report";

type SlideRendererProps = {
  reportId?: string;
  model: ExecutiveDarkViewModel | null | undefined;
  renderMode?: ReportRenderMode;
  blocks?: ReportVersionBlock[];
  locale?: string;
  hideOverviewInsights?: boolean;
  branding?: {
    logoUrl?: string | null;
    brandName?: string | null;
    source?: string;
    brandNameSource?: string;
  };
  templateId?: ReportTemplateId;
};

type BlockChartPoint = {
  date: string;
  label: string;
  value: number;
};

type BlockChartSeries = {
  label: string;
  sourceType?: string;
  points: BlockChartPoint[];
};

const MULTI_SERIES_BLOCKS = new Set([
  "reach_overview",
  "engagement_overview",
  "audience_growth",
]);

const FIXED_STAGE_WIDTH = 1920;
const FIXED_STAGE_HEIGHT = 1080;

function FixedReportSlideStage({
  children,
}: {
  children: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const nextScale = entry.contentRect.width / FIXED_STAGE_WIDTH;
      setScale(nextScale || 1);
    });

    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-0 top-0 overflow-hidden"
        style={{
          width: FIXED_STAGE_WIDTH,
          height: FIXED_STAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PresentationStageSlideFrame({
  slideId,
  renderMode,
  children,
}: {
  slideId: string;
  renderMode: ReportRenderMode;
  children: ReactNode;
}) {
  const slideClassName =
    renderMode === "export" ? "report-pdf-slide" : "report-preview-slide";
  const frameClassName =
    renderMode === "export"
      ? slideClassName
      : `${slideClassName} ${REPORT_SLIDE_THEME.radius.outerFrame} border ${REPORT_SLIDE_THEME.colors.frameBorder} ${REPORT_SLIDE_THEME.colors.frameBackground} ${REPORT_SLIDE_THEME.spacing.outerPadding} ${REPORT_SLIDE_THEME.effects.outerShadow}`;
  const shellWidth =
    renderMode === "export"
      ? REPORT_SLIDE_THEME.slide.width
      : REPORT_SLIDE_THEME.slide.surfaceWidth;
  const shellHeight =
    renderMode === "export"
      ? REPORT_SLIDE_THEME.slide.height
      : REPORT_SLIDE_THEME.slide.surfaceHeight;

  return (
    <section
      data-report-slide={slideId}
      className={frameClassName}
      style={{
        width: REPORT_SLIDE_THEME.slide.width,
        minWidth: REPORT_SLIDE_THEME.slide.width,
        maxWidth: REPORT_SLIDE_THEME.slide.width,
        height: REPORT_SLIDE_THEME.slide.height,
        minHeight: REPORT_SLIDE_THEME.slide.height,
        maxHeight: REPORT_SLIDE_THEME.slide.height,
        fontFamily: "var(--font-sans)",
        fontKerning: "normal",
        fontSynthesis: "none",
        textRendering: "geometricPrecision",
      }}
    >
      <div
        className={
          renderMode === "export"
            ? "overflow-hidden"
            : "mx-auto max-w-none overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_42px_rgba(148,163,184,0.14)]"
        }
        style={{
          width: shellWidth,
          height: shellHeight,
          boxSizing: "border-box",
          margin: renderMode === "export" ? 0 : "0 auto",
          borderRadius: renderMode === "export" ? 0 : undefined,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function getMultiSourceStagePalette(templateId: ReportTemplateId) {
  const useSimplePalette = templateId === "simple" || templateId === "modern";

  return useSimplePalette
    ? {
        background: "#EEF2F6",
        title: "#08122F",
        subtitle: "#6B7C97",
        progressActive: "#08122F",
        progressInactive: "#C9D3E1",
        progressPillBackground: "#EDF1F5",
        progressPillText: "#4E607A",
        progressPillBorder: "#DCE3EC",
        panelBackground: "#FFFFFF",
        panelBorder: "#DCE3EC",
        panelShadow: "shadow-[0_18px_42px_rgba(8,18,47,0.08)]",
        panelMuted: "#F6F8FB",
        metricAccent: "#1570B8",
        metricValue: "#08122F",
        chartAccent: "#1570B8",
        chartDark: false,
        insightBackground: "#625C94",
        insightBorder: "#DCE3EC",
        insightShadow: "shadow-[0_24px_44px_rgba(92,90,142,0.18)]",
        insightText: "#FFFFFF",
        insightSubtle: "rgba(255,255,255,0.80)",
      }
    : {
        background: "#07111F",
        title: "#FFFFFF",
        subtitle: "#CBD5E1",
        progressActive: "#FFFFFF",
        progressInactive: "rgba(255,255,255,0.25)",
        progressPillBackground: "rgba(255,255,255,0.05)",
        progressPillText: "#CBD5E1",
        progressPillBorder: "rgba(255,255,255,0.10)",
        panelBackground: "rgba(255,255,255,0.04)",
        panelBorder: "rgba(255,255,255,0.10)",
        panelShadow: "shadow-[0_18px_36px_rgba(2,6,23,0.18)]",
        panelMuted: "rgba(255,255,255,0.05)",
        metricAccent: "#7DD3FC",
        metricValue: "#FFFFFF",
        chartAccent: "#38BDF8",
        chartDark: true,
        insightBackground: "#2E1065",
        insightBorder: "rgba(125,211,252,0.20)",
        insightShadow: "shadow-[0_24px_44px_rgba(2,6,23,0.28)]",
        insightText: "#FFFFFF",
        insightSubtle: "rgba(226,232,240,0.88)",
      };
}

function getBlockSemanticName(block: ReportVersionBlock) {
  const value =
    block.data.semantic_name ??
    block.data.semanticName ??
    block.data.name ??
    block.data.key;

  return typeof value === "string" ? value.trim() : "";
}

function normalizeSemanticName(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getNormalizedBlockSemanticName(block: ReportVersionBlock) {
  return normalizeSemanticName(getBlockSemanticName(block));
}

function getBlockOrder(block: ReportVersionBlock, index: number) {
  const rawOrder =
    block.data.slide_number ??
    block.data.slideNumber ??
    block.data.order ??
    block.data.slide_order ??
    block.data.slideOrder;
  const order = typeof rawOrder === "number" ? rawOrder : Number(rawOrder);

  return Number.isFinite(order) && order > 0 ? order : index + 1;
}

function humanizeSemanticName(value: string, fallback: string) {
  const source = value || fallback;

  return source
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getReport10BlockDiagnostics(blocks: ReportVersionBlock[]) {
  return getReportBlockDiagnostics(blocks);
}

export function getReportBlockDiagnostics(blocks: ReportVersionBlock[]) {
  return {
    blocksCount: blocks.length,
    blockOrders: blocks.map(getBlockOrder),
    blockTypes: blocks.map((block) => block.type),
    semanticNames: blocks.map(getBlockSemanticName),
  };
}

export function shouldRenderBlocksAsSlides(blocks?: ReportVersionBlock[]) {
  const templateSlideCount = getReportTemplate("default").slides.length;
  return Boolean(blocks?.length && blocks.length > templateSlideCount);
}

function getBlockMetricKey(block: ReportVersionBlock) {
  const haystack = [
    getStringValue(block.data.metric_key),
    getStringValue(block.data.metricKey),
    getStringValue(block.data.metric_label),
    getStringValue(block.data.metricLabel),
    getStringValue(block.data.semantic_name),
    getStringValue(block.data.semanticName),
    getStringValue(block.data.key),
    getStringValue(block.data.name),
    block.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("impression") || haystack.includes("impresion")) {
    return "impressions";
  }

  if (
    haystack.includes("engagement") ||
    haystack.includes("interaction") ||
    haystack.includes("interacciones")
  ) {
    return "engagement";
  }

  if (haystack.includes("reach") || haystack.includes("alcance")) {
    return "reach";
  }

  return "";
}

function getBlockSlideType(block: ReportVersionBlock) {
  const haystack = [
    getStringValue(block.data.slide_type),
    getStringValue(block.data.slideType),
    getStringValue(block.data.semantic_name),
    getStringValue(block.data.semanticName),
    getStringValue(block.data.key),
    getStringValue(block.data.name),
    block.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("cover") || haystack.includes("title")) {
    return "cover";
  }

  if (
    haystack.includes("summary") ||
    haystack.includes("closing") ||
    haystack.includes("recommendation")
  ) {
    return "summary";
  }

  if (haystack.includes("metric")) {
    return "metric";
  }

  return "";
}

function normalizeFiveSlideBlockOrder(blocks: ReportVersionBlock[]) {
  if (blocks.length !== 5) {
    return blocks;
  }

  const consumed = new Set<string>();
  const pick = (predicate: (block: ReportVersionBlock) => boolean) => {
    const match = blocks.find((block) => !consumed.has(block.id) && predicate(block)) || null;

    if (match) {
      consumed.add(match.id);
    }

    return match;
  };

  const ordered = [
    pick((block) => getBlockOrder(block, 0) === 1) ||
      pick((block) => getBlockSlideType(block) === "cover") ||
      pick((block) => block.type === "title"),
    pick((block) => getBlockOrder(block, 0) === 2) ||
      pick((block) => getBlockMetricKey(block) === "reach"),
    pick((block) => getBlockOrder(block, 0) === 3) ||
      pick((block) => getBlockMetricKey(block) === "impressions"),
    pick((block) => getBlockOrder(block, 0) === 4) ||
      pick((block) => getBlockMetricKey(block) === "engagement"),
    pick((block) => getBlockOrder(block, 0) === 5) ||
      pick((block) => getBlockSlideType(block) === "summary"),
    ...blocks.filter((block) => !consumed.has(block.id)),
  ].filter((block): block is ReportVersionBlock => block !== null);

  return ordered.length === blocks.length ? ordered : blocks;
}

function sortBlocksByOrder(blocks: ReportVersionBlock[]) {
  const normalizedBlocks = normalizeFiveSlideBlockOrder(blocks);

  return normalizedBlocks
    .map((block, index) => ({
      block,
      index,
      order: getBlockOrder(block, index),
    }))
    .sort((left, right) => left.order - right.order || left.index - right.index)
    .map((item) => item.block);
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getObjectRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function getNestedValue(record: Record<string, unknown> | null, path: string[]) {
  let current: unknown = record;

  for (const segment of path) {
    const nextRecord = getObjectRecord(current);

    if (!nextRecord || !(segment in nextRecord)) {
      return undefined;
    }

    current = nextRecord[segment];
  }

  return current;
}

function getNumericCandidateValue(value: unknown): number | null {
  const directNumber = getNumberValue(value);

  if (directNumber !== null) {
    return directNumber;
  }

  const record = getObjectRecord(value);

  if (!record) {
    return null;
  }

  const nestedCandidates = [
    record.value,
    record.total,
    record.count,
    record.total_value,
    record.totalValue,
    record.metric_value,
    record.metricValue,
    record.current_value,
    record.currentValue,
  ];

  for (const candidate of nestedCandidates) {
    const parsed = getNumberValue(candidate);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function isEngagementBlock(block: ReportVersionBlock) {
  return getNormalizedBlockSemanticName(block) === "engagement_overview";
}

function getEngagementPrimaryMetricValue(block: ReportVersionBlock) {
  const dataRecord = block.data as Record<string, unknown>;
  const contentRecord = getObjectRecord(dataRecord.content);
  const candidateEntries = [
    {
      key: "summary",
      value: dataRecord.summary,
    },
    {
      key: "content.value",
      value: contentRecord?.value,
    },
    {
      key: "engagement",
      value: dataRecord.engagement,
    },
    {
      key: "total_interactions",
      value: dataRecord.total_interactions,
    },
    {
      key: "interactions_total",
      value: dataRecord.interactions_total,
    },
    {
      key: "normalized_report_metrics.interactions_total",
      value: getNestedValue(dataRecord, ["normalized_report_metrics", "interactions_total"]),
    },
    {
      key: "content_interactions",
      value: dataRecord.content_interactions,
    },
    {
      key: "accounts_engaged",
      value: dataRecord.accounts_engaged,
    },
  ];

  for (const candidate of candidateEntries) {
    const numericValue = getNumericCandidateValue(candidate.value);

    if (numericValue !== null) {
      return {
        source: candidate.key,
        numericValue,
        value: formatDisplayNumber(numericValue),
      };
    }
  }

  return {
    source: "",
    numericValue: null,
    value: "",
  };
}

function getSlideTitle(block: ReportVersionBlock, index: number) {
  const semanticName = getBlockSemanticName(block);
  const title =
    getStringValue(block.data.title) ||
    getStringValue(block.data.heading) ||
    getStringValue(block.data.label) ||
    getStringValue(block.data.text);

  if (title && title.length <= 72) {
    return title;
  }

  return humanizeSemanticName(semanticName, `Slide ${index + 1}`);
}

function getTextContent(block: ReportVersionBlock) {
  return (
    getStringValue(block.data.text) ||
    getStringValue(block.data.content) ||
    getStringValue(block.data.summary) ||
    getStringValue(block.data.insight) ||
    getStringValue(block.data.description) ||
    getStringValue(block.data.recommendation)
  );
}

function getBlockTimeframeLabel(block: ReportVersionBlock, locale?: string) {
  const timeframe = block.data.timeframe;
  const timeframeRecord =
    timeframe && typeof timeframe === "object"
      ? timeframe as Record<string, unknown>
      : null;
  const dateRange = formatMetaTimeframeDateRange({
    since:
      getStringValue(timeframeRecord?.since) ||
      getStringValue(block.data.period_since) ||
      getStringValue(block.data.timeframe_since) ||
      getStringValue(block.data.since),
    until:
      getStringValue(timeframeRecord?.until) ||
      getStringValue(block.data.period_until) ||
      getStringValue(block.data.timeframe_until) ||
      getStringValue(block.data.until),
    locale,
  });

  return (
    dateRange ||
    getStringValue(block.data.timeframe_label) ||
    getStringValue(block.data.timeframeLabel) ||
    getStringValue(block.data.period_label) ||
    getStringValue(block.data.periodLabel) ||
    getStringValue(timeframeRecord?.label) ||
    getStringValue(timeframe)
  );
}

function getListItems(block: ReportVersionBlock) {
  const raw =
    block.data.items ||
    block.data.bullets ||
    block.data.insights ||
    block.data.recommendations;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return (
          getStringValue(record.text) ||
          getStringValue(record.title) ||
          getStringValue(record.label)
        );
      }

      return "";
    })
    .filter(Boolean);
}

function getMetricItems(block: ReportVersionBlock) {
  const raw = block.data.metrics || block.data.stats || block.data.kpis;

  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const label =
          getStringValue(record.label) ||
          getStringValue(record.title) ||
          `Metric ${index + 1}`;
        const value = record.value ?? record.total ?? record.count ?? "";

        return {
          label,
          value: formatDisplayNumber(value),
        };
      })
      .filter(Boolean) as { label: string; value: string }[];
  }

  if (block.type !== "stat") {
    return [];
  }

  return [
    {
      label: getStringValue(block.data.label) || "Metric",
      value: formatDisplayNumber(block.data.value),
    },
  ];
}

function getPrimaryMetric(block: ReportVersionBlock) {
  if (isEngagementBlock(block)) {
    const engagementMetric = getEngagementPrimaryMetricValue(block);

    if (engagementMetric.value) {
      return {
        label: "Engagement",
        value: engagementMetric.value,
      };
    }
  }

  const metricItems = getMetricItems(block);
  const firstMetric = metricItems[0];
  const label =
    getStringValue(block.data.metric_label) ||
    getStringValue(block.data.metricLabel) ||
    getStringValue(block.data.label) ||
    firstMetric?.label ||
    "Total";
  const value =
    block.data.total ??
    block.data.value ??
    block.data.count ??
    block.data.total_value ??
    block.data.totalValue ??
    firstMetric?.value ??
    "";

  return {
    label,
    value: typeof value === "string" ? value : formatDisplayNumber(value),
  };
}

function normalizeChartPoint(item: unknown, index: number) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const xLabel =
    typeof record.x === "string" || typeof record.x === "number"
      ? String(record.x)
      : "";
  const timestampLabel =
    typeof record.timestamp === "string" || typeof record.timestamp === "number"
      ? String(record.timestamp)
      : "";
  const date =
    getStringValue(record.date) ||
    getStringValue(record.day) ||
    getStringValue(record.label) ||
    xLabel ||
    timestampLabel ||
    `Point ${index + 1}`;
  const value = Number(
    record.value ??
      record.current_value ??
      record.total ??
      record.count ??
      record.y ??
      record.reach ??
      record.impressions ??
      record.engagement ??
      record.total_interactions ??
      record.interactions_total ??
      record.content_interactions ??
      record.accounts_engaged ??
      0
  );

  return {
    date,
    label: getStringValue(record.label) || date,
    value: Number.isFinite(value) ? value : 0,
  };
}

function inferChartSeriesSourceType(record: Record<string, unknown>, label: string) {
  const explicit =
    getStringValue(record.source_type) ||
    getStringValue(record.sourceType) ||
    getStringValue(record.platform) ||
    getStringValue(record.provider);

  if (explicit) {
    return explicit.toLowerCase();
  }

  const haystack = label.toLowerCase();

  if (haystack.includes("instagram")) {
    return "instagram_business";
  }

  if (haystack.includes("facebook")) {
    return "facebook_pages";
  }

  return "";
}

function normalizeChartSeriesItem(item: unknown, index: number): BlockChartSeries | null {
  const record = getObjectRecord(item);

  if (!record) {
    return null;
  }

  const rawPoints =
    Array.isArray(record.points) ? record.points :
    Array.isArray(record.data) ? record.data :
    Array.isArray(record.series) ? record.series :
    [];

  if (!Array.isArray(rawPoints)) {
    return null;
  }

  const label =
    getStringValue(record.label) ||
    getStringValue(record.name) ||
    getStringValue(record.title) ||
    getStringValue(record.source) ||
    getStringValue(record.platform) ||
    `Series ${index + 1}`;

  return {
    label,
    sourceType: inferChartSeriesSourceType(record, label) || undefined,
    points: rawPoints
      .map(normalizeChartPoint)
      .filter(Boolean) as BlockChartPoint[],
  };
}

function getNestedChartSeries(collection: unknown) {
  if (!Array.isArray(collection)) {
    return null;
  }

  for (const item of collection) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;

    if (Array.isArray(record.points)) {
      return record.points;
    }

    if (Array.isArray(record.data)) {
      return record.data;
    }

    if (Array.isArray(record.series)) {
      return record.series;
    }
  }

  return null;
}

function getBlockChartSource(block: ReportVersionBlock) {
  const chart = block.data.chart;
  const chartRecord = chart && typeof chart === "object" ? chart as Record<string, unknown> : null;
  const metricRecord =
    block.data.metric && typeof block.data.metric === "object"
      ? (block.data.metric as Record<string, unknown>)
      : null;
  const chartData =
    block.data.chart_data && typeof block.data.chart_data === "object"
      ? (block.data.chart_data as Record<string, unknown>)
      : null;
  const dailyChart =
    block.data.dailyChart && typeof block.data.dailyChart === "object"
      ? (block.data.dailyChart as Record<string, unknown>)
      : null;
  const dailyEngagement = block.data.daily_engagement;
  const dailyEngagementRecord = getObjectRecord(dailyEngagement);

  if (Array.isArray(dailyEngagement)) {
    return {
      source: "data_json.daily_engagement" as const,
      raw: dailyEngagement,
    };
  }

  if (Array.isArray(dailyEngagementRecord?.points)) {
    return {
      source: "data_json.daily_engagement.points" as const,
      raw: dailyEngagementRecord.points,
    };
  }

  if (Array.isArray(dailyEngagementRecord?.data)) {
    return {
      source: "data_json.daily_engagement.data" as const,
      raw: dailyEngagementRecord.data,
    };
  }

  if (Array.isArray(chartRecord?.points)) {
    return {
      source: "data_json.chart.points" as const,
      raw: chartRecord.points,
    };
  }

  if (Array.isArray(chartData?.points)) {
    return {
      source: "data_json.chart_data.points" as const,
      raw: chartData.points,
    };
  }

  if (Array.isArray(dailyChart?.points)) {
    return {
      source: "data_json.dailyChart.points" as const,
      raw: dailyChart.points,
    };
  }

  if (Array.isArray(block.data.points)) {
    return {
      source: "data_json.points" as const,
      raw: block.data.points,
    };
  }

  if (Array.isArray(chartRecord?.data)) {
    const nestedDataPoints = getNestedChartSeries(chartRecord.data);

    if (nestedDataPoints) {
      return {
        source: "data_json.chart.data.points" as const,
        raw: nestedDataPoints,
      };
    }

    return {
      source: "data_json.chart.data" as const,
      raw: chartRecord.data,
    };
  }

  if (Array.isArray(chartData?.data)) {
    const nestedChartDataPoints = getNestedChartSeries(chartData.data);

    if (nestedChartDataPoints) {
      return {
        source: "data_json.chart_data.data.points" as const,
        raw: nestedChartDataPoints,
      };
    }

    return {
      source: "data_json.chart_data.data" as const,
      raw: chartData.data,
    };
  }

  if (Array.isArray(dailyChart?.data)) {
    return {
      source: "data_json.dailyChart.data" as const,
      raw: dailyChart.data,
    };
  }

  if (Array.isArray(chartRecord?.series)) {
    const nestedSeriesPoints = getNestedChartSeries(chartRecord.series);

    if (nestedSeriesPoints) {
      return {
        source: "data_json.chart.series.points" as const,
        raw: nestedSeriesPoints,
      };
    }

    return {
      source: "data_json.chart.series" as const,
      raw: chartRecord.series,
    };
  }

  if (Array.isArray(chartData?.series)) {
    const nestedChartSeriesPoints = getNestedChartSeries(chartData.series);

    if (nestedChartSeriesPoints) {
      return {
        source: "data_json.chart_data.series.points" as const,
        raw: nestedChartSeriesPoints,
      };
    }

    return {
      source: "data_json.chart_data.series" as const,
      raw: chartData.series,
    };
  }

  const raw =
    Array.isArray(block.data.data) ? block.data.data :
    Array.isArray(block.data.series) ? block.data.series :
    Array.isArray(block.data.daily) ? block.data.daily :
    Array.isArray(block.data.daily_series) ? block.data.daily_series :
    Array.isArray(block.data.dailySeries) ? block.data.dailySeries :
    Array.isArray(metricRecord?.daily_series) ? metricRecord.daily_series :
    Array.isArray(metricRecord?.dailySeries) ? metricRecord.dailySeries :
    Array.isArray(block.data.chart_data) ? block.data.chart_data :
    [];

  return {
    source: raw.length > 0 ? "data_json.series" as const : "none" as const,
    raw,
  };
}

function getBlockChartPoints(block: ReportVersionBlock) {
  return normalizeDailySeries(block.data) as BlockChartPoint[];
}

function getBlockChartSeries(block: ReportVersionBlock) {
  const chart = block.data.chart;
  const chartRecord = chart && typeof chart === "object" ? chart as Record<string, unknown> : null;
  const chartData =
    block.data.chart_data && typeof block.data.chart_data === "object"
      ? (block.data.chart_data as Record<string, unknown>)
      : null;
  const metricRecord =
    block.data.metric && typeof block.data.metric === "object"
      ? (block.data.metric as Record<string, unknown>)
      : null;
  const rawSeries =
    Array.isArray(chartRecord?.series) ? chartRecord.series :
    Array.isArray(chartData?.series) ? chartData.series :
    Array.isArray(block.data.series) ? block.data.series :
    Array.isArray(block.data.daily_series) ? block.data.daily_series :
    Array.isArray(block.data.dailySeries) ? block.data.dailySeries :
    Array.isArray(metricRecord?.daily_series) ? metricRecord.daily_series :
    Array.isArray(metricRecord?.dailySeries) ? metricRecord.dailySeries :
    [];

  return rawSeries
    .map(normalizeChartSeriesItem)
    .filter(Boolean) as BlockChartSeries[];
}

function isEngagementOverviewBlock(block: ReportVersionBlock) {
  return isEngagementBlock(block);
}

type InsightSummaryCard = {
  key: string;
  title: string;
  value: string;
  insight: string;
};

type OverviewMetricCard = {
  key: string;
  label: string;
  value: string;
  previousValue: string | null;
  changePercentage: number | null;
  trend: "up" | "down" | "flat" | "neutral";
  source: string | null;
};

type MultiSourceSemanticName =
  | "executive_summary"
  | "reach_overview"
  | "engagement_overview"
  | "audience_growth"
  | "top_performing_post"
  | "insights"
  | "recommendations";

type MultiSourcePlatformSection = {
  id: string;
  label: string;
  semanticBlocks: Partial<Record<MultiSourceSemanticName, ReportVersionBlock>>;
};

const OVERVIEW_METRIC_ORDER = ["reach", "impressions", "followers", "engagement"] as const;
const OVERVIEW_FIVE_SLIDE_METRIC_ORDER = ["reach", "followers", "engagement"] as const;

function getNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[%,$\s]/g, "").replace(/,/g, "");
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatOverviewChange(changePercentage: number | null) {
  if (changePercentage === null || !Number.isFinite(changePercentage)) {
    return null;
  }

  const rounded = Math.round(changePercentage * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";

  return `${prefix}${rounded}%`;
}

function getOverviewTrend(changePercentage: number | null) {
  if (changePercentage === null) {
    return "neutral";
  }

  if (changePercentage > 0) {
    return "positive";
  }

  if (changePercentage < 0) {
    return "negative";
  }

  return "neutral";
}

function normalizeOverviewTrend(value: unknown, changePercentage: number | null) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "up") {
      return "up" as const;
    }

    if (normalized === "down") {
      return "down" as const;
    }

    if (normalized === "flat") {
      return "flat" as const;
    }
  }

  const derived = getOverviewTrend(changePercentage);

  if (derived === "positive") {
    return "up" as const;
  }

  if (derived === "negative") {
    return "down" as const;
  }

  if (derived === "neutral" && changePercentage !== null) {
    return "flat" as const;
  }

  return "neutral" as const;
}

function formatOverviewMetricValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  return formatDisplayNumber(value);
}

function formatOverviewPreviousValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return formatDisplayNumber(value);
}

function getOverviewMetricKey(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("reach") || normalized.includes("alcance")) {
    return "reach";
  }

  if (normalized.includes("impression") || normalized.includes("impresion")) {
    return "impressions";
  }

  if (
    normalized.includes("engagement") ||
    normalized.includes("interaction") ||
    normalized.includes("interaccion")
  ) {
    return "engagement";
  }

  if (normalized.includes("follower") || normalized.includes("seguidores") || normalized.includes("fans")) {
    return "followers";
  }

  return "";
}

function toTitleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getArrayItemsFromUnknown(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (!item || typeof item !== "object") {
        return "";
      }

      const record = item as Record<string, unknown>;

      return (
        getStringValue(record.text) ||
        getStringValue(record.label) ||
        getStringValue(record.title) ||
        getStringValue(record.insight) ||
        getStringValue(record.summary) ||
        getStringValue(record.description)
      );
    })
    .filter(Boolean);
}

function humanizePlatformLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (
    normalized.includes("facebook") ||
    normalized.includes("fb") ||
    normalized.includes("page")
  ) {
    return "Facebook";
  }

  if (normalized.includes("instagram") || normalized.includes("ig")) {
    return "Instagram";
  }

  if (normalized === "facebook_pages") {
    return "Facebook";
  }

  if (normalized === "instagram_business") {
    return "Instagram";
  }

  return toTitleCase(value);
}

function getPlatformKey(value: string) {
  const normalized = humanizePlatformLabel(value).toLowerCase();

  if (normalized === "facebook") {
    return "facebook";
  }

  if (normalized === "instagram") {
    return "instagram";
  }

  return normalized.replace(/\s+/g, "-");
}

function getDefaultPlatformLabel(position: number) {
  return position === 0 ? "Facebook" : "Instagram";
}

function getBlockMetricCandidateValue(block: ReportVersionBlock, aliases: string[]) {
  const dataRecord = block.data as Record<string, unknown>;
  const nestedRecords = [
    getObjectRecord(dataRecord.metrics),
    getObjectRecord(dataRecord.stats),
    getObjectRecord(dataRecord.kpis),
    getObjectRecord(dataRecord.normalized_report_metrics),
    getObjectRecord(dataRecord.summary),
    getObjectRecord(dataRecord.content),
  ].filter(Boolean) as Record<string, unknown>[];

  for (const alias of aliases) {
    if (hasOwn(dataRecord, alias)) {
      return dataRecord[alias];
    }

    const snakeAlias = alias.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
    const camelAlias = alias.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());

    for (const candidateKey of [snakeAlias, camelAlias]) {
      if (hasOwn(dataRecord, candidateKey)) {
        return dataRecord[candidateKey];
      }
    }

    for (const record of nestedRecords) {
      if (hasOwn(record, alias)) {
        return record[alias];
      }

      if (hasOwn(record, snakeAlias)) {
        return record[snakeAlias];
      }

      if (hasOwn(record, camelAlias)) {
        return record[camelAlias];
      }
    }
  }

  return undefined;
}

function formatMetricCandidateDisplay(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return formatDisplayNumber(value);
  }

  const record = getObjectRecord(value);

  if (!record) {
    return "";
  }

  const primitiveCandidate = [
    record.value,
    record.total,
    record.count,
    record.metric_value,
    record.metricValue,
    record.current_value,
    record.currentValue,
  ].find((candidate) => candidate !== null && candidate !== undefined && candidate !== "");

  if (typeof primitiveCandidate === "string") {
    return primitiveCandidate.trim();
  }

  if (typeof primitiveCandidate === "number") {
    return formatDisplayNumber(primitiveCandidate);
  }

  return "";
}

function getMetricDisplay(block: ReportVersionBlock, aliases: string[], fallback = "—") {
  const value = getBlockMetricCandidateValue(block, aliases);
  const formatted = formatMetricCandidateDisplay(value);

  return formatted || fallback;
}

function getMetricNumber(block: ReportVersionBlock, aliases: string[]) {
  const value = getBlockMetricCandidateValue(block, aliases);

  if (value === undefined) {
    return null;
  }

  return getNumericCandidateValue(value);
}

function getBlockInsightText(block: ReportVersionBlock, fallback?: string) {
  return (
    getStringValue(block.data.insight_short) ||
    getStringValue(block.data.insightShort) ||
    getStringValue(block.data.ai_analysis) ||
    getStringValue(block.data.aiAnalysis) ||
    getStringValue(block.data.analysis) ||
    getStringValue(block.data.insight) ||
    getStringValue(block.data.summary) ||
    getStringValue(block.data.description) ||
    getTextContent(block) ||
    fallback ||
    ""
  );
}

function getBlockInsightItems(block: ReportVersionBlock, preferredKeys?: string[]) {
  const keys = preferredKeys || [
    "key_insights",
    "keyInsights",
    "comparative_insights",
    "comparativeInsights",
    "platform_strengths",
    "platformStrengths",
    "ecosystem_observations",
    "ecosystemObservations",
    "engagement_differences",
    "engagementDifferences",
    "reach_differences",
    "reachDifferences",
    "quick_wins",
    "quickWins",
    "strategic_recommendations",
    "strategicRecommendations",
    "recommendations",
  ];

  for (const key of keys) {
    const items = getArrayItemsFromUnknown((block.data as Record<string, unknown>)[key]);

    if (items.length > 0) {
      return items;
    }
  }

  const listItems = getListItems(block);

  if (listItems.length > 0) {
    return listItems;
  }

  const text = getBlockInsightText(block);

  if (!text) {
    return [];
  }

  return text
    .split(/\n+|(?<=\.)\s+(?=[A-Z])/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getBlockTrendDirection(
  block: ReportVersionBlock,
  chartPoints: BlockChartPoint[]
) {
  const explicit =
    getStringValue(block.data.trend_direction) ||
    getStringValue(block.data.trendDirection) ||
    getStringValue(block.data.trend);

  if (explicit) {
    const normalized = explicit.toLowerCase();

    if (normalized.includes("up") || normalized.includes("grow") || normalized.includes("positive")) {
      return "Upward";
    }

    if (normalized.includes("down") || normalized.includes("declin") || normalized.includes("negative")) {
      return "Downward";
    }

    if (normalized.includes("flat") || normalized.includes("stable")) {
      return "Stable";
    }
  }

  if (chartPoints.length >= 2) {
    const first = chartPoints[0]?.value ?? 0;
    const last = chartPoints[chartPoints.length - 1]?.value ?? 0;

    if (last > first) {
      return "Upward";
    }

    if (last < first) {
      return "Downward";
    }
  }

  return "Stable";
}

function getStrongestDay(block: ReportVersionBlock, chartPoints: BlockChartPoint[]) {
  const explicit =
    getStringValue(block.data.strongest_day) ||
    getStringValue(block.data.strongestDay) ||
    getStringValue(block.data.best_day) ||
    getStringValue(block.data.bestDay);

  if (explicit) {
    return explicit;
  }

  if (chartPoints.length === 0) {
    return "Not available";
  }

  const strongestPoint = [...chartPoints].sort((left, right) => right.value - left.value)[0];

  return strongestPoint ? strongestPoint.label || strongestPoint.date : "Not available";
}

function getBlockPlatformLabel(
  block: ReportVersionBlock,
  blocks: ReportVersionBlock[],
  semanticName: string
) {
  const directCandidates = [
    getStringValue(block.data.source_type),
    getStringValue(block.data.sourceType),
    getStringValue(block.data.platform),
    getStringValue(block.data.provider),
    getStringValue(block.data.source),
    getStringValue(block.data.channel),
    getStringValue(block.data.title),
    getStringValue(block.data.heading),
    getStringValue(block.data.label),
  ];

  for (const candidate of directCandidates) {
    const platform = humanizePlatformLabel(candidate);

    if (platform === "Facebook" || platform === "Instagram") {
      return platform;
    }
  }

  const chartSeries = getBlockChartSeries(block);

  for (const series of chartSeries) {
    const platform = humanizePlatformLabel(series.sourceType || series.label);

    if (platform === "Facebook" || platform === "Instagram") {
      return platform;
    }
  }

  const semanticPeers = blocks.filter(
    (item) => getNormalizedBlockSemanticName(item) === semanticName
  );
  const position = Math.max(0, semanticPeers.findIndex((item) => item === block));

  return getDefaultPlatformLabel(position);
}

function getBlockAccountLabel(block: ReportVersionBlock, fallback: string) {
  const directCandidates = [
    getStringValue(block.data.account_name),
    getStringValue(block.data.accountName),
    getStringValue(block.data.page_name),
    getStringValue(block.data.pageName),
    getStringValue(block.data.source_label),
    getStringValue(block.data.sourceLabel),
    getStringValue(block.data.entity_name),
    getStringValue(block.data.entityName),
    getStringValue(block.data.name),
  ];

  for (const candidate of directCandidates) {
    if (candidate) {
      return candidate;
    }
  }

  const sourceRecord = getObjectRecord((block.data as Record<string, unknown>).source);

  if (sourceRecord) {
    const nestedCandidate =
      getStringValue(sourceRecord.account_name) ||
      getStringValue(sourceRecord.accountName) ||
      getStringValue(sourceRecord.page_name) ||
      getStringValue(sourceRecord.pageName) ||
      getStringValue(sourceRecord.label) ||
      getStringValue(sourceRecord.name);

    if (nestedCandidate) {
      return nestedCandidate;
    }
  }

  return `${fallback} account`;
}

function isMultiSourceTenSlideReport(blocks: ReportVersionBlock[]) {
  if (blocks.length < 9) {
    return false;
  }

  const semanticNames = blocks.map((block) => getNormalizedBlockSemanticName(block));

  return (
    semanticNames.includes("executive_summary") &&
    semanticNames.filter((name) => name === "reach_overview").length >= 2 &&
    semanticNames.filter((name) => name === "engagement_overview").length >= 2 &&
    semanticNames.filter((name) => name === "audience_growth").length >= 2 &&
    (
      semanticNames.includes("insights") ||
      semanticNames.includes("recommendations") ||
      semanticNames.includes("top_performing_post")
    )
  );
}

function hasMultiSourcePlatformSemantics(blocks: ReportVersionBlock[]) {
  const semanticNames = blocks.map((block) => getNormalizedBlockSemanticName(block));

  return (
    semanticNames.filter((name) => name === "reach_overview").length >= 2 &&
    semanticNames.filter((name) => name === "engagement_overview").length >= 2 &&
    semanticNames.filter((name) => name === "audience_growth").length >= 2
  );
}

function shouldRenderMultiSourceExecutiveOverview(
  block: ReportVersionBlock,
  index: number,
  totalSlides: number
) {
  if (index !== 1) {
    return false;
  }

  const semanticName = getNormalizedBlockSemanticName(block);

  if (
    semanticName !== "executive_summary" &&
    semanticName !== "cross_platform_overview"
  ) {
    return false;
  }

  if (totalSlides < 9) {
    return false;
  }

  return true;
}

function collectMultiSourcePlatformSections(blocks: ReportVersionBlock[]) {
  const semanticNames: MultiSourceSemanticName[] = [
    "reach_overview",
    "engagement_overview",
    "audience_growth",
    "top_performing_post",
  ];
  const sections = new Map<string, MultiSourcePlatformSection>();

  semanticNames.forEach((semanticName) => {
    const semanticBlocks = blocks.filter(
      (block) => getNormalizedBlockSemanticName(block) === semanticName
    );

    semanticBlocks.forEach((block, index) => {
      const label = getBlockPlatformLabel(block, blocks, semanticName);
      const id = getPlatformKey(label) || `platform-${index + 1}`;
      const existing = sections.get(id);

      if (existing) {
        existing.semanticBlocks[semanticName] = block;
        return;
      }

      sections.set(id, {
        id,
        label,
        semanticBlocks: {
          [semanticName]: block,
        },
      });
    });
  });

  return Array.from(sections.values()).sort((left, right) => {
    const order = ["facebook", "instagram"];
    const leftIndex = order.indexOf(left.id);
    const rightIndex = order.indexOf(right.id);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.label.localeCompare(right.label);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

function splitItemsInHalf(items: string[]) {
  const midpoint = Math.ceil(items.length / 2);

  return [items.slice(0, midpoint), items.slice(midpoint)] as const;
}

function renderEmptyChartState(tone: ReturnType<typeof getTemplateTone>) {
  return (
    <div className={`flex h-full flex-col items-center justify-center rounded-[30px] border px-6 text-center ${tone.card}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.accent}`}>
        Daily chart
      </p>
      <p className={`mt-3 max-w-xs text-sm leading-6 ${tone.subtle}`}>
        No daily trend was available for this section.
      </p>
    </div>
  );
}

function renderMetricStatCard(input: {
  label: string;
  value: string;
  tone: ReturnType<typeof getTemplateTone>;
  strong?: boolean;
}) {
  const { label, value, tone, strong = false } = input;

  return (
    <article className={`rounded-[24px] border p-4 ${strong ? tone.cardStrong : tone.card}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${strong ? tone.cardStrongAccent : tone.accent}`}>
        {label}
      </p>
      <p className={`mt-3 text-[1.8rem] font-semibold leading-none tracking-[-0.05em] ${strong ? tone.cardStrongTitle : tone.title}`}>
        {value || "—"}
      </p>
    </article>
  );
}

function getOverviewMetricLabel(metricKey: string) {
  switch (metricKey) {
    case "reach":
      return "Reach";
    case "impressions":
      return "Impressions";
    case "engagement":
      return "Engagement";
    case "followers":
      return "Followers";
    default:
      return humanizeSemanticName(metricKey, "Metric");
  }
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function getPreferredRecordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (hasOwn(record, key)) {
      return record[key];
    }
  }

  return undefined;
}

function isOverviewBlock(block: ReportVersionBlock) {
  const semanticName = getNormalizedBlockSemanticName(block);
  const title = getStringValue(block.data.title).toLowerCase();
  const label = getStringValue(block.data.label).toLowerCase();

  return semanticName === "overview" || title === "overview" || label === "overview";
}

function getOverviewMetricsFromRawData(rawData: Record<string, unknown>) {
  const collected = new Map<string, OverviewMetricCard>();

  function upsertMetric(input: {
    metricKey: string;
    label?: string;
    value: unknown;
    previousValue?: unknown;
    changePercentage?: unknown;
    trend?: unknown;
    source?: string | null;
  }) {
    if (!input.metricKey) {
      return;
    }
    const parsedChangePercentage = getNumberValue(input.changePercentage);

    collected.set(input.metricKey, {
      key: input.metricKey,
      label: input.label || getOverviewMetricLabel(input.metricKey),
      value: formatOverviewMetricValue(input.value),
      previousValue: formatOverviewPreviousValue(input.previousValue),
      changePercentage: parsedChangePercentage,
      trend: normalizeOverviewTrend(input.trend, parsedChangePercentage),
      source: input.source || null,
    });
  }

  const rawMetricCollections = [
    { name: "metrics", value: rawData.metrics },
    { name: "stats", value: rawData.stats },
    { name: "kpis", value: rawData.kpis },
  ];

  rawMetricCollections.forEach((rawCollection) => {
    if (Array.isArray(rawCollection.value)) {
      rawCollection.value.forEach((item, index) => {
        if (!item || typeof item !== "object") {
          return;
        }

        const record = item as Record<string, unknown>;
        const metricKey = getOverviewMetricKey(
          getStringValue(record.key) ||
            getStringValue(record.metric) ||
            getStringValue(record.name) ||
            getStringValue(record.label) ||
            getStringValue(record.title)
        );

        upsertMetric({
          metricKey,
          label:
            getStringValue(record.label) ||
            getStringValue(record.title) ||
            getOverviewMetricLabel(metricKey),
          value: getPreferredRecordValue(record, ["value", "total", "current_value", "count"]),
          previousValue: getPreferredRecordValue(record, [
            "previous_value",
            "previousValue",
            "prev_value",
            "prevValue",
          ]),
          changePercentage: getPreferredRecordValue(record, [
            "change_percentage",
            "changePercentage",
            "growth_percentage",
            "growthPercentage",
            "percent_change",
            "percentChange",
          ]),
          trend: record.trend,
          source: `rawData.${rawCollection.name}[${index}]`,
        });
      });
      return;
    }

    if (!rawCollection.value || typeof rawCollection.value !== "object") {
      return;
    }

    Object.entries(rawCollection.value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
      const metricKey = getOverviewMetricKey(entryKey);

      if (!metricKey) {
        return;
      }

      if (entryValue && typeof entryValue === "object") {
        const record = entryValue as Record<string, unknown>;

        upsertMetric({
          metricKey,
          label:
            getStringValue(record.label) ||
            getStringValue(record.title) ||
            getOverviewMetricLabel(metricKey),
          value: getPreferredRecordValue(record, ["value", "total", "current_value", "count"]),
          previousValue: getPreferredRecordValue(record, [
            "previous_value",
            "previousValue",
            "prev_value",
            "prevValue",
          ]),
          changePercentage: getPreferredRecordValue(record, [
            "change_percentage",
            "changePercentage",
            "growth_percentage",
            "growthPercentage",
            "percent_change",
            "percentChange",
          ]),
          trend: record.trend,
          source: `rawData.${rawCollection.name}.${entryKey}`,
        });
      } else {
        upsertMetric({
          metricKey,
          label: getOverviewMetricLabel(metricKey),
          value: entryValue,
          source: `rawData.${rawCollection.name}.${entryKey}`,
        });
      }
    });
  });

  return collected;
}

function getOverviewMetricAliases(metricKey: string) {
  switch (metricKey) {
    case "reach":
      return ["reach", "viewers"];
    case "impressions":
      return ["impressions", "views"];
    case "followers":
      return ["followers", "fans"];
    case "engagement":
      return ["engagement", "interactions"];
    default:
      return [metricKey];
  }
}


function getOverviewMetricKeyFromBlock(block: ReportVersionBlock) {
  const candidates = [
    getBlockSemanticName(block),
    getStringValue(block.data.metric),
    getStringValue(block.data.metric_label),
    getStringValue(block.data.metricLabel),
    getStringValue(block.data.label),
    getStringValue(block.data.title),
    getStringValue(block.data.heading),
    getStringValue(block.data.key),
    getStringValue(block.data.name),
  ];

  for (const candidate of candidates) {
    const metricKey = getOverviewMetricKey(candidate);

    if (metricKey) {
      return metricKey;
    }
  }

  return "";
}

function getOverviewMetricCardFromBlock(block: ReportVersionBlock) {
  const metricKey = getOverviewMetricKeyFromBlock(block);

  if (!metricKey) {
    return null;
  }

  const collected = getOverviewMetricsFromRawData(block.data as Record<string, unknown>);

  const directValue = (() => {
    if (hasOwn(block.data as Record<string, unknown>, metricKey)) {
      return block.data[metricKey];
    }

    if (hasOwn(block.data as Record<string, unknown>, `${metricKey}_total`)) {
      return block.data[`${metricKey}_total`];
    }

    if (hasOwn(block.data as Record<string, unknown>, `${metricKey}Total`)) {
      return block.data[`${metricKey}Total`];
    }

    if (metricKey === "engagement") {
      const aliases = ["interactions", "interactions_total", "interactionsTotal"];
      for (const key of aliases) {
        if (hasOwn(block.data as Record<string, unknown>, key)) {
          return block.data[key];
        }
      }
    }

    return undefined;
  })();

  const directChange = (() => {
    const aliases = [
      `${metricKey}_change_percentage`,
      `${metricKey}ChangePercentage`,
      `${metricKey}_growth_percentage`,
      `${metricKey}GrowthPercentage`,
    ];

    if (metricKey === "engagement") {
      aliases.push("interactions_change_percentage", "interactionsChangePercentage");
    }

    for (const key of aliases) {
      if (hasOwn(block.data as Record<string, unknown>, key)) {
        return block.data[key];
      }
    }

    return undefined;
  })();

  const directPreviousValue = (() => {
    const aliases = getOverviewMetricAliases(metricKey);

    for (const key of aliases) {
      const previousCandidates = [
        `${key}_previous_value`,
        `${key}PreviousValue`,
        `${key}_prev_value`,
        `${key}PrevValue`,
      ];

      for (const previousKey of previousCandidates) {
        if (hasOwn(block.data as Record<string, unknown>, previousKey)) {
          return block.data[previousKey];
        }
      }
    }

    if (hasOwn(block.data as Record<string, unknown>, "previous_value")) {
      return block.data.previous_value;
    }

    if (hasOwn(block.data as Record<string, unknown>, "previousValue")) {
      return block.data.previousValue;
    }

    return undefined;
  })();

  const directTrend = (() => {
    if (hasOwn(block.data as Record<string, unknown>, "trend")) {
      return block.data.trend;
    }

    const aliases = getOverviewMetricAliases(metricKey);

    for (const key of aliases) {
      const trendCandidates = [`${key}_trend`, `${key}Trend`];

      for (const trendKey of trendCandidates) {
        if (hasOwn(block.data as Record<string, unknown>, trendKey)) {
          return block.data[trendKey];
        }
      }
    }

    return undefined;
  })();

  if (
    directValue !== undefined ||
    directPreviousValue !== undefined ||
    directChange !== undefined ||
    !collected.has(metricKey)
  ) {
    const parsedChangePercentage = getNumberValue(directChange);
    collected.set(metricKey, {
      key: metricKey,
      label: getOverviewMetricLabel(metricKey),
      value: formatOverviewMetricValue(directValue),
      previousValue: formatOverviewPreviousValue(directPreviousValue),
      changePercentage: parsedChangePercentage,
      trend: normalizeOverviewTrend(directTrend, parsedChangePercentage),
      source: `block.data.${metricKey}`,
    });
  }

  return collected.get(metricKey) || null;
}

function collectOverviewMetrics(blocks: ReportVersionBlock[]) {
  const collected = new Map<string, OverviewMetricCard>();

  blocks.forEach((block) => {
    const rawMetrics = getOverviewMetricsFromRawData(block.data as Record<string, unknown>);

    rawMetrics.forEach((metric, key) => {
      const existing = collected.get(key);

      if (!existing || existing.value === "—") {
        collected.set(key, metric);
      }
    });

    const metricCard = getOverviewMetricCardFromBlock(block);

    if (!metricCard) {
      return;
    }

    const existing = collected.get(metricCard.key);

    if (!existing || existing.value === "—") {
      collected.set(metricCard.key, metricCard);
    }
  });

  return OVERVIEW_METRIC_ORDER.map((metricKey) => collected.get(metricKey))
    .filter(Boolean) as OverviewMetricCard[];
}

function mergeOverviewMetrics(
  primary: OverviewMetricCard[],
  fallback: OverviewMetricCard[],
  metricOrder: readonly string[] = OVERVIEW_METRIC_ORDER
) {
  const merged = new Map<string, OverviewMetricCard>();

  fallback.forEach((metric) => {
    merged.set(metric.key, metric);
  });

  primary.forEach((metric) => {
    merged.set(metric.key, metric);
  });

  return metricOrder.map((metricKey) => merged.get(metricKey))
    .filter(Boolean) as OverviewMetricCard[];
}

function normalizeOverviewFallbackValue(value: string | null | undefined) {
  const normalized = getStringValue(value);

  if (!normalized) {
    return "";
  }

  if (normalized.toLowerCase() === "n/a") {
    return "";
  }

  return normalized;
}

function getOverviewRawMetricRecord(
  rawData: Record<string, unknown> | null,
  keys: string[]
) {
  if (!rawData) {
    return null;
  }

  const metrics =
    rawData.metrics && typeof rawData.metrics === "object"
      ? (rawData.metrics as Record<string, unknown>)
      : null;

  for (const key of keys) {
    const candidate = metrics?.[key] ?? rawData[key];

    if (candidate && typeof candidate === "object") {
      return candidate as Record<string, unknown>;
    }
  }

  return null;
}

function getOverviewFallbackChange(
  rawData: Record<string, unknown> | null,
  keys: string[]
) {
  const record = getOverviewRawMetricRecord(rawData, keys);

  if (record) {
    const nestedChange =
      record.change_percentage ??
      record.changePercentage ??
      record.growth_percentage ??
      record.growthPercentage ??
      record.percent_change ??
      record.percentChange;
    const parsedNestedChange = getNumberValue(nestedChange);

    if (parsedNestedChange !== null) {
      return parsedNestedChange;
    }
  }

  for (const key of keys) {
    const directChange =
      rawData?.[`${key}_change_percentage`] ??
      rawData?.[`${key}ChangePercentage`] ??
      rawData?.[`${key}_growth_percentage`] ??
      rawData?.[`${key}GrowthPercentage`];
    const parsedDirectChange = getNumberValue(directChange);

    if (parsedDirectChange !== null) {
      return parsedDirectChange;
    }
  }

  return null;
}

function getOverviewModelField(
  model: ExecutiveDarkViewModel | null | undefined,
  field: string
) {
  if (!model) {
    return undefined;
  }

  return (model as Record<string, unknown>)[field];
}

function getOverviewFollowersChange(
  model: ExecutiveDarkViewModel | null | undefined,
  rawData: Record<string, unknown> | null
) {
  const rawFallback =
    getOverviewFallbackChange(rawData, ["followers", "fans"]) ??
    getNumberValue(getOverviewModelField(model, "followersGrowthChangePercentage")) ??
    getNumberValue(getOverviewModelField(model, "followersGrowthPercentage")) ??
    getNumberValue(getOverviewModelField(model, "fansGrowthChangePercentage")) ??
    getNumberValue(getOverviewModelField(model, "fansGrowthPercentage")) ??
    getNumberValue(getOverviewModelField(model, "followersGrowthValue")) ??
    getNumberValue(getOverviewModelField(model, "fansGrowthValue"));

  return rawFallback;
}

function getOverviewFollowersTrend(
  model: ExecutiveDarkViewModel | null | undefined,
  rawData: Record<string, unknown> | null,
  fallbackChange: number | null
) {
  return normalizeOverviewTrend(
    getOverviewRawMetricRecord(rawData, ["followers", "fans"])?.trend ??
      getOverviewModelField(model, "followersGrowthTrend") ??
      getOverviewModelField(model, "fansGrowthTrend"),
    fallbackChange
  );
}

function getOverviewMetricsFromViewModel(model: ExecutiveDarkViewModel | null | undefined) {
  const safeModel = model ?? null;
  const rawData = safeModel?.generalInsightsRawData ?? null;
  const followersChange = getOverviewFollowersChange(safeModel, rawData);
  const reachValue =
    normalizeOverviewFallbackValue(safeModel?.reachTotalValue) ||
    normalizeOverviewFallbackValue(safeModel?.viewersTotalValue) ||
    normalizeOverviewFallbackValue(safeModel?.generalInsightsMetrics?.reach?.value);
  const impressionsValue =
    normalizeOverviewFallbackValue(safeModel?.impressionsTotalValue) ||
    normalizeOverviewFallbackValue(safeModel?.generalInsightsMetrics?.impressions?.value);
  const followersValue =
    normalizeOverviewFallbackValue(safeModel?.followersTotalValue) ||
    normalizeOverviewFallbackValue(safeModel?.generalInsightsMetrics?.followers?.value);
  const engagementValue =
    normalizeOverviewFallbackValue(safeModel?.interactionsTotalValue) ||
    normalizeOverviewFallbackValue(safeModel?.generalInsightsMetrics?.interactions?.value);

  console.log("[OVERVIEW_VIEW_MODEL_SAFE]", {
    hasModel: Boolean(model),
    model,
    rawData,
  });

  return [
    {
      key: "reach",
      label: "Reach",
      value: reachValue || "—",
      previousValue: null,
      changePercentage: getOverviewFallbackChange(rawData, ["reach", "viewers"]),
      trend: normalizeOverviewTrend(
        getOverviewRawMetricRecord(rawData, ["reach", "viewers"])?.trend,
        getOverviewFallbackChange(rawData, ["reach", "viewers"])
      ),
      source: reachValue ? "viewModel.reach" : null,
    },
    {
      key: "impressions",
      label: "Impressions",
      value: impressionsValue || "—",
      previousValue: null,
      changePercentage: getOverviewFallbackChange(rawData, ["impressions", "views"]),
      trend: normalizeOverviewTrend(
        getOverviewRawMetricRecord(rawData, ["impressions", "views"])?.trend,
        getOverviewFallbackChange(rawData, ["impressions", "views"])
      ),
      source: impressionsValue ? "viewModel.impressions" : null,
    },
    {
      key: "followers",
      label: "Followers",
      value: followersValue || "—",
      previousValue: null,
      changePercentage: followersChange,
      trend: getOverviewFollowersTrend(safeModel, rawData, followersChange),
      source: followersValue ? "viewModel.followers" : null,
    },
    {
      key: "engagement",
      label: "Engagement",
      value: engagementValue || "—",
      previousValue: null,
      changePercentage: getOverviewFallbackChange(rawData, ["interactions", "engagement"]),
      trend: normalizeOverviewTrend(
        getOverviewRawMetricRecord(rawData, ["interactions", "engagement"])?.trend,
        getOverviewFallbackChange(rawData, ["interactions", "engagement"])
      ),
      source: engagementValue ? "viewModel.engagement" : null,
    },
  ];
}

function getOverviewMetricNarrativeLabel(metricKey: string, locale?: string) {
  const isSpanish = locale?.toLowerCase().startsWith("es");

  switch (metricKey) {
    case "reach":
      return isSpanish ? "alcance" : "reach";
    case "impressions":
      return isSpanish ? "impresiones" : "impressions";
    case "followers":
      return isSpanish ? "seguidores" : "followers";
    case "engagement":
      return isSpanish ? "engagement" : "engagement";
    default:
      return isSpanish ? metricKey : metricKey;
  }
}

function buildOverviewAiAnalysis(
  metrics: OverviewMetricCard[],
  locale?: string,
  fallbackInsight?: string
) {
  const isSpanish = locale?.toLowerCase().startsWith("es");
  const availableMetrics = metrics.filter((metric) => metric.value !== "—");
  const positiveMetrics = metrics.filter(
    (metric) => metric.changePercentage !== null && metric.changePercentage > 0
  );
  const negativeMetrics = metrics.filter(
    (metric) => metric.changePercentage !== null && metric.changePercentage < 0
  );
  const missingMetrics = metrics.filter((metric) => metric.value === "—");

  if (availableMetrics.length === 0) {
    return isSpanish
      ? fallbackInsight ||
          "No hay suficientes datos en este overview para construir un analisis comparativo entre metricas."
      : fallbackInsight ||
          "There is not enough overview data to build a comparative analysis across metrics.";
  }

  const strongestMetric = [...positiveMetrics].sort(
    (left, right) => (right.changePercentage ?? 0) - (left.changePercentage ?? 0)
  )[0];
  const weakestMetric = [...negativeMetrics].sort(
    (left, right) => (left.changePercentage ?? 0) - (right.changePercentage ?? 0)
  )[0];

  if (isSpanish) {
    const parts = [
      `El overview muestra ${availableMetrics.length} metricas con dato visible: ${availableMetrics
        .map((metric) => `${getOverviewMetricNarrativeLabel(metric.key, locale)} (${metric.value})`)
        .join(", ")}.`,
    ];

    if (strongestMetric) {
      parts.push(
        `La mejor señal viene de ${getOverviewMetricNarrativeLabel(
          strongestMetric.key,
          locale
        )}, con una variacion de ${formatOverviewChange(strongestMetric.changePercentage)}.`
      );
    }

    if (weakestMetric) {
      parts.push(
        `La principal caida aparece en ${getOverviewMetricNarrativeLabel(
          weakestMetric.key,
          locale
        )}, con ${formatOverviewChange(weakestMetric.changePercentage)}.`
      );
    }

    if (!strongestMetric && !weakestMetric) {
      parts.push(
        "No hay cambios porcentuales suficientes para hablar de aceleracion o caida clara entre las metricas visibles."
      );
    }

    if (missingMetrics.length > 0) {
      parts.push(
        `Faltan datos en ${missingMetrics
          .map((metric) => getOverviewMetricNarrativeLabel(metric.key, locale))
          .join(", ")}, por lo que la lectura ejecutiva debe tomarse como parcial.`
      );
    }

    return parts.join(" ");
  }

  const parts = [
    `The overview shows ${availableMetrics.length} visible metrics: ${availableMetrics
      .map((metric) => `${getOverviewMetricNarrativeLabel(metric.key, locale)} (${metric.value})`)
      .join(", ")}.`,
  ];

  if (strongestMetric) {
    parts.push(
      `The strongest signal is ${getOverviewMetricNarrativeLabel(
        strongestMetric.key,
        locale
      )}, up ${formatOverviewChange(strongestMetric.changePercentage)}.`
    );
  }

  if (weakestMetric) {
    parts.push(
      `The main decline appears in ${getOverviewMetricNarrativeLabel(
        weakestMetric.key,
        locale
      )}, at ${formatOverviewChange(weakestMetric.changePercentage)}.`
    );
  }

  if (!strongestMetric && !weakestMetric) {
    parts.push("There are not enough percentage deltas to describe a clear acceleration or decline.");
  }

  if (missingMetrics.length > 0) {
    parts.push(
      `Data is missing for ${missingMetrics
        .map((metric) => getOverviewMetricNarrativeLabel(metric.key, locale))
        .join(", ")}, so this executive readout is partial.`
    );
  }

  return parts.join(" ");
}

function isOverviewCandidate(blocks: ReportVersionBlock[]) {
  if (!blocks || blocks.length === 0) {
    return false;
  }

  const found = new Set(
    blocks
      .map((block) => getOverviewMetricKeyFromBlock(block))
      .filter(Boolean)
  );

  return found.size >= 2;
}

function shouldRenderOverviewSlide(blocks: ReportVersionBlock[], index: number, totalSlides: number) {
  if (index !== 1) {
    return false;
  }

  if (totalSlides === 5) {
    return true;
  }

  return isOverviewCandidate(blocks);
}

function OverviewSlide({
  blocks,
  model,
  index,
  totalSlides,
  renderMode,
  templateId,
  locale,
  hideInsights = false,
}: {
  blocks: ReportVersionBlock[];
  model: ExecutiveDarkViewModel | null | undefined;
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
  locale?: string;
  hideInsights?: boolean;
}) {
  const tone = getTemplateTone(templateId);
  const modern = templateId === "modern";
  const isFiveSlideReport = totalSlides === 5;
  const slideId = String(index + 1).padStart(2, "0");
  const sortedBlocks = sortBlocksByOrder(blocks);
  const metricBlocks = sortedBlocks.filter((block) =>
    isOverviewBlock(block) || Boolean(getOverviewMetricKeyFromBlock(block))
  );
  const blockMetrics = collectOverviewMetrics(sortedBlocks);
  const fallbackMetrics = getOverviewMetricsFromViewModel(model);
  const metricOrder = isFiveSlideReport
    ? OVERVIEW_FIVE_SLIDE_METRIC_ORDER
    : OVERVIEW_METRIC_ORDER;
  const overviewMetrics = mergeOverviewMetrics(blockMetrics, fallbackMetrics, metricOrder);
  const overviewBlock = sortedBlocks.find((block) => isOverviewBlock(block)) || null;
  const timeframeBlock = metricBlocks[0] || blocks[0];
  const timeframeLabel = timeframeBlock ? getBlockTimeframeLabel(timeframeBlock, locale) : "";
  const insight = overviewBlock
    ? getStringValue(overviewBlock.data.insight) ||
      getStringValue(overviewBlock.data.text) ||
      getStringValue(overviewBlock.data.summary) ||
      getStringValue(overviewBlock.data.content) ||
      ""
    : buildOverviewAiAnalysis(overviewMetrics, locale, "");

  if (overviewBlock) {
    console.log("[FRONTEND_OVERVIEW_INSIGHT]", {
      semanticName: getBlockSemanticName(overviewBlock),
      insight,
      raw: overviewBlock.data,
    });
  }

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title=""
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="flex h-full min-h-0 flex-col gap-6">
        <div className="space-y-2">
          <h2 className={`text-[2.35rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
            Overview
          </h2>
          {timeframeLabel ? (
            <p className={`text-sm font-medium ${tone.subtle}`}>
              {timeframeLabel}
            </p>
          ) : null}
        </div>

        <div className={`grid min-h-0 flex-1 gap-5 ${hideInsights ? "grid-cols-1" : "grid-cols-[0.92fr_1.08fr]"}`}>
          <div className="grid min-h-0 grid-cols-2 gap-4">
            {overviewMetrics.map((metric, metricIndex) => {
              const changeText = isFiveSlideReport
                ? null
                : formatOverviewChange(metric.changePercentage);
              const trend = metric.trend;
              const changeClass =
                trend === "up"
                  ? "text-emerald-300"
                  : trend === "down"
                    ? "text-rose-300"
                    : trend === "flat"
                      ? "text-cyan-200"
                      : "text-slate-400";
              const arrow =
                trend === "up"
                  ? "↑"
                  : trend === "down"
                    ? "↓"
                    : trend === "flat"
                      ? "→"
                      : "";

              return (
                <article
                  key={metric.key}
                  className={`group flex min-h-[152px] flex-col rounded-[28px] border p-5 transition duration-300 ${modern && metricIndex === 0 ? tone.cardStrong : tone.card} ${
                    isFiveSlideReport && metricIndex === overviewMetrics.length - 1 && overviewMetrics.length % 2 === 1
                      ? "col-span-2"
                      : ""
                  }`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${modern && metricIndex === 0 ? tone.cardStrongAccent : tone.accent}`}>
                    {metric.label}
                  </p>
                  <p className={`mt-4 break-words text-[2.35rem] font-semibold leading-none tracking-[-0.06em] ${modern && metricIndex === 0 ? tone.cardStrongTitle : tone.title}`}>
                    {metric.value || "—"}
                  </p>
                  <div className="mt-auto pt-4">
                    {isFiveSlideReport ? null : metric.previousValue ? (
                      <p className={`text-[0.74rem] font-medium ${modern && metricIndex === 0 ? tone.cardStrongSubtitle : tone.subtle}`}>
                        vs previous period {metric.previousValue}
                      </p>
                    ) : (
                      <p className={`text-[0.74rem] font-medium ${modern && metricIndex === 0 ? tone.cardStrongSubtitle : tone.subtle}`}>
                        {metric.changePercentage === null
                          ? "No previous comparison"
                          : "vs previous period"}
                      </p>
                    )}
                    {isFiveSlideReport ? null : changeText ? (
                      <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${tone.chip} ${changeClass}`}>
                        {arrow ? <span>{arrow}</span> : null}
                        <span>{changeText}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {hideInsights ? null : (
            <div className={`min-h-0 rounded-[28px] border p-5 ${tone.insight}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${modern ? tone.insightTitle : tone.accentSoft}`}>
                Insights
              </p>
              <p className={`mt-3 text-[0.95rem] leading-7 ${modern ? tone.insightBody : tone.subtitle}`}>
                {insight}
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideCanvas>
  );
}

function getExecutiveSummaryPayloadCards(block: ReportVersionBlock) {
  const rawCards = block.data.insight_cards || block.data.insightCards;

  if (!Array.isArray(rawCards)) {
    return [];
  }

  return rawCards
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title =
        getStringValue(record.title) ||
        getStringValue(record.label) ||
        `Insight ${index + 1}`;
      const value = record.value ?? record.total ?? record.count ?? "";
      const insight =
        getStringValue(record.insight) ||
        getStringValue(record.summary) ||
        getStringValue(record.text) ||
        getStringValue(record.description);

      return {
        key: getStringValue(record.id) || `${title}-${index}`,
        title,
        value: typeof value === "string" ? value : formatDisplayNumber(value),
        insight,
      };
    })
    .filter(Boolean) as InsightSummaryCard[];
}

function getInsightSummaryCards(blocks: ReportVersionBlock[]) {
  const excludedSemanticNames = new Set([
    "cover",
    "executive_summary",
    "closing_summary",
    "closing",
  ]);

  return sortBlocksByOrder(blocks)
    .map((block, index) => {
      const semanticName = getBlockSemanticName(block);

      if (excludedSemanticNames.has(semanticName)) {
        return null;
      }

      const listItems = getListItems(block);
      const primaryMetric = getPrimaryMetric(block);
      const insight =
        getStringValue(block.data.insight) ||
        getStringValue(block.data.summary) ||
        getStringValue(block.data.analysis) ||
        getTextContent(block) ||
        listItems[0] ||
        "";

      if (!insight && !primaryMetric.value) {
        return null;
      }

      return {
        key: block.id || `${semanticName || "block"}-${index}`,
        title: getSlideTitle(block, index),
        value: primaryMetric.value || "",
        insight,
      };
    })
    .filter(Boolean) as InsightSummaryCard[];
}

function getExecutiveAiAnalysis(
  block: ReportVersionBlock,
  cards: InsightSummaryCard[],
  options?: { allowLegacyFallback?: boolean }
) {
  const explicitAnalysis =
    getStringValue(block.data.ai_analysis) ||
    getStringValue(block.data.aiAnalysis) ||
    getStringValue(block.data.analysis);

  if (explicitAnalysis) {
    return explicitAnalysis;
  }

  if (!options?.allowLegacyFallback) {
    return "";
  }

  const blockText = getTextContent(block);

  if (blockText) {
    return blockText;
  }

  const leadingSignals = cards
    .slice(0, 3)
    .map((card) => card.title.toLowerCase())
    .join(", ");

  if (!leadingSignals) {
    return "The current Meta dataset does not include enough insight detail to connect the sections yet.";
  }

  return `The strongest readout comes from ${leadingSignals}. Reviewed together, these signals help connect audience size, content response and performance momentum into one executive view.`;
}

/*
 * LEGACY / candidate for removal after contract is stable.
 * Official 5-slide summary is SummarySlide via lib/reports/templates/default.ts.
 * This block-based summary remains only for reports that still render dynamic block decks.
 */
function ExecutiveSummarySlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
  templateId,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
}) {
  const tone = getTemplateTone(templateId);
  const slideId = String(index + 1).padStart(2, "0");
  const title =
    getStringValue(block.data.title) ||
    getStringValue(block.data.heading) ||
    "Insights Summary";
  const payloadCards = getExecutiveSummaryPayloadCards(block);
  const cards = payloadCards.length > 0 ? payloadCards : getInsightSummaryCards(blocks);
  const visibleCards = cards.slice(0, 8);
  const aiAnalysis = getExecutiveAiAnalysis(block, cards, {
    allowLegacyFallback: payloadCards.length === 0,
  });
  const fallbackText = getTextContent(block);

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
          {visibleCards.length > 0 ? (
            visibleCards.map((card) => (
              <article
                key={card.key}
                className={`min-h-0 rounded-[24px] border p-4 ${tone.card}`}
              >
                <p className={`line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${tone.accent}`}>
                  {card.title}
                </p>
                {card.value ? (
                  <p className={`mt-3 line-clamp-1 text-2xl font-semibold tracking-[-0.05em] ${tone.title}`}>
                    {card.value}
                  </p>
                ) : null}
                <p className={`mt-3 line-clamp-4 text-[0.72rem] leading-5 ${tone.subtitle}`}>
                  {card.insight}
                </p>
              </article>
            ))
          ) : (
            <article className={`col-span-4 rounded-[24px] border p-5 ${tone.card}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.accent}`}>
                Summary
              </p>
              <p className={`mt-3 text-sm leading-6 ${tone.subtitle}`}>
                {fallbackText || "No insight cards were available for this report yet."}
              </p>
            </article>
          )}
        </div>

        {aiAnalysis ? (
          <div className={`rounded-[28px] border p-5 ${templateId === "modern" ? tone.cardStrong : tone.insight}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${templateId === "modern" ? tone.cardStrongAccent : tone.accentSoft}`}>
              AI analysis
            </p>
            <p className={`mt-3 line-clamp-5 text-[0.92rem] leading-6 ${templateId === "modern" ? tone.cardStrongSubtitle : tone.subtitle}`}>
              {aiAnalysis}
            </p>
          </div>
        ) : null}
      </div>
    </SlideCanvas>
  );
}

function MultiSourceExecutiveOverviewSlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
  templateId,
  locale,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
  locale?: string;
}) {
  const slideId = String(index + 1).padStart(2, "0");
  const timeframeLabel =
    getBlockTimeframeLabel(block, locale) || "Date range unavailable";
  const title = "Overview";
  const stagePalette = getMultiSourceStagePalette(templateId);
  const platformSectionsById = new Map(
    collectMultiSourcePlatformSections(blocks).map((section) => [section.id, section])
  );
  const platformSections = [
    {
      id: "facebook",
      label: "Facebook",
      semanticBlocks: platformSectionsById.get("facebook")?.semanticBlocks || {},
      cardClass: stagePalette.facebookCard,
      labelClass: stagePalette.facebookAccent,
      trendClass: stagePalette.facebookAccent,
    },
    {
      id: "instagram",
      label: "Instagram",
      semanticBlocks: platformSectionsById.get("instagram")?.semanticBlocks || {},
      cardClass: stagePalette.instagramCard,
      labelClass: stagePalette.instagramAccent,
      trendClass: stagePalette.instagramAccent,
    },
  ] as const;
  const insightText =
    getStringValue(block.data.ai_analysis) ||
    getStringValue(block.data.aiAnalysis) ||
    getStringValue(block.data.analysis) ||
    getStringValue(block.data.summary) ||
    getStringValue(block.data.description) ||
    getStringValue(block.data.text) ||
    "Cross-platform performance shows a differentiated split between distribution strength and interaction quality, giving leadership teams a clear baseline before deeper section-by-section analysis.";
  const conciseInsightText =
    insightText.split(/(?<=[.!?])\s+/)[0]?.trim() ||
    "Interpretation this period summary.";
  const progressStyle: CSSProperties = {
    left: 1357,
    top: 100,
    width: 460,
    height: 73,
  };

  function getMetricTrendText(
    targetBlock: ReportVersionBlock | undefined,
    aliases: string[]
  ) {
    if (!targetBlock) {
      return "\u2191 5%";
    }

    const trendCandidate = getBlockMetricCandidateValue(targetBlock, [
      ...aliases.flatMap((alias) => [
        `${alias}_change_percentage`,
        `${alias}ChangePercentage`,
        `${alias}_growth_percentage`,
        `${alias}GrowthPercentage`,
      ]),
      "change_percentage",
      "changePercentage",
      "growth_percentage",
      "growthPercentage",
    ]);
    const numericTrend = getNumberValue(trendCandidate);

    if (numericTrend === null) {
      return "\u2191 5%";
    }

    const rounded = Math.round(Math.abs(numericTrend) * 10) / 10;
    const prefix = numericTrend < 0 ? "\u2193" : "\u2191";

    return `${prefix} ${rounded}%`;
  }

  function renderMetricCard(input: {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    trend: string;
    platform: string;
    cardClass: string;
    labelClass: string;
    trendClass: string;
  }) {
    return (
      <article
        key={input.key}
        className={`absolute overflow-hidden rounded-[30px] border ${stagePalette.cardShadow} ${input.cardClass}`}
        style={{
          left: input.x,
          top: input.y,
          width: input.width,
          height: input.height,
        }}
      >
        <div className="relative h-full w-full">
          <p
            className={`absolute font-medium leading-none ${input.labelClass}`}
            style={{
              left: 55,
              top: 42,
              fontSize: 28,
            }}
          >
            {input.label}
          </p>
          <p
            className="absolute font-bold leading-none"
            style={{
              left: 55,
              top: 88,
              fontSize: 68,
              letterSpacing: "-0.06em",
              color: stagePalette.metricValue,
            }}
          >
            {input.value}
          </p>
          <p
            className={`absolute font-medium leading-none ${input.trendClass}`}
            style={{
              left: 55,
              top: 160,
              fontSize: 22,
            }}
          >
            {input.trend}
          </p>
          <p
            className="absolute font-bold leading-none"
            style={{
              right: 36,
              bottom: 28,
              fontSize: 28,
              color: stagePalette.platformText,
            }}
          >
            {input.platform}
          </p>
        </div>
      </article>
    );
  }

  return (
    <PresentationStageSlideFrame slideId={slideId} renderMode={renderMode}>
      <FixedReportSlideStage>
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: stagePalette.background }}
        >
          <h2
            className="absolute font-extrabold leading-none"
            style={{
              left: 115,
              top: 110,
              fontSize: 82,
              letterSpacing: "-0.07em",
              color: stagePalette.title,
            }}
          >
            {title}
          </h2>
          <p
            className="absolute font-medium"
            style={{
              left: 115,
              top: 220,
              fontSize: 31,
              lineHeight: 1.2,
              color: stagePalette.subtitle,
            }}
          >
            {`Data Resume period: "${timeframeLabel}".`}
          </p>

          <div
            className="absolute flex items-center justify-end gap-4"
            style={progressStyle}
          >
            <div className="flex items-center gap-3">
              {Array.from({ length: totalSlides }, (_, dotIndex) => dotIndex + 1).map((dot) => (
                <span
                  key={dot}
                  className={`h-4 rounded-full ${String(dot).padStart(2, "0") === slideId ? "w-14" : "w-4"}`}
                  style={{
                    background:
                      String(dot).padStart(2, "0") === slideId
                        ? stagePalette.progressActive
                        : stagePalette.progressInactive,
                  }}
                />
              ))}
            </div>
            <span
              className="rounded-full border px-5 py-3 text-[24px] font-semibold leading-none"
              style={{
                borderColor: stagePalette.progressPillBorder,
                background: stagePalette.progressPillBackground,
                color: stagePalette.progressPillText,
              }}
            >
              {slideId}/{String(totalSlides).padStart(2, "0")}
            </span>
          </div>

          {platformSections.flatMap((section, sectionIndex) => {
            const reachBlock = section.semanticBlocks.reach_overview;
            const engagementBlock = section.semanticBlocks.engagement_overview;
            const baseBlock = reachBlock || engagementBlock || block;
            const cardX = sectionIndex === 0 ? 115 : 741;
            const metrics = [
              {
                key: `${section.id}-reach`,
                label: "Reach",
                value: getMetricDisplay(
                  reachBlock || baseBlock,
                  ["reach", "total_reach"],
                  "Not available"
                ),
                trend: getMetricTrendText(
                  reachBlock || baseBlock,
                  ["reach", "total_reach"]
                ),
                y: 307,
                height: 219,
              },
              {
                key: `${section.id}-impressions`,
                label: "Impressions",
                value: getMetricDisplay(
                  reachBlock || baseBlock,
                  ["impressions", "total_impressions"],
                  "Not available"
                ),
                trend: getMetricTrendText(
                  reachBlock || baseBlock,
                  ["impressions", "total_impressions"]
                ),
                y: 551,
                height: 219,
              },
              {
                key: `${section.id}-engagement`,
                label: "Engagement",
                value: getMetricDisplay(
                  engagementBlock || baseBlock,
                  ["engagement", "total_engagement", "interactions_total"],
                  "Not available"
                ),
                trend: getMetricTrendText(
                  engagementBlock || baseBlock,
                  ["engagement", "total_engagement", "interactions_total"]
                ),
                y: 794,
                height: sectionIndex === 0 ? 218 : 218,
              },
            ];

            return metrics.map((metric) =>
              renderMetricCard({
                key: metric.key,
                x: cardX,
                y: metric.y,
                width: sectionIndex === 0 ? 538 : 539,
                height: metric.height,
                label: metric.label,
                value: metric.value,
                trend: metric.trend,
                platform: section.label,
                cardClass: section.cardClass,
                labelClass: section.labelClass,
                trendClass: section.trendClass,
              })
            );
          })}

          <section
            className={`absolute overflow-hidden rounded-[30px] border ${stagePalette.aiShadow}`}
            style={{
              left: 1318,
              top: 307,
              width: 538,
              height: 704,
              paddingLeft: 52,
              paddingTop: 54,
              paddingRight: 52,
              paddingBottom: 52,
              borderColor: stagePalette.aiPanelBorder,
              background: stagePalette.aiPanelBackground,
            }}
          >
            <p
              className="font-extrabold leading-[1.1] text-white"
              style={{ fontSize: 40 }}
            >
              AI Insight:
            </p>
            <p
              className="text-white"
              style={{
                marginTop: 48,
                fontSize: 46,
                lineHeight: 1.22,
                fontWeight: 700,
                display: "-webkit-box",
                WebkitLineClamp: 6,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {conciseInsightText || "Interpretation this period summary."}
            </p>
          </section>
        </div>
      </FixedReportSlideStage>
    </PresentationStageSlideFrame>
  );
}

function MultiSourceMetricSlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
  templateId,
  locale,
  variant,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
  locale?: string;
  variant: "reach" | "engagement" | "audience";
}) {
  const tone = getTemplateTone(templateId);
  const semanticName = getBlockSemanticName(block).toLowerCase();
  const slideId = String(index + 1).padStart(2, "0");
  const platformLabel = getBlockPlatformLabel(block, blocks, semanticName);
  const timeframeLabel = getBlockTimeframeLabel(block, locale);
  const chartPoints = getBlockChartPoints(block);
  const chartSeries = getBlockChartSeries(block);
  const hasMultiSeriesChart = chartSeries.length >= 2;
  const hasChart = hasMultiSeriesChart
    ? chartSeries.some((series) => series.points.length > 0)
    : chartPoints.length > 0;
  const insightText = getBlockInsightText(block);
  const insightItems = getBlockInsightItems(block);
  const strongestDay = getStrongestDay(block, chartPoints);
  const trendDirection = getBlockTrendDirection(block, chartPoints);
  const conciseInsightText = insightItems[0] || insightText;

  if (process.env.NODE_ENV === "development") {
    console.info("[ReportChart][metric.slide]", {
      slide_number: slideId,
      metric_key: variant,
      daily_series_length: chartPoints.length,
      daily_series_values: chartPoints.map((point) => point.value),
      chart_props_recibidos: {
        semanticName,
        hasChart,
        hasMultiSeriesChart,
        seriesCount: chartSeries.length,
        timeframeLabel,
      },
    });
  }

  if (variant === "reach") {
    return (
      <SlideCanvas
        index={slideId}
        totalSlides={totalSlides}
        eyebrow=""
        title=""
        renderMode={renderMode}
        templateId={templateId}
      >
        <div className="grid h-full min-h-0 grid-cols-[0.82fr_1.18fr] gap-6">
          <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${tone.accent}`}>
                Metric
              </p>
              <h2 className={`mt-3 text-[2.3rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
                {platformLabel}
              </h2>
              <p className={`mt-2 text-xs ${tone.subtle}`}>
                Reach / visibility performance
              </p>
              <p className={`mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
                Total reach this period
              </p>
              <p className={`mt-3 text-[3rem] font-semibold leading-none tracking-[-0.06em] ${tone.title}`}>
                {getMetricDisplay(block, ["reach", "total_reach"], "—")}
              </p>
              {timeframeLabel ? (
                <p className={`mt-3 text-sm font-medium ${tone.subtle}`}>
                  {timeframeLabel}
                </p>
              ) : null}
            </div>
            <div />
            <InsightBox
              text={
                conciseInsightText ||
                "Visibility trends indicate how efficiently this platform converted activity into sustained awareness."
              }
              label="AI Insight"
              className="max-h-[220px]"
              templateId={templateId}
            />
          </section>

          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
            {hasChart ? (
              <MetricDailyChart
                points={chartPoints}
                series={
                  hasMultiSeriesChart
                    ? chartSeries.map((series) => ({
                        label: series.label,
                        sourceType: series.sourceType,
                        points: series.points,
                      }))
                    : undefined
                }
                isAvailable={hasChart}
                metricLabel={getStringValue(block.data.metric) || "Reach"}
                dark={tone.dark}
                slideNumber={slideId}
                metricKey="reach"
                placeholderText="Daily reach series is not available for this report yet."
              />
            ) : (
              renderEmptyChartState(tone)
            )}
            <KPIGrid columns={3}>
              <KPICard
                label="Impressions"
                value={getMetricDisplay(block, ["impressions", "total_impressions"], "—")}
                meta="Total content exposures in period"
                templateId={templateId}
              />
              <KPICard
                label="Highest day"
                value={strongestDay}
                meta="Strongest daily reach point"
                templateId={templateId}
              />
              <KPICard
                label="Trend"
                value={trendDirection}
                meta="Direction versus opening days"
                templateId={templateId}
              />
            </KPIGrid>
          </section>
        </div>
      </SlideCanvas>
    );
  }

  if (variant === "engagement") {
    return (
      <SlideCanvas
        index={slideId}
        totalSlides={totalSlides}
        eyebrow=""
        title=""
        renderMode={renderMode}
        templateId={templateId}
      >
        <div className="grid h-full min-h-0 grid-cols-[0.82fr_1.18fr] gap-5">
          <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${tone.accent}`}>
                Metric
              </p>
              <h2 className={`mt-3 text-[2.4rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
                {platformLabel}
              </h2>
              <p className={`mt-2 text-xs ${tone.subtle}`}>
                Engagement performance and daily interaction intensity
              </p>
              <p className={`mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
                Total engagement this period
              </p>
              <p className={`mt-3 text-[3rem] font-semibold leading-none tracking-[-0.06em] ${tone.title}`}>
                {getMetricDisplay(block, ["engagement", "total_engagement", "interactions_total"], "—")}
              </p>
              {timeframeLabel ? (
                <p className={`mt-3 text-sm font-medium ${tone.subtle}`}>
                  {timeframeLabel}
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {renderMetricStatCard({
                label: "Engagement rate",
                value: getMetricDisplay(block, ["engagement_rate", "average_engagement_rate"], "—"),
                tone,
              })}
              {renderMetricStatCard({
                label: "Frequency",
                value: getMetricDisplay(block, ["frequency"], "—"),
                tone,
              })}
            </div>

            <InsightBox
              text={
                conciseInsightText ||
                "Engagement quality reflects where audience attention concentrated, how interactions clustered, and whether the channel sustained momentum beyond isolated spikes."
              }
              label="AI Insight"
              className="mt-6 max-h-[220px]"
              templateId={templateId}
            />
          </section>

          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
            {hasChart ? (
              <MetricDailyChart
                points={chartPoints}
                series={
                  hasMultiSeriesChart
                    ? chartSeries.map((series) => ({
                        label: series.label,
                        sourceType: series.sourceType,
                        points: series.points,
                      }))
                    : undefined
                }
                isAvailable={hasChart}
                metricLabel={getStringValue(block.data.metric) || "Engagement"}
                dark={tone.dark}
                slideNumber={slideId}
                metricKey="engagement"
                placeholderText="Daily engagement series is not available for this report yet."
              />
            ) : (
              renderEmptyChartState(tone)
            )}
            <KPIGrid columns={3}>
              <KPICard
                label="Highest day"
                value={strongestDay}
                meta="Largest interaction spike"
                templateId={templateId}
              />
              <KPICard
                label="Trend"
                value={trendDirection}
                meta="Direction of the daily curve"
                templateId={templateId}
              />
              <KPICard
                label="Interactions"
                value={getMetricDisplay(block, ["interactions_total", "engagement"], "—")}
                meta="Total actions recorded in period"
                templateId={templateId}
              />
            </KPIGrid>
          </section>
        </div>
      </SlideCanvas>
    );
  }

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title=""
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${tone.accent}`}>
              Audience Growth & Retention
            </p>
            <h2 className={`mt-3 text-[2.35rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
              {platformLabel}
            </h2>
          </div>
          {timeframeLabel ? (
            <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.chip}`}>
              {timeframeLabel}
            </div>
          ) : null}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[0.88fr_1.12fr] gap-6">
          <section className="grid gap-4">
            <article className={`rounded-[30px] border p-5 ${tone.cardStrong}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.cardStrongAccent}`}>
                Followers
              </p>
              <p className={`mt-4 text-[2.6rem] font-semibold leading-none tracking-[-0.06em] ${tone.cardStrongTitle}`}>
                {getMetricDisplay(block, ["followers", "followers_total", "audience"], "—")}
              </p>
            </article>
            <div className="grid grid-cols-2 gap-3">
              {renderMetricStatCard({
                label: "Growth",
                value: getMetricDisplay(block, ["followers_growth", "follower_growth", "audience_growth"], "—"),
                tone,
              })}
              {renderMetricStatCard({
                label: "Retention narrative",
                value: trendDirection,
                tone,
              })}
            </div>
            <article className={`rounded-[30px] border p-5 ${tone.card}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
                Growth insight
              </p>
              <p className={`mt-3 text-[0.92rem] leading-6 ${tone.subtitle}`}>
                {insightText || "Audience momentum here should be read as a retention story, not only a volume story: consistency matters more than isolated acquisition surges."}
              </p>
            </article>
          </section>

          <section className={`min-h-0 rounded-[32px] border p-5 ${tone.card}`}>
            {hasChart ? (
              <MetricDailyChart
                points={chartPoints}
                series={
                  hasMultiSeriesChart
                    ? chartSeries.map((series) => ({
                        label: series.label,
                        sourceType: series.sourceType,
                        points: series.points,
                      }))
                    : undefined
                }
                isAvailable={hasChart}
                metricLabel={getStringValue(block.data.metric) || "Audience growth"}
                dark={tone.dark}
              />
            ) : (
              renderEmptyChartState(tone)
            )}
          </section>
        </div>
      </div>
    </SlideCanvas>
  );
}

function MultiSourceTopPerformingPostSlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
  templateId,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
}) {
  const tone = getTemplateTone(templateId);
  const slideId = String(index + 1).padStart(2, "0");
  const platformLabel = getBlockPlatformLabel(block, blocks, "top_performing_post");
  const metricItems = getMetricItems(block).slice(0, 3);
  const insightItems = getBlockInsightItems(block);
  const text = getBlockInsightText(block);

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title=""
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="grid h-full min-h-0 grid-cols-[1.04fr_0.96fr] gap-6">
        <section className={`rounded-[32px] border p-6 ${tone.cardStrong}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.cardStrongAccent}`}>
            Top Performing Post
          </p>
          <h2 className={`mt-4 text-[2.35rem] font-semibold tracking-[-0.06em] ${tone.cardStrongTitle}`}>
            {platformLabel}
          </h2>
          <p className={`mt-4 text-[1rem] leading-7 ${tone.cardStrongSubtitle}`}>
            {text || "This standout content moment concentrated the strongest audience response and offers the clearest signal for future editorial replication."}
          </p>
        </section>
        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <div className="grid grid-cols-3 gap-3">
            {(metricItems.length > 0 ? metricItems : [
              { label: "Reach", value: getMetricDisplay(block, ["reach", "total_reach"], "—") },
              { label: "Engagement", value: getMetricDisplay(block, ["engagement", "total_engagement"], "—") },
              { label: "Rate", value: getMetricDisplay(block, ["engagement_rate"], "—") },
            ]).map((metric, metricIndex) => (
              <article key={`${metric.label}-${metricIndex}`} className={`rounded-[24px] border p-4 ${tone.card}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${tone.accent}`}>
                  {metric.label}
                </p>
                <p className={`mt-3 text-[1.55rem] font-semibold tracking-[-0.05em] ${tone.title}`}>
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
          <article className={`min-h-0 rounded-[32px] border p-5 ${tone.insight}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${templateId === "modern" ? tone.insightTitle : tone.accentSoft}`}>
              Strategic takeaway
            </p>
            <div className="mt-4 grid gap-2">
              {(insightItems.length > 0 ? insightItems : [text]).slice(0, 4).map((item, itemIndex) => (
                <div key={`${item}-${itemIndex}`} className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-2.5">
                  <p className={`text-[0.82rem] leading-5 ${templateId === "modern" ? tone.insightBody : tone.subtitle}`}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </SlideCanvas>
  );
}

function MultiSourcePlatformMetricSlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
  templateId,
  locale,
  platformIndex,
  metric,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
  locale?: string;
  platformIndex: number;
  metric: "reach";
}) {
  const slideId = String(index + 1).padStart(2, "0");
  const stagePalette = getMultiSourceStagePalette(templateId);
  const platformLabel = getBlockPlatformLabel(block, blocks, "reach_overview");
  const metricLabel = metric === "reach" ? "Reach" : "Metric";
  const title = `${platformLabel} ${metricLabel}`;
  const timeframeLabel =
    getBlockTimeframeLabel(block, locale) || "Date range unavailable";
  const totalMetricValue = getMetricDisplay(
    block,
    ["reach", "total_reach"],
    "Not available"
  );
  const chartPoints = getBlockChartPoints(block);
  const strongestDay = getStrongestDay(block, chartPoints);
  const trendDirection = getBlockTrendDirection(block, chartPoints);
  const hasDailySeries = chartPoints.length > 0;
  const accountLabel = getBlockAccountLabel(block, platformLabel);
  const insightText = getBlockInsightText(
    block,
    `${platformLabel} reach performance remained ${trendDirection.toLowerCase()} during the selected period, with the strongest day on ${strongestDay}.`
  );
  const recommendation =
    getBlockInsightItems(block)[0] ||
    (trendDirection === "Upward"
      ? `Double down on the content pattern that drove the strongest result on ${strongestDay}.`
      : trendDirection === "Downward"
        ? `Review the content cadence and distribution around ${strongestDay} to recover reach momentum.`
        : `Maintain a consistent publishing rhythm and test one high-distribution format to unlock additional reach.`);

  return (
    <PresentationStageSlideFrame slideId={slideId} renderMode={renderMode}>
      <FixedReportSlideStage>
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: stagePalette.background }}
        >
          <p
            className="absolute font-semibold uppercase tracking-[0.18em]"
            style={{
              left: 115,
              top: 110,
              fontSize: 24,
              color: stagePalette.metricAccent,
            }}
          >
            PLATFORM {platformIndex + 1}
          </p>
          <h2
            className="absolute font-extrabold leading-none"
            style={{
              left: 115,
              top: 148,
              fontSize: 76,
              letterSpacing: "-0.065em",
              color: stagePalette.title,
            }}
          >
            {title}
          </h2>
          <p
            className="absolute font-medium"
            style={{
              left: 115,
              top: 234,
              fontSize: 30,
              lineHeight: 1.2,
              color: stagePalette.subtitle,
            }}
          >
            {timeframeLabel}
          </p>

          <div
            className="absolute flex items-center justify-end gap-4"
            style={{ left: 1357, top: 100, width: 460, height: 73 }}
          >
            <div className="flex items-center gap-3">
              {Array.from({ length: totalSlides }, (_, dotIndex) => dotIndex + 1).map((dot) => (
                <span
                  key={dot}
                  className={`h-4 rounded-full ${String(dot).padStart(2, "0") === slideId ? "w-14" : "w-4"}`}
                  style={{
                    background:
                      String(dot).padStart(2, "0") === slideId
                        ? stagePalette.progressActive
                        : stagePalette.progressInactive,
                  }}
                />
              ))}
            </div>
            <span
              className="rounded-full border px-5 py-3 text-[24px] font-semibold leading-none"
              style={{
                borderColor: stagePalette.progressPillBorder,
                background: stagePalette.progressPillBackground,
                color: stagePalette.progressPillText,
              }}
            >
              {slideId}/{String(totalSlides).padStart(2, "0")}
            </span>
          </div>

          <section
            className={`absolute overflow-hidden rounded-[32px] border ${stagePalette.panelShadow}`}
            style={{
              left: 115,
              top: 320,
              width: 380,
              height: 690,
              borderColor: stagePalette.panelBorder,
              background: stagePalette.panelBackground,
            }}
          >
            <div className="flex h-full flex-col px-[42px] py-[42px]">
              <p
                className="font-semibold uppercase tracking-[0.18em]"
                style={{ fontSize: 24, color: stagePalette.metricAccent }}
              >
                Total Reach
              </p>
              <p
                className="mt-8 font-bold leading-none"
                style={{
                  fontSize: 86,
                  letterSpacing: "-0.07em",
                  color: stagePalette.metricValue,
                }}
              >
                {totalMetricValue}
              </p>
              <p
                className="mt-5 font-medium"
                style={{ fontSize: 22, lineHeight: 1.35, color: stagePalette.subtitle }}
              >
                During selected reporting period
              </p>

              <div
                className="mt-10 rounded-[24px] border px-6 py-5"
                style={{
                  borderColor: stagePalette.panelBorder,
                  background: stagePalette.panelMuted,
                }}
              >
                <p className="text-[16px] font-semibold uppercase tracking-[0.16em]" style={{ color: stagePalette.metricAccent }}>
                  Source
                </p>
                <p className="mt-3 text-[30px] font-semibold leading-none" style={{ color: stagePalette.title }}>
                  {accountLabel}
                </p>
              </div>

              <div className="mt-auto grid gap-4">
                <div
                  className="rounded-[24px] border px-6 py-5"
                  style={{
                    borderColor: stagePalette.panelBorder,
                    background: stagePalette.panelMuted,
                  }}
                >
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em]" style={{ color: stagePalette.metricAccent }}>
                    Strongest day
                  </p>
                  <p className="mt-3 text-[28px] font-semibold leading-none" style={{ color: stagePalette.title }}>
                    {strongestDay}
                  </p>
                </div>
                <div
                  className="rounded-[24px] border px-6 py-5"
                  style={{
                    borderColor: stagePalette.panelBorder,
                    background: stagePalette.panelMuted,
                  }}
                >
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em]" style={{ color: stagePalette.metricAccent }}>
                    Trend direction
                  </p>
                  <p className="mt-3 text-[28px] font-semibold leading-none" style={{ color: stagePalette.title }}>
                    {trendDirection}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`absolute overflow-hidden rounded-[32px] border ${stagePalette.panelShadow}`}
            style={{
              left: 535,
              top: 320,
              width: 1320,
              height: 430,
              borderColor: stagePalette.panelBorder,
              background: stagePalette.panelBackground,
            }}
          >
            <div className="flex h-full flex-col px-[44px] py-[34px]">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[20px] font-semibold uppercase tracking-[0.16em]" style={{ color: stagePalette.metricAccent }}>
                    Daily Reach
                  </p>
                  <p className="mt-3 text-[30px] font-semibold leading-none" style={{ color: stagePalette.title }}>
                    {platformLabel}
                  </p>
                </div>
                <div
                  className="rounded-full border px-4 py-2.5"
                  style={{
                    borderColor: stagePalette.panelBorder,
                    background: stagePalette.panelMuted,
                    color: stagePalette.progressPillText,
                  }}
                >
                  <p className="text-[18px] font-semibold leading-none">
                    Strongest day: {strongestDay}
                  </p>
                </div>
              </div>

              <div className="mt-6 min-h-0 flex-1">
                {hasDailySeries ? (
                  <MetricDailyChart
                    points={chartPoints}
                    isAvailable={hasDailySeries}
                    metricLabel="Reach"
                    dark={stagePalette.chartDark}
                  />
                ) : (
                  <div
                    className="flex h-full flex-col items-center justify-center rounded-[28px] border px-8 text-center"
                    style={{
                      borderColor: stagePalette.panelBorder,
                      background: stagePalette.panelMuted,
                    }}
                  >
                    <p className="text-[20px] font-semibold uppercase tracking-[0.16em]" style={{ color: stagePalette.metricAccent }}>
                      Daily Reach
                    </p>
                    <p className="mt-5 max-w-[34rem] text-[28px] leading-[1.35]" style={{ color: stagePalette.subtitle }}>
                      No daily reach data available for this period.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className={`absolute overflow-hidden rounded-[30px] border ${stagePalette.insightShadow}`}
            style={{
              left: 535,
              top: 780,
              width: 1320,
              height: 230,
              borderColor: stagePalette.insightBorder,
              background: stagePalette.insightBackground,
            }}
          >
            <div className="grid h-full grid-cols-[0.68fr_0.32fr] gap-8 px-[42px] py-[34px]">
              <div className="min-w-0">
                <p className="text-[24px] font-extrabold uppercase tracking-[0.14em]" style={{ color: stagePalette.insightText }}>
                  AI Insight
                </p>
                <p
                  className="mt-5"
                  style={{
                    fontSize: 28,
                    lineHeight: 1.3,
                    color: stagePalette.insightText,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {insightText}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[18px] font-semibold uppercase tracking-[0.14em]" style={{ color: stagePalette.insightSubtle }}>
                  Tactical recommendation
                </p>
                <p
                  className="mt-4"
                  style={{
                    fontSize: 22,
                    lineHeight: 1.32,
                    color: stagePalette.insightText,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {recommendation}
                </p>
              </div>
            </div>
          </section>
        </div>
      </FixedReportSlideStage>
    </PresentationStageSlideFrame>
  );
}

function MultiSourceInsightsSlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
  templateId,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
}) {
  const tone = getTemplateTone(templateId);
  const slideId = String(index + 1).padStart(2, "0");
  const platformSections = collectMultiSourcePlatformSections(blocks);
  const strongestSource =
    humanizePlatformLabel(
      getStringValue(block.data.strongest_source) ||
        getStringValue(block.data.strongestSource)
    ) ||
    platformSections[0]?.label ||
    "Not available";
  const keyInsights = getBlockInsightItems(block, [
    "key_insights",
    "keyInsights",
    "comparative_insights",
    "comparativeInsights",
    "platform_strengths",
    "platformStrengths",
    "ecosystem_observations",
    "ecosystemObservations",
    "engagement_differences",
    "engagementDifferences",
    "reach_differences",
    "reachDifferences",
  ]);
  const text = getBlockInsightText(
    block,
    "This cross-platform comparison should be read as a system: one channel expands distribution efficiently, while the other deepens interaction quality and community response."
  );

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title=""
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <section className={`rounded-[32px] border p-5 ${tone.insight}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${templateId === "modern" ? tone.insightTitle : tone.accentSoft}`}>
            AI Strategy Consultant
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h2 className={`text-[2.35rem] font-semibold tracking-[-0.06em] ${templateId === "modern" ? tone.cardStrongTitle : tone.title}`}>
                Cross-Platform Strategic Insights
              </h2>
              <p className={`mt-3 max-w-3xl text-[0.95rem] leading-7 ${templateId === "modern" ? tone.insightBody : tone.subtitle}`}>
                {text}
              </p>
            </div>
            <div className={`rounded-[24px] border border-white/10 bg-white/5 px-4 py-3`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${templateId === "modern" ? tone.insightTitle : tone.accentSoft}`}>
                Strongest source
              </p>
              <p className={`mt-2 text-[1.2rem] font-semibold ${templateId === "modern" ? tone.cardStrongTitle : tone.title}`}>
                {strongestSource}
              </p>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-[0.95fr_1.05fr] gap-5">
          <section className="grid gap-3">
            {platformSections.slice(0, 2).map((section) => {
              const reachBlock = section.semanticBlocks.reach_overview;
              const engagementBlock = section.semanticBlocks.engagement_overview;

              return (
                <article key={section.id} className={`rounded-[28px] border p-4 ${tone.card}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`text-[1.1rem] font-semibold ${tone.title}`}>{section.label}</h3>
                    <div className={`rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${tone.chip}`}>
                      {section.label === strongestSource ? "Primary advantage" : "Secondary advantage"}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {renderMetricStatCard({
                      label: "Reach",
                      value: getMetricDisplay(reachBlock || block, ["reach", "total_reach"], "—"),
                      tone,
                    })}
                    {renderMetricStatCard({
                      label: "Engagement",
                      value: getMetricDisplay(
                        engagementBlock || block,
                        ["engagement", "total_engagement", "interactions_total"],
                        "—"
                      ),
                      tone,
                    })}
                  </div>
                  <p className={`mt-4 text-[0.84rem] leading-6 ${tone.subtitle}`}>
                    {getBlockInsightText(
                      engagementBlock || reachBlock || block,
                      "The platform plays a distinct role inside the overall ecosystem."
                    )}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="grid min-h-0 grid-cols-2 gap-3">
            {keyInsights.slice(0, 6).map((insight, insightIndex) => (
              <article key={`${insight}-${insightIndex}`} className={`rounded-[26px] border p-4 ${tone.card}`}>
                <div className={`inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${tone.chip}`}>
                  Observation {String(insightIndex + 1).padStart(2, "0")}
                </div>
                <p className={`mt-4 text-[0.9rem] leading-6 ${tone.subtitle}`}>
                  {insight}
                </p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </SlideCanvas>
  );
}

function MultiSourceRecommendationsSlide({
  block,
  index,
  totalSlides,
  renderMode,
  templateId,
}: {
  block: ReportVersionBlock;
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  templateId: ReportTemplateId;
}) {
  const tone = getTemplateTone(templateId);
  const slideId = String(index + 1).padStart(2, "0");
  const quickWins = getBlockInsightItems(block, ["quick_wins", "quickWins"]);
  const strategicRecommendations = getBlockInsightItems(block, [
    "strategic_recommendations",
    "strategicRecommendations",
    "recommendations",
  ]);
  const [leftFallback, rightFallback] = splitItemsInHalf(strategicRecommendations);
  const quickWinItems = quickWins.length > 0 ? quickWins : leftFallback;
  const strategicItems =
    quickWins.length > 0 ? strategicRecommendations : rightFallback;

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title=""
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${tone.accent}`}>
            Recommendations & Next Steps
          </p>
          <h2 className={`mt-3 text-[2.35rem] font-semibold tracking-[-0.06em] ${tone.title}`}>
            Premium, actionable next moves
          </h2>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-5">
          <section className={`rounded-[32px] border p-5 ${tone.cardStrong}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.cardStrongAccent}`}>
              Quick Wins
            </p>
            <div className="mt-4 space-y-3">
              {quickWinItems.slice(0, 4).map((item, itemIndex) => (
                <div key={`${item}-${itemIndex}`} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className={`text-[0.88rem] leading-6 ${tone.cardStrongSubtitle}`}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className={`rounded-[32px] border p-5 ${tone.card}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.accent}`}>
              Strategic Recommendations
            </p>
            <div className="mt-4 space-y-3">
              {strategicItems.slice(0, 4).map((item, itemIndex) => (
                <div key={`${item}-${itemIndex}`} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className={`text-[0.88rem] leading-6 ${tone.subtitle}`}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </SlideCanvas>
  );
}

function ReportBlockSlide({
  block,
  blocks,
  model,
  index,
  totalSlides,
  renderMode,
  logoUrl,
  brandName,
  templateId,
  locale,
  hideOverviewInsights = false,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  model: ExecutiveDarkViewModel | null | undefined;
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  logoUrl: string | null;
  brandName: string;
  templateId: ReportTemplateId;
  locale?: string;
  hideOverviewInsights?: boolean;
}) {
  const tone = getTemplateTone(templateId);
  const semanticName = getBlockSemanticName(block);
  const normalizedSemanticName = getNormalizedBlockSemanticName(block);
  const isFiveSlideClosingCover = totalSlides === 5 && index === totalSlides - 1;
  const slideId = String(index + 1).padStart(2, "0");
  const title = getSlideTitle(block, index);
  const text = getTextContent(block);
  const listItems = getListItems(block);
  const primaryMetric = getPrimaryMetric(block);
  const chartSource = getBlockChartSource(block);
  const chartPoints = getBlockChartPoints(block);
  const chartSeries = getBlockChartSeries(block);
  const supportsMultiSeries = MULTI_SERIES_BLOCKS.has(normalizedSemanticName);
  const hasMultiSeriesChart =
    supportsMultiSeries &&
    chartSeries.length >= 2;
  const hasChart = hasMultiSeriesChart
    ? chartSeries.some((series) => series.points.length > 0)
    : chartPoints.length > 0;
  const isMultiSourceTenSlide = isMultiSourceTenSlideReport(blocks);
  const isEngagementOverview = isEngagementOverviewBlock(block);
  const renderModeName = hasChart ? "rich-data-slide" : "fallback";
  const chartMetricLabel =
    (isEngagementOverview
      ? getStringValue(block.data.title) || "Engagement"
      : getStringValue(
          chartSource.source.startsWith("data_json.chart") &&
            block.data.chart &&
            typeof block.data.chart === "object"
            ? (block.data.chart as Record<string, unknown>).metric
            : ""
        )) ||
    getStringValue(block.data.metric) ||
    getStringValue(block.data.label) ||
    (isEngagementOverview ? "Engagement" : "Value");

  console.info("[DataSlides][render.detected]", {
    semanticName,
    hasChartPoints: chartSource.source.startsWith("data_json.chart") && hasChart,
    hasPoints: chartSource.source === "data_json.points" && hasChart,
    pointsCount: chartPoints.length,
    renderMode: renderModeName,
  });
  console.info("[DataSlides][chart.source]", {
    semanticName,
    source: chartSource.source,
    hasMultiSeriesChart,
    seriesCount: chartSeries.length,
  });
  if (isEngagementOverview) {
    const chartRecord =
      block.data.chart && typeof block.data.chart === "object"
        ? (block.data.chart as Record<string, unknown>)
        : null;
    const engagementMetric = getEngagementPrimaryMetricValue(block);
    console.log("ENGAGEMENT_RENDER_RESOLVED", {
      semanticName,
      engagementValue: engagementMetric.numericValue,
      engagementValueSource: engagementMetric.source || null,
      pointsCount: chartPoints.length,
      firstPoint: chartPoints[0] || null,
      rawBlock: {
        id: block.id,
        type: block.type,
        data: block.data,
        rawDataJson: block.rawDataJson,
        chart: chartRecord,
      },
    });
  }
  console.info("[AUDIT_RENDER_PATH][SlideRenderer][ReportBlockSlide]", {
    index,
    blockSemanticName: semanticName || null,
    blockType: block.type,
    totalSlides,
    allBlocksLength: blocks.length,
    allSemanticNames: blocks.map((item) => getBlockSemanticName(item)),
    overviewCandidate: isOverviewCandidate(blocks),
  });
  if (
    index === 1 &&
    (normalizedSemanticName === "executive_summary" ||
      normalizedSemanticName === "cross_platform_overview")
  ) {
    console.log("[MULTISOURCE_SLIDE2_AUDIT]", {
      index,
      semanticName: normalizedSemanticName,
      title,
      isMultiSource: totalSlides >= 9,
      rendererBranch: shouldRenderMultiSourceExecutiveOverview(block, index, totalSlides)
        ? "MultiSourceExecutiveOverviewSlide"
        : "ExecutiveSummarySlide",
      blockKeys: Object.keys(block.data || {}),
      blocksLength: blocks.length,
    });
  }

  if (isFiveSlideClosingCover) {
    const coverBlock =
      blocks.find((item) => getBlockSemanticName(item) === "cover") ||
      blocks.find((item) => item.type === "title") ||
      blocks[0];
    const coverTitle = coverBlock ? getSlideTitle(coverBlock, 0) : title;
    const coverText = coverBlock ? getTextContent(coverBlock) : text;
    const coverMeta = coverBlock ? getBlockTimeframeLabel(coverBlock, locale) : "";

    return (
      <CoverSlide
        slideId={slideId}
        eyebrow=""
        title=""
        renderMode={renderMode}
        templateId={templateId}
        model={{
          reportTitle: coverTitle || "Marketing Performance Report",
          subtitle: coverText,
          meta: coverMeta,
          branding: {
            logoUrl,
            brandName,
          },
        }}
      />
    );
  }

  if (normalizedSemanticName === "cover" || (index === 0 && block.type === "title")) {
    const meta = getBlockTimeframeLabel(block, locale);

    return (
      <CoverSlide
        slideId={slideId}
        eyebrow=""
        title=""
        renderMode={renderMode}
        templateId={templateId}
        model={{
          reportTitle: title || "Marketing Performance Report",
          subtitle: text,
          meta,
          branding: {
            logoUrl,
            brandName,
          },
        }}
      />
    );
  }

  if (
    normalizedSemanticName === "executive_summary" ||
    normalizedSemanticName === "cross_platform_overview"
  ) {
    if (shouldRenderMultiSourceExecutiveOverview(block, index, totalSlides)) {
      return (
        <MultiSourceExecutiveOverviewSlide
          block={block}
          blocks={blocks}
          index={index}
          totalSlides={totalSlides}
          renderMode={renderMode}
          templateId={templateId}
          locale={locale}
        />
      );
    }

    return (
      <ExecutiveSummarySlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
      />
    );
  }

  if (isMultiSourceTenSlide && index === 2 && normalizedSemanticName === "reach_overview") {
    return (
      <MultiSourcePlatformMetricSlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
        locale={locale}
        platformIndex={0}
        metric="reach"
      />
    );
  }

  if (isMultiSourceTenSlide && normalizedSemanticName === "reach_overview") {
    return (
      <MultiSourceMetricSlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
        locale={locale}
        variant="reach"
      />
    );
  }

  if (isMultiSourceTenSlide && normalizedSemanticName === "engagement_overview") {
    return (
      <MultiSourceMetricSlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
        locale={locale}
        variant="engagement"
      />
    );
  }

  if (isMultiSourceTenSlide && normalizedSemanticName === "audience_growth") {
    return (
      <MultiSourceMetricSlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
        locale={locale}
        variant="audience"
      />
    );
  }

  if (isMultiSourceTenSlide && normalizedSemanticName === "top_performing_post") {
    return (
      <MultiSourceTopPerformingPostSlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
      />
    );
  }

  if (isMultiSourceTenSlide && normalizedSemanticName === "insights") {
    return (
      <MultiSourceInsightsSlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
      />
    );
  }

  if (isMultiSourceTenSlide && normalizedSemanticName === "recommendations") {
    return (
      <MultiSourceRecommendationsSlide
        block={block}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
      />
    );
  }

  if (shouldRenderOverviewSlide(blocks, index, totalSlides)) {
    console.info("[AUDIT_RENDER_PATH][SlideRenderer][OverviewSlide]", {
      index,
      activated: true,
      reason:
        totalSlides === 5
          ? "index===1 && totalSlides===5"
          : "index===1 && isOverviewCandidate(blocks)",
      allBlocksLength: blocks.length,
      allSemanticNames: blocks.map((item) => getBlockSemanticName(item)),
    });
    return (
      <OverviewSlide
        blocks={blocks}
        model={model}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
        templateId={templateId}
        locale={locale}
        hideInsights={hideOverviewInsights}
      />
    );
  }

  if (semanticName === "closing_summary" || semanticName === "closing") {
    return (
      <SlideCanvas
        index={slideId}
        totalSlides={totalSlides}
        eyebrow=""
        title=""
        renderMode={renderMode}
        templateId={templateId}
      >
        <HeroBlock
          eyebrow="Meta"
          title={title || "Fin del reporte"}
          subtitle={text || "Gracias por revisar este resumen de desempeno"}
          meta={getBlockTimeframeLabel(block, locale)}
          footer={<FooterMeta text="Reporte generado con Measurable." />}
          templateId={templateId}
          rightSlot={<CoverLogo logoDataUrl={logoUrl} dark={tone.dark} />}
        />
      </SlideCanvas>
    );
  }

  return (
    <SlideCanvas
      index={slideId}
      totalSlides={totalSlides}
      eyebrow=""
      title={title}
      renderMode={renderMode}
      templateId={templateId}
    >
      <div className="grid h-full min-h-0 grid-cols-[0.82fr_1.18fr] gap-6">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <div className={`rounded-[30px] border p-6 ${tone.cardStrong}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${templateId === "modern" ? tone.cardStrongAccent : tone.accent}`}>
              {primaryMetric.label}
            </p>
            <p className={`mt-4 break-words text-[2.65rem] font-semibold leading-none tracking-[-0.06em] ${templateId === "modern" ? tone.cardStrongTitle : tone.title}`}>
              {primaryMetric.value || "--"}
            </p>
          </div>

          <div className={`min-h-0 overflow-hidden rounded-[30px] border p-5 ${tone.card}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.subtle}`}>
              Insight
            </p>
            {text ? (
              <p className={`mt-3 line-clamp-[10] whitespace-pre-wrap text-[0.92rem] leading-6 ${tone.subtitle}`}>
                {text}
              </p>
            ) : (
              <p className={`mt-3 text-[0.92rem] leading-6 ${tone.subtle}`}>
                This slide is ready for the report block content.
              </p>
            )}

            {listItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {listItems.slice(0, 4).map((item, itemIndex) => (
                  <div
                    key={`${item}-${itemIndex}`}
                    className={`rounded-2xl border px-3 py-2 text-[0.8rem] leading-5 ${tone.listItem}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-0">
          {hasChart ? (
            <MetricDailyChart
              points={chartPoints}
              series={
                hasMultiSeriesChart
                  ? chartSeries.map((series) => ({
                      label: series.label,
                      sourceType: series.sourceType,
                      points: series.points,
                    }))
                  : undefined
              }
              isAvailable={hasChart}
              metricLabel={chartMetricLabel}
              dark={tone.dark}
            />
          ) : (
            <div className={`flex h-full flex-col items-center justify-center rounded-[30px] border px-6 text-center ${tone.card}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.accent}`}>
                Daily chart
              </p>
              <p className={`mt-3 max-w-xs text-sm leading-6 ${tone.subtle}`}>
                No daily trend was available for this section.
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideCanvas>
  );
}

export function buildReportBlockSlideElements(input: {
  blocks: ReportVersionBlock[];
  model: ExecutiveDarkViewModel | null | undefined;
  renderMode: ReportRenderMode;
  logoUrl: string | null;
  brandName: string;
  templateId: ReportTemplateId;
  locale?: string;
  hideOverviewInsights?: boolean;
}) {
  const sortedBlocks = sortBlocksByOrder(input.blocks);

  return sortedBlocks.map((block, index) => (
    <ReportBlockSlide
      key={block.id || `report-block-slide-${index}`}
      block={block}
      blocks={sortedBlocks}
      model={input.model}
      index={index}
      totalSlides={sortedBlocks.length}
      renderMode={input.renderMode}
      logoUrl={input.logoUrl}
      brandName={input.brandName}
      templateId={input.templateId}
      locale={input.locale}
      hideOverviewInsights={input.hideOverviewInsights}
    />
  )) as ReactElement[];
}

/*
 * Source of truth renderer for report preview/export.
 * The official 5-slide structure is defined in lib/reports/templates/default.ts.
 */
export function SlideRenderer({
  reportId,
  model,
  renderMode = "preview",
  blocks,
  locale,
  hideOverviewInsights = false,
  branding,
  templateId = "executive",
}: SlideRendererProps) {
  const template = getReportTemplate("default");
  const safeBranding = resolveReportBranding({
    id: reportId,
    templateId,
    branding,
  });
  const context = buildDefaultTemplateContext(model, {
    logoUrl: safeBranding.logoUrl || null,
    brandName: safeBranding.brandName,
    source: safeBranding.source,
  });
  const rootClassName =
    renderMode === "export"
      ? `report-pdf-root ${REPORT_SLIDE_THEME.spacing.exportGap}`
      : REPORT_SLIDE_THEME.spacing.previewGap;
  const shouldUseBlockSlides =
    renderMode !== "export" && shouldRenderBlocksAsSlides(blocks);
  const sortedBlocks = blocks ? sortBlocksByOrder(blocks) : [];
  const normalizedOrder = sortedBlocks.map((block) => ({
    slideNumber:
      block.data.slide_number ??
      block.data.slideNumber ??
      block.data.order ??
      block.data.slide_order ??
      block.data.slideOrder ??
      null,
    slideType:
      getStringValue(block.data.slide_type) ||
      getStringValue(block.data.slideType) ||
      getBlockSlideType(block) ||
      null,
    metricKey:
      getStringValue(block.data.metric_key) ||
      getStringValue(block.data.metricKey) ||
      getBlockMetricKey(block) ||
      null,
    blockType: block.type,
  }));

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide renderer source of truth]", {
      reportId,
      template: templateId,
      slideCount: shouldUseBlockSlides ? sortedBlocks.length : template.slides.length,
      normalizedOrder,
      branding: safeBranding,
    });
  }

  if (shouldUseBlockSlides && blocks && template.slides.length < blocks.length) {
    console.warn("[Report10][legacy.limit.detected]", {
      templateSlides: template.slides.length,
      blocksCount: blocks.length,
      semanticNames: blocks.map(getBlockSemanticName),
    });
    console.warn("[Report15][legacy.limit.detected]", {
      templateSlides: template.slides.length,
      blocksCount: blocks.length,
      semanticNames: blocks.map(getBlockSemanticName),
    });
  }

  if (shouldUseBlockSlides && blocks) {
    console.info("[Report15][blocks.detected]", getReportBlockDiagnostics(sortedBlocks));
    console.info("[Report15][render.mode]", {
      mode: "dynamic-blocks",
      blocksCount: sortedBlocks.length,
      renderMode,
    });
    console.info("[Report15][blocks.count]", {
      blocksCount: sortedBlocks.length,
    });
  }

  const slideElements =
    shouldUseBlockSlides && blocks
      ? buildReportBlockSlideElements({
          blocks: sortedBlocks,
          model,
          renderMode,
          logoUrl: safeBranding.logoUrl,
          brandName: safeBranding.brandName,
          templateId,
          locale,
          hideOverviewInsights,
        })
      : template.slides.map((slide) => {
          const SlideComponent = slide.component;
          const slideModel = slide.buildModel(context);

          return (
            <SlideComponent
              key={slide.id}
              slideId={slide.id}
              eyebrow={slide.eyebrow}
              title={slide.title}
              renderMode={renderMode}
              templateId={templateId}
              model={slideModel}
            />
          ) as ReactElement;
        });

  const slides = <div className={rootClassName}>{slideElements}</div>;

  if (renderMode === "export") {
    return slides;
  }

  return <SlideDeckViewport slides={slideElements}>{slides}</SlideDeckViewport>;
}
