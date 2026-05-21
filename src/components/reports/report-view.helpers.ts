import type { ReportVersionBlock } from "@/types/report";
import { formatDisplayNumber } from "@/lib/formatters";
import { normalizeDailySeries } from "@/lib/reports/daily-series";

export type ExecutiveDarkKpi = {
  id: string;
  label: string;
  value: string;
  featured: boolean;
};

export type ExecutiveDarkSeriesPoint = {
  date: string;
  label: string;
  value: number;
};

export type ExecutiveDarkTimeframe = {
  label?: string;
  since?: string;
  until?: string;
  key?: string;
  preset?: string;
};

export type ExecutiveDarkTimeframeSource =
  | "report.description.timeframe"
  | "blocks.data_json.timeframe"
  | "report.description.timeframe.label"
  | "legacy.periodLabel";

export type ExecutiveDarkParseError = {
  id: string;
  type: string;
  message: string;
};

export type ExecutiveDarkGeneralInsightsMetric = {
  value: string;
  available: boolean;
  semanticValid: boolean;
  sourceMetricName: string;
};

export type ExecutiveDarkViewModel = {
  title: string;
  subtitle: string;
  periodLabel: string;
  deliveryLabel: string;
  deckLabel: string;
  kpis: ExecutiveDarkKpi[];
  heroMetrics: ExecutiveDarkKpi[];
  reachTotalValue: string;
  primaryNarrative: string;
  premiumInsight: string;
  secondaryNarrative: string;
  descriptionTimeframe: ExecutiveDarkTimeframe | null;
  timeframeSource: ExecutiveDarkTimeframeSource;
  coverTimeframeSource: ExecutiveDarkTimeframeSource | "title_block.period";
  coverTimeframeSince: string;
  coverTimeframeUntil: string;
  coverTimeframeLabel: string;
  timeframeSince: string;
  timeframeUntil: string;
  viewersLabel: string;
  impressionsLabel: string;
  viewersTotalValue: string;
  viewersDailyPoints: ExecutiveDarkSeriesPoint[];
  viewersDailyAvailable: boolean;
  impressionsTotalValue: string;
  impressionsDailyPoints: ExecutiveDarkSeriesPoint[];
  impressionsDailyAvailable: boolean;
  impressionsSlidePresent: boolean;
  impressionsUnavailable: boolean;
  impressionsDailyCount: number;
  impressionsAverageDailyValue: string;
  impressionsHighestDay: {
    date: string;
    value: number;
  } | null;
  impressionsLowestDay: {
    date: string;
    value: number;
  } | null;
  impressionsFrequencyValue: string;
  impressionsInsightText: string;
  engagementLabel: string;
  engagementTotalValue: string;
  engagementDailyPoints: ExecutiveDarkSeriesPoint[];
  engagementDailyAvailable: boolean;
  engagementHighestDay: {
    date: string;
    value: number;
  } | null;
  engagementLowestDay: {
    date: string;
    value: number;
  } | null;
  engagementInsightText: string;
  reachDailyPoints: ExecutiveDarkSeriesPoint[];
  reachDailyAvailable: boolean;
  followersTotalValue: string;
  followersGrowthValue: string;
  interactionsTotalValue: string;
  linkClicksValue: string;
  pageVisitsValue: string;
  generalInsightsSlidePresent: boolean;
  generalInsightsRawData: Record<string, unknown> | null;
  generalInsightsMetrics: {
    reach: ExecutiveDarkGeneralInsightsMetric | null;
    impressions: ExecutiveDarkGeneralInsightsMetric | null;
    frequency: ExecutiveDarkGeneralInsightsMetric | null;
    followers: ExecutiveDarkGeneralInsightsMetric | null;
    followersGrowth: ExecutiveDarkGeneralInsightsMetric | null;
    interactions: ExecutiveDarkGeneralInsightsMetric | null;
    linkClicks: ExecutiveDarkGeneralInsightsMetric | null;
    pageVisits: ExecutiveDarkGeneralInsightsMetric | null;
  };
  finalSummaryAiText: string;
  finalRecommendationText: string;
  finalSummaryMetrics: {
    reach?: string;
    impressions?: string;
    engagement?: string;
  } | null;
  parseErrors: ExecutiveDarkParseError[];
};

type ClassifiedTextBlock = {
  id: string;
  text: string;
  role: "summary" | "ai_summary" | "recent_posts_summary" | "generic";
  invalid: boolean;
};

function getTrimmedText(value: string | null | undefined) {
  return value?.trim() || "";
}

function normalizeSlideToken(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getBlockMetricKey(block: ReportVersionBlock) {
  const candidates = [
    block.data.metric_key,
    block.data.metricKey,
    block.data.metric_label,
    block.data.metricLabel,
    block.data.semantic_name,
    block.data.semanticName,
    block.data.key,
    block.data.name,
    block.type,
  ];
  const haystack = candidates
    .map((value) => getTrimmedText(String(value ?? "")))
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
  const candidates = [
    block.data.slide_type,
    block.data.slideType,
    block.data.semantic_name,
    block.data.semanticName,
    block.data.key,
    block.data.name,
    block.type,
  ];
  const normalized = candidates
    .map((value) => normalizeSlideToken(getTrimmedText(String(value ?? ""))))
    .filter(Boolean)
    .join(" ");

  if (normalized.includes("cover") || normalized.includes("title")) {
    return "cover";
  }

  if (
    normalized.includes("summary") ||
    normalized.includes("closing") ||
    normalized.includes("recommendation")
  ) {
    return "summary";
  }

  if (normalized.includes("metric")) {
    return "metric";
  }

  return "";
}

function getBlockSlideNumber(block: ReportVersionBlock) {
  const rawValue =
    block.data.slide_number ??
    block.data.slideNumber ??
    block.data.order ??
    block.data.slide_order ??
    block.data.slideOrder;
  const parsed = typeof rawValue === "number" ? rawValue : Number(rawValue);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFiveSlideBlocks(blocks: ReportVersionBlock[]) {
  if (blocks.length !== 5) {
    return blocks;
  }

  const consumed = new Set<string>();
  const pick = (
    predicate: (block: ReportVersionBlock) => boolean
  ) => {
    const match = blocks.find((block) => !consumed.has(block.id) && predicate(block)) || null;

    if (match) {
      consumed.add(match.id);
    }

    return match;
  };

  const coverBlock =
    pick((block) => getBlockSlideNumber(block) === 1) ||
    pick((block) => getBlockSlideType(block) === "cover") ||
    pick((block) => block.type === "title");
  const reachBlock =
    pick((block) => getBlockSlideNumber(block) === 2) ||
    pick((block) => getBlockMetricKey(block) === "reach");
  const impressionsBlock =
    pick((block) => getBlockSlideNumber(block) === 3) ||
    pick((block) => getBlockMetricKey(block) === "impressions");
  const engagementBlock =
    pick((block) => getBlockSlideNumber(block) === 4) ||
    pick((block) => getBlockMetricKey(block) === "engagement");
  const summaryBlock =
    pick((block) => getBlockSlideNumber(block) === 5) ||
    pick((block) => getBlockSlideType(block) === "summary");

  const ordered = [
    coverBlock,
    reachBlock,
    impressionsBlock,
    engagementBlock,
    summaryBlock,
    ...blocks.filter((block) => !consumed.has(block.id)),
  ].filter((block): block is ReportVersionBlock => block !== null);

  return ordered.length === blocks.length ? ordered : blocks;
}

function getStatValue(value: ReportVersionBlock["data"]["value"]) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return formatDisplayNumber(value);
}

function safeParseBlock(rawDataJson: string) {
  if (!rawDataJson) {
    return { invalid: false };
  }

  try {
    JSON.parse(rawDataJson);
    return { invalid: false };
  } catch {
    return { invalid: true };
  }
}

function inferTextRole(
  block: ReportVersionBlock,
  index: number
): ClassifiedTextBlock["role"] {
  const raw = block.rawDataJson.toLowerCase();
  const text = getTrimmedText(block.data.text).toLowerCase();

  if (raw.includes("ai_summary") || text.includes("insight")) {
    return "ai_summary";
  }

  if (
    raw.includes("recent_posts_summary") ||
    text.includes("recent post") ||
    text.includes("publicacion") ||
    text.includes("post")
  ) {
    return "recent_posts_summary";
  }

  if (raw.includes("summary") || index === 0) {
    return "summary";
  }

  return "generic";
}

function formatShortDate(value: string) {
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(isoCandidate);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPeriodLabel(since: string, until: string, fallbackLabel?: string) {
  if (since && until) {
    return `${formatShortDate(since)} - ${formatShortDate(until)}`;
  }

  if (fallbackLabel) {
    return fallbackLabel;
  }

  return "Analyzed period";
}

function getTimeframeSource(input: {
  descriptionTimeframe: ExecutiveDarkTimeframe | null;
  blockSince: string;
  blockUntil: string;
}): ExecutiveDarkTimeframeSource {
  if (input.blockSince && input.blockUntil) {
    return "blocks.data_json.timeframe";
  }

  if (input.descriptionTimeframe?.since && input.descriptionTimeframe.until) {
    return "report.description.timeframe";
  }

  if (input.descriptionTimeframe?.label) {
    return "report.description.timeframe.label";
  }

  return "legacy.periodLabel";
}

function getTitleBlockTimeframe(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");

  return {
    since: getTrimmedText(
      String(
        titleBlock?.data.period_since ??
          titleBlock?.data.timeframe_since ??
          titleBlock?.data.since ??
          ""
      )
    ),
    until: getTrimmedText(
      String(
        titleBlock?.data.period_until ??
          titleBlock?.data.timeframe_until ??
          titleBlock?.data.until ??
          ""
      )
    ),
    label: getTrimmedText(
      String(
        titleBlock?.data.period_label ??
          titleBlock?.data.timeframe_label ??
          ""
      )
    ),
  };
}

function getPreferredText(
  texts: ClassifiedTextBlock[],
  roles: ClassifiedTextBlock["role"][]
) {
  for (const role of roles) {
    const match = texts.find((textBlock) => textBlock.role === role);

    if (match?.text) {
      return match.text;
    }
  }

  return "";
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

function buildContinuousDailyPoints(
  points: ExecutiveDarkSeriesPoint[],
  startDate?: string,
  endDate?: string
) {
  const normalizedStart = normalizeDateKey(startDate || "");
  const normalizedEnd = normalizeDateKey(endDate || "");

  if (!normalizedStart || !normalizedEnd) {
    return points;
  }

  const pointsByDate = new Map(
    points.map((point) => [normalizeDateKey(point.date), point.value])
  );
  const result: ExecutiveDarkSeriesPoint[] = [];
  const current = new Date(`${normalizedStart}T12:00:00Z`);
  const end = new Date(`${normalizedEnd}T12:00:00Z`);

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

function matchesMetricAlias(value: string, aliases: string[]) {
  const normalizedValue = value.toLowerCase();

  return aliases.some((alias) => {
    const normalizedAlias = alias.toLowerCase();
    return (
      normalizedValue === normalizedAlias ||
      normalizedValue.includes(normalizedAlias)
    );
  });
}

function coerceSeriesPoint(value: unknown): ExecutiveDarkSeriesPoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const point = value as {
    date?: unknown;
    day?: unknown;
    label?: unknown;
    name?: unknown;
    value?: unknown;
    total?: unknown;
    count?: unknown;
  };
  const rawDate =
    getTrimmedText(String(point.date ?? point.day ?? point.label ?? point.name ?? ""));
  const rawValue = point.value ?? point.total ?? point.count;
  const numericValue =
    typeof rawValue === "number"
      ? rawValue
      : Number(String(rawValue ?? "").trim());

  if (!rawDate || Number.isNaN(numericValue)) {
    return null;
  }

  return {
    date: rawDate,
    label: formatShortDayLabel(rawDate),
    value: numericValue,
  };
}

function getMetricChartData(blocks: ReportVersionBlock[], metricAliases: string[]) {
  const chartBlock = blocks.find((block) => {
    if (
      block.type !== "chart" &&
      !block.type.toLowerCase().includes("chart") &&
      !block.type.toLowerCase().includes("graph")
    ) {
      return false;
    }

    const haystack = [
      getTrimmedText(String(block.data.metric ?? "")),
      getTrimmedText(String(block.data.label ?? "")),
      getTrimmedText(String(block.data.title ?? "")),
      getTrimmedText(String(block.data.source_label ?? "")),
      getTrimmedText(String(block.data.semantic_name ?? "")),
      getTrimmedText(String(block.data.y_axis_label ?? "")),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesMetricAlias(haystack, metricAliases);
  });

  if (!chartBlock) {
    return {
      points: [] as ExecutiveDarkSeriesPoint[],
      isAvailable: false,
      timeframeSince: "",
      timeframeUntil: "",
      sourceLabel: "",
    };
  }

  const rawPoints = normalizeDailySeries(chartBlock.data);
  const startDate = getTrimmedText(
    String(
      chartBlock.data.timeframe_since ??
        chartBlock.data.since ??
        chartBlock.data.start ??
        chartBlock.data.start_date ??
        ""
    )
  );
  const endDate = getTrimmedText(
    String(
      chartBlock.data.timeframe_until ??
        chartBlock.data.until ??
        chartBlock.data.end ??
        chartBlock.data.end_date ??
        ""
    )
  );
  const sourceLabel = getTrimmedText(
    String(
      chartBlock.data.source_label ??
        chartBlock.data.label ??
        chartBlock.data.title ??
        ""
    )
  );

  const points = buildContinuousDailyPoints(
    rawPoints.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
    startDate,
    endDate
  );

  const isAvailable = points.length > 0;

  return {
    points,
    isAvailable,
    timeframeSince: startDate,
    timeframeUntil: endDate,
    sourceLabel,
  };
}

function getKpiValue(kpis: ExecutiveDarkKpi[], aliases: string[]) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  const match = kpis.find((kpi) =>
    normalizedAliases.some((alias) => kpi.label.toLowerCase().includes(alias))
  );

  return match?.value || "N/A";
}

function getKpiLabel(
  kpis: ExecutiveDarkKpi[],
  aliases: string[],
  fallback: string
) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  const match = kpis.find((kpi) =>
    normalizedAliases.some((alias) => kpi.label.toLowerCase().includes(alias))
  );

  return match?.label || fallback;
}

function getMetricTotalValue(
  kpis: ExecutiveDarkKpi[],
  aliases: string[],
  points: ExecutiveDarkSeriesPoint[]
) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  const metricKpi = kpis.find((kpi) =>
    normalizedAliases.some((alias) => kpi.label.toLowerCase().includes(alias))
  );

  if (metricKpi?.value) {
    return metricKpi.value;
  }

  if (points.length > 0) {
    return String(
      points.reduce((sum, point) => sum + point.value, 0)
    );
  }

  return "N/A";
}

function getImpressionsSlideData(blocks: ReportVersionBlock[]) {
  const block =
    blocks.find((item) => getBlockMetricKey(item) === "impressions") ||
    blocks.find((item) => item.type === "impressions_slide") ||
    blocks.find((item) => getBlockSlideNumber(item) === 3);

  if (!block) {
    return null;
  }

  const timeframeSince = getTrimmedText(String(block.data.timeframe_since ?? ""));
  const timeframeUntil = getTrimmedText(String(block.data.timeframe_until ?? ""));
  const rawImpressionsTotal = block.data.impressions_total;
  const impressionsTotal =
    rawImpressionsTotal === null || rawImpressionsTotal === undefined
      ? ""
      : getTrimmedText(String(rawImpressionsTotal));
  const points = buildContinuousDailyPoints(
    normalizeDailySeries(block.data)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    timeframeSince,
    timeframeUntil
  );

  const highestRaw = block.data.highest_day;
  const lowestRaw = block.data.lowest_day;
  const impressionsDailyCount =
    Number(String(block.data.impressions_daily_count ?? points.length).trim()) || 0;
  const averageDaily = getTrimmedText(String(block.data.average_daily ?? ""));
  const frequency = getTrimmedText(String(block.data.frequency ?? ""));
  const insightText = getTrimmedText(String(block.data.insight_text ?? ""));
  const hasDailyData = points.length > 0;
  const hasSummaryData =
    Boolean(impressionsTotal) ||
    Boolean(averageDaily) ||
    Boolean(frequency) ||
    Boolean(insightText) ||
    Boolean(highestRaw) ||
    Boolean(lowestRaw) ||
    impressionsDailyCount > 0;
  const unavailable = !hasDailyData && !hasSummaryData;

  return {
    title: getTrimmedText(String(block.data.title ?? "")),
    label: getTrimmedText(String(block.data.label ?? "")),
    timeframeSince,
    timeframeUntil,
    impressionsTotal,
    points,
    impressionsDailyCount,
    averageDaily,
    highestDay:
      highestRaw && typeof highestRaw === "object"
        ? {
            date: getTrimmedText(String((highestRaw as { date?: unknown }).date ?? "")),
            value: Number(String((highestRaw as { value?: unknown }).value ?? "").trim()) || 0,
          }
        : null,
    lowestDay:
      lowestRaw && typeof lowestRaw === "object"
        ? {
            date: getTrimmedText(String((lowestRaw as { date?: unknown }).date ?? "")),
            value: Number(String((lowestRaw as { value?: unknown }).value ?? "").trim()) || 0,
          }
        : null,
    frequency,
    insightText:
      insightText ||
      "Impressions insights will appear here once the source includes enough contextual detail.",
    unavailable,
  };
}

function getEngagementSlideData(blocks: ReportVersionBlock[]) {
  const block =
    blocks.find((item) => getBlockMetricKey(item) === "engagement") ||
    blocks.find((item) => getBlockSlideNumber(item) === 4) ||
    null;

  if (!block) {
    return null;
  }

  const points = normalizeDailySeries(block.data).sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
  );
  const highestRaw =
    block.data.highest_day && typeof block.data.highest_day === "object"
      ? (block.data.highest_day as { date?: unknown; value?: unknown })
      : null;
  const lowestRaw =
    block.data.lowest_day && typeof block.data.lowest_day === "object"
      ? (block.data.lowest_day as { date?: unknown; value?: unknown })
      : null;

  return {
    label:
      getTrimmedText(String(block.data.metric_label ?? "")) ||
      getTrimmedText(String(block.data.metricLabel ?? "")) ||
      "Engagement",
    total:
      getTrimmedText(String(block.data.total ?? "")) ||
      getTrimmedText(String(block.data.value ?? "")) ||
      getTrimmedText(String(block.data.engagement ?? "")) ||
      getTrimmedText(String(block.data.interactions_total ?? "")),
    points,
    highestDay:
      highestRaw && getTrimmedText(String(highestRaw.date ?? ""))
        ? {
            date: getTrimmedText(String(highestRaw.date ?? "")),
            value: Number(String(highestRaw.value ?? "").trim()) || 0,
          }
        : null,
    lowestDay:
      lowestRaw && getTrimmedText(String(lowestRaw.date ?? ""))
        ? {
            date: getTrimmedText(String(lowestRaw.date ?? "")),
            value: Number(String(lowestRaw.value ?? "").trim()) || 0,
          }
        : null,
    insightText:
      getTrimmedText(String(block.data.insight_short ?? "")) ||
      getTrimmedText(String(block.data.insightShort ?? "")) ||
      getTrimmedText(String(block.data.insight ?? "")) ||
      getTrimmedText(String(block.data.ai_summary ?? "")) ||
      getTrimmedText(String(block.data.aiSummary ?? "")) ||
      getTrimmedText(String(block.data.summary ?? "")),
  };
}

function getGeneralInsightsMetric(
  value: unknown,
  available: unknown,
  semanticValid: unknown,
  sourceMetricName: unknown
): ExecutiveDarkGeneralInsightsMetric {
  return {
    value:
      value === null || value === undefined ? "" : getTrimmedText(String(value)),
    available: available !== false,
    semanticValid: semanticValid !== false,
    sourceMetricName: getTrimmedText(String(sourceMetricName ?? "")),
  };
}

function getGeneralInsightsMetricFromBlock(
  rawMetric: unknown,
  fallbackValue: unknown,
  fallbackAvailable: unknown,
  fallbackSemanticValid: unknown,
  fallbackSourceMetricName: unknown
) {
  if (rawMetric && typeof rawMetric === "object") {
    const metric = rawMetric as {
      value?: unknown;
      available?: unknown;
      semantic_valid?: unknown;
      source_metric_name?: unknown;
    };

    return getGeneralInsightsMetric(
      metric.value,
      metric.available,
      metric.semantic_valid,
      metric.source_metric_name
    );
  }

  return getGeneralInsightsMetric(
    fallbackValue,
    fallbackAvailable,
    fallbackSemanticValid,
    fallbackSourceMetricName
  );
}

function getGeneralInsightsSlideData(blocks: ReportVersionBlock[]) {
  const block =
    blocks.find((item) => item.type === "general_insights_slide") ||
    blocks.find((item) => getBlockSlideNumber(item) === 5) ||
    blocks.find((item) => getBlockSlideType(item) === "summary");

  if (!block) {
    return null;
  }

  const metrics =
    block.data.metrics && typeof block.data.metrics === "object"
      ? (block.data.metrics as Record<string, unknown>)
      : null;

  return {
    rawData: block.data as Record<string, unknown>,
    reach: getGeneralInsightsMetricFromBlock(
      metrics?.reach ?? block.data.reach,
      block.data.reach,
      block.data.reach_available,
      block.data.reach_semantic_valid,
      block.data.reach_source_metric_name
    ),
    impressions: getGeneralInsightsMetricFromBlock(
      metrics?.impressions ?? block.data.impressions,
      block.data.impressions,
      block.data.impressions_available,
      block.data.impressions_semantic_valid,
      block.data.impressions_source_metric_name
    ),
    frequency: getGeneralInsightsMetricFromBlock(
      metrics?.frequency ?? block.data.frequency,
      block.data.frequency,
      block.data.frequency_available,
      block.data.frequency_semantic_valid,
      block.data.frequency_source_metric_name
    ),
    followers: getGeneralInsightsMetricFromBlock(
      metrics?.followers ?? block.data.followers,
      block.data.followers,
      block.data.followers_available,
      block.data.followers_semantic_valid,
      block.data.followers_source_metric_name
    ),
    followersGrowth: getGeneralInsightsMetricFromBlock(
      metrics?.followers_growth ?? block.data.followers_growth,
      block.data.followers_growth,
      block.data.followers_growth_available,
      block.data.followers_growth_semantic_valid,
      block.data.followers_growth_source_metric_name
    ),
    interactions: getGeneralInsightsMetricFromBlock(
      metrics?.interactions ?? block.data.interactions,
      block.data.interactions,
      block.data.interactions_available,
      block.data.interactions_semantic_valid,
      block.data.interactions_source_metric_name
    ),
    linkClicks: getGeneralInsightsMetricFromBlock(
      metrics?.link_clicks ?? block.data.link_clicks,
      block.data.link_clicks,
      block.data.link_clicks_available,
      block.data.link_clicks_semantic_valid,
      block.data.link_clicks_source_metric_name
    ),
    pageVisits: getGeneralInsightsMetricFromBlock(
      metrics?.page_visits ?? block.data.page_visits,
      block.data.page_visits,
      block.data.page_visits_available,
      block.data.page_visits_semantic_valid,
      block.data.page_visits_source_metric_name
    ),
  };
}

function getSummarySlideData(blocks: ReportVersionBlock[]) {
  const block =
    blocks.find((item) => getBlockSlideNumber(item) === 5) ||
    blocks.find((item) => getBlockSlideType(item) === "summary") ||
    blocks.find((item) => item.type === "general_insights_slide") ||
    null;

  if (!block) {
    return null;
  }

  const metricsSummary =
    block.data.metrics_summary && typeof block.data.metrics_summary === "object"
      ? (block.data.metrics_summary as Record<string, unknown>)
      : null;

  return {
    metricsSummary,
    aiSummary:
      getTrimmedText(String(block.data.ai_summary ?? "")) ||
      getTrimmedText(String(block.data.aiSummary ?? "")) ||
      getTrimmedText(String(block.data.insight_short ?? "")) ||
      getTrimmedText(String(block.data.insightShort ?? "")) ||
      getTrimmedText(String(block.data.insight ?? "")) ||
      getTrimmedText(String(block.data.summary ?? "")),
    recommendation:
      getTrimmedText(String(block.data.recommendation ?? "")) ||
      getTrimmedText(String(block.data.actionable_recommendation ?? "")) ||
      getTrimmedText(String(block.data.actionableRecommendation ?? "")),
  };
}

export function buildExecutiveDarkViewModel(
  blocks: ReportVersionBlock[],
  options?: {
    descriptionTimeframe?: ExecutiveDarkTimeframe | null;
    fallbackTitle?: string | null;
  }
): ExecutiveDarkViewModel {
  const orderedBlocks = normalizeFiveSlideBlocks(blocks);
  const parseErrors: ExecutiveDarkParseError[] = [];

  const titleBlock = orderedBlocks.find((block) => block.type === "title");
  const title =
    getTrimmedText(titleBlock?.data.text) ||
    getTrimmedText(options?.fallbackTitle) ||
    "Executive Monthly Report";

  const textBlocks = orderedBlocks
    .filter((block) => block.type === "text")
    .map((block, index) => {
      const parseState = safeParseBlock(block.rawDataJson);

      if (parseState.invalid) {
        parseErrors.push({
          id: block.id,
          type: block.type,
          message: "A text block could not be interpreted correctly.",
        });
      }

      return {
        id: block.id,
        text: getTrimmedText(block.data.text),
        role: inferTextRole(block, index),
        invalid: parseState.invalid,
      } satisfies ClassifiedTextBlock;
    })
    .filter((block) => block.text);

  const kpis = orderedBlocks
    .filter((block) => block.type === "stat")
    .map((block, index) => {
      const parseState = safeParseBlock(block.rawDataJson);

      if (parseState.invalid) {
        parseErrors.push({
          id: block.id,
          type: block.type,
          message: "A KPI could not be interpreted correctly.",
        });
      }

      return {
        id: block.id,
        label: getTrimmedText(block.data.label) || `KPI ${index + 1}`,
        value: getStatValue(block.data.value),
        featured: index === 0,
      } satisfies ExecutiveDarkKpi;
    });

  const subtitle =
    getPreferredText(textBlocks, ["summary", "generic", "ai_summary"]) ||
    "Executive summary of the analyzed period focused on results and leadership-level readout.";

  const primaryNarrative =
    getPreferredText(textBlocks, ["summary", "generic", "recent_posts_summary"]) ||
    "No main narrative is available for this report yet.";

  const premiumInsight =
    getPreferredText(textBlocks, ["ai_summary", "generic", "summary"]) ||
    "No highlighted insight is available yet.";

  const secondaryNarrative =
    getPreferredText(textBlocks, ["recent_posts_summary", "generic", "summary"]) ||
    "No additional context is available for this period.";
  const impressionsSlideData = getImpressionsSlideData(orderedBlocks);
  const engagementSlideData = getEngagementSlideData(orderedBlocks);
  const generalInsightsSlideData = getGeneralInsightsSlideData(orderedBlocks);
  const summarySlideData = getSummarySlideData(orderedBlocks);
  const viewersChart = getMetricChartData(orderedBlocks, ["viewers", "viewer", "reach", "espectadores"]);
  const impressionsChart = getMetricChartData(orderedBlocks, ["impressions", "impresiones", "views", "view", "visualizaciones"]);
  const engagementChart = getMetricChartData(orderedBlocks, ["engagement", "interactions", "interacciones"]);
  const descriptionTimeframe = options?.descriptionTimeframe || null;
  const titleBlockTimeframe = getTitleBlockTimeframe(orderedBlocks);
  const blockTimeframeSince =
    viewersChart.timeframeSince ||
    impressionsSlideData?.timeframeSince ||
    impressionsChart.timeframeSince ||
    "";
  const blockTimeframeUntil =
    viewersChart.timeframeUntil ||
    impressionsSlideData?.timeframeUntil ||
    impressionsChart.timeframeUntil ||
    "";
  const timeframeSource = getTimeframeSource({
    descriptionTimeframe,
    blockSince: blockTimeframeSince,
    blockUntil: blockTimeframeUntil,
  });
  const timeframeSince =
    blockTimeframeSince ||
    descriptionTimeframe?.since ||
    "";
  const timeframeUntil =
    blockTimeframeUntil ||
    descriptionTimeframe?.until ||
    "";
  const coverTimeframeSince =
    descriptionTimeframe?.since ||
    titleBlockTimeframe.since ||
    blockTimeframeSince ||
    "";
  const coverTimeframeUntil =
    descriptionTimeframe?.until ||
    titleBlockTimeframe.until ||
    blockTimeframeUntil ||
    "";
  const coverTimeframeLabel =
    descriptionTimeframe?.label ||
    titleBlockTimeframe.label ||
    "";
  const coverTimeframeSource =
    descriptionTimeframe?.since && descriptionTimeframe.until
      ? "report.description.timeframe"
      : titleBlockTimeframe.since && titleBlockTimeframe.until
        ? "title_block.period"
        : blockTimeframeSince && blockTimeframeUntil
          ? "blocks.data_json.timeframe"
          : descriptionTimeframe?.label
            ? "report.description.timeframe.label"
            : "legacy.periodLabel";
  const viewersLabel =
    getKpiLabel(kpis, ["viewers", "viewer", "reach", "espectadores"], viewersChart.sourceLabel || "Espectadores");
  const impressionsLabel =
    impressionsSlideData?.label ||
    getKpiLabel(kpis, ["impressions", "impresiones", "views", "view", "visualizaciones"], impressionsChart.sourceLabel || "IMPRESIONES");
  const viewersTotalValue = getMetricTotalValue(
    kpis,
    ["viewers", "viewer", "reach", "espectadores"],
    viewersChart.points
  );
  const impressionsTotalValue =
    impressionsSlideData?.impressionsTotal ||
    getMetricTotalValue(
      kpis,
      ["impressions", "impresiones", "views", "view", "visualizaciones"],
      impressionsChart.points
    );
  const followersTotalValue = getKpiValue(kpis, ["followers", "fans"]);
  const followersGrowthValue = getKpiValue(kpis, ["followers growth", "growth", "new followers"]);
  const interactionsTotalValue = getKpiValue(kpis, ["interactions", "engagement"]);
  const linkClicksValue = getKpiValue(kpis, ["link clicks", "clicks"]);
  const pageVisitsValue = getKpiValue(kpis, ["page visits", "visits"]);
  const engagementLabel =
    engagementSlideData?.label ||
    getKpiLabel(kpis, ["interactions", "engagement"], engagementChart.sourceLabel || "ENGAGEMENT");
  const engagementTotalValue =
    engagementSlideData?.total ||
    getMetricTotalValue(kpis, ["interactions", "engagement"], engagementChart.points);

  return {
    title,
    subtitle,
    periodLabel: formatPeriodLabel(
      timeframeSince,
      timeframeUntil,
      descriptionTimeframe?.label
    ),
    deliveryLabel: "Monthly Results Review",
    deckLabel: "Executive Dark · 05 slides",
    descriptionTimeframe,
    timeframeSource,
    coverTimeframeSource,
    coverTimeframeSince,
    coverTimeframeUntil,
    coverTimeframeLabel,
    timeframeSince,
    timeframeUntil,
    viewersLabel,
    impressionsLabel,
    viewersTotalValue,
    viewersDailyPoints: viewersChart.points,
    viewersDailyAvailable: viewersChart.isAvailable,
    impressionsTotalValue,
    impressionsDailyPoints: impressionsSlideData?.points || impressionsChart.points,
    impressionsDailyAvailable: impressionsSlideData
      ? !impressionsSlideData.unavailable && impressionsSlideData.points.length > 0
      : impressionsChart.isAvailable,
    impressionsSlidePresent: Boolean(impressionsSlideData),
    impressionsUnavailable: impressionsSlideData?.unavailable || false,
    impressionsDailyCount: impressionsSlideData?.impressionsDailyCount || impressionsChart.points.length,
    impressionsAverageDailyValue: impressionsSlideData?.averageDaily || "0",
    impressionsHighestDay: impressionsSlideData?.highestDay || null,
    impressionsLowestDay: impressionsSlideData?.lowestDay || null,
    impressionsFrequencyValue: impressionsSlideData?.frequency || "",
    impressionsInsightText: impressionsSlideData?.insightText || "",
    engagementLabel,
    engagementTotalValue,
    engagementDailyPoints: engagementSlideData?.points || engagementChart.points,
    engagementDailyAvailable: engagementSlideData
      ? engagementSlideData.points.length > 0
      : engagementChart.isAvailable,
    engagementHighestDay: engagementSlideData?.highestDay || null,
    engagementLowestDay: engagementSlideData?.lowestDay || null,
    engagementInsightText:
      engagementSlideData?.insightText ||
      premiumInsight ||
      "Engagement insight is not available yet.",
    kpis,
    heroMetrics: kpis.slice(0, 3),
    reachTotalValue: viewersTotalValue,
    primaryNarrative,
    premiumInsight,
    secondaryNarrative,
    reachDailyPoints: viewersChart.points,
    reachDailyAvailable: viewersChart.isAvailable,
    followersTotalValue,
    followersGrowthValue,
    interactionsTotalValue,
    linkClicksValue,
    pageVisitsValue,
    generalInsightsSlidePresent: Boolean(generalInsightsSlideData),
    generalInsightsRawData: generalInsightsSlideData?.rawData || null,
    generalInsightsMetrics: {
      reach: generalInsightsSlideData?.reach || null,
      impressions: generalInsightsSlideData?.impressions || null,
      frequency: generalInsightsSlideData?.frequency || null,
      followers: generalInsightsSlideData?.followers || null,
      followersGrowth: generalInsightsSlideData?.followersGrowth || null,
      interactions: generalInsightsSlideData?.interactions || null,
      linkClicks: generalInsightsSlideData?.linkClicks || null,
      pageVisits: generalInsightsSlideData?.pageVisits || null,
    },
    finalSummaryAiText:
      summarySlideData?.aiSummary ||
      premiumInsight ||
      secondaryNarrative,
    finalRecommendationText:
      summarySlideData?.recommendation ||
      "Keep reinforcing the strongest content pattern, protect reach efficiency, and test one focused iteration next period.",
    finalSummaryMetrics: summarySlideData?.metricsSummary
      ? {
          reach: getTrimmedText(String(summarySlideData.metricsSummary.reach ?? "")) || undefined,
          impressions:
            getTrimmedText(String(summarySlideData.metricsSummary.impressions ?? "")) || undefined,
          engagement:
            getTrimmedText(String(summarySlideData.metricsSummary.engagement ?? "")) || undefined,
        }
      : null,
    parseErrors,
  };
}
