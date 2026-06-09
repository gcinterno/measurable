"use client";

import { trackEvent } from "@/lib/analytics";

type UpgradeAnalytics = {
  currentPlan?: string;
  targetPlan?: string;
  ctaLocation: string;
};

type UpgradeLimitModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  primaryLabel?: string;
  onClose: () => void;
  onUpgrade: () => void;
  analytics?: UpgradeAnalytics;
};

export function UpgradeLimitModal({
  open,
  title = "Monthly report limit reached",
  message = "You have reached your monthly report limit.",
  primaryLabel = "View plans",
  onClose,
  onUpgrade,
  analytics,
}: UpgradeLimitModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(7,17,31,0.52)] px-4 py-6 backdrop-blur-[2px]">
      <div className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:max-h-none">
        <div className="shrink-0 border-b border-slate-200 bg-[linear-gradient(135deg,#08111f_0%,#12306d_100%)] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 stroke-current">
                <path
                  d="M5 18.5h14l-1.6-8.5-4.15 3.2L12 6.5l-1.25 6.7L6.6 10 5 18.5Z"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M8 18.5V20h8v-1.5" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {title}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-6 sm:py-6">
          <div className="space-y-4 sm:space-y-5">
            <p className="text-sm leading-6 text-slate-600 sm:leading-7">
              {message}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-slate-200/70 bg-white/88 px-5 py-3 backdrop-blur-[10px] sm:static sm:border-t sm:bg-transparent sm:px-6 sm:py-6 sm:backdrop-blur-0">
          <div className="space-y-3 sm:flex sm:flex-row sm:gap-3 sm:space-y-0">
            <button
              type="button"
              onClick={() => {
                if (analytics) {
                  trackEvent("upgrade_click", {
                    current_plan: analytics.currentPlan || "unknown",
                    target_plan: analytics.targetPlan || "unknown",
                    cta_location: analytics.ctaLocation,
                  });
                }

                onUpgrade();
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(29,78,216,0.24)] transition hover:opacity-95 sm:flex-1"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:flex-1"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
