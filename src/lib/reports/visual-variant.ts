import type { Report, ReportDetail, ReportVersionBlock } from "@/types/report";

export type ReportVisualVariant = "meta_ads" | "instagram_business";

type ReportVisualInput =
  | Pick<
      Report,
      | "integrationMetadata"
      | "reportSources"
      | "sourceSummary"
      | "title"
      | "rawIntegrationHints"
    >
  | Pick<
      ReportDetail,
      | "integrationMetadata"
      | "reportSources"
      | "sourceSummary"
      | "title"
      | "rawIntegrationHints"
    >
  | null
  | undefined;

function getNormalizedValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function collectValuesFromReport(report: ReportVisualInput) {
  const values: string[] = [];
  const push = (value: unknown) => {
    const normalized = getNormalizedValue(value);

    if (normalized) {
      values.push(normalized);
    }
  };

  if (!report) {
    return values;
  }

  const flatReport = report as Report;
  const reportRecord = report as Record<string, unknown>;

  push(flatReport.integrationType);
  push(flatReport.integrationLabel);
  push(flatReport.sourceName);
  push(flatReport.channel);
  push(flatReport.sourceSummary);
  push(flatReport.title);
  push(flatReport.reportTitle);
  push(reportRecord.integration);
  push(reportRecord.report_source);
  push(reportRecord.reportSource);
  push(reportRecord.generation_mode);
  push(reportRecord.generationMode);
  push(reportRecord.provider);
  push(reportRecord.integration_type);
  push(reportRecord.integrationType);
  push(reportRecord.source_type);
  push(reportRecord.sourceType);

  const metadata = report.integrationMetadata;

  if (metadata) {
    push(metadata.integrationType);
    push(metadata.integrationDisplayName);
    push(metadata.sourceName);
    push(metadata.sourceHandle);
    push(metadata.socialNetwork);
    push(metadata.channel);
  }

  const hints = report.rawIntegrationHints;

  if (hints) {
    push(hints.integrationLabel);
    push(hints.integrationType);
    push(hints.integrationDisplayName);
    push(hints.sourceName);
    push(hints.sourceHandle);
    push(hints.socialNetwork);
    push(hints.channel);
    push(hints.sourceType);
    push(hints.integration);
    push(hints.type);
    push(hints.reportType);
    push(hints.pageName);
  }

  (report.reportSources || []).forEach((source) => {
    push(source.provider);
    push(source.sourceType);
    push(source.label);
  });

  return values;
}

function collectValuesFromBlock(block: ReportVersionBlock) {
  const values: string[] = [];
  const data = block.data as Record<string, unknown>;
  const push = (value: unknown) => {
    const normalized = getNormalizedValue(value);

    if (normalized) {
      values.push(normalized);
    }
  };

  [
    data.integration,
    data.report_source,
    data.reportSource,
    data.generation_mode,
    data.generationMode,
    data.provider,
    data.integration_type,
    data.integrationType,
    data.source_type,
    data.sourceType,
    data.slide_type,
    data.slideType,
    data.metric_key,
    data.metricKey,
    data.semantic_name,
    data.semanticName,
    data.title,
    data.label,
    data.name,
    data.key,
    block.type,
  ].forEach(push);

  const dataset = data.dataset;

  if (dataset && typeof dataset === "object") {
    const datasetRecord = dataset as Record<string, unknown>;
    push(datasetRecord.integration_type);
    push(datasetRecord.integrationType);
    push(datasetRecord.report_source);
    push(datasetRecord.reportSource);
    push(datasetRecord.provider);
    push(datasetRecord.type);
  }

  return values;
}

const META_ADS_DIRECT_TOKENS = [
  "meta_ads",
  "meta ads",
  "meta-ad",
  "metaads",
];

const META_ADS_BLOCK_TOKENS = [
  "meta ads performance report",
  "meta ads performance",
  "meta ads report",
  "spend & delivery",
  "spend and delivery",
  "spend_delivery",
  "traffic performance",
  "traffic_performance",
  "results / cost efficiency",
  "results cost efficiency",
  "results_cost_efficiency",
  "paid media",
];

const INSTAGRAM_BUSINESS_DIRECT_TOKENS = [
  "instagram_business_login",
  "instagram_business",
  "instagram business",
  "instagram",
];

const FACEBOOK_DIRECT_TOKENS = [
  "facebook_pages",
  "facebook page",
  "facebook pages",
  "facebook",
];

function hasMetaAdsSignal(values: string[]) {
  return values.some((value) =>
    META_ADS_DIRECT_TOKENS.some((token) => value.includes(token))
  );
}

function hasMetaAdsBlockSignal(values: string[]) {
  return values.some((value) =>
    META_ADS_BLOCK_TOKENS.some((token) => value.includes(token))
  );
}

function hasInstagramBusinessSignal(values: string[]) {
  return values.some((value) =>
    INSTAGRAM_BUSINESS_DIRECT_TOKENS.some((token) => value.includes(token))
  );
}

function hasFacebookSignal(values: string[]) {
  return values.some((value) =>
    FACEBOOK_DIRECT_TOKENS.some((token) => value.includes(token))
  );
}

export function resolveReportVisualVariant(input: {
  report?: ReportVisualInput;
  blocks?: ReportVersionBlock[] | null;
}) {
  const reportValues = collectValuesFromReport(input.report);
  const blockValues = (input.blocks || []).flatMap((block) => collectValuesFromBlock(block));

  if (hasMetaAdsSignal(reportValues) || hasMetaAdsSignal(blockValues)) {
    return "meta_ads" as const;
  }

  if (hasMetaAdsBlockSignal(blockValues)) {
    return "meta_ads" as const;
  }

  if (
    (hasInstagramBusinessSignal(reportValues) && !hasFacebookSignal(reportValues)) ||
    (hasInstagramBusinessSignal(blockValues) && !hasFacebookSignal(reportValues))
  ) {
    return "instagram_business" as const;
  }

  return null;
}
