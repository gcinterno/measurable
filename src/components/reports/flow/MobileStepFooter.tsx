"use client";

import Link from "next/link";

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
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 border-t border-slate-200 bg-white/96 px-4 pb-4 pt-3 shadow-[0_-12px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="inline-flex min-w-[5.5rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
          >
            {secondaryLabel}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
