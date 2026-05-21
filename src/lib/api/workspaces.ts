import type { Workspace } from "@/types/workspace";

import { apiFetch } from "@/lib/api";
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

  if (input.logoUrl !== undefined) {
    payload.logo_url = input.logoUrl ?? null;
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
