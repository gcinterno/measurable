type BrandingInput =
  | {
      logoUrl?: string | null;
      source?: string;
    }
  | null
  | undefined;

export function resolveReportBranding(
  reportVersionBranding?: BrandingInput,
  reportBranding?: BrandingInput,
  fallbackBranding?: BrandingInput
) {
  const reportVersionLogo = reportVersionBranding?.logoUrl?.trim() || null;
  const reportLogo = reportBranding?.logoUrl?.trim() || null;
  const fallbackLogo = fallbackBranding?.logoUrl?.trim() || null;

  return {
    logoUrl: reportVersionLogo ?? reportLogo ?? fallbackLogo ?? null,
    source: reportVersionLogo
      ? `reportVersion.${reportVersionBranding?.source || "branding.logo_url"}`
      : reportLogo
        ? `report.${reportBranding?.source || "branding.logo_url"}`
        : fallbackLogo
          ? `fallback.${fallbackBranding?.source || "branding.logo_url"}`
          : "empty",
  };
}
