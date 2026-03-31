import type { Report } from "@/types/report";
import type {
  ReportBlock,
  ReportDetail,
  ReportVersion,
  ReportVersionBlock,
} from "@/types/report";

import { apiFetch } from "@/lib/api";
import { apiUrl } from "@/lib/api/config";
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
  blocks?: BackendBlock[] | null;
};

type BackendVersionViewBlock = {
  id?: string | number;
  block_id?: string | number;
  type?: string | null;
  data_json?: string | null;
};

type BackendVersionViewResponse = {
  blocks?: BackendVersionViewBlock[] | null;
};

type ReportsResponse =
  | BackendReport[]
  | { reports?: BackendReport[]; items?: BackendReport[]; data?: BackendReport[] };

function normalizeReport(report: BackendReport, index: number): Report {
  const id = report.id ?? report.report_id ?? `report-${index}`;

  return {
    id: String(id),
    title: report.title || report.name || `Reporte ${index + 1}`,
    status: report.status || "Sin estado",
    createdAt: report.created_at || report.createdAt || "",
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

  return {
    id: String(version.id ?? `version-${index}`),
    version: String(version.version ?? version.name ?? `Version ${index + 1}`),
    createdAt: version.created_at || version.createdAt || "",
    status: version.status || "Sin estado",
    blocks,
    rawMetadata:
      blocks.length === 0
        ? {
            id: version.id,
            version: version.version,
            name: version.name,
            status: version.status,
            created_at: version.created_at,
            createdAt: version.createdAt,
          }
        : undefined,
  };
}

export async function fetchReports() {
  const response = await apiFetch<ReportsResponse>("/reports");
  const reports = Array.isArray(response)
    ? response
    : response.reports || response.items || response.data || [];

  return reports.map(normalizeReport);
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
};

function extractReportId(response: CreateReportResponse) {
  const reportId =
    response.report_id ??
    response.reportId ??
    response.id ??
    response.data?.report_id ??
    response.data?.reportId ??
    response.data?.id;

  if (!reportId) {
    throw new Error("Report id missing in create report response");
  }

  return String(reportId);
}

export async function createReport(input: {
  name: string;
  datasetId: string;
}) {
  const workspaceId = getActiveWorkspaceId();

  if (!workspaceId) {
    throw new Error("Selecciona un workspace activo antes de crear un reporte.");
  }

  const payloads = [
    {
      name: input.name,
      dataset_id: input.datasetId,
      workspace_id: workspaceId,
    },
    {
      title: input.name,
      dataset_id: input.datasetId,
      workspace_id: workspaceId,
    },
    {
      name: input.name,
      datasetId: input.datasetId,
      workspace_id: workspaceId,
    },
    {
      name: input.name,
      dataset_id: input.datasetId,
      workspaceId,
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

export async function createMetaPagesReport(input: { datasetId: string }) {
  const payload = {
    dataset_id: Number(input.datasetId),
    title: "Meta Pages Overview",
  };

  const response = await apiFetch<CreateReportResponse>("/reports/meta-pages", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  console.log("create meta pages report response:", response);

  return {
    raw: response,
    reportId: extractReportId(response),
  };
}

export async function fetchReportDetail(reportId: string) {
  const response = await apiFetch<ReportDetailResponse>(`/reports/${reportId}`);
  const report = "report" in response ? response.report || response.data : response.data || response;

  if (!report) {
    return null;
  }

  return {
    ...normalizeReport(report, 0),
    blocks: (report.blocks || []).map(normalizeBlock),
    workspaceId: String(report.workspace_id ?? report.workspaceId ?? ""),
    workspaceName: report.workspace_name || report.workspaceName || undefined,
  } satisfies ReportDetail;
}

export async function fetchReportVersions(reportId: string) {
  const response = await apiFetch<ReportVersionsResponse>(
    `/reports/${reportId}/versions`
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

export async function fetchReportVersionBlocks(
  reportId: string,
  versionId = "1"
) {
  const response = await apiFetch<BackendVersionViewResponse>(
    `/reports/${reportId}/versions/${versionId}`
  );

  return (response.blocks || []).map((block, index) => ({
    id: String(block.id ?? block.block_id ?? `version-block-${index}`),
    type: block.type || "text",
    data: parseBlockData(block.data_json),
    rawDataJson: block.data_json || "",
  })) satisfies ReportVersionBlock[];
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
  const res = await fetch(apiUrl(`/reports/${reportId}/export`), {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Export failed");
  }

  if (contentType.includes("application/json")) {
    const response = (await res.json()) as {
      message?: string;
      detail?: string;
    };

    return (
      response.message ||
      response.detail ||
      "Exportacion iniciada correctamente."
    );
  }

  return "Exportacion completada correctamente.";
}
