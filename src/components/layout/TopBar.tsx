"use client";

import { useRouter } from "next/navigation";

import { clearSession } from "@/lib/auth/session";
import { usePreferencesStore } from "@/lib/store/preferences-store";

export function TopBar() {
  const router = useRouter();
  const displayName = usePreferencesStore((state) => state.displayName);
  const logoDataUrl = usePreferencesStore((state) => state.logoDataUrl);
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <header
      className={`sticky top-0 z-30 px-5 py-4 backdrop-blur sm:px-6 lg:px-8 ${
        darkMode
          ? "border-b border-slate-700/80 bg-slate-950/88"
          : "border-b border-slate-200/80 bg-white/88"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            Measurable workspace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`hidden rounded-2xl px-4 py-3 text-sm md:block ${
              darkMode
                ? "border border-slate-700 bg-slate-900 text-slate-300"
                : "border border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            Team workspace
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition ${
              darkMode
                ? "border border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Logout
          </button>
          <div
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 shadow-sm ${
              darkMode
                ? "border border-slate-700 bg-slate-900"
                : "border border-slate-200 bg-white"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-semibold text-white">
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
            <div>
              <p className={`text-sm font-medium ${darkMode ? "text-white" : "text-slate-950"}`}>
                {displayName}
              </p>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
