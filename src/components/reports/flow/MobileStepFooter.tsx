"use client";

import Link from "next/link";

import { usePreferencesStore } from "@/lib/store/preferences-store";

type MobileStepFooterProps = {
  primaryLabel: string;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function MobileStepFooter({
  primaryLabel,
  onPrimaryClick,
  primaryDisabled = false,
  secondaryHref,
  secondaryLabel,
}: MobileStepFooterProps) {
  const theme = usePreferencesStore((state) => state.theme);
  const darkMode = theme === "dark";

  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 px-4 pb-4 pt-3 backdrop-blur md:hidden ${
        darkMode
          ? "border-t border-white/10 bg-[rgba(7,17,31,0.94)] shadow-[0_-12px_24px_rgba(2,6,23,0.3)]"
          : "border-t border-slate-200 bg-white/96 shadow-[0_-12px_24px_rgba(15,23,42,0.08)]"
      }`}
    >
      <div className="flex items-center gap-3">
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className={`inline-flex min-w-[5.5rem] items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium ${
              darkMode
                ? "border border-white/10 bg-white/5 text-slate-200"
                : "border border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {secondaryLabel}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
          className={`inline-flex flex-1 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${
            darkMode
              ? "bg-white/10 hover:bg-white/14 disabled:bg-white/6"
              : "bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300"
          }`}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
