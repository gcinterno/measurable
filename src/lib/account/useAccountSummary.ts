"use client";

import { useEffect, useState } from "react";

import {
  getLastAccountSummary,
  refreshAccountSummary,
  subscribeAccountSummary,
  type AccountSummary,
} from "@/lib/api/account";
import { isAbortError, isAuthError } from "@/lib/api";

export function useAccountSummary(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(() =>
    enabled ? getLastAccountSummary() : null
  );
  const [loading, setLoading] = useState(enabled && !getLastAccountSummary());

  useEffect(() => {
    if (!enabled) {
      setAccountSummary(null);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const cachedSummary = getLastAccountSummary();

    if (cachedSummary) {
      setAccountSummary(cachedSummary);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const unsubscribe = subscribeAccountSummary((summary) => {
      if (!active) {
        return;
      }

      setAccountSummary(summary);
      setLoading(false);
    });

    async function loadAccountSummary() {
      try {
        const summary = await refreshAccountSummary({
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setAccountSummary(summary);
      } catch (error) {
        if (!active || isAbortError(error) || isAuthError(error)) {
          return;
        }

        console.error("account summary load error:", error);

        if (!cachedSummary) {
          setAccountSummary(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAccountSummary();

    return () => {
      active = false;
      unsubscribe();
      controller.abort();
    };
  }, [enabled]);

  return {
    accountSummary,
    loading,
  };
}
