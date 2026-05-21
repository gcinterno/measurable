import type {
  ExecutiveDarkGeneralInsightsMetric,
  ExecutiveDarkSeriesPoint,
  ExecutiveDarkViewModel,
} from "@/components/reports/report-view.helpers";
import type {
  CoverSlideModel,
  GeneralInsightsMetricState,
  ImpressionsSlideModel,
  ReachSlideCardModel,
  ReachSlideModel,
  SummarySlideModel,
} from "@/components/reports/slides/types";
import { formatDisplayNumber, formatNumber } from "@/lib/formatters";
import { getIntegrationReportContext } from "@/lib/integrations/session";

export type DefaultTemplateContext = {
  report: ExecutiveDarkViewModel;
  branding: {
    logoUrl: string | null;
    brandName: string;
    source?: string;
  };
  coverBrandName: string;
  coverIntegrationLabel: string;
  analyzedPeriod: string;
  reachDisplayLabel: string;
  impressionsDisplayLabel: string;
  reachInsight: string;
  viewersTotal: number;
  impressionsTotal: number;
  followersTotal: number;
  followersGrowth: number;
  interactionsTotal: number;
  linkClicks: number;
  pageVisits: number;
  frequency: number;
  impressionsDailyPoints: ExecutiveDarkSeriesPoint[];
};

function formatIntegrationDisplayName(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFallbackBrandName() {
  return "Social Account";
}

function getCoverBrandName(title: string) {
  const storedPageName = getIntegrationReportContext()?.pageName?.trim();

  if (storedPageName) {
    return storedPageName;
  }

  const normalizedTitle = title.trim();

  if (
    !normalizedTitle ||
    normalizedTitle === "Executive Monthly Report" ||
    normalizedTitle === "Generated report" ||
    normalizedTitle === "Meta Pages Overview" ||
    normalizedTitle === "Report Meta"
  ) {
    return getFallbackBrandName();
  }

  return normalizedTitle
    .replace(/^marketing report\s*/i, "")
    .replace(/^meta pages overview\s*/i, "")
    .trim();
}

function formatCoverDate(value: string) {
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
    year: "numeric",
  }).format(date);
}

function formatAnalyzedPeriod(report: ExecutiveDarkViewModel) {
  const since = report.coverTimeframeSince;
  const until = report.coverTimeframeUntil;
  const source = report.coverTimeframeSource;

  if (since && until) {
    const value = `${formatCoverDate(since)} - ${formatCoverDate(until)}`;

    console.info("[MetaTimeframe][render.cover]", {
      source,
      since,
      until,
      label: report.coverTimeframeLabel || report.descriptionTimeframe?.label,
      value,
    });

    return value;
  }

  if (report.coverTimeframeLabel || report.descriptionTimeframe?.label) {
    const value = report.coverTimeframeLabel || report.descriptionTimeframe?.label || "";

    console.info("[MetaTimeframe][render.cover]", {
      source,
      since: null,
      until: null,
      label: value,
      value,
    });

    return value;
  }

  console.info("[MetaTimeframe][render.cover]", {
    source,
    since: null,
    until: null,
    label: null,
    value: report.periodLabel,
  });

  return report.periodLabel;
}

function getCoverIntegrationLabel() {
  const context = getIntegrationReportContext();
  const source = context?.source?.trim().toLowerCase() || "";
  const integration = context?.integration?.trim().toLowerCase() || "";

  if (source === "facebook_pages") {
    return "Facebook Pages";
  }

  if (source === "instagram_business") {
    return "Instagram Business";
  }

  if (integration === "meta" && source) {
    return formatIntegrationDisplayName(source);
  }

  if (integration && integration !== "meta") {
    return formatIntegrationDisplayName(integration);
  }

  return "Social Account";
}

function getReachInsight(report: ExecutiveDarkViewModel) {
  return report.premiumInsight || report.primaryNarrative || report.subtitle;
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

function getReachExtremes(points: ExecutiveDarkSeriesPoint[]) {
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

function parseMetricNumber(value: string | number | null | undefined, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).replace(/,/g, "").trim();

  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMetricValue(value: number) {
  return formatNumber(value, 0);
}

function buildSourceCaption(integrationLabel: string) {
  const normalizedLabel = integrationLabel.trim();

  if (!normalizedLabel || normalizedLabel === "Social Account") {
    return "Based on synchronized social data";
  }

  return `Based on synchronized ${normalizedLabel.toLowerCase()} data`;
}

function buildReachCard(
  label: string,
  point: ExecutiveDarkSeriesPoint | null,
  metricLabel: string
): ReachSlideCardModel {
  if (!point) {
    return {
      label,
      value: "Not available",
      meta: "No daily series available yet.",
    };
  }

  return {
    label,
    value: formatInsightDate(point.date),
    meta: `${formatMetricValue(point.value)} ${metricLabel.toLowerCase()}`,
  };
}

function toGeneralInsightsMetricState(
  metric: ExecutiveDarkGeneralInsightsMetric | null
): GeneralInsightsMetricState | null {
  if (!metric) {
    return null;
  }

  return {
    value: metric.value,
    available: metric.available,
    semantic_valid: metric.semanticValid,
    source_metric_name: metric.sourceMetricName,
  };
}

export function buildDefaultTemplateContext(
  report: ExecutiveDarkViewModel,
  branding: {
    logoUrl: string | null;
    brandName: string;
    source?: string;
  }
): DefaultTemplateContext {
  const reachDisplayLabel = "ALCANCE";
  const impressionsDisplayLabel = "IMPRESIONES";
  const viewersTotal = parseMetricNumber(report.viewersTotalValue, 0);
  const impressionsTotal = report.impressionsSlidePresent
    ? parseMetricNumber(report.impressionsTotalValue, 0)
    : parseMetricNumber(report.impressionsTotalValue, 0);
  const impressionsDailyPoints =
    report.impressionsSlidePresent
      ? report.impressionsDailyPoints
      : report.impressionsDailyAvailable && report.impressionsDailyPoints.length > 0
        ? report.impressionsDailyPoints
        : [];

  return {
    report,
    branding,
    coverBrandName: branding.brandName || getCoverBrandName(report.title),
    coverIntegrationLabel: getCoverIntegrationLabel(),
    analyzedPeriod: formatAnalyzedPeriod(report),
    reachDisplayLabel,
    impressionsDisplayLabel,
    reachInsight: formatInsightTextDates(getReachInsight(report)),
    viewersTotal,
    impressionsTotal,
    followersTotal: parseMetricNumber(report.followersTotalValue, 0),
    followersGrowth: parseMetricNumber(report.followersGrowthValue, 0),
    interactionsTotal: parseMetricNumber(report.interactionsTotalValue, 0),
    linkClicks: parseMetricNumber(report.linkClicksValue, 0),
    pageVisits: parseMetricNumber(report.pageVisitsValue, 0),
    frequency: viewersTotal > 0 ? impressionsTotal / viewersTotal : 0,
    impressionsDailyPoints,
  };
}

export function buildCoverSlideModel(
  context: DefaultTemplateContext
): CoverSlideModel {
  return {
    reportTitle: `Marketing Report ${context.coverBrandName}`,
    subtitle: `${context.coverIntegrationLabel} Report - Summary & Insights`,
    meta: context.analyzedPeriod,
    branding: context.branding,
  };
}

export function buildReachSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  const extremes = getReachExtremes(context.report.viewersDailyPoints);

  console.info("[MetaTimeframe][render.reach]", {
    source: context.report.timeframeSource,
    label: context.report.descriptionTimeframe?.label || context.report.periodLabel,
    timeframe: {
      since: context.report.timeframeSince || null,
      until: context.report.timeframeUntil || null,
    },
    pointsLength: context.report.viewersDailyPoints.length,
  });

  return {
    metricKey: "reach",
    metricEyebrow: "Metric",
    metricTitle: context.reachDisplayLabel,
    sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
    totalLabel: `Total de ${context.reachDisplayLabel.toLowerCase()} del periodo`,
    totalValue: formatDisplayNumber(context.report.viewersTotalValue),
    insightText: context.reachInsight,
    chartPoints: context.report.viewersDailyPoints,
    chartAvailable:
      context.report.viewersDailyAvailable ||
      context.report.viewersDailyPoints.length > 0,
    chartMetricLabel: context.reachDisplayLabel,
    highestDayCard: buildReachCard(
      "Highest day",
      extremes.highest,
      context.reachDisplayLabel
    ),
    lowestDayCard: buildReachCard(
      "Lowest day",
      extremes.lowest,
      context.reachDisplayLabel
    ),
  };
}

export function buildImpressionsSlideModel(
  context: DefaultTemplateContext
): ImpressionsSlideModel {
  console.info("[MetaTimeframe][render.impressions]", {
    source: context.report.timeframeSource,
    label: context.report.descriptionTimeframe?.label || context.report.periodLabel,
    timeframe: {
      since: context.report.timeframeSince || null,
      until: context.report.timeframeUntil || null,
    },
    impressionsDailyCount: context.impressionsDailyPoints.length,
  });

  return {
    impressions_total: context.impressionsTotal,
    impressions_daily: context.impressionsDailyPoints.map((point) => ({
      date: point.date,
      value: point.value,
    })),
    reach_total: context.viewersTotal,
    timeframe_since: context.report.timeframeSince,
    timeframe_until: context.report.timeframeUntil,
    metric_label: context.impressionsDisplayLabel,
    average_daily: parseMetricNumber(context.report.impressionsAverageDailyValue, 0),
    highest_day: context.report.impressionsHighestDay,
    lowest_day: context.report.impressionsLowestDay,
    frequency: parseMetricNumber(
      context.report.impressionsFrequencyValue,
      context.frequency
    ),
    insight_text: context.report.impressionsInsightText,
    impressions_daily_count: context.report.impressionsDailyCount,
    title: context.impressionsDisplayLabel,
    impressions_slide_present: context.report.impressionsSlidePresent,
    unavailable:
      context.report.impressionsUnavailable &&
      context.impressionsDailyPoints.length === 0 &&
      context.impressionsTotal === 0,
    source_metric_name: context.report.impressionsLabel,
    timeframe_source: context.report.timeframeSource,
    source_caption: buildSourceCaption(context.coverIntegrationLabel),
    unavailable_message:
      "Impressions data was not available with enough detail for this reporting period.",
  };
}

export function buildEngagementSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  const extremes = getReachExtremes(context.report.engagementDailyPoints);

  return {
    metricKey: "engagement",
    metricEyebrow: "Metric",
    metricTitle: "ENGAGEMENT",
    sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
    totalLabel: "Total engagement this period",
    totalValue:
      formatDisplayNumber(context.report.engagementTotalValue) || "N/A",
    insightText: context.report.engagementInsightText,
    chartPoints: context.report.engagementDailyPoints,
    chartAvailable:
      context.report.engagementDailyAvailable ||
      context.report.engagementDailyPoints.length > 0,
    chartMetricLabel: context.report.engagementLabel || "Engagement",
    highestDayCard: buildReachCard(
      "Highest day",
      context.report.engagementHighestDay || extremes.highest,
      context.report.engagementLabel || "Engagement"
    ),
    lowestDayCard: buildReachCard(
      "Lowest day",
      context.report.engagementLowestDay || extremes.lowest,
      context.report.engagementLabel || "Engagement"
    ),
  };
}

export function buildSummarySlideModel(
  context: DefaultTemplateContext
): SummarySlideModel {
  return {
    title: "Resumen final",
    aiSummary: context.report.finalSummaryAiText,
    recommendation: context.report.finalRecommendationText,
    metrics: [
      {
        label: "Reach",
        value:
          context.report.finalSummaryMetrics?.reach ||
          formatDisplayNumber(context.report.viewersTotalValue) ||
          "N/A",
        meta: context.report.viewersLabel || "Total reach in period",
      },
      {
        label: "Impressions",
        value:
          context.report.finalSummaryMetrics?.impressions ||
          formatDisplayNumber(context.report.impressionsTotalValue) ||
          "N/A",
        meta: context.report.impressionsLabel || "Total impressions in period",
      },
      {
        label: "Engagement",
        value:
          context.report.finalSummaryMetrics?.engagement ||
          formatDisplayNumber(context.report.engagementTotalValue) ||
          "N/A",
        meta: context.report.engagementLabel || "Total interactions in period",
      },
    ],
  };
}
