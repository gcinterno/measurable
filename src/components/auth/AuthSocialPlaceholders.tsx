"use client";

import { useState } from "react";

import { apiUrl } from "@/lib/api/config";
import { clearLogoutInProgress } from "@/lib/auth/session";

type AuthSocialPlaceholdersProps = {
  compact?: boolean;
};

export function AuthSocialPlaceholders({
  compact = false,
}: AuthSocialPlaceholdersProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleAuthUrl = apiUrl("/auth/google/start");

  function handleGoogleLogin() {
    clearLogoutInProgress();
    setGoogleLoading(true);
    window.location.assign(googleAuthUrl);
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-soft)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--surface)] px-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-wait disabled:opacity-70"
        >
          {googleLoading ? "Connecting..." : "Google"}
        </button>
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-muted)]"
        >
          Facebook
        </button>
      </div>
    </div>
  );
}
