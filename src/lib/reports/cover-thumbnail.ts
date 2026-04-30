import { getIntegrationReportContext } from "@/lib/integrations/session";
import type { AppLanguage } from "@/lib/store/preferences-store";
import type { ReportDescriptionTimeframe } from "@/types/report";

function normalizeReportTitle(title: string) {
  return title.trim();
}

export function getCoverThumbnailTitle(title: string, language: AppLanguage) {
  const normalizedTitle = normalizeReportTitle(title);

  if (!normalizedTitle) {
    return language === "es" ? "Reporte de Marketing" : "Marketing Report";
  }

  if (
    /^marketing report/i.test(normalizedTitle) ||
    /^reporte de marketing/i.test(normalizedTitle)
  ) {
    return normalizedTitle;
  }

  return `${language === "es" ? "Reporte de Marketing" : "Marketing Report"} ${normalizedTitle}`.trim();
}

export function getCoverThumbnailSubtitle(language: AppLanguage) {
  const integration = getIntegrationReportContext()?.integration?.trim().toLowerCase();

  if (integration === "meta" || !integration) {
    return language === "es"
      ? "Reporte de pagina de Facebook - Resumen e insights"
      : "Facebook Page Report - Summary & Insights";
  }

  const label = integration
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return language === "es"
    ? `Reporte de ${label} - Resumen e insights`
    : `${label} Report - Summary & Insights`;
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
