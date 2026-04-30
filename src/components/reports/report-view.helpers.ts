import type { ReportVersionBlock } from "@/types/report";
import { formatDisplayNumber } from "@/lib/formatters";

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

function getMetricChartData(blocks: ReportVersionBlock[], metricAliases: string[]) {
  const chartBlock = blocks.find((block) => {
    if (block.type !== "chart") {
      return false;
    }

    const metric = getTrimmedText(String(block.data.metric ?? "")).toLowerCase();
    const label = getTrimmedText(block.data.label).toLowerCase();

    return metricAliases.some(
      (alias) => metric === alias || label.includes(alias)
    );
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

  const rawPoints = Array.isArray(chartBlock.data.points)
    ? chartBlock.data.points
    : [];
  const startDate = getTrimmedText(
    String(
      chartBlock.data.timeframe_since ??
        chartBlock.data.since ??
        chartBlock.data.start_date ??
        ""
    )
  );
  const endDate = getTrimmedText(
    String(
      chartBlock.data.timeframe_until ??
        chartBlock.data.until ??
        chartBlock.data.end_date ??
        ""
    )
  );
  const sourceLabel = getTrimmedText(
    String(chartBlock.data.source_label ?? chartBlock.data.label ?? "")
  );

  const points = buildContinuousDailyPoints(
    rawPoints
    .map((point) => {
      if (!point || typeof point !== "object") {
        return null;
      }

      const date = getTrimmedText(String((point as { date?: unknown }).date ?? ""));
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
      } satisfies ExecutiveDarkSeriesPoint;
    })
    .filter((point): point is ExecutiveDarkSeriesPoint => point !== null)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
    startDate,
    endDate
  );

  const isAvailable =
    Boolean(chartBlock.data.is_available) && points.length > 0;

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
  const block = blocks.find((item) => item.type === "impressions_slide");

  if (!block) {
    return null;
  }

  const rawDaily = Array.isArray(block.data.impressions_daily)
    ? block.data.impressions_daily
    : [];
  const timeframeSince = getTrimmedText(String(block.data.timeframe_since ?? ""));
  const timeframeUntil = getTrimmedText(String(block.data.timeframe_until ?? ""));
  const consistencyValid = block.data.consistency_valid !== false;
  const chartable = block.data.chartable !== false;
  const rawImpressionsTotal = block.data.impressions_total;
  const impressionsTotal =
    rawImpressionsTotal === null || rawImpressionsTotal === undefined
      ? ""
      : getTrimmedText(String(rawImpressionsTotal));
  const points = buildContinuousDailyPoints(
    rawDaily
      .map((point) => {
        if (!point || typeof point !== "object") {
          return null;
        }

        const date = getTrimmedText(String((point as { date?: unknown }).date ?? ""));
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
        } satisfies ExecutiveDarkSeriesPoint;
      })
      .filter((point): point is ExecutiveDarkSeriesPoint => point !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    timeframeSince,
    timeframeUntil
  );

  const highestRaw = block.data.highest_day;
  const lowestRaw = block.data.lowest_day;
  const impressionsDailyCount =
    Number(String(block.data.impressions_daily_count ?? points.length).trim()) || 0;
  const unavailable =
    !consistencyValid ||
    !chartable ||
    !impressionsTotal ||
    impressionsDailyCount === 0;

  return {
    title: getTrimmedText(String(block.data.title ?? "")),
    label: getTrimmedText(String(block.data.label ?? "")),
    timeframeSince,
    timeframeUntil,
    impressionsTotal,
    points: unavailable ? [] : points,
    impressionsDailyCount,
    averageDaily: getTrimmedText(String(block.data.average_daily ?? "")),
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
    frequency: unavailable ? "" : getTrimmedText(String(block.data.frequency ?? "")),
    insightText: unavailable
      ? "La métrica de impresiones no estuvo disponible con suficiente detalle en la fuente actual de Facebook Insights."
      : getTrimmedText(String(block.data.insight_text ?? "")),
    unavailable,
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
  const block = blocks.find((item) => item.type === "general_insights_slide");

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

export function buildExecutiveDarkViewModel(
  blocks: ReportVersionBlock[],
  options?: {
    descriptionTimeframe?: ExecutiveDarkTimeframe | null;
  }
): ExecutiveDarkViewModel {
  const parseErrors: ExecutiveDarkParseError[] = [];

  const titleBlock = blocks.find((block) => block.type === "title");
  const title = getTrimmedText(titleBlock?.data.text) || "Executive Monthly Report";

  const textBlocks = blocks
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

  const kpis = blocks
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
  const impressionsSlideData = getImpressionsSlideData(blocks);
  const generalInsightsSlideData = getGeneralInsightsSlideData(blocks);
  const viewersChart = getMetricChartData(blocks, ["viewers", "viewer", "reach", "espectadores"]);
  const impressionsChart = getMetricChartData(blocks, ["impressions", "impresiones", "views", "view", "visualizaciones"]);
  const descriptionTimeframe = options?.descriptionTimeframe || null;
  const titleBlockTimeframe = getTitleBlockTimeframe(blocks);
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
    parseErrors,
  };
}
