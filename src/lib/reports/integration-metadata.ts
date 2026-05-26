import type { Report, ReportIntegrationMetadata, ReportSource } from "@/types/report";

export type ReportIntegrationPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "csv"
  | "upload"
  | "legacy";

function normalizePlatform(value?: string | null): ReportIntegrationPlatform | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("facebook") ||
    normalized === "meta" ||
    normalized === "fb"
  ) {
    return "facebook";
  }

  if (normalized.includes("instagram") || normalized === "ig") {
    return "instagram";
  }

  if (normalized.includes("tiktok")) {
    return "tiktok";
  }

  if (normalized.includes("csv")) {
    return "csv";
  }

  if (normalized.includes("upload")) {
    return "upload";
  }

  if (normalized.includes("legacy") || normalized.includes("manual")) {
    return "legacy";
  }

  return null;
}

function humanizePlatform(platform: ReportIntegrationPlatform) {
  switch (platform) {
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "csv":
      return "CSV";
    case "upload":
      return "Upload";
    case "legacy":
    default:
      return "Legacy";
  }
}

function getSourceLabel(metadata?: ReportIntegrationMetadata | null) {
  if (metadata?.sourceHandle?.trim()) {
    return metadata.sourceHandle.trim();
  }

  if (metadata?.sourceName?.trim()) {
    return metadata.sourceName.trim();
  }

  return "";
}

function collectDescriptionHints(value: unknown, collector: string[]) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    collector.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectDescriptionHints(entry, collector));
    return;
  }

  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((entry) =>
      collectDescriptionHints(entry, collector)
    );
  }
}

function collectPlatforms(input: {
  integrationMetadata?: ReportIntegrationMetadata;
  reportSources?: ReportSource[];
  rawIntegrationHints?: Report["rawIntegrationHints"];
  description?: Report["description"];
  sourceSummary?: string;
  title?: string;
}) {
  const platforms: ReportIntegrationPlatform[] = [];
  const seen = new Set<ReportIntegrationPlatform>();
  const descriptionHints: string[] = [];

  function pushPlatform(value?: string | null) {
    const platform = normalizePlatform(value);

    if (!platform || seen.has(platform)) {
      return;
    }

    seen.add(platform);
    platforms.push(platform);
  }

  pushPlatform(input.integrationMetadata?.channel);
  pushPlatform(input.integrationMetadata?.socialNetwork);
  pushPlatform(input.integrationMetadata?.integrationType);
  pushPlatform(input.integrationMetadata?.integrationDisplayName);
  pushPlatform(input.integrationMetadata?.sourceName);
  pushPlatform(input.rawIntegrationHints?.channel);
  pushPlatform(input.rawIntegrationHints?.socialNetwork);
  pushPlatform(input.rawIntegrationHints?.integrationType);
  pushPlatform(input.rawIntegrationHints?.integrationDisplayName);
  pushPlatform(input.rawIntegrationHints?.sourceType);
  pushPlatform(input.rawIntegrationHints?.integration);
  pushPlatform(input.rawIntegrationHints?.type);
  pushPlatform(input.rawIntegrationHints?.reportType);
  pushPlatform(input.rawIntegrationHints?.pageName);
  pushPlatform(input.sourceSummary);
  pushPlatform(input.title);

  collectDescriptionHints(input.description, descriptionHints);
  descriptionHints.forEach((entry) => pushPlatform(entry));

  (input.reportSources || []).forEach((source) => {
    pushPlatform(source.provider);
    pushPlatform(source.sourceType);
    pushPlatform(source.label);
  });

  return platforms;
}

function buildBadgeLabel(platforms: ReportIntegrationPlatform[]) {
  if (platforms.length === 0) {
    return "Manual Report";
  }

  if (
    platforms.length === 2 &&
    platforms.includes("facebook") &&
    platforms.includes("instagram")
  ) {
    return "Facebook & Instagram Report";
  }

  if (platforms.length > 1) {
    return "Multi-source Report";
  }

  switch (platforms[0]) {
    case "facebook":
      return "Facebook Report";
    case "instagram":
      return "Instagram Report";
    case "tiktok":
      return "TikTok Report";
    case "csv":
      return "CSV Report";
    case "upload":
      return "Upload Report";
    case "legacy":
    default:
      return "Legacy Report";
  }
}

function buildIntegrationLabel(platforms: ReportIntegrationPlatform[]) {
  if (platforms.length === 0) {
    return "Manual";
  }

  if (
    platforms.length === 2 &&
    platforms.includes("facebook") &&
    platforms.includes("instagram")
  ) {
    return "Facebook & Instagram";
  }

  if (platforms.length > 1) {
    return "Multi-source";
  }

  return humanizePlatform(platforms[0]);
}

function buildChannelLabel(platforms: ReportIntegrationPlatform[]) {
  if (platforms.length === 0) {
    return "Legacy";
  }

  if (
    platforms.length === 2 &&
    platforms.includes("facebook") &&
    platforms.includes("instagram")
  ) {
    return "Facebook & Instagram";
  }

  if (platforms.length > 1) {
    return "Multiple channels";
  }

  return humanizePlatform(platforms[0]);
}

export function getReportIntegrationMetadata(report?: {
  integrationMetadata?: ReportIntegrationMetadata;
  rawIntegrationHints?: Report["rawIntegrationHints"];
}) {
  if (report?.integrationMetadata) {
    return report.integrationMetadata;
  }

  if (!report?.rawIntegrationHints) {
    return null;
  }

  return {
    integrationType: report.rawIntegrationHints.integrationType,
    integrationDisplayName: report.rawIntegrationHints.integrationDisplayName,
    sourceName:
      report.rawIntegrationHints.sourceName || report.rawIntegrationHints.pageName,
    sourceHandle: report.rawIntegrationHints.sourceHandle,
    socialNetwork: report.rawIntegrationHints.socialNetwork,
    channel: report.rawIntegrationHints.channel,
  };
}

export function getReportIntegrationSourceLabel(
  metadata?: ReportIntegrationMetadata | null,
  rawIntegrationHints?: Report["rawIntegrationHints"]
) {
  return (
    getSourceLabel(metadata) ||
    rawIntegrationHints?.pageName?.trim() ||
    rawIntegrationHints?.sourceName?.trim() ||
    "—"
  );
}

export function getReportIntegrationBadgeDetails(
  report: Pick<
    Report,
    | "integrationMetadata"
    | "reportSources"
    | "rawIntegrationHints"
    | "description"
    | "sourceSummary"
    | "title"
  >
) {
  const metadata = getReportIntegrationMetadata(report);
  const platforms = collectPlatforms(report);
  const sourceLabel =
    getSourceLabel(metadata) ||
    report.rawIntegrationHints?.pageName?.trim() ||
    report.rawIntegrationHints?.sourceName?.trim() ||
    "";
  const label = buildBadgeLabel(platforms);
  const badgeLabel = sourceLabel ? `${label} · ${sourceLabel}` : label;

  return {
    metadata,
    platforms,
    label,
    sourceLabel,
    badgeLabel,
  };
}

export function getReportIntegrationBadgeLabel(
  report: Pick<
    Report,
    | "integrationMetadata"
    | "reportSources"
    | "rawIntegrationHints"
    | "description"
    | "sourceSummary"
    | "title"
  >
) {
  return getReportIntegrationBadgeDetails(report).badgeLabel;
}

export function getReportIntegrationDetails(
  report: Pick<
    Report,
    | "integrationMetadata"
    | "reportSources"
    | "rawIntegrationHints"
    | "description"
    | "sourceSummary"
    | "title"
  >
) {
  const badge = getReportIntegrationBadgeDetails(report);

  return {
    metadata: badge.metadata,
    platforms: badge.platforms,
    integrationLabel: buildIntegrationLabel(badge.platforms),
    channelLabel: buildChannelLabel(badge.platforms),
    sourceLabel:
      badge.sourceLabel ||
      report.rawIntegrationHints?.pageName?.trim() ||
      report.rawIntegrationHints?.sourceName?.trim() ||
      "—",
    badgeLabel: badge.badgeLabel,
  };
}
