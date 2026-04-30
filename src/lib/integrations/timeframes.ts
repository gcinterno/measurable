export type MetaTimeframeOptionId =
  | "last_7_days"
  | "last_14_days"
  | "last_28_days"
  | "this_month"
  | "last_month"
  | "custom";

export type MetaTimeframeSelection = {
  key: MetaTimeframeOptionId;
  label: string;
  preset: MetaTimeframeOptionId;
  startDate?: string;
  endDate?: string;
  isCustom: boolean;
};

export const META_TIMEFRAME_OPTIONS = [
  {
    id: "last_7_days",
    label: "Last 7 days",
    description: "Short recent window for fast trend checks.",
  },
  {
    id: "last_14_days",
    label: "Last 14 days",
    description: "Two-week readout for recent movement.",
  },
  {
    id: "last_28_days",
    label: "Last 28 days",
    description: "Balanced period for the current Meta flow.",
  },
  {
    id: "this_month",
    label: "This month",
    description: "Month-to-date performance.",
  },
  {
    id: "last_month",
    label: "Last month",
    description: "Previous full month performance.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Choose a custom start and end date.",
  },
] as const satisfies ReadonlyArray<{
  id: MetaTimeframeOptionId;
  label: string;
  description: string;
}>;

export function isMetaTimeframeOptionId(
  value: string | null | undefined
): value is MetaTimeframeOptionId {
  return META_TIMEFRAME_OPTIONS.some((option) => option.id === value);
}

export function normalizeMetaTimeframeSelection(input: {
  preset?: string | null;
  startDate?: string;
  endDate?: string;
}): MetaTimeframeSelection {
  const key = isMetaTimeframeOptionId(input.preset)
    ? input.preset
    : "last_28_days";
  const option = META_TIMEFRAME_OPTIONS.find((item) => item.id === key);
  const isCustom = key === "custom";

  return {
    key,
    label: isCustom && input.startDate && input.endDate
      ? `${input.startDate} -> ${input.endDate}`
      : option?.label || key,
    preset: key,
    startDate: isCustom ? input.startDate : undefined,
    endDate: isCustom ? input.endDate : undefined,
    isCustom,
  };
}

export function formatMetaTimeframeLabel(input: {
  timeframe?: string;
  startDate?: string;
  endDate?: string;
}) {
  if (!input.timeframe) {
    return "Selected period";
  }

  return normalizeMetaTimeframeSelection({
    preset: input.timeframe,
    startDate: input.startDate,
    endDate: input.endDate,
  }).label;
}

function parseDateOnly(value?: string | null) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("T")[0].split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateForRange(date: Date, locale?: string) {
  const isSpanish = locale?.startsWith("es");
  const day = new Intl.DateTimeFormat(isSpanish ? "es-MX" : "en-US", {
    day: "2-digit",
  }).format(date);
  const month = new Intl.DateTimeFormat(isSpanish ? "es-MX" : "en-US", {
    month: isSpanish ? "long" : "short",
  }).format(date);
  const year = new Intl.DateTimeFormat(isSpanish ? "es-MX" : "en-US", {
    year: "numeric",
  }).format(date);

  if (isSpanish) {
    return `${day} de ${capitalize(month)} ${year}`;
  }

  return `${month} ${day}, ${year}`;
}

export function formatMetaTimeframeDateRange(input: {
  since?: string | null;
  until?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  locale?: string;
}) {
  const since = parseDateOnly(input.since || input.startDate);
  const until = parseDateOnly(input.until || input.endDate);

  if (!since || !until) {
    return "";
  }

  return `${formatDateForRange(since, input.locale)} - ${formatDateForRange(
    until,
    input.locale
  )}`;
}

export function validateMetaTimeframe(input: {
  timeframe: MetaTimeframeOptionId;
  startDate?: string;
  endDate?: string;
}) {
  if (input.timeframe !== "custom") {
    return "";
  }

  if (!input.startDate || !input.endDate) {
    return "Select both start date and end date.";
  }

  const startTime = new Date(input.startDate).getTime();
  const endTime = new Date(input.endDate).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return "Use valid dates for the custom range.";
  }

  if (startTime > endTime) {
    return "Start date must be before end date.";
  }

  return "";
}
