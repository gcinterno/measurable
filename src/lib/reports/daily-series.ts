import type { ExecutiveDarkSeriesPoint } from "@/components/reports/report-view.helpers";

type DailySeriesPoint = ExecutiveDarkSeriesPoint;
type MetricSeriesKey =
  | "reach"
  | "engagement"
  | "page_views"
  | "impressions"
  | "organic_impressions"
  | "unknown";

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
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

function normalizeDate(value: unknown) {
  const raw =
    getTrimmedString(value) ||
    getTrimmedString(getRecord(value)?.date) ||
    getTrimmedString(getRecord(value)?.label) ||
    getTrimmedString(getRecord(value)?.x);

  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeValue(value: unknown) {
  const record = getRecord(value);
  const raw =
    record?.value ??
    record?.y ??
    record?.count ??
    record?.total ??
    value;

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  const normalized = String(raw ?? "").replace(/,/g, "").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePoint(value: unknown): DailySeriesPoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const date = normalizeDate(value);
  const numericValue = normalizeValue(value);

  if (!date || numericValue === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label =
    getTrimmedString(record.label) ||
    formatShortDayLabel(date);

  return {
    date,
    label,
    value: numericValue,
  };
}

function inferMetricSeriesKey(record: Record<string, unknown>): MetricSeriesKey {
  const haystack = [
    record.metric_key,
    record.metricKey,
    record.slide_type,
    record.slideType,
    record.normalized_field,
    record.normalizedField,
    record.raw_metric_name,
    record.rawMetricName,
    Array.isArray(record.source_metrics_used)
      ? record.source_metrics_used.join(" ")
      : "",
    Array.isArray(record.sourceMetricsUsed)
      ? record.sourceMetricsUsed.join(" ")
      : "",
    record.metric_label,
    record.metricLabel,
    record.semantic_name,
    record.semanticName,
    record.key,
    record.name,
    record.title,
    record.label,
    record.source_label,
  ]
    .map((value) => getTrimmedString(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    haystack.includes("organic_impressions") ||
    haystack.includes("organic impressions") ||
    haystack.includes("organic visibility")
  ) {
    return "organic_impressions";
  }

  if (
    haystack.includes("page_views") ||
    haystack.includes("page views") ||
    haystack.includes("page_visits") ||
    haystack.includes("page visits") ||
    haystack.includes("profile_views") ||
    haystack.includes("profile views")
  ) {
    return "page_views";
  }

  if (
    haystack.includes("engagement") ||
    haystack.includes("interaction") ||
    haystack.includes("interacciones")
  ) {
    return "engagement";
  }

  if (haystack.includes("impression") || haystack.includes("impresion")) {
    return "impressions";
  }

  if (haystack.includes("reach") || haystack.includes("alcance") || haystack.includes("viewer")) {
    return "reach";
  }

  return "unknown";
}

function collectMetricSpecificSeries(
  record: Record<string, unknown>,
  metricKey: MetricSeriesKey
) {
  if (metricKey === "reach") {
    return [
      ...collectSeries(record.daily_reach, metricKey),
      ...collectSeries(record.reach_daily, metricKey),
      ...collectSeries(record.viewers_daily, metricKey),
      ...collectSeries(record.viewer_daily, metricKey),
    ];
  }

  if (metricKey === "engagement") {
    return [
      ...collectSeries(record.daily_engagement, metricKey),
      ...collectSeries(record.engagement_daily, metricKey),
      ...collectSeries(record.interactions_daily, metricKey),
      ...collectSeries(record.interaction_daily, metricKey),
    ];
  }

  if (metricKey === "page_views") {
    return [
      ...collectSeries(record.daily_page_views, metricKey),
      ...collectSeries(record.daily_page_visits, metricKey),
      ...collectSeries(record.page_views_daily, metricKey),
      ...collectSeries(record.pageViewsDaily, metricKey),
      ...collectSeries(record.page_visits_daily, metricKey),
      ...collectSeries(record.pageVisitsDaily, metricKey),
      ...collectSeries(record.profile_views_daily, metricKey),
      ...collectSeries(record.profileViewsDaily, metricKey),
      ...collectSeries(record.profile_visits_daily, metricKey),
    ];
  }

  if (metricKey === "impressions" || metricKey === "organic_impressions") {
    return [
      ...collectSeries(record.daily_organic_impressions, metricKey),
      ...collectSeries(record.organic_impressions_daily, metricKey),
      ...collectSeries(record.dailyOrganicImpressions, metricKey),
      ...collectSeries(record.daily_impressions, metricKey),
      ...collectSeries(record.impressions_daily, metricKey),
    ];
  }

  return [];
}

function collectSeries(value: unknown, metricHint: MetricSeriesKey = "unknown"): DailySeriesPoint[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const point = normalizePoint(entry);

      if (point) {
        return [point];
      }

      const record = getRecord(entry);

      return [
        ...collectSeries(record?.points, metricHint),
        ...collectSeries(record?.data, metricHint),
        ...collectSeries(record?.values, metricHint),
        ...collectSeries(record?.series, metricHint),
        ...collectSeries(record?.daily_series, metricHint),
      ];
    });
  }

  const record = getRecord(value);

  if (!record) {
    return [];
  }

  const metricKey =
    metricHint !== "unknown" ? metricHint : inferMetricSeriesKey(record);

  return [
    ...collectSeries(record.points, metricKey),
    ...collectSeries(record.data, metricKey),
    ...collectSeries(record.values, metricKey),
    ...collectSeries(record.series, metricKey),
    ...collectSeries(record.chart, metricKey),
    ...collectSeries(record.chart_data, metricKey),
    ...collectSeries(record.dailyChart, metricKey),
    ...collectSeries(record.daily_series, metricKey),
    ...collectSeries(record.dailySeries, metricKey),
    ...collectSeries(record.daily, metricKey),
    ...collectMetricSpecificSeries(record, metricKey),
  ];
}

export function normalizeDailySeries(slide: unknown): DailySeriesPoint[] {
  const record = getRecord(slide);

  if (!record) {
    return [];
  }

  const metricRecord = getRecord(record.metric);
  const dataRecord = getRecord(record.data);
  const metricKey = inferMetricSeriesKey(record);
  const blocksValue = Array.isArray(record.blocks)
    ? record.blocks.flatMap((block) => {
        const blockRecord = getRecord(block);
        return [
          ...collectSeries(blockRecord?.daily_series, metricKey),
          ...collectSeries(blockRecord?.chart_data, metricKey),
          ...collectSeries(blockRecord?.dailyChart, metricKey),
          ...collectSeries(getRecord(blockRecord?.data)?.daily_series, metricKey),
          ...collectSeries(blockRecord, metricKey),
        ];
      })
    : [];

  const points = [
    ...collectSeries(record.daily_series, metricKey),
    ...collectSeries(record.chart_data, metricKey),
    ...collectSeries(record.dailyChart, metricKey),
    ...collectSeries(metricRecord?.daily_series, metricKey),
    ...collectSeries(dataRecord?.daily_series, metricKey),
    ...blocksValue,
    ...collectSeries(record, metricKey),
  ];

  const deduped = new Map<string, DailySeriesPoint>();

  points.forEach((point) => {
    const key = `${point.date}:${point.label}`;

    if (!deduped.has(key)) {
      deduped.set(key, point);
    }
  });

  return [...deduped.values()].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
  );
}
