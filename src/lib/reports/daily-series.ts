import type { ExecutiveDarkSeriesPoint } from "@/components/reports/report-view.helpers";

type DailySeriesPoint = ExecutiveDarkSeriesPoint;

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

function collectSeries(value: unknown): DailySeriesPoint[] {
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
        ...collectSeries(record?.points),
        ...collectSeries(record?.data),
        ...collectSeries(record?.values),
        ...collectSeries(record?.series),
        ...collectSeries(record?.daily_series),
      ];
    });
  }

  const record = getRecord(value);

  if (!record) {
    return [];
  }

  return [
    ...collectSeries(record.points),
    ...collectSeries(record.data),
    ...collectSeries(record.values),
    ...collectSeries(record.series),
    ...collectSeries(record.chart),
    ...collectSeries(record.chart_data),
    ...collectSeries(record.dailyChart),
    ...collectSeries(record.daily_series),
    ...collectSeries(record.dailySeries),
    ...collectSeries(record.daily),
    ...collectSeries(record.reach_daily),
    ...collectSeries(record.impressions_daily),
    ...collectSeries(record.engagement_daily),
  ];
}

export function normalizeDailySeries(slide: unknown): DailySeriesPoint[] {
  const record = getRecord(slide);

  if (!record) {
    return [];
  }

  const metricRecord = getRecord(record.metric);
  const dataRecord = getRecord(record.data);
  const blocksValue = Array.isArray(record.blocks)
    ? record.blocks.flatMap((block) => {
        const blockRecord = getRecord(block);
        return collectSeries(blockRecord?.daily_series);
      })
    : [];

  const points = [
    ...collectSeries(record.daily_series),
    ...collectSeries(record.chart_data),
    ...collectSeries(record.dailyChart),
    ...collectSeries(metricRecord?.daily_series),
    ...collectSeries(dataRecord?.daily_series),
    ...blocksValue,
    ...collectSeries(record),
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

