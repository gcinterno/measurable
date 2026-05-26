import type { Workspace } from "@/types/workspace";

import { apiFetch, readApiResponseText } from "@/lib/api";
import { apiUrl } from "@/lib/api/config";
import {
  clearActiveWorkspaceId,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@/lib/workspace/session";

type BackendWorkspace = {
  id?: string | number;
  name?: string | null;
  slug?: string | null;
  plan?: string | null;
  storage_used_bytes?: string | number | null;
  storageUsedBytes?: string | number | null;
  storage_limit_bytes?: string | number | null;
  storageLimitBytes?: string | number | null;
  brand_name?: string | null;
  brandName?: string | null;
  brand_logo_url?: string | null;
  brandLogoUrl?: string | null;
  plan_limits?: {
    reports_per_month?: string | number | null;
    reportsPerMonth?: string | number | null;
    max_slides_per_report?: string | number | null;
    maxSlidesPerReport?: string | number | null;
    storage_limit_bytes?: string | number | null;
    storageLimitBytes?: string | number | null;
  } | null;
  planLimits?: {
    reports_per_month?: string | number | null;
    reportsPerMonth?: string | number | null;
    max_slides_per_report?: string | number | null;
    maxSlidesPerReport?: string | number | null;
    storage_limit_bytes?: string | number | null;
    storageLimitBytes?: string | number | null;
  } | null;
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
};

function parseOptionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

type WorkspacesResponse =
  | BackendWorkspace[]
  | {
      workspaces?: BackendWorkspace[];
      items?: BackendWorkspace[];
      data?: BackendWorkspace[];
    };

type WorkspaceDetailResponse =
  | BackendWorkspace
  | {
      workspace?: BackendWorkspace;
      data?: BackendWorkspace;
    };

type UploadWorkspaceBrandLogoResponse =
  | {
      logo_url?: string | null;
      logoUrl?: string | null;
      data?: {
        logo_url?: string | null;
        logoUrl?: string | null;
      } | null;
    }
  | null;

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("token");
}

function extractUploadedBrandLogoUrl(response: UploadWorkspaceBrandLogoResponse) {
  const logoUrl =
    response?.logo_url ??
    response?.logoUrl ??
    response?.data?.logo_url ??
    response?.data?.logoUrl;

  if (!logoUrl || !String(logoUrl).trim()) {
    throw new Error("Logo URL missing in brand logo upload response");
  }

  return String(logoUrl).trim();
}

function extractWorkspaceBranding(workspace: BackendWorkspace) {
  const logoSources: Array<[string | null | undefined, string]> = [
    [workspace.branding?.resolvedLogoUrl, "branding.resolvedLogoUrl"],
    [workspace.branding?.resolved_logo_url, "branding.resolved_logo_url"],
    [workspace.branding?.brandLogoUrl, "branding.brandLogoUrl"],
    [workspace.branding?.brand_logo_url, "branding.brand_logo_url"],
    [workspace.branding?.logoUrl, "branding.logoUrl"],
    [workspace.branding?.logo_url, "branding.logo_url"],
    [workspace.resolvedLogoUrl, "resolvedLogoUrl"],
    [workspace.resolved_logo_url, "resolved_logo_url"],
    [workspace.brandLogoUrl, "brandLogoUrl"],
    [workspace.brand_logo_url, "brand_logo_url"],
    [workspace.logoUrl, "logoUrl"],
    [workspace.logo_url, "logo_url"],
  ];
  const brandNameSources: Array<[string | null | undefined, string]> = [
    [workspace.branding?.resolvedBrandName, "branding.resolvedBrandName"],
    [workspace.branding?.resolved_brand_name, "branding.resolved_brand_name"],
    [workspace.branding?.brandName, "branding.brandName"],
    [workspace.branding?.brand_name, "branding.brand_name"],
    [workspace.resolvedBrandName, "resolvedBrandName"],
    [workspace.resolved_brand_name, "resolved_brand_name"],
    [workspace.brandName, "brandName"],
    [workspace.brand_name, "brand_name"],
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

function normalizeWorkspace(workspace: BackendWorkspace, index: number): Workspace {
  const branding = extractWorkspaceBranding(workspace);
  const planLimits = workspace.plan_limits || workspace.planLimits || null;
  const normalizedPlanLimits = {
    reportsPerMonth: parseOptionalNumber(
      planLimits?.reports_per_month ?? planLimits?.reportsPerMonth
    ),
    maxSlidesPerReport: parseOptionalNumber(
      planLimits?.max_slides_per_report ?? planLimits?.maxSlidesPerReport
    ),
    storageLimitBytes: parseOptionalNumber(
      planLimits?.storage_limit_bytes ?? planLimits?.storageLimitBytes
    ),
  };
  const storageLimitBytes =
    parseOptionalNumber(
      workspace.storage_limit_bytes ?? workspace.storageLimitBytes
    ) ?? normalizedPlanLimits.storageLimitBytes;

  return {
    id: String(workspace.id ?? `workspace-${index}`),
    name: workspace.name || `Workspace ${index + 1}`,
    slug: workspace.slug || "",
    plan: workspace.plan || undefined,
    planLimits: normalizedPlanLimits,
    storageUsedBytes: parseOptionalNumber(
      workspace.storage_used_bytes ?? workspace.storageUsedBytes
    ),
    storageLimitBytes,
    branding: {
      logoUrl: branding.logoUrl,
      brandName: branding.brandName,
      source: branding.source,
      brandNameSource: branding.brandNameSource,
    },
  } satisfies Workspace;
}

export async function fetchWorkspaces() {
  const response = await apiFetch<WorkspacesResponse>("/workspaces");
  const workspaces = Array.isArray(response)
    ? response
    : response.workspaces || response.items || response.data || [];

  return workspaces.map(normalizeWorkspace);
}

export async function fetchWorkspace(
  workspaceId: string,
  options?: {
    authToken?: string;
    signal?: AbortSignal;
  }
) {
  const headers = new Headers();

  if (options?.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  }

  const response = await apiFetch<WorkspaceDetailResponse>(`/workspaces/${workspaceId}`, {
    headers,
    credentials: "include",
    signal: options?.signal,
  });
  const workspace =
    "workspace" in response ? response.workspace || response.data : response.data || response;

  if (!workspace) {
    throw new Error("Workspace payload missing");
  }

  return normalizeWorkspace(workspace, 0);
}

export async function updateWorkspace(
  workspaceId: string,
  input: {
    name?: string;
    brandName?: string;
    logoUrl?: string | null;
  },
  options?: {
    signal?: AbortSignal;
  }
) {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name;
  }

  if (input.brandName !== undefined) {
    payload.brand_name = input.brandName;
  }

  if (input.logoUrl !== undefined) {
    payload.logo_url = input.logoUrl ?? null;
    payload.brand_logo_url = input.logoUrl ?? null;
  }

  const response = await apiFetch<WorkspaceDetailResponse>(`/workspaces/${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    signal: options?.signal,
  });
  const workspace =
    "workspace" in response ? response.workspace || response.data : response.data || response;

  if (!workspace) {
    throw new Error("Workspace payload missing after update");
  }

  return normalizeWorkspace(workspace, 0);
}

export async function getWorkspaceBranding(
  workspaceId: string,
  options?: {
    authToken?: string;
    signal?: AbortSignal;
  }
) {
  const workspace = await fetchWorkspace(workspaceId, options);

  return {
    workspace,
    branding: workspace.branding,
  };
}

export async function updateWorkspaceBranding(
  workspaceId: string,
  input: {
    brandName?: string;
    logoUrl?: string | null;
    removeLogo?: boolean;
  },
  options?: {
    signal?: AbortSignal;
  }
) {
  const payload: Record<string, unknown> = {};

  if (input.brandName !== undefined) {
    payload.brand_name = input.brandName;
    payload.brandName = input.brandName;
    payload.name = input.brandName;
  }

  if (input.removeLogo) {
    payload.remove_logo = true;
    payload.logo_url = null;
    payload.logoUrl = null;
    payload.brand_logo_url = null;
  } else if (input.logoUrl !== undefined) {
    payload.logo_url = input.logoUrl ?? null;
    payload.logoUrl = input.logoUrl ?? null;
    payload.brand_logo_url = input.logoUrl ?? null;
  }

  const attempts: Array<() => Promise<Workspace>> = [
    async () => {
      const response = await apiFetch<WorkspaceDetailResponse>("/workspace/branding", {
        method: "PATCH",
        body: JSON.stringify(payload),
        signal: options?.signal,
      });
      const workspace =
        "workspace" in response ? response.workspace || response.data : response;

      if (!workspace) {
        throw new Error("Workspace payload missing after /workspace/branding");
      }

      return normalizeWorkspace(workspace, 0);
    },
    async () => {
      const response = await apiFetch<WorkspaceDetailResponse>(`/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        signal: options?.signal,
      });
      const workspace =
        "workspace" in response ? response.workspace || response.data : response;

      if (!workspace) {
        throw new Error("Workspace payload missing after PATCH /workspaces/{id}");
      }

      return normalizeWorkspace(workspace, 0);
    },
    async () =>
      updateWorkspace(
        workspaceId,
        {
          brandName: input.brandName,
          logoUrl: input.logoUrl,
        },
        options
      ),
  ];

  let workspace: Workspace | null = null;
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      workspace = await attempt();
      break;
    } catch (error) {
      lastError = error;
      console.error("workspace branding update error:", {
        workspaceId,
        payload,
        error,
      });
    }
  }

  if (!workspace) {
    throw lastError instanceof Error ? lastError : new Error("Workspace branding update failed");
  }

  return {
    workspace,
    branding: workspace.branding,
  };
}

export async function uploadWorkspaceBrandLogo(
  file: File,
  options?: {
    signal?: AbortSignal;
  }
) {
  const endpoint = "/workspace/branding/logo";
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    body: formData,
    signal: options?.signal,
  });
  const text = await readApiResponseText(endpoint, response);
  const data = JSON.parse(text) as UploadWorkspaceBrandLogoResponse;

  return {
    raw: data,
    logoUrl: extractUploadedBrandLogoUrl(data),
  };
}

export function resolveActiveWorkspace(workspaces: Workspace[]) {
  if (workspaces.length === 0) {
    clearActiveWorkspaceId();
    return null;
  }

  const storedWorkspaceId = getActiveWorkspaceId();
  const matchedWorkspace = workspaces.find(
    (workspace) => workspace.id === storedWorkspaceId
  );

  if (matchedWorkspace) {
    return matchedWorkspace;
  }

  const fallbackWorkspace = workspaces[0];
  setActiveWorkspaceId(fallbackWorkspace.id);
  return fallbackWorkspace;
}
