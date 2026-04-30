import type { Report } from "@/types/report";
import type {
  ReportBlock,
  ReportDetail,
  ReportLocale,
  ReportVersion,
  ReportVersionBlock,
  ReportVersionView,
} from "@/types/report";

import { apiFetch, isAbortError, isAuthError } from "@/lib/api";
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
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  workspace_id?: string | number | null;
  workspaceId?: string | number | null;
  workspace_name?: string | null;
  workspaceName?: string | null;
  description?: unknown;
  logo_url?: string | null;
  logoUrl?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  branding?: {
    logo_url?: string | null;
    logoUrl?: string | null;
  } | null;
  blocks?: BackendBlock[] | null;
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
  logo_url?: string | null;
  logoUrl?: string | null;
  branding?: {
    logo_url?: string | null;
    logoUrl?: string | null;
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
  logo_url?: string | null;
  logoUrl?: string | null;
  branding?: {
    logo_url?: string | null;
    logoUrl?: string | null;
  } | null;
  blocks?: BackendVersionViewBlock[] | null;
};

type ReportsResponse =
  | BackendReport[]
  | { reports?: BackendReport[]; items?: BackendReport[]; data?: BackendReport[] };

function normalizeReport(report: BackendReport, index: number): Report {
  const id = report.id ?? report.report_id ?? `report-${index}`;
  const normalizedThumbnailUrl =
    report.thumbnailUrl || report.thumbnail_url || undefined;
  const branding = extractReportBranding(report);

  return {
    id: String(id),
    title: report.title || report.name || `Reporte ${index + 1}`,
    status: report.status || "No status",
    createdAt: report.created_at || report.createdAt || "",
    thumbnailUrl: normalizedThumbnailUrl,
    branding: {
      logoUrl: branding.logoUrl,
      source: branding.source,
    },
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

function extractReportBranding(
  report: BackendReport | BackendVersion | BackendVersionViewResponse
) {
  if (report.branding?.logoUrl) {
    return {
      logoUrl: report.branding.logoUrl,
      source: "branding.logoUrl",
    };
  }

  if (report.branding?.logo_url) {
    return {
      logoUrl: report.branding.logo_url,
      source: "branding.logo_url",
    };
  }

  if (report.logoUrl) {
    return {
      logoUrl: report.logoUrl,
      source: "logoUrl",
    };
  }

  if (report.logo_url) {
    return {
      logoUrl: report.logo_url,
      source: "logo_url",
    };
  }

  return {
    logoUrl: undefined,
    source: "empty",
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
      source: branding.source,
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

export async function fetchReports(options?: { signal?: AbortSignal }) {
  const finalUrl = apiUrl("/reports");
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

      const response = await apiFetch<ReportsResponse>("/reports", {
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
  const response = await fetch(apiUrl(`/reports/${reportId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (response.ok) {
    return;
  }

  const rawText = await response.text();

  throw new Error(rawText || "Could not delete the report");
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
  timeframe: string;
  startDate?: string;
  endDate?: string;
  requestedSlides?: number;
  aiMode?: "standard" | "agents";
}) {
  const locale = getCurrentLocale();
  const payload = {
    dataset_id: Number(input.datasetId),
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
      source: branding.source,
    },
    logoUrl: branding.logoUrl,
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
      source: branding.source,
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

export async function downloadReportPdf(reportId: string) {
  const res = await fetch(apiUrl(`/reports/${reportId}/download/pdf`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
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
}
