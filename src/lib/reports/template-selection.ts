"use client";

export type ReportTemplateId = "executive" | "modern";

const REPORT_TEMPLATE_SELECTIONS_KEY = "reportTemplateSelections";

function normalizeTemplateId(value: string | null | undefined): ReportTemplateId {
  return value === "modern" ? "modern" : "executive";
}

function readSelections() {
  if (typeof window === "undefined") {
    return {} as Record<string, ReportTemplateId>;
  }

  try {
    const raw = window.localStorage.getItem(REPORT_TEMPLATE_SELECTIONS_KEY);

    if (!raw) {
      return {} as Record<string, ReportTemplateId>;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;

    return Object.fromEntries(
      Object.entries(parsed).map(([reportId, templateId]) => [
        reportId,
        normalizeTemplateId(templateId),
      ])
    );
  } catch {
    return {} as Record<string, ReportTemplateId>;
  }
}

function writeSelections(selections: Record<string, ReportTemplateId>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    REPORT_TEMPLATE_SELECTIONS_KEY,
    JSON.stringify(selections)
  );
}

export function getReportTemplateLabel(templateId: ReportTemplateId) {
  return templateId === "modern" ? "Moderno" : "Ejecutivo";
}

export function getStoredReportTemplateSelection(reportId: string) {
  if (!reportId) {
    return "executive" satisfies ReportTemplateId;
  }

  return readSelections()[reportId] || "executive";
}

export function saveReportTemplateSelection(
  reportId: string,
  templateId: ReportTemplateId
) {
  if (!reportId) {
    return;
  }

  const selections = readSelections();
  selections[reportId] = normalizeTemplateId(templateId);
  writeSelections(selections);
}

export function resolveReportTemplateSelection(
  templateId: string | null | undefined
): ReportTemplateId {
  return normalizeTemplateId(templateId);
}
