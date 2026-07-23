import type {
  ExecutiveDarkSeriesPoint,
  ExecutiveDarkViewModel,
} from "@/components/reports/report-view.helpers";
import type {
  CoverSlideModel,
  ImpressionsSlideModel,
  ReachSlideCardModel,
  ReachSlideModel,
  SummarySlideModel,
} from "@/components/reports/slides/types";
import { formatDisplayNumber, formatNumber } from "@/lib/formatters";
import { getIntegrationReportContext } from "@/lib/integrations/session";
import type { Report, ReportDetail } from "@/types/report";

const DEFAULT_AI_INSIGHT_FALLBACK = "Not available right now.";
const PAGE_VIEWS_UNAVAILABLE_MESSAGE =
  "Not available right now with the current Meta permissions.";

export type DefaultTemplateContext = {
  reportId?: string;
  report: ExecutiveDarkViewModel;
  branding: {
    logoUrl: string | null;
    brandName: string;
    workspaceId?: string | null;
    source?: string;
    watermarkEnabled?: boolean;
    watermarkLabel?: string;
    watermarkLogoLightUrl?: string | null;
    watermarkLogoDarkUrl?: string | null;
  };
  coverSourceName: string;
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

const REACH_UNAVAILABLE_MESSAGE =
  "Meta did not return reach for the selected period.";
const UNIQUE_REACH_UNAVAILABLE_MESSAGE =
  "Meta did not return unique reach for the selected period.";
const REACH_AND_IMPRESSIONS_UNAVAILABLE_MESSAGE =
  "Meta did not return reach or impressions for the selected period.";
const IMPRESSIONS_VISIBILITY_INSIGHT =
  "Meta did not return unique reach for the selected period, so the report displays impressions as the available visibility metric.";
const IMPRESSIONS_UNAVAILABLE_MESSAGE =
  "Meta did not return impressions for the selected period.";

function formatMetricSummaryValue(metric: unknown): string {
  if (metric === null || metric === undefined || metric === "") {
    return "N/A";
  }

  if (typeof metric === "string" || typeof metric === "number") {
    const normalized = String(metric).trim();
    return normalized || "N/A";
  }

  if (typeof metric !== "object") {
    return "N/A";
  }

  const record = metric as Record<string, unknown>;

  if (record.is_available === false || record.isAvailable === false) {
    return "N/A";
  }

  const candidates = [
    record.formatted_value,
    record.formattedValue,
    record.value,
    record.total,
    record.amount,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return formatDisplayNumber(candidate);
    }

    if (candidate && typeof candidate === "object") {
      const nested = formatMetricSummaryValue(candidate);

      if (nested !== "N/A") {
        return nested;
      }
    }
  }

  return "N/A";
}

function isMetricSummaryUnavailable(metric: unknown) {
  return Boolean(
    metric &&
      typeof metric === "object" &&
      ((metric as Record<string, unknown>).is_available === false ||
        (metric as Record<string, unknown>).isAvailable === false)
  );
}

function formatMetricSummaryDescription(metric: unknown, fallback: string): string {
  if (!metric || typeof metric !== "object") {
    return fallback;
  }

  const record = metric as Record<string, unknown>;
  const description =
    (typeof record.description === "string" && record.description.trim()) ||
    (typeof record.unavailable_message === "string" && record.unavailable_message.trim()) ||
    (typeof record.unavailableMessage === "string" && record.unavailableMessage.trim()) ||
    "";

  return description || fallback;
}

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

type CoverSourceReportInput =
  | Pick<
      Report,
      | "integrationMetadata"
      | "reportSources"
      | "sourceSummary"
      | "title"
      | "rawIntegrationHints"
      | "integrationType"
      | "integrationLabel"
      | "sourceName"
      | "channel"
      | "brandName"
      | "logoUrl"
      | "periodStart"
      | "periodEnd"
      | "template"
      | "reportTitle"
      | "workspaceId"
    >
  | Pick<
      ReportDetail,
      | "integrationMetadata"
      | "reportSources"
      | "sourceSummary"
      | "title"
      | "rawIntegrationHints"
      | "integrationType"
      | "integrationLabel"
      | "sourceName"
      | "channel"
      | "brandName"
      | "logoUrl"
      | "periodStart"
      | "periodEnd"
      | "template"
      | "reportTitle"
      | "workspaceId"
    >
  | null
  | undefined;

function getFirstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function resolveReportCoverSourceName(
  report: CoverSourceReportInput,
  fallbackBrandName?: string | null
) {
  const metadata = report?.integrationMetadata;
  const primarySourceLabel = report?.reportSources?.find((source) => source.label?.trim())?.label;
  const storedPageName = getIntegrationReportContext()?.pageName?.trim();
  const flatSourceName =
    report && "sourceName" in report && typeof report.sourceName === "string"
      ? report.sourceName.trim()
      : "";
  const flatIntegrationType =
    report && "integrationType" in report && typeof report.integrationType === "string"
      ? report.integrationType.trim().toLowerCase()
      : "";
  const titleCandidate = report?.title || report?.reportTitle || "";
  const titleFallback = titleCandidate ? getCoverBrandName(titleCandidate) : "";
  const isStandaloneInstagram =
    flatIntegrationType.includes("instagram_business_login") ||
    metadata?.integrationType?.toLowerCase().includes("instagram_business_login");
  const safeTitleFallback =
    isStandaloneInstagram && titleFallback.toLowerCase().includes("facebook")
      ? "Instagram Business Report"
      : titleFallback;

  return (
    getFirstNonEmpty([
      flatSourceName,
      metadata?.sourceName,
      metadata?.sourceHandle,
      primarySourceLabel,
      report?.sourceSummary,
      storedPageName,
      safeTitleFallback,
      fallbackBrandName,
    ]) || "Marketing Report"
  );
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

export function resolveReportCoverIntegrationLabel(report?: CoverSourceReportInput) {
  const metadata = report?.integrationMetadata;
  const hints = report?.rawIntegrationHints;
  const flatIntegrationLabel =
    report && "integrationLabel" in report && typeof report.integrationLabel === "string"
      ? report.integrationLabel.trim()
      : "";
  const flatIntegrationType =
    report && "integrationType" in report && typeof report.integrationType === "string"
      ? report.integrationType.trim()
      : "";
  const flatChannel =
    report && "channel" in report && typeof report.channel === "string" ? report.channel.trim() : "";
  const haystacks = [
    flatIntegrationLabel,
    flatIntegrationType,
    flatChannel,
    metadata?.channel,
    metadata?.socialNetwork,
    metadata?.integrationType,
    metadata?.integrationDisplayName,
    hints?.channel,
    hints?.socialNetwork,
    hints?.integrationType,
    hints?.integrationDisplayName,
    hints?.sourceType,
    hints?.integration,
    hints?.type,
    hints?.reportType,
    report?.sourceSummary,
    report?.title,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());

  const hasFacebook = haystacks.some(
    (value) =>
      value.includes("facebook_pages") ||
      value.includes("facebook page") ||
      value.includes("facebook")
  );
  const hasInstagram = haystacks.some(
    (value) =>
      value.includes("instagram_business_login") ||
      value.includes("instagram_business") ||
      value.includes("instagram business") ||
      value.includes("instagram")
  );
  const hasStandaloneInstagram = haystacks.some((value) =>
    value.includes("instagram_business_login")
  );
  const hasCsv = haystacks.some((value) => value.includes("csv"));
  const hasUpload = haystacks.some((value) => value.includes("upload"));

  if (hasStandaloneInstagram) {
    return "Instagram Business";
  }

  if (hasFacebook && hasInstagram) {
    return "Facebook Pages";
  }

  if (hasFacebook) {
    return "Facebook Pages";
  }

  if (hasInstagram) {
    return "Instagram Business";
  }

  if (hasCsv) {
    return "CSV";
  }

  if (hasUpload) {
    return "Upload";
  }

  return getCoverIntegrationLabel();
}

function getReachInsight(report: ExecutiveDarkViewModel) {
  return (
    report.reachInsightText ||
    report.premiumInsight ||
    report.primaryNarrative ||
    DEFAULT_AI_INSIGHT_FALLBACK
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

function isFacebookPagesContext(context: DefaultTemplateContext) {
  return context.coverIntegrationLabel.trim().toLowerCase() === "facebook pages";
}

function isInstagramBusinessContext(context: DefaultTemplateContext) {
  return context.coverIntegrationLabel.trim().toLowerCase() === "instagram business";
}

function hasMetricValue(value: unknown) {
  return formatMetricSummaryValue(value) !== "N/A";
}

function buildSummaryVisibilityNote(context: DefaultTemplateContext) {
  return `Meta did not return unique reach for the selected period. ${context.impressionsDisplayLabel} are shown as the available visibility metric.`;
}

function appendVisibilityNote(text: string, note: string) {
  return text.toLowerCase().includes("impression") ? text : `${text} ${note}`;
}

function getVisibilityMetricState(context: DefaultTemplateContext) {
  const hasReach = hasMetricValue(context.report.viewersTotalValue);
  const hasImpressions = !context.report.impressionsUnavailable && hasMetricValue(context.report.impressionsTotalValue);

  return {
    hasReach,
    hasImpressions,
    usesImpressionsFallback: !hasReach && hasImpressions,
    hasNoVisibilityMetric: !hasReach && !hasImpressions,
  };
}

function buildMetricSlideModel(input: {
  metricKey: string;
  branding: DefaultTemplateContext["branding"];
  sourceCaption: string;
  metricTitle: string;
  totalLabel: string;
  totalValue: string;
  isAvailable: boolean;
  unavailableMessage?: string;
  insightText: string;
  chartPoints: ExecutiveDarkSeriesPoint[];
  chartAvailable: boolean;
  chartMetricLabel: string;
  highestDayPoint: { date: string; value: number; label?: string } | null;
  lowestDayPoint: { date: string; value: number; label?: string } | null;
}): ReachSlideModel {
  return {
    metricKey: input.metricKey,
    branding: input.branding,
    metricEyebrow: "Metric",
    metricTitle: input.metricTitle,
    sourceCaption: input.sourceCaption,
    totalLabel: input.totalLabel,
    totalValue: input.totalValue,
    isAvailable: input.isAvailable,
    unavailableMessage: input.unavailableMessage,
    insightText: input.insightText,
    chartPoints: input.chartPoints,
    chartAvailable: input.chartAvailable,
    chartMetricLabel: input.chartMetricLabel,
    highestDayCard: buildReachCard(
      "Highest day",
      input.highestDayPoint,
      input.chartMetricLabel
    ),
    lowestDayCard: buildReachCard(
      "Lowest day",
      input.lowestDayPoint,
      input.chartMetricLabel
    ),
  };
}

function normalizeSummaryMetricValue(metric: unknown): string {
  const direct = formatMetricSummaryValue(metric);
  if (direct !== "N/A") {
    return direct;
  }

  if (!metric || typeof metric !== "object") {
    return "N/A";
  }

  const record = metric as Record<string, unknown>;
  const candidates = [
    record.formatted_total,
    record.formattedTotal,
    record.post_title,
    record.postTitle,
    record.title,
    record.name,
    record.caption,
    record.text,
    record.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "N/A";
}

function buildSummaryMetricCard(
  label: string,
  metric: unknown,
  fallbackValue: unknown,
  fallbackMeta: string,
  unavailableMeta?: string
) {
  const metricUnavailable = isMetricSummaryUnavailable(metric);
  const metricValue = normalizeSummaryMetricValue(metric);
  const fallbackFormattedValue = normalizeSummaryMetricValue(fallbackValue);
  const value = metricUnavailable
    ? "N/A"
    : metricValue !== "N/A"
      ? metricValue
      : fallbackFormattedValue;

  return {
    label,
    value: value !== "N/A" ? value : "N/A",
    meta:
      value === "N/A"
        ? unavailableMeta || formatMetricSummaryDescription(metric, fallbackMeta)
        : formatMetricSummaryDescription(metric, fallbackMeta),
  };
}

function buildReachCard(
  label: string,
  point: { date: string; value: number; label?: string } | null,
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

export function buildDefaultTemplateContext(
  report: ExecutiveDarkViewModel,
  branding: {
    logoUrl: string | null;
    brandName: string;
    workspaceId?: string | null;
    source?: string;
    watermarkEnabled?: boolean;
    watermarkLabel?: string;
    watermarkLogoLightUrl?: string | null;
    watermarkLogoDarkUrl?: string | null;
  },
  reportId?: string,
  coverSourceName?: string,
  coverIntegrationLabel?: string
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
    reportId,
    report,
    branding,
    coverSourceName:
      coverSourceName || getCoverBrandName(report.title) || branding.brandName || "Marketing Report",
    coverIntegrationLabel: coverIntegrationLabel || getCoverIntegrationLabel(),
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
    reportHeading: "Marketing Report",
    reportTitle: context.coverSourceName,
    subtitle: `${context.coverIntegrationLabel} Report - Summary & Insights`,
    meta: context.analyzedPeriod,
    branding: context.branding,
  };
}

export function buildReachSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  if (isFacebookPagesContext(context)) {
    const hasReach = hasMetricValue(context.report.viewersTotalValue);
    const extremes = getReachExtremes(context.report.viewersDailyPoints);

    return buildMetricSlideModel({
      metricKey: "reach",
      branding: context.branding,
      sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
      metricTitle: "REACH / ALCANCE",
      totalLabel: "TOTAL REACH",
      totalValue: hasReach ? formatDisplayNumber(context.report.viewersTotalValue) : "N/A",
      isAvailable: hasReach,
      unavailableMessage: hasReach ? undefined : UNIQUE_REACH_UNAVAILABLE_MESSAGE,
      insightText: hasReach
        ? context.reachInsight || DEFAULT_AI_INSIGHT_FALLBACK
        : UNIQUE_REACH_UNAVAILABLE_MESSAGE,
      chartPoints: hasReach ? context.report.viewersDailyPoints : [],
      chartAvailable:
        hasReach &&
        (context.report.viewersDailyAvailable || context.report.viewersDailyPoints.length > 0),
      chartMetricLabel: context.report.viewersLabel || "Reach",
      highestDayPoint: hasReach
        ? context.report.viewersDailyPoints.length > 0
          ? extremes.highest
          : null
        : null,
      lowestDayPoint: hasReach
        ? context.report.viewersDailyPoints.length > 0
          ? extremes.lowest
          : null
        : null,
    });
  }

  const visibilityState = getVisibilityMetricState(context);
  const usesImpressionsFallback = visibilityState.usesImpressionsFallback;
  const hasNoVisibilityMetric = visibilityState.hasNoVisibilityMetric;
  const chartPoints = usesImpressionsFallback
    ? context.impressionsDailyPoints
    : context.report.viewersDailyPoints;
  const chartMetricLabel = usesImpressionsFallback
    ? "Impressions"
    : context.reachDisplayLabel;
  const totalValue = usesImpressionsFallback
    ? formatMetricSummaryValue(context.report.impressionsTotalValue)
    : formatDisplayNumber(context.report.viewersTotalValue);
  const extremes = getReachExtremes(chartPoints);
  const insightText = hasNoVisibilityMetric
    ? REACH_AND_IMPRESSIONS_UNAVAILABLE_MESSAGE
    : usesImpressionsFallback
      ? IMPRESSIONS_VISIBILITY_INSIGHT
      : context.reachInsight || DEFAULT_AI_INSIGHT_FALLBACK;

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric render]", {
      reportId: context.reportId || null,
      slideNumber: "02",
      metricKey: usesImpressionsFallback ? "impressions" : "reach",
      formattedTotal: totalValue,
      isAvailable: !hasNoVisibilityMetric,
      unavailableReason: hasNoVisibilityMetric ? "missing_visibility_metric" : "",
      unavailableMessage: hasNoVisibilityMetric
        ? REACH_AND_IMPRESSIONS_UNAVAILABLE_MESSAGE
        : usesImpressionsFallback
          ? REACH_UNAVAILABLE_MESSAGE
          : "",
      dailySeriesLength: chartPoints.length,
      firstDate: chartPoints[0]?.date,
      lastDate: chartPoints.at(-1)?.date,
    });
  }

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
    metricKey: usesImpressionsFallback ? "impressions" : "reach",
    branding: context.branding,
    metricEyebrow: "Metric",
    metricTitle: usesImpressionsFallback
      ? "VISIBILITY / IMPRESSIONS"
      : `${context.reachDisplayLabel} / REACH`,
    sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
    totalLabel: usesImpressionsFallback
      ? "TOTAL IMPRESSIONS"
      : "TOTAL REACH",
    totalValue,
    isAvailable: !hasNoVisibilityMetric,
    unavailableMessage: hasNoVisibilityMetric
      ? REACH_AND_IMPRESSIONS_UNAVAILABLE_MESSAGE
      : undefined,
    insightText,
    chartPoints,
    chartAvailable:
      !hasNoVisibilityMetric &&
      (usesImpressionsFallback
        ? context.report.impressionsDailyAvailable || chartPoints.length > 0
        : context.report.viewersDailyAvailable || chartPoints.length > 0),
    chartMetricLabel,
    highestDayCard: buildReachCard(
      "Highest day",
      extremes.highest,
      chartMetricLabel
    ),
    lowestDayCard: buildReachCard(
      "Lowest day",
      extremes.lowest,
      chartMetricLabel
    ),
  };
}

export function buildImpressionsSlideModel(
  context: DefaultTemplateContext
): ImpressionsSlideModel {
  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric render]", {
      reportId: context.reportId || null,
      slideNumber: "03",
      metricKey: "impressions",
      formattedTotal: context.report.impressionsUnavailable
        ? "N/A"
        : formatMetricSummaryValue(context.report.impressionsTotalValue),
      isAvailable: !context.report.impressionsUnavailable,
      unavailableReason: context.report.impressionsUnavailableReason,
      unavailableMessage: context.report.impressionsUnavailableMessage,
      dailySeriesLength: context.impressionsDailyPoints.length,
      firstDate: context.impressionsDailyPoints[0]?.date,
      lastDate: context.impressionsDailyPoints.at(-1)?.date,
    });
  }

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
    formatted_total:
      context.report.impressionsUnavailable
        ? "N/A"
        : formatMetricSummaryValue(context.report.impressionsTotalValue),
    is_available: !context.report.impressionsUnavailable,
    unavailable_reason: context.report.impressionsUnavailableReason,
    unavailable_message: context.report.impressionsUnavailableMessage,
    branding: context.branding,
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
      context.report.impressionsUnavailable,
    source_metric_name: context.report.impressionsLabel,
    timeframe_source: context.report.timeframeSource,
    source_caption: buildSourceCaption(context.coverIntegrationLabel),
  };
}

export function buildEngagementSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  const extremes = getReachExtremes(context.report.engagementDailyPoints);

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric render]", {
      reportId: context.reportId || null,
      slideNumber: "03",
      metricKey: "engagement",
      formattedTotal: context.report.engagementUnavailable
        ? "N/A"
        : formatMetricSummaryValue(context.report.engagementTotalValue),
      isAvailable: !context.report.engagementUnavailable,
      unavailableReason: context.report.engagementUnavailableReason,
      unavailableMessage: context.report.engagementUnavailableMessage,
      dailySeriesLength: context.report.engagementDailyPoints.length,
      firstDate: context.report.engagementDailyPoints[0]?.date,
      lastDate: context.report.engagementDailyPoints.at(-1)?.date,
    });
  }

  return {
    metricKey: "engagement",
    branding: context.branding,
    metricEyebrow: "Metric",
    metricTitle: "ENGAGEMENT",
    sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
    totalLabel: "Total engagement",
    totalValue:
      context.report.engagementUnavailable
        ? "N/A"
        : formatMetricSummaryValue(context.report.engagementTotalValue),
    isAvailable: !context.report.engagementUnavailable,
    unavailableMessage: context.report.engagementUnavailableMessage,
    insightText: context.report.engagementUnavailable
      ? context.report.engagementUnavailableMessage || DEFAULT_AI_INSIGHT_FALLBACK
      : context.report.engagementInsightText || DEFAULT_AI_INSIGHT_FALLBACK,
    chartPoints: context.report.engagementDailyPoints,
    chartAvailable:
      !context.report.engagementUnavailable &&
      (context.report.engagementDailyAvailable ||
        context.report.engagementDailyPoints.length > 0),
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

export function buildThirdMetricSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  if (isFacebookPagesContext(context)) {
    const isAvailable =
      !context.report.impressionsUnavailable &&
      hasMetricValue(context.report.impressionsTotalValue);
    const extremes = getReachExtremes(context.impressionsDailyPoints);

    return buildMetricSlideModel({
      metricKey: "impressions",
      branding: context.branding,
      sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
      metricTitle: "IMPRESSIONS / IMPRESIONES",
      totalLabel: "TOTAL IMPRESSIONS",
      totalValue: isAvailable
        ? formatMetricSummaryValue(context.report.impressionsTotalValue)
        : "N/A",
      isAvailable,
      unavailableMessage: isAvailable ? undefined : IMPRESSIONS_UNAVAILABLE_MESSAGE,
      insightText: isAvailable
        ? context.report.impressionsInsightText || DEFAULT_AI_INSIGHT_FALLBACK
        : IMPRESSIONS_UNAVAILABLE_MESSAGE,
      chartPoints: isAvailable ? context.impressionsDailyPoints : [],
      chartAvailable:
        isAvailable &&
        (context.report.impressionsDailyAvailable || context.impressionsDailyPoints.length > 0),
      chartMetricLabel: context.report.impressionsLabel || "Impressions",
      highestDayPoint: isAvailable
        ? context.report.impressionsHighestDay || extremes.highest
        : null,
      lowestDayPoint: isAvailable
        ? context.report.impressionsLowestDay || extremes.lowest
        : null,
    });
  }

  return buildEngagementSlideModel(context);
}

export function buildPageViewsSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  const extremes = getReachExtremes(context.report.pageViewsDailyPoints);
  const isInstagramBusiness = isInstagramBusinessContext(context);

  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide metric render]", {
      reportId: context.reportId || null,
      slideNumber: "04",
      metricKey: "page_views",
      formattedTotal: context.report.pageViewsUnavailable
        ? "N/A"
        : formatMetricSummaryValue(context.report.pageViewsTotalValue),
      isAvailable: !context.report.pageViewsUnavailable,
      unavailableReason: context.report.pageViewsUnavailableReason,
      unavailableMessage: context.report.pageViewsUnavailableMessage,
      dailySeriesLength: context.report.pageViewsDailyPoints.length,
      firstDate: context.report.pageViewsDailyPoints[0]?.date,
      lastDate: context.report.pageViewsDailyPoints.at(-1)?.date,
    });
  }

  return {
    metricKey: isInstagramBusiness ? "profile_activity" : "page_views",
    branding: context.branding,
    metricEyebrow: "Metric",
    metricTitle: isInstagramBusiness ? "PROFILE ACTIVITY" : "PAGE VIEWS",
    sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
    totalLabel: isInstagramBusiness ? "Profile activity" : "Total page views",
    totalValue: context.report.pageViewsUnavailable
      ? "N/A"
      : formatMetricSummaryValue(context.report.pageViewsTotalValue),
    isAvailable: !context.report.pageViewsUnavailable,
    unavailableMessage:
      context.report.pageViewsUnavailableMessage || PAGE_VIEWS_UNAVAILABLE_MESSAGE,
    insightText: context.report.pageViewsUnavailable
      ? context.report.pageViewsUnavailableMessage || PAGE_VIEWS_UNAVAILABLE_MESSAGE
      : context.report.pageViewsInsightText || DEFAULT_AI_INSIGHT_FALLBACK,
    chartPoints: context.report.pageViewsDailyPoints,
    chartAvailable:
      !context.report.pageViewsUnavailable &&
      (context.report.pageViewsDailyAvailable ||
        context.report.pageViewsDailyPoints.length > 0),
    chartMetricLabel:
      context.report.pageViewsLabel ||
      (isInstagramBusiness ? "Profile activity" : "Page views"),
    highestDayCard: buildReachCard(
      "Highest day",
      context.report.pageViewsHighestDay || extremes.highest,
      context.report.pageViewsLabel ||
        (isInstagramBusiness ? "Profile activity" : "Page views")
    ),
    lowestDayCard: buildReachCard(
      "Lowest day",
      context.report.pageViewsLowestDay || extremes.lowest,
      context.report.pageViewsLabel ||
        (isInstagramBusiness ? "Profile activity" : "Page views")
    ),
  };
}

export function buildFourthMetricSlideModel(
  context: DefaultTemplateContext
): ReachSlideModel {
  if (isFacebookPagesContext(context)) {
    const extremes = getReachExtremes(context.report.engagementDailyPoints);

    return buildMetricSlideModel({
      metricKey: "engagement",
      branding: context.branding,
      sourceCaption: buildSourceCaption(context.coverIntegrationLabel),
      metricTitle: "ENGAGEMENT",
      totalLabel: "TOTAL ENGAGEMENT",
      totalValue: context.report.engagementUnavailable
        ? "N/A"
        : formatMetricSummaryValue(context.report.engagementTotalValue),
      isAvailable: !context.report.engagementUnavailable,
      unavailableMessage: context.report.engagementUnavailableMessage,
      insightText: context.report.engagementUnavailable
        ? context.report.engagementUnavailableMessage || DEFAULT_AI_INSIGHT_FALLBACK
        : context.report.engagementInsightText || DEFAULT_AI_INSIGHT_FALLBACK,
      chartPoints: context.report.engagementDailyPoints,
      chartAvailable:
        !context.report.engagementUnavailable &&
        (context.report.engagementDailyAvailable ||
          context.report.engagementDailyPoints.length > 0),
      chartMetricLabel: context.report.engagementLabel || "Engagement",
      highestDayPoint: context.report.engagementHighestDay || extremes.highest,
      lowestDayPoint: context.report.engagementLowestDay || extremes.lowest,
    });
  }

  return buildPageViewsSlideModel(context);
}

export function buildSummarySlideModel(
  context: DefaultTemplateContext
): SummarySlideModel {
  if (process.env.NODE_ENV === "development") {
    console.log("[5-slide summary render]", {
      metricsSummary: context.report.finalSummaryMetrics,
      reach: context.report.finalSummaryMetrics?.reach,
      engagement: context.report.finalSummaryMetrics?.engagement,
      followers: context.report.finalSummaryMetrics?.followers,
      pageViews:
        context.report.finalSummaryMetrics?.page_views ||
        context.report.finalSummaryMetrics?.page_visits ||
        context.report.finalSummaryMetrics?.profile_views,
    });
  }

  const isFacebookPages = isFacebookPagesContext(context);
  const isInstagramBusiness = isInstagramBusinessContext(context);
  const visibilityState = getVisibilityMetricState(context);
  const usesImpressionsFallback = visibilityState.usesImpressionsFallback;
  const reachValue = formatMetricSummaryValue(context.report.finalSummaryMetrics?.reach);
  const impressionsValue = formatMetricSummaryValue(context.report.impressionsTotalValue);
  const summaryEngagementUnavailable =
    context.report.engagementUnavailable ||
    isMetricSummaryUnavailable(context.report.finalSummaryMetrics?.engagement);
  const summaryFollowersUnavailable = isMetricSummaryUnavailable(
    context.report.finalSummaryMetrics?.followers
  );
  const summaryPageViewsMetric =
    context.report.finalSummaryMetrics?.page_views ||
    context.report.finalSummaryMetrics?.page_visits ||
    context.report.finalSummaryMetrics?.profile_views;
  const summaryPageViewsUnavailable =
    context.report.pageViewsUnavailable ||
    isMetricSummaryUnavailable(summaryPageViewsMetric);
  const engagementValue = summaryEngagementUnavailable
    ? "N/A"
    : formatMetricSummaryValue(context.report.finalSummaryMetrics?.engagement);
  const followersValue = summaryFollowersUnavailable
    ? "N/A"
    : formatMetricSummaryValue(context.report.finalSummaryMetrics?.followers);
  const pageViewsValue = summaryPageViewsUnavailable
    ? "N/A"
    : formatMetricSummaryValue(summaryPageViewsMetric);
  const aiSummaryBase = context.report.finalSummaryAiText || DEFAULT_AI_INSIGHT_FALLBACK;
  const recommendationBase =
    context.report.finalRecommendationText || DEFAULT_AI_INSIGHT_FALLBACK;
  const summaryMetricsRecord = context.report.finalSummaryMetrics || {};
  const hasReachMetric = hasMetricValue(context.report.viewersTotalValue);
  const facebookSummaryMetrics = isFacebookPages
    ? [
        buildSummaryMetricCard(
          "Reach",
          summaryMetricsRecord.reach,
          context.report.viewersTotalValue,
          context.report.viewersLabel || "Total reach in period",
          UNIQUE_REACH_UNAVAILABLE_MESSAGE
        ),
        buildSummaryMetricCard(
          "Impressions",
          summaryMetricsRecord.impressions,
          context.report.impressionsTotalValue,
          context.report.impressionsLabel || "Total impressions in period",
          IMPRESSIONS_UNAVAILABLE_MESSAGE
        ),
        buildSummaryMetricCard(
          "Engagement",
          summaryMetricsRecord.engagement,
          context.report.engagementTotalValue,
          context.report.engagementLabel || "Total engagement in period",
          context.report.engagementUnavailableMessage
        ),
        buildSummaryMetricCard(
          "Page Views",
          summaryPageViewsMetric,
          context.report.pageViewsTotalValue,
          context.report.pageViewsLabel || "Total page views in period",
          "Meta did not return page views for the selected period."
        ),
        buildSummaryMetricCard(
          "Followers",
          summaryMetricsRecord.followers,
          context.report.followersTotalValue,
          "Total followers in period",
          "Meta did not return followers for the selected period."
        ),
        ...([
          ["Reactions", summaryMetricsRecord.reactions_total ?? summaryMetricsRecord.reactions, "Reactions from analyzed posts"],
          ["Comments", summaryMetricsRecord.comments_total ?? summaryMetricsRecord.comments, "Comments from analyzed posts"],
          ["Shares", summaryMetricsRecord.shares_total ?? summaryMetricsRecord.shares, "Shares from analyzed posts"],
          ["Posts Analyzed", summaryMetricsRecord.posts_analyzed_count ?? summaryMetricsRecord.posts_analyzed, "Posts analyzed in the selected period"],
          ["Top Post", summaryMetricsRecord.top_post_by_engagement, "Top post by engagement"],
        ] as Array<[string, unknown, string]>)
          .map(([label, metric, meta]) =>
            buildSummaryMetricCard(label, metric, metric, meta)
          )
          .filter((metric) => metric.value !== "N/A"),
      ]
    : null;

  return {
    title: "Final Summary",
    branding: context.branding,
    aiSummary: isFacebookPages && !hasReachMetric
      ? appendVisibilityNote(aiSummaryBase, UNIQUE_REACH_UNAVAILABLE_MESSAGE)
      : usesImpressionsFallback
      ? appendVisibilityNote(aiSummaryBase, buildSummaryVisibilityNote(context))
      : aiSummaryBase,
    recommendation: isFacebookPages && !hasReachMetric
      ? appendVisibilityNote(recommendationBase, UNIQUE_REACH_UNAVAILABLE_MESSAGE)
      : usesImpressionsFallback
      ? appendVisibilityNote(recommendationBase, buildSummaryVisibilityNote(context))
      : recommendationBase,
    metrics: facebookSummaryMetrics || [
      {
        label: usesImpressionsFallback ? "Impressions" : "Reach",
        value: usesImpressionsFallback
          ? impressionsValue !== "N/A"
            ? impressionsValue
            : formatMetricSummaryValue(context.report.impressionsTotalValue)
          : reachValue !== "N/A"
            ? reachValue
            : formatMetricSummaryValue(context.report.viewersTotalValue),
        meta: usesImpressionsFallback
          ? "Total impressions in period"
          : formatMetricSummaryDescription(
              context.report.finalSummaryMetrics?.reach,
              context.report.viewersLabel || "Total reach in period"
            ),
      },
      {
        label: "Engagement",
        value: summaryEngagementUnavailable
          ? "N/A"
          : engagementValue !== "N/A"
          ? engagementValue
          : formatMetricSummaryValue(context.report.engagementTotalValue),
        meta: summaryEngagementUnavailable
          ? formatMetricSummaryDescription(
              context.report.finalSummaryMetrics?.engagement,
              context.report.engagementUnavailableMessage
            )
          : formatMetricSummaryDescription(
              context.report.finalSummaryMetrics?.engagement,
              context.report.engagementLabel || "Total interactions in period"
            ),
      },
      {
        label: "Followers",
        value: summaryFollowersUnavailable
          ? "N/A"
          : followersValue !== "N/A"
          ? followersValue
          : formatMetricSummaryValue(context.report.followersTotalValue),
        meta: summaryFollowersUnavailable
          ? formatMetricSummaryDescription(
              context.report.finalSummaryMetrics?.followers,
              "Follower data is not available for this period."
            )
          : formatMetricSummaryDescription(
              context.report.finalSummaryMetrics?.followers,
              "Total followers in period"
            ),
      },
      {
        label: isInstagramBusiness ? "Profile Activity" : "Page Views",
        value: summaryPageViewsUnavailable
          ? "N/A"
          : pageViewsValue !== "N/A"
          ? pageViewsValue
          : formatMetricSummaryValue(context.report.pageViewsTotalValue),
        meta: summaryPageViewsUnavailable
          ? formatMetricSummaryDescription(
              summaryPageViewsMetric,
              context.report.pageViewsUnavailableMessage ||
                (isInstagramBusiness
                  ? "Profile activity is not available for this period."
                  : PAGE_VIEWS_UNAVAILABLE_MESSAGE)
            )
          : formatMetricSummaryDescription(
              summaryPageViewsMetric,
              context.report.pageViewsLabel ||
                (isInstagramBusiness
                  ? "Profile activity in period"
                  : "Total page views in period")
            ),
      },
    ],
  };
}
