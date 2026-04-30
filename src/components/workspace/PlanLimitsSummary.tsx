"use client";

import Link from "next/link";

import { FEATURES } from "@/config/features";
import { formatNumber } from "@/lib/formatters";
import {
  formatReportsUsageLabel,
  formatSlidesUsageLabel,
  formatPlanName,
  getReportsLimit,
  getStorageLimit,
  getStoragePercent,
  isReportsNearLimit,
  isSlideEstimateNearLimit,
  isStorageNearLimit,
  shouldShowUpgradeCta,
} from "@/lib/workspace/plan-limits";
import type { Workspace } from "@/types/workspace";

type PlanLimitsSummaryProps = {
  workspace: Workspace | null;
  reportsUsedThisMonth?: number;
  estimatedSlides?: number;
  compact?: boolean;
  variant?: "default" | "sidebar" | "plans";
};

function SummaryTile({
  label,
  value,
  tone = "default",
  dark = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        dark
          ? tone === "warning"
            ? "border-amber-400/30 bg-amber-500/10"
            : "border-white/10 bg-white/6"
          : tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          dark
            ? tone === "warning"
              ? "text-amber-300"
              : "text-slate-400"
            : tone === "warning"
              ? "text-amber-700"
              : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-medium ${
          dark
            ? tone === "warning"
              ? "text-amber-50"
              : "text-white"
            : tone === "warning"
              ? "text-amber-950"
              : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressStat({
  label,
  value,
  percent,
  warning = false,
  premium = false,
}: {
  label: string;
  value: string;
  percent: number;
  warning?: boolean;
  premium?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-300">{label}</span>
        <span
          className={`font-semibold ${
            premium
              ? "text-sky-100"
              : warning
                ? "text-amber-200"
                : "text-white"
          }`}
        >
          {value}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${
            premium
              ? "bg-[linear-gradient(90deg,#fde68a_0%,#f8fafc_45%,#38bdf8_100%)] shadow-[0_0_12px_rgba(125,211,252,0.65)]"
              : warning
              ? "bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_100%)]"
              : "bg-[linear-gradient(90deg,#38bdf8_0%,#2563eb_100%)]"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function PlanLimitsSummary({
  workspace,
  reportsUsedThisMonth = 0,
  estimatedSlides = 0,
  compact = false,
  variant = "default",
}: PlanLimitsSummaryProps) {
  if (!workspace) {
    return null;
  }

  const reportsLimit = getReportsLimit(workspace);
  const reportsPercent =
    reportsLimit && reportsLimit > 0
      ? Math.min((reportsUsedThisMonth / reportsLimit) * 100, 100)
      : 0;
  const premiumReports = !reportsLimit && workspace.plan?.toLowerCase() === "advanced";
  const storageLimit = getStorageLimit(workspace);
  const storagePercent = getStoragePercent(workspace);
  const reportTone = isReportsNearLimit(workspace, reportsUsedThisMonth)
    ? "warning"
    : "default";
  const storageTone = isStorageNearLimit(workspace) ? "warning" : "default";
  const slidesTone = isSlideEstimateNearLimit(workspace, estimatedSlides)
    ? "warning"
    : "default";
  const planLabel = formatPlanName(workspace.plan);
  const showUpgrade = shouldShowUpgradeCta({
    workspace,
    reportsUsedThisMonth,
    estimatedSlides,
  });
  const reportsLabel = formatReportsUsageLabel(workspace, reportsUsedThisMonth);
  const slidesLabel = formatSlidesUsageLabel(workspace);

  if (variant === "sidebar") {
    return (
      <section className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
        <div className="space-y-4">
          {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
            <ProgressStat
              label="Reports generated"
              value={reportsLabel}
              percent={premiumReports ? 100 : reportsPercent}
              warning={reportTone === "warning"}
              premium={premiumReports}
            />
          ) : null}
          <ProgressStat
            label="Storage used"
            value={storageLimit ? `${formatNumber(storagePercent, 0)}%` : "Unlimited"}
            percent={storagePercent}
            warning={storageTone === "warning"}
          />
        </div>
      </section>
    );
  }

  if (variant === "plans") {
    return (
      <section className="mt-6 rounded-[28px] border border-slate-800 bg-slate-950 p-4 text-white sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
              Current plan
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {planLabel || "Active plan"}
            </h3>
          </div>
          {showUpgrade ? (
            <Link
              href="/plans"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/12"
            >
              Upgrade plan
            </Link>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <SummaryTile
            label="Reports"
            value={reportsLabel}
            tone={reportTone}
            dark
          />
          <SummaryTile
            label="Slides"
            value={slidesLabel}
            tone={slidesTone}
            dark
          />
          <SummaryTile
            label="Storage"
            value={storageLimit ? `${formatNumber(storagePercent, 0)}% used` : "Unlimited"}
            tone={storageTone}
            dark
          />
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-[24px] border border-slate-200 bg-white ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
            Current plan
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {planLabel || "Active plan"}
          </h3>
        </div>
        {showUpgrade ? (
          <Link
            href="/plans"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
          >
            Upgrade plan
          </Link>
        ) : null}
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "grid-cols-1" : "md:grid-cols-3"}`}>
        <SummaryTile
          label="Reports"
          value={reportsLabel}
          tone={reportTone}
        />
        <SummaryTile
          label="Slides"
          value={slidesLabel}
          tone={slidesTone}
        />
        <SummaryTile
          label="Storage"
          value={storageLimit ? `${formatNumber(storagePercent, 0)}% used` : "Unlimited"}
          tone={storageTone}
        />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            storageTone === "warning"
              ? "bg-[linear-gradient(90deg,#f59e0b_0%,#f97316_100%)]"
              : "bg-[linear-gradient(90deg,#0f172a_0%,#0284c7_100%)]"
          }`}
          style={{ width: `${storagePercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {`${formatNumber(storagePercent, 0)}% used`}
      </p>
    </section>
  );
}
