import { getIntegrationReportContext } from "@/lib/integrations/session";
import type { AppLanguage } from "@/lib/store/preferences-store";
import type { ReportDescriptionTimeframe } from "@/types/report";

function normalizeReportTitle(title: string) {
  return title.trim();
}

export function getCoverThumbnailTitle(title: string, language: AppLanguage) {
  const normalizedTitle = normalizeReportTitle(title);

  if (!normalizedTitle) {
    return "Marketing Report";
  }

  if (/^marketing report/i.test(normalizedTitle)) {
    return normalizedTitle;
  }

  return `Marketing Report ${normalizedTitle}`.trim();
}

export function getCoverThumbnailSubtitle(language: AppLanguage) {
  const context = getIntegrationReportContext();
  const source = context?.source?.trim().toLowerCase() || "";
  const integration = context?.integration?.trim().toLowerCase() || "";

  if (source === "facebook_pages") {
    return "Facebook Pages Report - Summary & Insights";
  }

  if (source === "instagram_business") {
    return "Instagram Business Report - Summary & Insights";
  }

  if (integration === "meta") {
    return "Social Report - Summary & Insights";
  }

  if (!integration) {
    return "Social Report - Summary & Insights";
  }

  const label = integration
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `${label} Report - Summary & Insights`;
}

function formatThumbnailDateRange(
  since: string,
  until: string,
  language: AppLanguage
) {
  const formatter = new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startDate = new Date(`${since}T12:00:00`);
  const endDate = new Date(`${until}T12:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${since} - ${until}`;
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

export function getCoverThumbnailMeta(
  language: AppLanguage,
  timeframe?: ReportDescriptionTimeframe | null
) {
  if (timeframe?.since && timeframe.until) {
    const value = formatThumbnailDateRange(timeframe.since, timeframe.until, language);

    console.info("[MetaTimeframe][render.thumbnail]", {
      source: "report.description.timeframe",
      label: timeframe.label,
      since: timeframe.since,
      until: timeframe.until,
      value,
    });

    return value;
  }

  if (timeframe?.label) {
    console.info("[MetaTimeframe][render.thumbnail]", {
      source: "report.description.timeframe.label",
      label: timeframe.label,
      since: null,
      until: null,
      value: timeframe.label,
    });

    return timeframe.label;
  }

  console.info("[MetaTimeframe][render.thumbnail]", {
    source: "none",
    label: null,
    since: null,
    until: null,
    value: "",
  });

  return "";
}
