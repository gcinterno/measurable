"use client";

import type { ReactElement } from "react";

import { FooterMeta } from "@/components/reports/primitives/FooterMeta";
import { HeroBlock } from "@/components/reports/primitives/HeroBlock";
import { SlideDeckViewport } from "@/components/reports/SlideDeckViewport";
import { SlideCanvas } from "@/components/reports/SlideCanvas";
import type { ExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { CoverLogo, MetricDailyChart } from "@/components/reports/slides/shared";
import { formatMetaTimeframeDateRange } from "@/lib/integrations/timeframes";
import { getReportTemplate } from "@/lib/reports/templates";
import { buildDefaultTemplateContext } from "@/lib/reports/templates/default-view-models";
import {
  REPORT_SLIDE_THEME,
  type ReportRenderMode,
} from "@/lib/reports/theme";
import { formatDisplayNumber } from "@/lib/formatters";
import type { ReportVersionBlock } from "@/types/report";

type SlideRendererProps = {
  model: ExecutiveDarkViewModel | null | undefined;
  renderMode?: ReportRenderMode;
  blocks?: ReportVersionBlock[];
  locale?: string;
  hideOverviewInsights?: boolean;
  branding?: {
    logoUrl?: string | null;
    source?: string;
  };
};

function getBlockSemanticName(block: ReportVersionBlock) {
  const value =
    block.data.semantic_name ??
    block.data.semanticName ??
    block.data.name ??
    block.data.key;

  return typeof value === "string" ? value.trim() : "";
}

function getBlockOrder(block: ReportVersionBlock, index: number) {
  const rawOrder = block.data.order ?? block.data.slide_order ?? block.data.slideOrder;
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
  return Boolean(blocks?.length);
}

function sortBlocksByOrder(blocks: ReportVersionBlock[]) {
  return blocks
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
  return getBlockSemanticName(block).toLowerCase() === "engagement_overview";
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

  const raw =
    Array.isArray(block.data.data) ? block.data.data :
    Array.isArray(block.data.series) ? block.data.series :
    Array.isArray(block.data.daily) ? block.data.daily :
    Array.isArray(block.data.daily_series) ? block.data.daily_series :
    Array.isArray(block.data.dailySeries) ? block.data.dailySeries :
    [];

  return {
    source: raw.length > 0 ? "data_json.series" as const : "none" as const,
    raw,
  };
}

function getBlockChartPoints(block: ReportVersionBlock) {
  return getBlockChartSource(block).raw
    .map(normalizeChartPoint)
    .filter(Boolean) as { date: string; label: string; value: number }[];
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
  const semanticName = getBlockSemanticName(block).toLowerCase();
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
  locale,
  hideInsights = false,
}: {
  blocks: ReportVersionBlock[];
  model: ExecutiveDarkViewModel | null | undefined;
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
  locale?: string;
  hideInsights?: boolean;
}) {
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
    >
      <div className="flex h-full min-h-0 flex-col gap-6">
        <div className="space-y-2">
          <h2 className="text-[2.35rem] font-semibold tracking-[-0.06em] text-white">
            Overview
          </h2>
          {timeframeLabel ? (
            <p className="text-sm font-medium text-slate-400">
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
                  className={`group flex min-h-[152px] flex-col rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md transition duration-300 hover:border-sky-300/30 hover:bg-white/[0.09] ${
                    isFiveSlideReport && metricIndex === overviewMetrics.length - 1 && overviewMetrics.length % 2 === 1
                      ? "col-span-2"
                      : ""
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
                    {metric.label}
                  </p>
                  <p className="mt-4 break-words text-[2.35rem] font-semibold leading-none tracking-[-0.06em] text-white">
                    {metric.value || "—"}
                  </p>
                  <div className="mt-auto pt-4">
                    {isFiveSlideReport ? null : metric.previousValue ? (
                      <p className="text-[0.74rem] font-medium text-slate-400">
                        vs previous period {metric.previousValue}
                      </p>
                    ) : (
                      <p className="text-[0.74rem] font-medium text-slate-500">
                        {metric.changePercentage === null
                          ? "No previous comparison"
                          : "vs previous period"}
                      </p>
                    )}
                    {isFiveSlideReport ? null : changeText ? (
                      <div className={`mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-sm font-semibold ${changeClass}`}>
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
            <div className="min-h-0 rounded-[28px] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(255,255,255,0.045))] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                Insights
              </p>
              <p className="mt-3 text-[0.95rem] leading-7 text-slate-100">
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

function ExecutiveSummarySlide({
  block,
  blocks,
  index,
  totalSlides,
  renderMode,
}: {
  block: ReportVersionBlock;
  blocks: ReportVersionBlock[];
  index: number;
  totalSlides: number;
  renderMode: ReportRenderMode;
}) {
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
    >
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
          {visibleCards.length > 0 ? (
            visibleCards.map((card) => (
              <article
                key={card.key}
                className="min-h-0 rounded-[24px] border border-white/10 bg-white/[0.055] p-4"
              >
                <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                  {card.title}
                </p>
                {card.value ? (
                  <p className="mt-3 line-clamp-1 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {card.value}
                  </p>
                ) : null}
                <p className="mt-3 line-clamp-4 text-[0.72rem] leading-5 text-slate-300">
                  {card.insight}
                </p>
              </article>
            ))
          ) : (
            <article className="col-span-4 rounded-[24px] border border-white/10 bg-white/[0.055] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                Summary
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {fallbackText || "No insight cards were available for this report yet."}
              </p>
            </article>
          )}
        </div>

        {aiAnalysis ? (
          <div className="rounded-[28px] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.13),rgba(255,255,255,0.045))] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
              AI analysis
            </p>
            <p className="mt-3 line-clamp-5 text-[0.92rem] leading-6 text-slate-100">
              {aiAnalysis}
            </p>
          </div>
        ) : null}
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
  locale?: string;
  hideOverviewInsights?: boolean;
}) {
  const semanticName = getBlockSemanticName(block);
  const isFiveSlideClosingCover = totalSlides === 5 && index === totalSlides - 1;
  const slideId = String(index + 1).padStart(2, "0");
  const title = getSlideTitle(block, index);
  const text = getTextContent(block);
  const listItems = getListItems(block);
  const primaryMetric = getPrimaryMetric(block);
  const chartSource = getBlockChartSource(block);
  const chartPoints = getBlockChartPoints(block);
  const hasChart = chartPoints.length > 0;
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

  if (isFiveSlideClosingCover) {
    const coverBlock =
      blocks.find((item) => getBlockSemanticName(item) === "cover") ||
      blocks.find((item) => item.type === "title") ||
      blocks[0];
    const coverTitle = coverBlock ? getSlideTitle(coverBlock, 0) : title;
    const coverText = coverBlock ? getTextContent(coverBlock) : text;
    const coverMeta = coverBlock ? getBlockTimeframeLabel(coverBlock, locale) : "";

    return (
      <SlideCanvas
        index={slideId}
        totalSlides={totalSlides}
        eyebrow=""
        title=""
        renderMode={renderMode}
      >
        <HeroBlock
          title={coverTitle || "Marketing Performance Report"}
          subtitle={coverText}
          meta={coverMeta}
          rightSlot={<CoverLogo logoDataUrl={logoUrl} dark />}
        />
      </SlideCanvas>
    );
  }

  if (semanticName === "cover" || (index === 0 && block.type === "title")) {
    const meta = getBlockTimeframeLabel(block, locale);

    return (
      <SlideCanvas
        index={slideId}
        totalSlides={totalSlides}
        eyebrow=""
        title=""
        renderMode={renderMode}
      >
        <HeroBlock
          title={title || "Marketing Performance Report"}
          subtitle={text}
          meta={meta}
          rightSlot={<CoverLogo logoDataUrl={logoUrl} dark />}
        />
      </SlideCanvas>
    );
  }

  if (semanticName === "executive_summary") {
    return (
      <ExecutiveSummarySlide
        block={block}
        blocks={blocks}
        index={index}
        totalSlides={totalSlides}
        renderMode={renderMode}
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
      >
        <HeroBlock
          eyebrow="Meta"
          title={title || "Fin del reporte"}
          subtitle={text || "Gracias por revisar este resumen de desempeno"}
          meta={getBlockTimeframeLabel(block, locale)}
          footer={<FooterMeta text="Reporte generado con Measurable." />}
          rightSlot={<CoverLogo logoDataUrl={logoUrl} dark />}
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
    >
      <div className="grid h-full min-h-0 grid-cols-[0.82fr_1.18fr] gap-6">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
              {primaryMetric.label}
            </p>
            <p className="mt-4 break-words text-[2.65rem] font-semibold leading-none tracking-[-0.06em] text-white">
              {primaryMetric.value || "--"}
            </p>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Insight
            </p>
            {text ? (
              <p className="mt-3 line-clamp-[10] whitespace-pre-wrap text-[0.92rem] leading-6 text-slate-200">
                {text}
              </p>
            ) : (
              <p className="mt-3 text-[0.92rem] leading-6 text-slate-400">
                This slide is ready for the report block content.
              </p>
            )}

            {listItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {listItems.slice(0, 4).map((item, itemIndex) => (
                  <div
                    key={`${item}-${itemIndex}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[0.8rem] leading-5 text-slate-200"
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
              isAvailable={chartPoints.length > 0}
              metricLabel={chartMetricLabel}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-[30px] border border-white/10 bg-white/[0.04] px-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                Daily chart
              </p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
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
      locale={input.locale}
      hideOverviewInsights={input.hideOverviewInsights}
    />
  )) as ReactElement[];
}

export function SlideRenderer({
  model,
  renderMode = "preview",
  blocks,
  locale,
  hideOverviewInsights = false,
  branding,
}: SlideRendererProps) {
  const template = getReportTemplate("default");
  const rawLogoUrl = branding?.logoUrl || null;
  const safeBranding = {
    logoUrl: rawLogoUrl,
    source: branding?.source,
  };
  const context = buildDefaultTemplateContext(model, {
    logoUrl: safeBranding.logoUrl,
    source: safeBranding.source,
  });
  const rootClassName =
    renderMode === "export"
      ? `report-pdf-root ${REPORT_SLIDE_THEME.spacing.exportGap}`
      : REPORT_SLIDE_THEME.spacing.previewGap;
  const shouldUseBlockSlides =
    renderMode !== "export" && shouldRenderBlocksAsSlides(blocks);
  const sortedBlocks = blocks ? sortBlocksByOrder(blocks) : [];
  console.info("[AUDIT_RENDER_PATH][SlideRenderer]", {
    entered: true,
    renderMode,
    blocksLength: blocks?.length ?? 0,
    sortedBlocksLength: sortedBlocks.length,
    semanticNames: sortedBlocks.map((block) => getBlockSemanticName(block)),
    usingBlocks: shouldUseBlockSlides,
    usingTemplate: !shouldUseBlockSlides,
    templateSlidesLength: template.slides.length,
  });

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
