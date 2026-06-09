"use client";

import { useEffect, useState } from "react";

import {
  getLastAccountSummary,
  refreshAccountSummary,
  subscribeAccountSummary,
} from "@/lib/api/account";
import { fetchWorkspaces, resolveActiveWorkspace } from "@/lib/api/workspaces";
import { isAbortError, isAuthError } from "@/lib/api";
import type { Workspace } from "@/types/workspace";

export function useActiveWorkspace(options?: { includeReportsUsage?: boolean }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [reportsUsedThisMonth, setReportsUsedThisMonth] = useState(() => {
    const summary = getLastAccountSummary();
    return typeof summary?.reportsUsed === "number" ? summary.reportsUsed : 0;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const unsubscribe = options?.includeReportsUsage
      ? subscribeAccountSummary((summary) => {
          if (!active) {
            return;
          }

          setReportsUsedThisMonth(
            typeof summary.reportsUsed === "number" ? summary.reportsUsed : 0
          );
        })
      : () => {};

    async function loadWorkspaceSummary() {
      try {
        setLoading(true);
        const [workspaces, accountSummary] = await Promise.all([
          fetchWorkspaces(),
          options?.includeReportsUsage
            ? refreshAccountSummary({ signal: controller.signal }).catch((error) => {
                if (isAbortError(error) || isAuthError(error)) {
                  throw error;
                }

                console.error("workspace account summary load error:", error);
                return getLastAccountSummary();
              })
            : Promise.resolve(null),
        ]);

        if (!active) {
          return;
        }

        setWorkspace(resolveActiveWorkspace(workspaces));
        setReportsUsedThisMonth(
          typeof accountSummary?.reportsUsed === "number" ? accountSummary.reportsUsed : 0
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
      unsubscribe();
      controller.abort();
    };
  }, [options?.includeReportsUsage]);

  return {
    workspace,
    reportsUsedThisMonth,
    loading,
  };
}
