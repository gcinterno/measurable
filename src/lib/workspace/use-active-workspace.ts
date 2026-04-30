"use client";

import { useEffect, useState } from "react";

import { fetchReports } from "@/lib/api/reports";
import { fetchWorkspaces, resolveActiveWorkspace } from "@/lib/api/workspaces";
import { isAbortError, isAuthError } from "@/lib/api";
import type { Workspace } from "@/types/workspace";

function isReportFromCurrentMonth(createdAt: string) {
  if (!createdAt) {
    return false;
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    createdDate.getFullYear() === now.getFullYear() &&
    createdDate.getMonth() === now.getMonth()
  );
}

export function useActiveWorkspace(options?: { includeReportsUsage?: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [reportsUsedThisMonth, setReportsUsedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadWorkspaceSummary() {
      try {
        setLoading(true);

        const [workspaces, reports] = await Promise.all([
          fetchWorkspaces(),
          options?.includeReportsUsage ? fetchReports().catch(() => []) : Promise.resolve([]),
        ]);

        if (!active) {
          return;
        }

        setWorkspace(resolveActiveWorkspace(workspaces));
        setReportsUsedThisMonth(
          reports.filter((report) => isReportFromCurrentMonth(report.createdAt)).length
        );
      } catch (error) {
        if (!active || isAbortError(error) || isAuthError(error)) {
          return;
        }

        console.error("active workspace summary load error:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWorkspaceSummary();

    return () => {
      active = false;
    };
  }, [options?.includeReportsUsage]);

  return {
    workspace,
    reportsUsedThisMonth,
    loading,
  };
}
