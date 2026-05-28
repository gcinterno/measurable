import type { Report } from "@/types/report";
import type {
  ReportBlock,
  ReportDetail,
  ReportLocale,
  ReportSource,
  ReportVersion,
  ReportVersionBlock,
  ReportVersionView,
} from "@/types/report";

import { apiFetch, isAbortError, isAuthError, readApiResponseText } from "@/lib/api";
import { apiUrl } from "@/lib/api/config";
import { FEATURES } from "@/config/features";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { getActiveWorkspaceId } from "@/lib/workspace/session";

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const token = window.localStorage.getItem("token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
}

type BackendReport = {
  id?: string | number;
  report_id?: string | number;
  title?: string | null;
  report_title?: string | null;
  reportTitle?: string | null;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  workspace_id?: string | number | null;
  workspaceId?: string | number | null;
  workspace_name?: string | null;
  workspaceName?: string | null;
  description?: unknown;
  brand_name?: string | null;
  brandName?: string | null;
  brand_logo_url?: string | null;
  brandLogoUrl?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
  integration_label?: string | null;
  integrationLabel?: string | null;
  resolved_logo_url?: string | null;
  resolvedLogoUrl?: string | null;
  resolved_brand_name?: string | null;
  resolvedBrandName?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  branding?: {
    resolved_logo_url?: string | null;
    resolvedLogoUrl?: string | null;
    brand_logo_url?: string | null;
    brandLogoUrl?: string | null;
    logo_url?: string | null;
    logoUrl?: string | null;
    brand_name?: string | null;
    brandName?: string | null;
    resolved_brand_name?: string | null;
    resolvedBrandName?: string | null;
  } | null;
  report_sources?: BackendReportSource[] | null;
  reportSources?: BackendReportSource[] | null;
  integration_metadata?: {
    integration_type?: string | null;
    integration_display_name?: string | null;
    source_name?: string | null;
    source_handle?: string | null;
    social_network?: string | null;
    channel?: string | null;
  } | null;
  integrationMetadata?: {
    integration_type?: string | null;
    integration_display_name?: string | null;
    source_name?: string | null;
    source_handle?: string | null;
    social_network?: string | null;
    channel?: string | null;
  } | null;
  integration_type?: string | null;
  integrationType?: string | null;
  integration_display_name?: string | null;
  integrationDisplayName?: string | null;
  source_name?: string | null;
  sourceName?: string | null;
  source_handle?: string | null;
  sourceHandle?: string | null;
  social_network?: string | null;
  socialNetwork?: string | null;
  channel?: string | null;
  period_start?: string | null;
  periodStart?: string | null;
  period_end?: string | null;
  periodEnd?: string | null;
  template?: string | null;
  source_type?: string | null;
  sourceType?: string | null;
  integration?: string | null;
  type?: string | null;
  report_type?: string | null;
  reportType?: string | null;
  page_name?: string | null;
  pageName?: string | null;
  blocks?: BackendBlock[] | null;
};

type BackendReportSource = {
  provider?: string | null;
  source_type?: string | null;
  sourceType?: string | null;
  integration_id?: string | number | null;
  integrationId?: string | number | null;
  integration_account_id?: string | number | null;
  integrationAccountId?: string | number | null;
  dataset_id?: string | number | null;
  datasetId?: string | number | null;
  position?: number | null;
  label?: string | null;
};

type BackendBlock = {
  id?: string | number;
  block_id?: string | number;
  type?: string | null;
  block_type?: string | null;
  content?: string | null;
  text?: string | null;
  value?: string | number | null;
  title?: string | null;
  label?: string | null;
  editable?: boolean | null;
};

type BackendVersion = {
  id?: string | number;
  version?: string | number | null;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  locale?: string | null;
  brand_name?: string | null;
  brandName?: string | null;
  brand_logo_url?: string | null;
  brandLogoUrl?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
  resolved_logo_url?: string | null;
  resolvedLogoUrl?: string | null;
  resolved_brand_name?: string | null;
  resolvedBrandName?: string | null;
  branding?: {
    resolved_logo_url?: string | null;
    resolvedLogoUrl?: string | null;
    brand_logo_url?: string | null;
    brandLogoUrl?: string | null;
    logo_url?: string | null;
    logoUrl?: string | null;
    brand_name?: string | null;
    brandName?: string | null;
    resolved_brand_name?: string | null;
    resolvedBrandName?: string | null;
  } | null;
  blocks?: BackendBlock[] | null;
};

type BackendVersionViewBlock = {
  id?: string | number;
  block_id?: string | number;
  type?: string | null;
  data_json?: string | null;
};

type BackendVersionViewResponse = {
  locale?: string | null;
  description?: unknown;
  brand_name?: string | null;
  brandName?: string | null;
  brand_logo_url?: string | null;
  brandLogoUrl?: string | null;
  logo_url?: string | null;
  logoUrl?: string | null;
  integration_label?: string | null;
  integrationLabel?: string | null;
  resolved_logo_url?: string | null;
  resolvedLogoUrl?: string | null;
  resolved_brand_name?: string | null;
  resolvedBrandName?: string | null;
  branding?: {
    resolved_logo_url?: string | null;
    resolvedLogoUrl?: string | null;
    brand_logo_url?: string | null;
    brandLogoUrl?: string | null;
    logo_url?: string | null;
    logoUrl?: string | null;
    brand_name?: string | null;
    brandName?: string | null;
    resolved_brand_name?: string | null;
    resolvedBrandName?: string | null;
  } | null;
  blocks?: BackendVersionViewBlock[] | null;
};

type ReportShareResponse = {
  status?: string;
  report_id?: string | number;
  reportId?: string | number;
  share_token?: string;
  shareToken?: string;
  share_url?: string;
  shareUrl?: string;
};

type PublicSharedReportResponse = {
  report?: BackendReport | null;
  version?: BackendVersionViewResponse | null;
  blocks?: BackendVersionViewBlock[] | null;
  is_public_share?: boolean;
  isPublicShare?: boolean;
};

type ReportsResponse =
  | BackendReport[]
  | { reports?: BackendReport[]; items?: BackendReport[]; data?: BackendReport[] };

function normalizeIntegrationMetadata(report: BackendReport) {
  const metadata = report.integration_metadata || report.integrationMetadata;

  const integrationType =
    metadata?.integration_type ||
    report.integration_type ||
    report.integrationType ||
    undefined;
  const integrationLabel =
    report.integration_label ||
    report.integrationLabel ||
    metadata?.integration_display_name ||
    report.integration_display_name ||
    report.integrationDisplayName ||
    undefined;
  const integrationDisplayName =
    metadata?.integration_display_name ||
    report.integration_display_name ||
    report.integrationDisplayName ||
    integrationLabel ||
    undefined;
  const sourceName =
    metadata?.source_name ||
    report.source_name ||
    report.sourceName ||
    report.page_name ||
    report.pageName ||
    undefined;
  const sourceHandle =
    metadata?.source_handle ||
    report.source_handle ||
    report.sourceHandle ||
    undefined;
  const socialNetwork =
    metadata?.social_network ||
    report.social_network ||
    report.socialNetwork ||
    undefined;
  const channel = metadata?.channel || report.channel || undefined;

  if (
    !integrationType &&
    !integrationDisplayName &&
    !sourceName &&
    !sourceHandle &&
    !socialNetwork &&
    !channel
  ) {
    return undefined;
  }

  return {
    integrationType: integrationType?.trim() || undefined,
    integrationLabel: integrationLabel?.trim() || undefined,
    integrationDisplayName: integrationDisplayName?.trim() || undefined,
    sourceName: sourceName?.trim() || undefined,
    sourceHandle: sourceHandle?.trim() || undefined,
    socialNetwork: socialNetwork?.trim() || undefined,
    channel: channel?.trim() || undefined,
  };
}

function normalizeShareToken(token: string) {
  return token.split("?")[0].split("#")[0].trim();
}

function normalizeReport(report: BackendReport, index: number): Report {
  const id = report.id ?? report.report_id ?? `report-${index}`;
  const normalizedThumbnailUrl =
    report.thumbnailUrl || report.thumbnail_url || undefined;
  const branding = extractReportBranding(report);
  const reportSources = normalizeReportSources(report.report_sources || report.reportSources);
  const normalizedIntegrationMetadata = normalizeIntegrationMetadata(report);
  const normalizedTitle =
    report.report_title ||
    report.reportTitle ||
    report.title ||
    report.name ||
    `Report ${index + 1}`;
  const normalizedSourceSummary =
    formatReportSourceSummary(reportSources) ||
    report.source_name ||
    report.sourceName ||
    report.integration_label ||
    report.integrationLabel ||
    normalizedIntegrationMetadata?.sourceName ||
    "";

  return {
    id: String(id),
    title: normalizedTitle,
    status: report.status || "No status",
    createdAt: report.created_at || report.createdAt || "",
    thumbnailUrl: normalizedThumbnailUrl,
    sourceSummary: normalizedSourceSummary,
    reportSources,
    integrationMetadata: normalizedIntegrationMetadata,
    description: normalizeReportDescriptionWithPeriod(
      report.description,
      report.period_start || report.periodStart || null,
      report.period_end || report.periodEnd || null
    ),
    branding: {
      logoUrl: branding.logoUrl,
      brandName: branding.brandName,
      source: branding.source,
      brandNameSource: branding.brandNameSource,
    },
    rawIntegrationHints: {
      integrationLabel:
        report.integration_label?.trim() ||
        report.integrationLabel?.trim() ||
        normalizedIntegrationMetadata?.integrationLabel ||
        undefined,
      integrationType:
        report.integration_type?.trim() ||
        report.integrationType?.trim() ||
        undefined,
      integrationDisplayName:
        report.integration_display_name?.trim() ||
        report.integrationDisplayName?.trim() ||
        undefined,
      sourceName:
        report.source_name?.trim() ||
        report.sourceName?.trim() ||
        undefined,
      sourceHandle:
        report.source_handle?.trim() ||
        report.sourceHandle?.trim() ||
        undefined,
      socialNetwork:
        report.social_network?.trim() ||
        report.socialNetwork?.trim() ||
        undefined,
      channel: report.channel?.trim() || undefined,
      brandName:
        report.brand_name?.trim() ||
        report.brandName?.trim() ||
        branding.brandName ||
        undefined,
      logoUrl:
        report.logo_url?.trim() ||
        report.logoUrl?.trim() ||
        branding.logoUrl ||
        undefined,
      periodStart:
        report.period_start?.trim() ||
        report.periodStart?.trim() ||
        undefined,
      periodEnd:
        report.period_end?.trim() ||
        report.periodEnd?.trim() ||
        undefined,
      template: report.template?.trim() || undefined,
      reportTitle:
        report.report_title?.trim() ||
        report.reportTitle?.trim() ||
        normalizedTitle,
      sourceType:
        report.source_type?.trim() ||
        report.sourceType?.trim() ||
        undefined,
      integration: report.integration?.trim() || undefined,
      type: report.type?.trim() || undefined,
      reportType:
        report.report_type?.trim() ||
        report.reportType?.trim() ||
        undefined,
      pageName:
        report.page_name?.trim() ||
        report.pageName?.trim() ||
        undefined,
    },
    workspaceId:
      report.workspace_id !== undefined && report.workspace_id !== null
        ? String(report.workspace_id)
        : report.workspaceId !== undefined && report.workspaceId !== null
          ? String(report.workspaceId)
          : undefined,
    integrationType:
      report.integration_type?.trim() ||
      report.integrationType?.trim() ||
      normalizedIntegrationMetadata?.integrationType ||
      undefined,
    integrationLabel:
      report.integration_label?.trim() ||
      report.integrationLabel?.trim() ||
      normalizedIntegrationMetadata?.integrationLabel ||
      normalizedIntegrationMetadata?.integrationDisplayName ||
      undefined,
    sourceName:
      report.source_name?.trim() ||
      report.sourceName?.trim() ||
      normalizedIntegrationMetadata?.sourceName ||
      undefined,
    channel: report.channel?.trim() || normalizedIntegrationMetadata?.channel || undefined,
    brandName: branding.brandName || report.brand_name?.trim() || report.brandName?.trim() || undefined,
    logoUrl: branding.logoUrl || report.logo_url?.trim() || report.logoUrl?.trim() || undefined,
    periodStart: report.period_start?.trim() || report.periodStart?.trim() || undefined,
    periodEnd: report.period_end?.trim() || report.periodEnd?.trim() || undefined,
    template: report.template?.trim() || undefined,
    reportTitle: normalizedTitle,
  };
}

function normalizeReportDescription(value: unknown) {
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const description = raw as Record<string, unknown>;
  const rawTimeframe = description.timeframe;

  if (!rawTimeframe || typeof rawTimeframe !== "object" || Array.isArray(rawTimeframe)) {
    return { ...description, timeframe: null };
  }

  const timeframe = rawTimeframe as Record<string, unknown>;

  return {
    ...description,
    timeframe: {
      label: typeof timeframe.label === "string" ? timeframe.label : undefined,
      since: typeof timeframe.since === "string" ? timeframe.since : undefined,
      until: typeof timeframe.until === "string" ? timeframe.until : undefined,
      key: typeof timeframe.key === "string" ? timeframe.key : undefined,
      preset: typeof timeframe.preset === "string" ? timeframe.preset : undefined,
    },
  };
}

function normalizeReportDescriptionWithPeriod(
  value: unknown,
  periodStart?: string | null,
  periodEnd?: string | null
) {
  const description = normalizeReportDescription(value);

  if (!description) {
    if (!periodStart && !periodEnd) {
      return null;
    }

    return {
      timeframe: {
        label: undefined,
        since: periodStart || undefined,
        until: periodEnd || undefined,
        key: undefined,
        preset: undefined,
      },
    };
  }

  const timeframe = description.timeframe || null;

  if (timeframe?.since || timeframe?.until || (!periodStart && !periodEnd)) {
    return description;
  }

  return {
    ...description,
    timeframe: {
      label: timeframe?.label,
      since: timeframe?.since || periodStart || undefined,
      until: timeframe?.until || periodEnd || undefined,
      key: timeframe?.key,
      preset: timeframe?.preset,
    },
  };
}

function extractReportBranding(
  report: BackendReport | BackendVersion | BackendVersionViewResponse
) {
  const logoSources: Array<[string | null | undefined, string]> = [
    [report.branding?.resolvedLogoUrl, "branding.resolvedLogoUrl"],
    [report.branding?.resolved_logo_url, "branding.resolved_logo_url"],
    [report.branding?.brandLogoUrl, "branding.brandLogoUrl"],
    [report.branding?.brand_logo_url, "branding.brand_logo_url"],
    [report.branding?.logoUrl, "branding.logoUrl"],
    [report.branding?.logo_url, "branding.logo_url"],
    [report.resolvedLogoUrl, "resolvedLogoUrl"],
    [report.resolved_logo_url, "resolved_logo_url"],
    [report.brandLogoUrl, "brandLogoUrl"],
    [report.brand_logo_url, "brand_logo_url"],
    [report.logoUrl, "logoUrl"],
    [report.logo_url, "logo_url"],
  ];
  const brandNameSources: Array<[string | null | undefined, string]> = [
    [report.branding?.resolvedBrandName, "branding.resolvedBrandName"],
    [report.branding?.resolved_brand_name, "branding.resolved_brand_name"],
    [report.branding?.brandName, "branding.brandName"],
    [report.branding?.brand_name, "branding.brand_name"],
    [report.resolvedBrandName, "resolvedBrandName"],
    [report.resolved_brand_name, "resolved_brand_name"],
    [report.brandName, "brandName"],
    [report.brand_name, "brand_name"],
  ];
  const resolvedLogo = logoSources.find(([value]) => typeof value === "string" && value.trim());
  const resolvedBrandName = brandNameSources.find(
    ([value]) => typeof value === "string" && value.trim()
  );

  return {
    logoUrl: resolvedLogo?.[0]?.trim() || undefined,
    brandName: resolvedBrandName?.[0]?.trim() || undefined,
    source: resolvedLogo?.[1] || "empty",
    brandNameSource: resolvedBrandName?.[1] || "empty",
  };
}

function normalizeBlock(block: BackendBlock, index: number): ReportBlock {
  const value =
    typeof block.value === "number" ? String(block.value) : block.value || "";

  return {
    id: String(block.id ?? block.block_id ?? `block-${index}`),
    type: block.type || block.block_type || "text",
    content: block.content || block.text || value,
    title: block.title || undefined,
    label: block.label || undefined,
    editable: Boolean(block.editable),
  };
}

function normalizeVersion(version: BackendVersion, index: number): ReportVersion {
  const blocks = (version.blocks || []).map(normalizeBlock);
  const branding = extractReportBranding(version);

  return {
    id: String(version.id ?? `version-${index}`),
    version: String(version.version ?? version.name ?? `Version ${index + 1}`),
    createdAt: version.created_at || version.createdAt || "",
    status: version.status || "No status",
    locale: normalizeLocale(version.locale),
    branding: {
      logoUrl: branding.logoUrl,
      brandName: branding.brandName,
      source: branding.source,
      brandNameSource: branding.brandNameSource,
    },
    blocks,
    rawMetadata:
      blocks.length === 0
        ? {
            id: version.id,
            version: version.version,
            name: version.name,
            status: version.status,
            locale: normalizeLocale(version.locale),
            created_at: version.created_at,
            createdAt: version.createdAt,
          }
        : undefined,
  };
}

function normalizeLocale(locale: string | null | undefined): ReportLocale {
  return locale === "es" ? "es" : "en";
}

function normalizeReportSource(source: BackendReportSource): ReportSource {
  const integrationId = source.integrationId ?? source.integration_id;
  const integrationAccountId =
    source.integrationAccountId ?? source.integration_account_id;
  const datasetId = source.datasetId ?? source.dataset_id;

  return {
    provider: source.provider || undefined,
    sourceType: source.sourceType || source.source_type || undefined,
    integrationId: integrationId !== null && integrationId !== undefined ? String(integrationId) : undefined,
    integrationAccountId:
      integrationAccountId !== null && integrationAccountId !== undefined
        ? String(integrationAccountId)
        : undefined,
    datasetId: datasetId !== null && datasetId !== undefined ? String(datasetId) : undefined,
    position: typeof source.position === "number" ? source.position : undefined,
    label: source.label || undefined,
  };
}

function normalizeReportSources(value: BackendReportSource[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as ReportSource[];
  }

  return value.map(normalizeReportSource);
}

function humanizeSourceLabel(label: string) {
  const normalized = label.trim().toLowerCase();

  if (normalized === "facebook page" || normalized === "facebook pages") {
    return "Facebook";
  }

  if (normalized === "instagram account" || normalized === "instagram business") {
    return "Instagram";
  }

  return label.trim();
}

function formatReportSourceSummary(reportSources: ReportSource[]) {
  if (reportSources.length === 0) {
    return "";
  }

  const orderedSources = [...reportSources].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0)
  );
  const labels = orderedSources
    .map((source) => source.label?.trim())
    .filter(Boolean)
    .map((label) => humanizeSourceLabel(label as string));

  return labels.join(" + ");
}

export async function fetchReports(options?: {
  signal?: AbortSignal;
  integrationType?: string;
  channel?: string;
}) {
  const searchParams = new URLSearchParams();

  if (options?.integrationType) {
    searchParams.set("integration_type", options.integrationType);
  }

  if (options?.channel) {
    searchParams.set("channel", options.channel);
  }

  const endpoint = searchParams.size > 0 ? `/reports?${searchParams.toString()}` : "/reports";
  const finalUrl = apiUrl(endpoint);
  const authHeaders = getAuthHeaders();
  const authMode = authHeaders?.Authorization ? "bearer" : "none";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      console.log("reports fetch start", {
        attempt: attempt + 1,
        finalRequestUrl: finalUrl,
        authMode,
      });

      const response = await apiFetch<ReportsResponse>(endpoint, {
        cache: "no-store",
        signal: options?.signal,
      });

      const reports = Array.isArray(response)
        ? response
        : response.reports || response.items || response.data || [];

      console.log("reports parsing success", {
        rawShape: Array.isArray(response)
          ? "array"
          : typeof response === "object" && response
            ? Object.keys(response)
            : typeof response,
        count: reports.length,
      });

      return reports.map(normalizeReport);
    } catch (error) {
      lastError = error as Error;

      const logMethod = isAuthError(error) || isAbortError(error) ? "warn" : "error";

      console[logMethod]("reports fetch failure", {
        attempt: attempt + 1,
        error: lastError.message,
      });

      if (isAuthError(error) || isAbortError(error)) {
        break;
      }

      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
    }
  }

  throw lastError || new Error("Could not load reports");
}

export async function deleteReport(reportId: string) {
  if (!reportId?.trim()) {
    throw new Error("Report id missing for delete");
  }

  const attempts = [
    {
      endpoint: `/reports/${reportId}`,
      method: "DELETE",
    },
    {
      endpoint: `/reports/${reportId}/delete`,
      method: "POST",
    },
  ] as const;
  let lastError: unknown = null;

  for (const attempt of attempts) {
    const requestUrl = apiUrl(attempt.endpoint);
    const authHeaders = getAuthHeaders();

    console.log("DELETE_REPORT_REQUEST_PAYLOAD", {
      endpoint: attempt.endpoint,
      method: attempt.method,
      reportId,
      requestUrl,
      hasBearerToken: Boolean(authHeaders?.Authorization),
    });

    try {
      const response = await fetch(requestUrl, {
        method: attempt.method,
        headers: authHeaders,
        cache: "no-store",
        credentials: "include",
      });
      const rawResponseBody = await response.clone().text();

      console.log("DELETE_REPORT_RESPONSE_STATUS", {
        endpoint: attempt.endpoint,
        ok: response.ok,
        reportId,
        status: response.status,
        statusText: response.statusText,
      });
      console.log("DELETE_REPORT_RESPONSE_BODY", rawResponseBody || null);

      await readApiResponseText(attempt.endpoint, response);
      return;
    } catch (error) {
      lastError = error;
      console.error("delete report request failed:", {
        endpoint: attempt.endpoint,
        method: attempt.method,
        reportId,
        error,
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Delete report failed");
}

export async function updateReportFolder(
  reportId: string,
  input: {
    folderId: string | null;
    folderName: string | null;
  }
) {
  await apiFetch(`/reports/${reportId}/folder`, {
    method: "PATCH",
    body: JSON.stringify({
      folder_id: input.folderId,
      folder_name: input.folderName,
    }),
  });
}

type ReportDetailResponse = BackendReport | { report?: BackendReport; data?: BackendReport };

type ReportVersionsResponse =
  | BackendVersion[]
  | { versions?: BackendVersion[]; items?: BackendVersion[]; data?: BackendVersion[] };

type CreateReportResponse = {
  id?: string | number;
  report_id?: string | number;
  reportId?: string | number;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  data?: {
    id?: string | number;
    report_id?: string | number;
    reportId?: string | number;
    title?: string | null;
    name?: string | null;
    status?: string | null;
    created_at?: string | null;
    createdAt?: string | null;
  };
  report?: {
    id?: string | number;
    report_id?: string | number;
    reportId?: string | number;
  };
  result?: {
    id?: string | number;
    report_id?: string | number;
    reportId?: string | number;
  };
};

type FetchLatestReportRenderDataOptions = {
  authToken?: string;
  source?: "flow-preview" | "report-detail";
};

function extractReportId(response: CreateReportResponse) {
  const reportId =
    response.report_id ??
    response.reportId ??
    response.id ??
    response.data?.report_id ??
    response.data?.reportId ??
    response.data?.id ??
    response.report?.report_id ??
    response.report?.reportId ??
    response.report?.id ??
    response.result?.report_id ??
    response.result?.reportId ??
    response.result?.id;

  if (!reportId) {
    throw new Error("Report id missing in create report response");
  }

  return String(reportId);
}

function getLatestReportVersionSelection(
  versions: Awaited<ReturnType<typeof fetchReportVersions>>
) {
  const latestVersion =
    [...versions].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return Number(right.id) - Number(left.id);
    })[0] || null;

  return {
    latestVersion,
    versionId: latestVersion?.id || "",
    versionNumber: latestVersion?.version || "1",
  };
}

function getCurrentLocale() {
  return usePreferencesStore.getState().language || "en";
}

export async function createReport(input: {
  name: string;
  datasetId: string;
}) {
  const workspaceId = getActiveWorkspaceId();
  const locale = getCurrentLocale();

  if (!workspaceId) {
    throw new Error("Select an active workspace before creating a report.");
  }

  const payloads = [
    {
      name: input.name,
      dataset_id: input.datasetId,
      workspace_id: workspaceId,
      locale,
    },
    {
      title: input.name,
      dataset_id: input.datasetId,
      workspace_id: workspaceId,
      locale,
    },
    {
      name: input.name,
      datasetId: input.datasetId,
      workspace_id: workspaceId,
      locale,
    },
    {
      name: input.name,
      dataset_id: input.datasetId,
      workspaceId,
      locale,
    },
  ];

  let lastError: Error | null = null;

  for (const payload of payloads) {
    try {
      const response = await apiFetch<CreateReportResponse>("/reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("create report response:", response);

      return {
        raw: response,
        reportId: extractReportId(response),
      };
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError || new Error("Create report failed");
}

export async function createMetaPagesReport(input: {
  datasetId: string;
  workspaceId?: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  requestedSlides?: number;
  aiMode?: "standard" | "agents";
}) {
  const locale = getCurrentLocale();
  const payload = {
    dataset_id: Number(input.datasetId),
    workspace_id: input.workspaceId,
    timeframe: input.timeframe,
    start_date: input.startDate,
    end_date: input.endDate,
    requested_slides: input.requestedSlides,
    ai_mode: input.aiMode || "standard",
    locale,
  };
  const body = JSON.stringify(payload);

  console.info("[MetaTimeframe][api.createMetaPagesReport.request]", {
    datasetId: input.datasetId,
    workspaceId: input.workspaceId,
    timeframe: input.timeframe,
    startDate: input.startDate,
    endDate: input.endDate,
    requestedSlides: input.requestedSlides,
    aiMode: input.aiMode || "standard",
    body,
    payload,
  });

  const response = await apiFetch<CreateReportResponse>("/reports/meta-pages", {
    method: "POST",
    body,
  });

  console.info("[MetaTimeframe][api.createMetaPagesReport.response]", {
    reportId: extractReportId(response),
    raw: response,
  });

  console.log("create meta pages report response:", response);

  return {
    raw: response,
    reportId: extractReportId(response),
  };
}

export async function createInstagramBusinessReport(input: {
  integrationId: string;
  workspaceId?: string;
  accountId: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  requestedSlides?: number;
  aiMode?: "standard" | "agents";
}) {
  const locale = getCurrentLocale();
  const payload = {
    integration_id: input.integrationId,
    workspace_id: input.workspaceId,
    account_id: input.accountId,
    timeframe: input.timeframe,
    start_date: input.startDate,
    end_date: input.endDate,
    requested_slides: input.requestedSlides,
    ai_mode: input.aiMode || "standard",
    locale,
  };
  const body = JSON.stringify(payload);
  const endpoint = "/reports/instagram-business";

  console.info("[MetaTimeframe][api.createInstagramBusinessReport.request]", {
    endpoint,
    integrationId: input.integrationId,
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    timeframe: input.timeframe,
    startDate: input.startDate,
    endDate: input.endDate,
    requestedSlides: input.requestedSlides,
    aiMode: input.aiMode || "standard",
    body,
    payload,
  });

  const response = await apiFetch<CreateReportResponse>(endpoint, {
    method: "POST",
    body,
  });

  console.info("[MetaTimeframe][api.createInstagramBusinessReport.response]", {
    endpoint,
    reportId: extractReportId(response),
    raw: response,
  });

  console.log("create instagram business report response:", response);

  return {
    raw: response,
    reportId: extractReportId(response),
  };
}

export async function createMultiSourceReport(input: {
  title: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  requestedSlides?: number;
  aiMode?: "standard" | "agents";
  locale?: string;
  sources: Array<{
    provider: string;
    sourceType: string;
    integrationId: string;
    integrationAccountId: string;
    datasetId: string;
    position: number;
    label: string;
  }>;
}) {
  const payload = {
    title: input.title,
    timeframe: input.timeframe,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    requested_slides: input.requestedSlides,
    ai_mode: input.aiMode || "standard",
    locale: input.locale || getCurrentLocale(),
    sources: input.sources.map((source) => ({
      provider: source.provider,
      source_type: source.sourceType,
      integration_id: Number(source.integrationId),
      integration_account_id: Number(source.integrationAccountId),
      dataset_id: Number(source.datasetId),
      position: source.position,
      label: source.label,
    })),
  };

  const response = await apiFetch<CreateReportResponse>("/reports/multi-source", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    raw: response,
    reportId: extractReportId(response),
  };
}

export async function fetchReportDetail(
  reportId: string,
  options?: {
    authToken?: string;
  }
) {
  const headers = new Headers();

  if (options?.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await apiFetch<ReportDetailResponse>(`/reports/${reportId}`, {
    cache: "no-store",
    headers,
    credentials: "include",
  });
  const report = "report" in response ? response.report || response.data : response.data || response;

  if (!report) {
    return null;
  }

  const branding = extractReportBranding(report);

  return {
    ...normalizeReport(report, 0),
    blocks: (report.blocks || []).map(normalizeBlock),
    workspaceId: String(report.workspace_id ?? report.workspaceId ?? ""),
    workspaceName: report.workspace_name || report.workspaceName || undefined,
    description: normalizeReportDescription(report.description),
    branding: {
      logoUrl: branding.logoUrl,
      brandName: branding.brandName,
      source: branding.source,
      brandNameSource: branding.brandNameSource,
    },
    logoUrl: branding.logoUrl,
    brandName: branding.brandName,
  } satisfies ReportDetail;
}

export async function fetchReportVersions(
  reportId: string,
  options?: {
    authToken?: string;
  }
) {
  const headers = new Headers();

  if (options?.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await apiFetch<ReportVersionsResponse>(
    `/reports/${reportId}/versions`,
    {
      cache: "no-store",
      headers,
      credentials: "include",
    }
  );
  const versions = Array.isArray(response)
    ? response
    : response.versions || response.items || response.data || [];

  return versions.map(normalizeVersion);
}

function parseBlockData(dataJson: string | null | undefined) {
  if (!dataJson) {
    return {};
  }

  try {
    return JSON.parse(dataJson) as ReportVersionBlock["data"];
  } catch (error) {
    console.error("report block data_json parse error:", error, dataJson);
    return {};
  }
}

export async function fetchReportVersionView(
  reportId: string,
  versionId = "1",
  options?: {
    authToken?: string;
  }
): Promise<ReportVersionView> {
  const headers = new Headers();

  if (options?.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await apiFetch<BackendVersionViewResponse>(
    `/reports/${reportId}/versions/${versionId}`,
    {
      cache: "no-store",
      headers,
      credentials: "include",
    }
  );
  const branding = extractReportBranding(response);

  return {
    locale: normalizeLocale(response.locale),
    description: normalizeReportDescription(response.description),
    branding: {
      logoUrl: branding.logoUrl,
      brandName: branding.brandName,
      source: branding.source,
      brandNameSource: branding.brandNameSource,
    },
    blocks: (response.blocks || []).map((block, index) => ({
      id: String(block.id ?? block.block_id ?? `version-block-${index}`),
      type: block.type || "text",
      data: parseBlockData(block.data_json),
      rawDataJson: block.data_json || "",
    })) satisfies ReportVersionBlock[],
  };
}

export async function fetchReportVersionBlocks(reportId: string, versionId = "1") {
  const response = await fetchReportVersionView(reportId, versionId);
  return response.blocks;
}

export async function fetchLatestReportRenderData(
  reportId: string,
  options?: FetchLatestReportRenderDataOptions
) {
  const versions = await fetchReportVersions(reportId, {
    authToken: options?.authToken,
  }).catch((error) => {
    console.warn("[REPORT_RENDER_PATH][versions.fetch.failed]", {
      source: options?.source || "report-detail",
      reportId,
      error: error instanceof Error ? error.message : String(error),
    });

    return [];
  });

  const versionSelection = getLatestReportVersionSelection(versions);
  const requestedVersionId =
    versionSelection.versionId || versionSelection.versionNumber || "1";
  let resolvedVersionId = requestedVersionId;
  let reportVersion = null as Awaited<ReturnType<typeof fetchReportVersionView>> | null;

  try {
    reportVersion = await fetchReportVersionView(reportId, requestedVersionId, {
      authToken: options?.authToken,
    });
  } catch (error) {
    if (requestedVersionId === "1") {
      throw error;
    }

    console.warn("[REPORT_RENDER_PATH][version.fallback]", {
      source: options?.source || "report-detail",
      reportId,
      requestedVersionId,
      fallbackVersionId: "1",
      error: error instanceof Error ? error.message : String(error),
    });

    resolvedVersionId = "1";
    reportVersion = await fetchReportVersionView(reportId, "1", {
      authToken: options?.authToken,
    });
  }

  const detail = await fetchReportDetail(reportId, {
    authToken: options?.authToken,
  }).catch(() => null);

  return {
    detail,
    reportVersion,
    versions,
    requestedVersionId,
    resolvedVersionId,
    versionNumber: versionSelection.versionNumber || "1",
  };
}

type UpdateBlockResponse =
  | BackendBlock
  | { block?: BackendBlock; data?: BackendBlock };

export async function updateReportBlock(input: {
  reportId: string;
  versionId: string;
  blockId: string;
  content: string;
}) {
  const payloads = [
    { content: input.content },
    { text: input.content },
    { value: input.content },
  ];

  let lastError: Error | null = null;

  for (const payload of payloads) {
    try {
      const response = await apiFetch<UpdateBlockResponse>(
        `/reports/${input.reportId}/versions/${input.versionId}/blocks/${input.blockId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      const block =
        "block" in response ? response.block || response.data : response.data || response;

      if (!block) {
        return {
          id: input.blockId,
          type: "text",
          content: input.content,
          editable: true,
        } satisfies ReportBlock;
      }

      return normalizeBlock(block, 0);
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError || new Error("Block update failed");
}

export async function exportReportPptx(reportId: string) {
  if (!FEATURES.ENABLE_PPTX_EXPORT) {
    throw new Error("PPTX export is disabled");
  }

  console.info("[PptxExport][request start]", {
    reportId,
    endpoint: `/reports/${reportId}/export`,
    method: "POST",
  });

  const res = await fetch(apiUrl(`/reports/${reportId}/export`), {
    method: "POST",
    headers: {
      ...(getAuthHeaders() || {}),
      Accept:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation, application/json",
    },
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const errorText = await res.text();
    console.warn("[PptxExport][request failure]", {
      reportId,
      status: res.status,
      contentType,
      error: errorText || "Export failed",
    });
    throw new Error(errorText || "Export failed");
  }

  if (contentType.includes("application/json")) {
    const response = (await res.json()) as {
      message?: string;
      detail?: string;
      download_url?: string;
      downloadUrl?: string;
      file_url?: string;
      fileUrl?: string;
      url?: string;
      filename?: string;
    };
    const downloadUrl =
      response.download_url ||
      response.downloadUrl ||
      response.file_url ||
      response.fileUrl ||
      response.url;

    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = response.filename || `measurable-report-${reportId}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      console.info("[PptxExport][request success]", {
        reportId,
        mode: "json_download_url",
        downloadUrl,
      });

      return response.message || "PPTX download started.";
    }

    console.info("[PptxExport][request success]", {
      reportId,
      mode: "json_message",
      response,
    });

    return (
      response.message ||
      response.detail ||
      "Export started successfully."
    );
  }

  const blob = await res.blob();
  const filename = getFilenameFromDisposition(
    res.headers.get("content-disposition"),
    `measurable-report-${reportId}.pptx`
  );
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);

  console.info("[PptxExport][request success]", {
    reportId,
    mode: "blob",
    contentType,
    filename,
    size: blob.size,
  });

  return "PPTX download started.";
}

function getFilenameFromDisposition(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = contentDisposition.match(/filename\s*=\s*"?(.*?)"?(?:;|$)/i);

  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
}

export async function downloadReportPdf(
  reportId: string,
  options?: {
    template?: string;
  }
) {
  console.info("[PDFExport][request]", {
    reportId,
    template: options?.template || null,
  });

  const url = new URL(apiUrl(`/reports/${reportId}/download/pdf`));

  if (options?.template) {
    url.searchParams.set("template", options.template);
  }

  url.searchParams.set("_ts", String(Date.now()));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[PDFExport][failure]", {
      reportId,
      status: res.status,
      errorText,
    });
    throw new Error(errorText || "PDF download failed");
  }

  const blob = await res.blob();
  const filename = getFilenameFromDisposition(
    res.headers.get("content-disposition"),
    `measurable-report-${reportId}.pdf`
  );
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);

  console.info("[PDFExport][success]", {
    reportId,
    filename,
    size: blob.size,
  });

  return {
    filename,
    size: blob.size,
  };
}

export async function createReportShare(reportId: string) {
  const response = await apiFetch<ReportShareResponse>(`/reports/${reportId}/share`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  const shareUrl = response.share_url || response.shareUrl || "";

  if (!shareUrl) {
    throw new Error("Share URL missing");
  }

  return {
    status: response.status || "ok",
    reportId: String(response.report_id ?? response.reportId ?? reportId),
    shareToken: response.share_token || response.shareToken || "",
    shareUrl,
  };
}

export async function getPublicSharedReport(token: string) {
  const cleanToken = normalizeShareToken(token);
  const endpoint = `/public/reports/${encodeURIComponent(cleanToken)}`;

  console.info("[PUBLIC_SHARE_DEBUG][fetch]", {
    tokenUsed: cleanToken,
    endpointUsed: endpoint,
  });

  try {
    const payload = await apiFetch<PublicSharedReportResponse>(endpoint, {
      method: "GET",
      cache: "no-store",
    });

    console.info("[PUBLIC_SHARE_DEBUG][fetch]", {
      tokenUsed: cleanToken,
      endpointUsed: endpoint,
      status: 200,
    });

    const report = payload.report;
    const version = payload.version;

    if (!report || !version) {
      throw new Error("Public report payload incomplete");
    }

    const branding = extractReportBranding(report);
    const versionBranding = extractReportBranding(version);

    return {
      report: {
        ...normalizeReport(report, 0),
        blocks: (report.blocks || []).map(normalizeBlock),
        workspaceId: String(report.workspace_id ?? report.workspaceId ?? ""),
        workspaceName: report.workspace_name || report.workspaceName || undefined,
        description: normalizeReportDescriptionWithPeriod(
          report.description,
          report.period_start || report.periodStart || null,
          report.period_end || report.periodEnd || null
        ),
        branding: {
          logoUrl: branding.logoUrl,
          brandName: branding.brandName,
          source: branding.source,
          brandNameSource: branding.brandNameSource,
        },
        logoUrl: branding.logoUrl,
        brandName: branding.brandName,
        integrationType:
          report.integration_type?.trim() ||
          report.integrationType?.trim() ||
          report.integration_metadata?.integration_type?.trim() ||
          report.integrationMetadata?.integration_type?.trim() ||
          undefined,
        integrationLabel:
          report.integration_label?.trim() ||
          report.integrationLabel?.trim() ||
          report.integration_metadata?.integration_display_name?.trim() ||
          report.integrationMetadata?.integration_display_name?.trim() ||
          undefined,
        sourceName:
          report.source_name?.trim() ||
          report.sourceName?.trim() ||
          report.integration_metadata?.source_name?.trim() ||
          report.integrationMetadata?.source_name?.trim() ||
          undefined,
        channel: report.channel?.trim() || report.integration_metadata?.channel?.trim() || undefined,
        periodStart: report.period_start?.trim() || report.periodStart?.trim() || undefined,
        periodEnd: report.period_end?.trim() || report.periodEnd?.trim() || undefined,
        template: report.template?.trim() || undefined,
        reportTitle:
          report.report_title?.trim() ||
          report.reportTitle?.trim() ||
          report.title?.trim() ||
          report.name?.trim() ||
          undefined,
      } satisfies ReportDetail,
      reportVersion: {
        locale: normalizeLocale(version.locale),
        description: normalizeReportDescription(version.description),
        branding: {
          logoUrl: versionBranding.logoUrl,
          brandName: versionBranding.brandName,
          source: versionBranding.source,
          brandNameSource: versionBranding.brandNameSource,
        },
        blocks: (payload.blocks || version.blocks || []).map((block, index) => ({
          id: String(block.id ?? block.block_id ?? `public-version-block-${index}`),
          type: block.type || "text",
          data: parseBlockData(block.data_json),
          rawDataJson: block.data_json || "",
        })) satisfies ReportVersionBlock[],
      } satisfies ReportVersionView,
      isPublicShare: payload.is_public_share === true || payload.isPublicShare === true,
    };
  } catch (error) {
    console.info("[PUBLIC_SHARE_DEBUG][fetch]", {
      tokenUsed: cleanToken,
      endpointUsed: endpoint,
      status: error instanceof Error && "status" in error ? (error as { status?: number }).status ?? null : null,
      code: error instanceof Error && "code" in error ? (error as { code?: string }).code ?? null : null,
    });
    throw error;
  }
}

export async function downloadPublicSharedReportPdf(
  token: string,
  options?: {
    template?: string;
  }
) {
  console.info("[PublicSharedPDF][request]", {
    token,
    template: options?.template || null,
  });

  const url = new URL(apiUrl(`/public/reports/${token}/download/pdf`));

  if (options?.template) {
    url.searchParams.set("template", options.template);
  }

  url.searchParams.set("_ts", String(Date.now()));

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[PublicSharedPDF][failure]", {
      token,
      status: res.status,
      errorText,
    });
    throw new Error(errorText || "Public PDF download failed");
  }

  const blob = await res.blob();
  const filename = getFilenameFromDisposition(
    res.headers.get("content-disposition"),
    "measurable-shared-report.pdf"
  );
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);

  console.info("[PublicSharedPDF][success]", {
    token,
    filename,
    size: blob.size,
  });

  return {
    filename,
    size: blob.size,
  };
}
