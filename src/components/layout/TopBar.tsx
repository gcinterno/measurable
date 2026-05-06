"use client";

import { useRouter } from "next/navigation";

import { useI18n } from "@/components/providers/LanguageProvider";
import { logoutUser } from "@/lib/api/auth";
import { startLogoutInProgress } from "@/lib/auth/session";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useAuthStore } from "@/lib/store/auth-store";

export function TopBar() {
  const router = useRouter();
  const { messages } = useI18n();
  const brandName = usePreferencesStore((state) => state.brandName);
  const logoDataUrl = usePreferencesStore((state) => state.logoDataUrl);
  const theme = usePreferencesStore((state) => state.theme);
  const logout = useAuthStore((state) => state.logout);
  const darkMode = theme === "dark";
  const initials = brandName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

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
          <p className="text-sm font-semibold tracking-tight text-[var(--text-primary)] sm:text-xs sm:uppercase sm:tracking-[0.22em] sm:text-[var(--measurable-blue)]">
            <span className="sm:hidden">Measurable</span>
            <span className="hidden sm:inline">{messages.shell.measurableWorkspace}</span>
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
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[var(--measurable-blue)] text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDataUrl}
                  alt="Logo"
                  className="h-full w-full object-cover"
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
