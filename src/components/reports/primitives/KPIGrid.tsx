"use client";

import type { ReactNode } from "react";

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
};

export function KPICard({
  label,
  value,
  meta,
  trend,
  unavailable,
  className = "h-[132px]",
}: KPICardProps) {
  return (
    <div
      className={`grid grid-rows-[auto_auto_1fr_auto] rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{meta}</p>
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
