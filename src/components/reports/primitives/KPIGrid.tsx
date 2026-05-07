"use client";

import type { ReactNode } from "react";

import type { ReportTemplateId } from "@/lib/reports/template-selection";
import { getTemplateTone } from "@/components/reports/slides/template";

type KPIGridProps = {
  columns: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
};

const COLUMN_CLASS: Record<KPIGridProps["columns"], string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function KPIGrid({ columns, children, className = "" }: KPIGridProps) {
  return <div className={`grid ${COLUMN_CLASS[columns]} gap-3 ${className}`}>{children}</div>;
}

type KPICardProps = {
  label: string;
  value: string;
  meta: string;
  trend?: "up" | "down";
  unavailable?: boolean;
  className?: string;
  templateId?: ReportTemplateId;
};

export function KPICard({
  label,
  value,
  meta,
  trend,
  unavailable,
  className = "h-[132px]",
  templateId = "executive",
}: KPICardProps) {
  const tone = getTemplateTone(templateId);
  const modern = templateId === "modern";

  return (
    <div
      className={`grid grid-rows-[auto_auto_1fr_auto] rounded-[22px] border px-4 py-4 ${tone.card} ${className}`}
    >
      {modern ? <div className="mb-3 h-1.5 w-12 rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#7dd3fc_100%)]" /> : null}
      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.accent}`}>
        {label}
      </p>
      <p className={`mt-2 text-sm font-semibold ${tone.title}`}>{value}</p>
      <p className={`mt-1 text-sm ${tone.subtitle}`}>{meta}</p>
      {trend && !unavailable ? (
        <p
          className={`mt-2 text-xs font-semibold uppercase tracking-[0.18em] ${
            trend === "up" ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {trend === "up" ? "Upward trend" : "Downward trend"}
        </p>
      ) : null}
    </div>
  );
}
