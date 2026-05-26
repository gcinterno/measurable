"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { fetchAccountSummary } from "@/lib/api/account";
import { logoutUser } from "@/lib/api/auth";
import { isAbortError, isAuthError } from "@/lib/api";
import { startLogoutInProgress } from "@/lib/auth/session";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";

export function TopBar() {
  const router = useRouter();
  const { messages } = useI18n();
  const preferenceBrandName = usePreferencesStore((state) => state.brandName);
  const preferenceDisplayName = usePreferencesStore((state) => state.displayName);
  const preferenceLogoUrl = usePreferencesStore((state) => state.logoDataUrl);
  const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
  const theme = usePreferencesStore((state) => state.theme);
  const logout = useAuthStore((state) => state.logout);
  const { workspace } = useActiveWorkspace();
  const [accountDisplayName, setAccountDisplayName] = useState("");
  const brandName =
    accountDisplayName ||
    preferenceDisplayName ||
    workspace?.branding?.brandName ||
    workspace?.name ||
    preferenceBrandName;
  const logoDataUrl = workspace?.branding?.logoUrl || preferenceLogoUrl;
  const darkMode = theme === "dark";
  const initials = brandName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadAccountSummary() {
      try {
        const summary = await fetchAccountSummary({
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setAccountDisplayName(summary.accountDisplayNameEffective);
        updatePreferences({
          displayName: summary.accountDisplayNameEffective,
        });
      } catch (error) {
        if (!isAbortError(error) && !isAuthError(error)) {
          console.error("top bar account summary error:", error);
        }
      }
    }

    void loadAccountSummary();

    return () => {
      active = false;
      controller.abort();
    };
  }, [updatePreferences]);

  async function handleLogout() {
    startLogoutInProgress();

    try {
      await logoutUser();
    } catch (error) {
      console.warn("logout request failed", {
        message: error instanceof Error ? error.message : "Unknown logout error",
      });
    } finally {
      logout();
      router.replace("/login");
    }
  }

  return (
    <header
      className={`sticky top-0 z-30 px-4 py-4 backdrop-blur sm:px-6 ${
        darkMode
          ? "border-b border-slate-700/80 bg-slate-950/88"
          : "border-b border-[var(--border-soft)] bg-white/92"
      }`}
    >
      <div className="flex items-center justify-between gap-2 sm:flex-wrap sm:items-center sm:gap-4">
        <div className="min-w-0 shrink-0">
          <div className="sm:hidden">
            <img
              src={darkMode ? "/brand/measurable-logo-white.svg" : "/brand/measurable-logo-black.svg"}
              alt="Measurable"
              className="h-16 w-auto object-contain"
            />
          </div>
          <p className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-[var(--measurable-blue)] sm:block">
            {messages.shell.measurableWorkspace}
          </p>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
          <div
            className={`hidden rounded-2xl px-4 py-3 text-sm sm:order-none sm:w-auto sm:block ${
              darkMode
                ? "border border-slate-700 bg-slate-900 text-slate-300"
                : "border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-secondary)]"
            }`}
          >
            {messages.shell.teamWorkspace}
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-medium shadow-sm transition sm:order-none sm:px-4 sm:py-3 sm:text-sm sm:flex-none ${
              darkMode
                ? "border border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                : "border border-[var(--border-soft)] bg-white text-[var(--navy-900)] hover:bg-[var(--surface-soft)]"
            }`}
          >
            {messages.shell.logout}
          </button>
          <div
            className={`flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 shadow-sm sm:order-none sm:flex-none sm:gap-3 sm:px-3 ${
              darkMode
                ? "border border-slate-700 bg-slate-900"
                : "border border-[var(--border-soft)] bg-white"
            }`}
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#07111f] text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDataUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                initials || "AL"
              )}
            </div>
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-medium sm:text-sm ${darkMode ? "text-white" : "text-slate-950"}`}
              >
                {brandName}
              </p>
              <p className={`text-[11px] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {messages.shell.admin}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
