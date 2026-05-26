import { MEASURABLE_BRAND_LOGO_URL } from "@/lib/branding";
import { apiUrl } from "@/lib/api/config";

export const DEFAULT_REPORT_BRAND_NAME = "Measurableapp.com Report Generator";

type BrandingInput =
  | {
      logoUrl?: string | null;
      logo_url?: string | null;
      resolved_logo_url?: string | null;
      resolvedLogoUrl?: string | null;
      brand_logo_url?: string | null;
      brandLogoUrl?: string | null;
      brandName?: string | null;
      brand_name?: string | null;
      resolved_brand_name?: string | null;
      resolvedBrandName?: string | null;
      source?: string;
      brandNameSource?: string;
      [key: string]: unknown;
    }
  | null
  | undefined;

type ReportBrandingPayload =
  | {
      id?: string | number | null;
      workspaceId?: string | number | null;
      workspace_id?: string | number | null;
      template?: string | null;
      templateId?: string | null;
      branding?: BrandingInput;
      workspace?: {
        id?: string | number | null;
        branding?: BrandingInput;
        logo_url?: string | null;
        logoUrl?: string | null;
        brand_name?: string | null;
        brandName?: string | null;
        [key: string]: unknown;
      } | null;
      report?: {
        workspaceId?: string | number | null;
        workspace_id?: string | number | null;
        id?: string | number | null;
        branding?: BrandingInput;
        brand_logo_url?: string | null;
        brandLogoUrl?: string | null;
        logo_url?: string | null;
        logoUrl?: string | null;
        brand_name?: string | null;
        brandName?: string | null;
        [key: string]: unknown;
      } | null;
      brand_logo_url?: string | null;
      brandLogoUrl?: string | null;
      logo_url?: string | null;
      logoUrl?: string | null;
      brand_name?: string | null;
      brandName?: string | null;
      [key: string]: unknown;
    }
  | null
  | undefined;

type ResolvedReportBranding = {
  logoUrl: string;
  brandName: string;
  source: string;
  brandNameSource: string;
};

export function resolveAssetUrl(
  logoUrl: string | null | undefined,
  apiBaseUrl: string,
  options?: {
    workspaceId?: string | number | null;
  }
) {
  const trimmedValue = logoUrl?.trim() || "";
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, "");

  if (!trimmedValue) {
    return null;
  }

  if (
    trimmedValue.startsWith("data:") ||
    trimmedValue.startsWith("blob:") ||
    trimmedValue.startsWith("http://") ||
    trimmedValue.startsWith("https://") ||
    trimmedValue.startsWith("//")
  ) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/")) {
    return apiUrl(trimmedValue);
  }

  const normalizedWorkspaceId =
    options?.workspaceId !== null && options?.workspaceId !== undefined
      ? String(options.workspaceId).trim()
      : "";
  const normalizedFilename = trimmedValue.replace(/^\/+/, "");

  if (/^[^/]+\.[a-z0-9]+$/i.test(normalizedFilename)) {
    if (normalizedWorkspaceId) {
      return `${normalizedApiBaseUrl}/workspace/branding/logo/${encodeURIComponent(normalizedWorkspaceId)}/${encodeURIComponent(normalizedFilename)}`;
    }

    return `${normalizedApiBaseUrl}/workspace/branding/logo/${encodeURIComponent(normalizedFilename)}`;
  }

  return `${normalizedApiBaseUrl}/${normalizedFilename}`;
}

function normalizeBrandLogoUrl(
  value: string | null | undefined,
  options?: {
    workspaceId?: string | number | null;
  }
) {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  return resolveAssetUrl(trimmedValue, apiUrl("/"), options) || "";
}

type BrandingEntity =
  | {
      branding?: BrandingInput;
      [key: string]: unknown;
    }
  | null
  | undefined;

function getFirstString(
  input: BrandingInput,
  keys: string[]
) {
  if (!input) {
    return null;
  }

  for (const key of keys) {
    const value = input[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getBrandingValue(input: BrandingInput) {
  return {
    logoUrl: getFirstString(input, [
      "resolved_logo_url",
      "resolvedLogoUrl",
      "brand_logo_url",
      "brandLogoUrl",
      "logoUrl",
      "logo_url",
    ]),
    brandName: getFirstString(input, [
      "resolved_brand_name",
      "resolvedBrandName",
      "brand_name",
      "brandName",
    ]),
    logoSource:
      getFirstString(input, ["source"]) ||
      "branding.logo_url",
    brandNameSource:
      getFirstString(input, ["brandNameSource"]) ||
      "branding.brand_name",
  };
}

function pickResolvedBranding(
  candidates: Array<{ label: string; value: BrandingInput }>,
  options?: {
    workspaceId?: string | number | null;
  }
): ResolvedReportBranding {
  const resolvedLogo =
    candidates
      .map((candidate) => ({
        label: candidate.label,
        ...getBrandingValue(candidate.value),
      }))
      .find((candidate) => candidate.logoUrl) || null;
  const resolvedBrandName =
    candidates
      .map((candidate) => ({
        label: candidate.label,
        ...getBrandingValue(candidate.value),
      }))
      .find((candidate) => candidate.brandName) || null;

  const resolvedBranding = {
    logoUrl:
      normalizeBrandLogoUrl(resolvedLogo?.logoUrl, {
        workspaceId: options?.workspaceId,
      }) || MEASURABLE_BRAND_LOGO_URL,
    brandName: resolvedBrandName?.brandName || DEFAULT_REPORT_BRAND_NAME,
    source: resolvedLogo
      ? `${resolvedLogo.label}.${resolvedLogo.logoSource}`
      : "fallback.measurable.brand.logo",
    brandNameSource: resolvedBrandName
      ? `${resolvedBrandName.label}.${resolvedBrandName.brandNameSource}`
      : "fallback.measurable.brand_name",
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[ReportBranding][resolve.asset.result]", {
      workspaceId: options?.workspaceId ?? null,
      rawLogoUrl: resolvedLogo?.logoUrl ?? null,
      resolvedLogoUrl: resolvedBranding.logoUrl,
    });
  }

  return resolvedBranding;
}

function looksLikeReportPayload(value: BrandingInput | ReportBrandingPayload) {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("branding" in value || "workspace" in value || "report" in value)
  );
}

export function resolveReportBranding(
  report: ReportBrandingPayload
): ResolvedReportBranding;
export function resolveReportBranding(
  report?: ReportBrandingPayload,
  workspace?: BrandingEntity,
  user?: BrandingEntity,
  options?: {
    overrideBranding?: BrandingInput;
  }
): ResolvedReportBranding;
export function resolveReportBranding(
  reportVersionBranding?: BrandingInput,
  reportBranding?: BrandingInput,
  fallbackBranding?: BrandingInput,
  options?: {
    overrideBranding?: BrandingInput;
  }
): ResolvedReportBranding;
export function resolveReportBranding(
  reportOrBranding?: BrandingInput | ReportBrandingPayload,
  reportBranding?: BrandingInput,
  fallbackBranding?: BrandingInput,
  options?: {
    overrideBranding?: BrandingInput;
  }
): ResolvedReportBranding {
  if (
    arguments.length <= 1 &&
    looksLikeReportPayload(reportOrBranding)
  ) {
    const report = reportOrBranding as ReportBrandingPayload;
    const workspaceId =
      report.workspaceId ??
      report.workspace_id ??
      report.workspace?.id ??
      report.report?.workspaceId ??
      report.report?.workspace_id ??
      null;

    if (process.env.NODE_ENV !== "production") {
      console.log("[ReportBranding][resolve.asset]", {
        workspaceId,
        rawLogoUrl:
          report?.branding?.logoUrl ??
          report?.branding?.logo_url ??
          report?.workspace?.branding?.logoUrl ??
          report?.workspace?.branding?.logo_url ??
          report?.logoUrl ??
          report?.logo_url ??
          null,
      });
    }

    return pickResolvedBranding([
      { label: "branding", value: report?.branding },
      { label: "workspace.branding", value: report?.workspace?.branding },
      { label: "workspace", value: report?.workspace },
      { label: "report.branding", value: report?.report?.branding },
      { label: "report", value: report?.report },
      { label: "root", value: report },
    ], {
      workspaceId,
    });
  }

  if (
    arguments.length >= 2 &&
    looksLikeReportPayload(reportOrBranding) &&
    (reportBranding === null ||
      reportBranding === undefined ||
      (typeof reportBranding === "object" && "branding" in (reportBranding as object)))
  ) {
    const report = reportOrBranding as ReportBrandingPayload;
    const workspace = reportBranding as BrandingEntity;
    const user = fallbackBranding as BrandingEntity;
    const workspaceId =
      report.workspaceId ??
      report.workspace_id ??
      report.workspace?.id ??
      report.report?.workspaceId ??
      report.report?.workspace_id ??
      null;

    return pickResolvedBranding([
      { label: "report.branding", value: report?.branding },
      { label: "report.workspace.branding", value: report?.workspace?.branding },
      { label: "report.workspace", value: report?.workspace },
      { label: "workspace.branding", value: workspace?.branding },
      { label: "workspace", value: workspace },
      { label: "report.report.branding", value: report?.report?.branding },
      { label: "report.report", value: report?.report },
      { label: "user.branding", value: user?.branding },
      { label: "user", value: user },
      { label: "report.root", value: report },
      { label: "override", value: options?.overrideBranding },
    ], {
      workspaceId,
    });
  }

  return pickResolvedBranding([
    { label: "reportVersion", value: reportOrBranding as BrandingInput },
    { label: "report", value: reportBranding },
    { label: "fallback", value: fallbackBranding },
    { label: "override", value: options?.overrideBranding },
  ]);
}
