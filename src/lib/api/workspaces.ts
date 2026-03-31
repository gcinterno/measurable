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
};

type WorkspacesResponse =
  | BackendWorkspace[]
  | {
      workspaces?: BackendWorkspace[];
      items?: BackendWorkspace[];
      data?: BackendWorkspace[];
    };

export async function fetchWorkspaces() {
  const response = await apiFetch<WorkspacesResponse>("/workspaces");
  const workspaces = Array.isArray(response)
    ? response
    : response.workspaces || response.items || response.data || [];

  return workspaces.map((workspace, index) => ({
    id: String(workspace.id ?? `workspace-${index}`),
    name: workspace.name || `Workspace ${index + 1}`,
    slug: workspace.slug || "",
  })) satisfies Workspace[];
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
