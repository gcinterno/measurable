type ReportBrandingSnapshot = {
  logoUrl?: string | null;
  source?: string;
  savedAt?: string;
};

const REPORT_BRANDING_SNAPSHOTS_KEY = "reportBrandingSnapshots";

function readReportBrandingSnapshots() {
  if (typeof window === "undefined") {
    return {} as Record<string, ReportBrandingSnapshot>;
  }

  try {
    const raw = window.localStorage.getItem(REPORT_BRANDING_SNAPSHOTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReportBrandingSnapshot>) : {};
  } catch {
    return {};
  }
}

function isSafeSnapshotLogoUrl(value: string) {
  return (
    !value.startsWith("data:") &&
    !value.startsWith("blob:") &&
    value.length <= 2048
  );
}

export function getReportBrandingSnapshot(reportId: string) {
  const snapshot = readReportBrandingSnapshots()[reportId];
  const logoUrl = snapshot?.logoUrl?.trim() || null;

  if (!logoUrl || !isSafeSnapshotLogoUrl(logoUrl)) {
    return null;
  }

  return {
    logoUrl,
    source: snapshot?.source || "localStorage.reportBrandingSnapshots",
  };
}

export function saveReportBrandingSnapshot(
  reportId: string,
  branding: ReportBrandingSnapshot
) {
  if (typeof window === "undefined" || !reportId) {
    return;
  }

  const logoUrl = branding.logoUrl?.trim();

  if (!logoUrl || !isSafeSnapshotLogoUrl(logoUrl)) {
    return;
  }

  const snapshots = readReportBrandingSnapshots();
  snapshots[reportId] = {
    logoUrl,
    source: branding.source || "preferences.logoDataUrl",
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      REPORT_BRANDING_SNAPSHOTS_KEY,
      JSON.stringify(snapshots)
    );
  } catch (error) {
    console.warn("report branding snapshot save failed:", error);
  }
}
