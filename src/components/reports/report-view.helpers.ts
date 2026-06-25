import type { ReportVersionBlock } from "@/types/report";
import { formatDisplayNumber } from "@/lib/formatters";
import { normalizeDailySeries } from "@/lib/reports/daily-series";

const META_UNAVAILABLE_MESSAGE =
  "Dato no disponible en este momento con los permisos actuales de Meta.";
const DEFAULT_INSIGHT_FALLBACK = "Dato no disponible en este momento.";

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
  reachInsightText: string;
  viewersDailyPoints: ExecutiveDarkSeriesPoint[];
  viewersDailyAvailable: boolean;
  impressionsTotalValue: string;
  impressionsDailyPoints: ExecutiveDarkSeriesPoint[];
  impressionsDailyAvailable: boolean;
  impressionsSlidePresent: boolean;
  impressionsUnavailable: boolean;
  impressionsUnavailableMessage: string;
  impressionsUnavailableReason: string;
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
  engagementUnavailable: boolean;
  engagementUnavailableMessage: string;
  engagementUnavailableReason: string;
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
  pageViewsLabel: string;
  pageViewsTotalValue: string;
  pageViewsDailyPoints: ExecutiveDarkSeriesPoint[];
  pageViewsDailyAvailable: boolean;
  pageViewsUnavailable: boolean;
  pageViewsUnavailableMessage: string;
  pageViewsUnavailableReason: string;
  pageViewsHighestDay: {
    date: string;
    value: number;
  } | null;
  pageViewsLowestDay: {
    date: string;
    value: number;
  } | null;
  pageViewsInsightText: string;
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
  finalSummaryMetrics: Record<string, unknown> | null;
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

function getTrimmedUnknown(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isExplicitlyUnavailable(record: Record<string, unknown>) {
  const value = record.is_available ?? record.isAvailable ?? record.available;

  return value === false || value === "false";
}

function isUnavailableMetricValue(value: unknown) {
  return typeof value === "string" && value.trim().toLowerCase() === "n/a";
}

function getUnavailableMessage(record: Record<string, unknown>) {
  return (
    getTrimmedUnknown(record.unavailable_message) ||
    getTrimmedUnknown(record.unavailableMessage) ||
    getTrimmedUnknown(record.unavailable_reason) ||
    getTrimmedUnknown(record.unavailableReason) ||
    META_UNAVAILABLE_MESSAGE
  );
}

function getUnavailableReason(record: Record<string, unknown>) {
  return (
    getTrimmedUnknown(record.unavailable_reason) ||
    getTrimmedUnknown(record.unavailableReason) ||
    ""
  );
}

function getFormattedMetricTotal(record: Record<string, unknown>, aliases: string[] = []) {
  const candidates = [
    record.formatted_total,
    record.formattedTotal,
    record.formatted_value,
    record.formattedValue,
    record.total,
    record.value,
    record.amount,
    ...aliases.map((alias) => record[alias]),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return formatDisplayNumber(candidate);
    }
  }

  return "";
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

  if (
    haystack.includes("page_views") ||
    haystack.includes("page views") ||
    haystack.includes("page_visits") ||
    haystack.includes("page visits") ||
    haystack.includes("profile_views") ||
    haystack.includes("profile views") ||
    haystack.includes("visitas a la pagina")
  ) {
    return "page_views";
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

function hasImpressionsMetricBlock(blocks: ReportVersionBlock[]) {
  return blocks.some(
    (block) =>
      getBlockMetricKey(block) === "impressions" ||
      block.type === "impressions_slide"
  );
}

function hasImpressionsLayout(blocks: ReportVersionBlock[]) {
  return (
    hasImpressionsMetricBlock(blocks) ||
    blocks.some(
      (block) =>
        getBlockMetricKey(block) === "engagement" &&
        getBlockSlideNumber(block) === 4
    )
  );
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
  const hasImpressions = hasImpressionsLayout(blocks);
  const impressionsBlock = hasImpressions
    ? pick((block) => getBlockMetricKey(block) === "impressions") ||
      pick((block) => block.type === "impressions_slide") ||
      pick((block) => getBlockSlideNumber(block) === 3)
    : null;
  const engagementBlock =
    pick((block) => getBlockMetricKey(block) === "engagement") ||
    pick((block) => getBlockSlideNumber(block) === (hasImpressions ? 4 : 3));
  const pageViewsBlock = !hasImpressions
    ? pick((block) => getBlockMetricKey(block) === "page_views") ||
      pick((block) => getBlockSlideNumber(block) === 4)
    : null;
  const summaryBlock =
    pick((block) => getBlockSlideNumber(block) === 5) ||
    pick((block) => getBlockSlideType(block) === "summary");

  const ordered = [
    coverBlock,
    reachBlock,
    impressionsBlock || engagementBlock,
    hasImpressions ? engagementBlock : pageViewsBlock,
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

  const metricBlock =
    blocks.find((block) => {
      const haystack = [
        getTrimmedText(String(block.data.metric ?? "")),
        getTrimmedText(String(block.data.metric_key ?? "")),
        getTrimmedText(String(block.data.metricKey ?? "")),
        getTrimmedText(String(block.data.metric_label ?? "")),
        getTrimmedText(String(block.data.metricLabel ?? "")),
        getTrimmedText(String(block.data.label ?? "")),
        getTrimmedText(String(block.data.title ?? "")),
        getTrimmedText(String(block.data.semantic_name ?? "")),
        getTrimmedText(String(block.data.semanticName ?? "")),
        block.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesMetricAlias(haystack, metricAliases);
    }) || null;

  const sourceBlock = chartBlock || metricBlock;

  if (!sourceBlock) {
    return {
      points: [] as ExecutiveDarkSeriesPoint[],
      isAvailable: false,
      timeframeSince: "",
      timeframeUntil: "",
      sourceLabel: "",
    };
  }

  const rawPoints = normalizeDailySeries(sourceBlock.data);
  const startDate = getTrimmedText(
    String(
      sourceBlock.data.timeframe_since ??
        sourceBlock.data.since ??
        sourceBlock.data.start ??
        sourceBlock.data.start_date ??
        ""
    )
  );
  const endDate = getTrimmedText(
    String(
      sourceBlock.data.timeframe_until ??
        sourceBlock.data.until ??
        sourceBlock.data.end ??
        sourceBlock.data.end_date ??
        ""
    )
  );
  const sourceLabel = getTrimmedText(
    String(
      sourceBlock.data.source_label ??
        sourceBlock.data.label ??
        sourceBlock.data.title ??
        ""
    )
  );

  const points = rawPoints.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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
  const hasImpressions = hasImpressionsLayout(blocks);
  const block =
    blocks.find((item) => getBlockMetricKey(item) === "impressions") ||
    blocks.find((item) => item.type === "impressions_slide") ||
    (hasImpressions
      ? blocks.find((item) => getBlockSlideNumber(item) === 3)
      : null);

  if (!block) {
    return null;
  }

  const timeframeSince = getTrimmedText(String(block.data.timeframe_since ?? ""));
  const timeframeUntil = getTrimmedText(String(block.data.timeframe_until ?? ""));
  const explicitTotal = getFormattedMetricTotal(block.data as Record<string, unknown>, [
    "impressions_total",
    "impressionsTotal",
  ]);
  const unavailable =
    isExplicitlyUnavailable(block.data as Record<string, unknown>) ||
    isUnavailableMetricValue(explicitTotal);
  const impressionsTotal = unavailable
    ? "N/A"
    : explicitTotal;
  const normalizedDailySeries = normalizeDailySeries(block.data).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const points = unavailable ? [] : normalizedDailySeries;

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
  const legacyUnavailable = !hasDailyData && !hasSummaryData;

  return {
    rawBlock: block.data as Record<string, unknown>,
    title: getTrimmedText(String(block.data.title ?? "")),
    label: getTrimmedText(String(block.data.label ?? "")),
    timeframeSince,
    timeframeUntil,
    impressionsTotal,
    points,
    impressionsDailyCount,
    averageDaily,
    isAvailable: !unavailable,
    unavailable: unavailable || legacyUnavailable,
    unavailableReason: getUnavailableReason(block.data as Record<string, unknown>),
    unavailableMessage: getUnavailableMessage(block.data as Record<string, unknown>),
    highestDay:
      !unavailable && highestRaw && typeof highestRaw === "object"
        ? {
            date: getTrimmedText(String((highestRaw as { date?: unknown }).date ?? "")),
            value: Number(String((highestRaw as { value?: unknown }).value ?? "").trim()) || 0,
          }
        : null,
    lowestDay:
      !unavailable && lowestRaw && typeof lowestRaw === "object"
        ? {
            date: getTrimmedText(String((lowestRaw as { date?: unknown }).date ?? "")),
            value: Number(String((lowestRaw as { value?: unknown }).value ?? "").trim()) || 0,
          }
        : null,
    frequency,
    insightText:
      insightText ||
      (unavailable || legacyUnavailable
        ? getUnavailableMessage(block.data as Record<string, unknown>) ||
          META_UNAVAILABLE_MESSAGE
        : DEFAULT_INSIGHT_FALLBACK),
  };
}

function getEngagementSlideData(blocks: ReportVersionBlock[]) {
  const hasImpressions = hasImpressionsLayout(blocks);
  const block =
    blocks.find((item) => getBlockMetricKey(item) === "engagement") ||
    blocks.find((item) => getBlockSlideNumber(item) === (hasImpressions ? 4 : 3)) ||
    null;

  if (!block) {
    return null;
  }

  const explicitTotal = getFormattedMetricTotal(block.data as Record<string, unknown>, [
    "engagement",
    "interactions_total",
    "interactionsTotal",
  ]);
  const unavailable =
    isExplicitlyUnavailable(block.data as Record<string, unknown>) ||
    isUnavailableMetricValue(explicitTotal);
  const points = unavailable ? [] : normalizeDailySeries(block.data).sort(
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
    rawBlock: block.data as Record<string, unknown>,
    label:
      getTrimmedText(String(block.data.metric_label ?? "")) ||
      getTrimmedText(String(block.data.metricLabel ?? "")) ||
      "Engagement",
    total: unavailable ? "N/A" : explicitTotal,
    isAvailable: !unavailable,
    unavailable,
    unavailableReason: getUnavailableReason(block.data as Record<string, unknown>),
    unavailableMessage: getUnavailableMessage(block.data as Record<string, unknown>),
    points,
    highestDay:
      !unavailable && highestRaw && getTrimmedText(String(highestRaw.date ?? ""))
        ? {
            date: getTrimmedText(String(highestRaw.date ?? "")),
            value: Number(String(highestRaw.value ?? "").trim()) || 0,
          }
        : null,
    lowestDay:
      !unavailable && lowestRaw && getTrimmedText(String(lowestRaw.date ?? ""))
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

function getPageViewsSlideData(blocks: ReportVersionBlock[]) {
  const hasImpressions = hasImpressionsLayout(blocks);
  if (hasImpressions) {
    return null;
  }

  const block =
    blocks.find((item) => getBlockMetricKey(item) === "page_views") ||
    blocks.find((item) => getBlockSlideNumber(item) === 4) ||
    null;

  if (!block) {
    return null;
  }

  const explicitTotal = getFormattedMetricTotal(block.data as Record<string, unknown>, [
    "page_views",
    "pageViews",
    "page_visits",
    "pageVisits",
    "profile_views",
    "profileViews",
    "total_page_views",
    "totalPageViews",
  ]);
  const unavailable =
    isExplicitlyUnavailable(block.data as Record<string, unknown>) ||
    isUnavailableMetricValue(explicitTotal);
  const points = unavailable ? [] : normalizeDailySeries(block.data).sort(
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
    rawBlock: block.data as Record<string, unknown>,
    label:
      getTrimmedText(String(block.data.metric_label ?? "")) ||
      getTrimmedText(String(block.data.metricLabel ?? "")) ||
      getTrimmedText(String(block.data.title ?? "")) ||
      "PAGE VIEWS",
    total: unavailable ? "N/A" : explicitTotal,
    isAvailable: !unavailable,
    unavailable,
    unavailableReason: getUnavailableReason(block.data as Record<string, unknown>),
    unavailableMessage: getUnavailableMessage(block.data as Record<string, unknown>),
    points,
    highestDay:
      !unavailable && highestRaw && getTrimmedText(String(highestRaw.date ?? ""))
        ? {
            date: getTrimmedText(String(highestRaw.date ?? "")),
            value: Number(String(highestRaw.value ?? "").trim()) || 0,
          }
        : null,
    lowestDay:
      !unavailable && lowestRaw && getTrimmedText(String(lowestRaw.date ?? ""))
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
    rawBlock: block.data as Record<string, unknown>,
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

function getSeriesExtremes(points: ExecutiveDarkSeriesPoint[]) {
  if (points.length === 0) {
    return {
      highest: null,
      lowest: null,
    };
  }

  return {
    highest: points.reduce((current, point) =>
      point.value > current.value ? point : current
    ),
    lowest: points.reduce((current, point) =>
      point.value < current.value ? point : current
    ),
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
    DEFAULT_INSIGHT_FALLBACK;

  const premiumInsight =
    getPreferredText(textBlocks, ["ai_summary", "generic", "summary"]) ||
    DEFAULT_INSIGHT_FALLBACK;

  const secondaryNarrative =
    getPreferredText(textBlocks, ["recent_posts_summary", "generic", "summary"]) ||
    DEFAULT_INSIGHT_FALLBACK;
  const impressionsSlideData = getImpressionsSlideData(orderedBlocks);
  const engagementSlideData = getEngagementSlideData(orderedBlocks);
  const pageViewsSlideData = getPageViewsSlideData(orderedBlocks);
  const generalInsightsSlideData = getGeneralInsightsSlideData(orderedBlocks);
  const summarySlideData = getSummarySlideData(orderedBlocks);
  const reachSlideBlock =
    orderedBlocks.find((item) => getBlockMetricKey(item) === "reach") ||
    orderedBlocks.find((item) => getBlockSlideNumber(item) === 2) ||
    null;
  const viewersChart = getMetricChartData(orderedBlocks, ["viewers", "viewer", "reach", "espectadores"]);
  const impressionsChart = getMetricChartData(orderedBlocks, ["impressions", "impresiones", "views", "view", "visualizaciones"]);
  const engagementChart = getMetricChartData(orderedBlocks, ["engagement", "interactions", "interacciones"]);
  const pageViewsChart = getMetricChartData(orderedBlocks, [
    "page views",
    "page_views",
    "page visits",
    "page_visits",
    "profile views",
    "profile_views",
    "visitas a la pagina",
  ]);
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
  const reachInsightText =
    (reachSlideBlock
      ? getTrimmedText(String(reachSlideBlock.data.insight_short ?? "")) ||
        getTrimmedText(String(reachSlideBlock.data.insightShort ?? "")) ||
        getTrimmedText(String(reachSlideBlock.data.insight ?? "")) ||
        getTrimmedText(String(reachSlideBlock.data.ai_summary ?? "")) ||
        getTrimmedText(String(reachSlideBlock.data.aiSummary ?? "")) ||
        getTrimmedText(String(reachSlideBlock.data.summary ?? ""))
      : "") ||
    premiumInsight ||
    DEFAULT_INSIGHT_FALLBACK;
  const impressionsTotalValue =
    impressionsSlideData?.unavailable
      ? "N/A"
      : impressionsSlideData?.impressionsTotal ||
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
  const pageViewsLabel =
    pageViewsSlideData?.label ||
    getKpiLabel(
      kpis,
      ["page views", "page visits", "profile views", "visits"],
      pageViewsChart.sourceLabel || "PAGE VIEWS"
    );
  const engagementLabel =
    engagementSlideData?.label ||
    getKpiLabel(kpis, ["interactions", "engagement"], engagementChart.sourceLabel || "ENGAGEMENT");
  const engagementTotalValue =
    engagementSlideData?.unavailable
      ? "N/A"
      : engagementSlideData?.total ||
    getMetricTotalValue(kpis, ["interactions", "engagement"], engagementChart.points);
  const pageViewsTotalValue =
    pageViewsSlideData?.unavailable
      ? "N/A"
      : pageViewsSlideData?.total ||
    getMetricTotalValue(
      kpis,
      ["page views", "page visits", "profile views", "visits"],
      pageViewsChart.points
    );
  const resolvedImpressionsPoints =
    impressionsSlideData && impressionsSlideData.points.length > 0
      ? impressionsSlideData.points
      : impressionsChart.points;
  const resolvedEngagementPoints =
    engagementSlideData && engagementSlideData.points.length > 0
      ? engagementSlideData.points
      : engagementChart.points;
  const resolvedPageViewsPoints =
    pageViewsSlideData && pageViewsSlideData.points.length > 0
      ? pageViewsSlideData.points
      : pageViewsChart.points;
  const impressionsExtremes = getSeriesExtremes(resolvedImpressionsPoints);
  const engagementExtremes = getSeriesExtremes(resolvedEngagementPoints);
  const pageViewsExtremes = getSeriesExtremes(resolvedPageViewsPoints);

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric debug]", {
      reportId: null,
      slideNumber: "02",
      metricKey: "reach",
      total: viewersTotalValue,
      rawSlideKeys: reachSlideBlock ? Object.keys(reachSlideBlock.data || {}) : [],
      dailySeriesRaw: reachSlideBlock?.data.daily_series,
      chartDataRaw: reachSlideBlock?.data.chart_data,
      normalizedDailySeries: viewersChart.points,
      normalizedDailySeriesLength: viewersChart.points.length,
      values: viewersChart.points.map((d) => d.value),
    });

    console.log("[5-slide metric debug]", {
      reportId: null,
      slideNumber: "03",
      metricKey: "engagement",
      total: engagementTotalValue,
      rawSlideKeys: engagementSlideData?.rawBlock ? Object.keys(engagementSlideData.rawBlock) : [],
      dailySeriesRaw: engagementSlideData?.rawBlock?.daily_series,
      chartDataRaw: engagementSlideData?.rawBlock?.chart_data,
      normalizedDailySeries: resolvedEngagementPoints,
      normalizedDailySeriesLength: resolvedEngagementPoints.length,
      values: resolvedEngagementPoints.map((d) => d.value),
    });

    console.log("[5-slide metric debug]", {
      reportId: null,
      slideNumber: "04",
      metricKey: "page_views",
      total: pageViewsTotalValue,
      rawSlideKeys: pageViewsSlideData?.rawBlock ? Object.keys(pageViewsSlideData.rawBlock) : [],
      dailySeriesRaw: pageViewsSlideData?.rawBlock?.daily_series,
      chartDataRaw: pageViewsSlideData?.rawBlock?.chart_data,
      normalizedDailySeries: resolvedPageViewsPoints,
      normalizedDailySeriesLength: resolvedPageViewsPoints.length,
      values: resolvedPageViewsPoints.map((d) => d.value),
    });

    console.log("[5-slide summary debug]", {
      metricsSummary: summarySlideData?.metricsSummary,
      reach: summarySlideData?.metricsSummary?.reach,
      engagement: summarySlideData?.metricsSummary?.engagement,
      followers: summarySlideData?.metricsSummary?.followers,
      pageViews:
        summarySlideData?.metricsSummary?.page_views ||
        summarySlideData?.metricsSummary?.page_visits ||
        summarySlideData?.metricsSummary?.profile_views,
    });
  }

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
    reachInsightText,
    viewersDailyPoints: viewersChart.points,
    viewersDailyAvailable: viewersChart.isAvailable,
    impressionsTotalValue,
    impressionsDailyPoints: resolvedImpressionsPoints,
    impressionsDailyAvailable: impressionsSlideData
      ? !impressionsSlideData.unavailable && resolvedImpressionsPoints.length > 0
      : impressionsChart.isAvailable,
    impressionsSlidePresent: Boolean(impressionsSlideData),
    impressionsUnavailable: impressionsSlideData?.unavailable || false,
    impressionsUnavailableMessage:
      impressionsSlideData?.unavailableMessage || META_UNAVAILABLE_MESSAGE,
    impressionsUnavailableReason: impressionsSlideData?.unavailableReason || "",
    impressionsDailyCount: impressionsSlideData?.impressionsDailyCount || resolvedImpressionsPoints.length,
    impressionsAverageDailyValue: impressionsSlideData?.averageDaily || "0",
    impressionsHighestDay: impressionsSlideData?.highestDay || impressionsExtremes.highest,
    impressionsLowestDay: impressionsSlideData?.lowestDay || impressionsExtremes.lowest,
    impressionsFrequencyValue: impressionsSlideData?.frequency || "",
    impressionsInsightText: impressionsSlideData?.insightText || "",
    engagementLabel,
    engagementTotalValue,
    engagementDailyPoints: resolvedEngagementPoints,
    engagementDailyAvailable: engagementSlideData
      ? !engagementSlideData.unavailable && resolvedEngagementPoints.length > 0
      : engagementChart.isAvailable,
    engagementUnavailable: engagementSlideData?.unavailable || false,
    engagementUnavailableMessage:
      engagementSlideData?.unavailableMessage || META_UNAVAILABLE_MESSAGE,
    engagementUnavailableReason: engagementSlideData?.unavailableReason || "",
    engagementHighestDay: engagementSlideData?.highestDay || engagementExtremes.highest,
    engagementLowestDay: engagementSlideData?.lowestDay || engagementExtremes.lowest,
    engagementInsightText:
      engagementSlideData?.insightText ||
      premiumInsight ||
      DEFAULT_INSIGHT_FALLBACK,
    pageViewsLabel,
    pageViewsTotalValue,
    pageViewsDailyPoints: resolvedPageViewsPoints,
    pageViewsDailyAvailable: pageViewsSlideData
      ? !pageViewsSlideData.unavailable && resolvedPageViewsPoints.length > 0
      : pageViewsChart.isAvailable,
    pageViewsUnavailable: pageViewsSlideData?.unavailable || false,
    pageViewsUnavailableMessage:
      pageViewsSlideData?.unavailableMessage || META_UNAVAILABLE_MESSAGE,
    pageViewsUnavailableReason: pageViewsSlideData?.unavailableReason || "",
    pageViewsHighestDay: pageViewsSlideData?.highestDay || pageViewsExtremes.highest,
    pageViewsLowestDay: pageViewsSlideData?.lowestDay || pageViewsExtremes.lowest,
    pageViewsInsightText:
      pageViewsSlideData?.insightText ||
      premiumInsight ||
      DEFAULT_INSIGHT_FALLBACK,
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
      secondaryNarrative ||
      DEFAULT_INSIGHT_FALLBACK,
    finalRecommendationText:
      summarySlideData?.recommendation ||
      DEFAULT_INSIGHT_FALLBACK,
    finalSummaryMetrics: summarySlideData?.metricsSummary || null,
    parseErrors,
  };
}
