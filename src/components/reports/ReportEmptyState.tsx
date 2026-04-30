"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/LanguageProvider";

type ReportEmptyStateProps = {
  title: string;
  description: string;
  onRefresh?: () => void;
  showRefresh?: boolean;
};

export function ReportEmptyState({
  title,
  description,
  onRefresh,
  showRefresh = true,
}: ReportEmptyStateProps) {
  const { messages } = useI18n();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
        {description}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {messages.reports.emptyStateHint}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {showRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {messages.reports.refresh}
          </button>
        ) : null}
        <Link
          href="/reports"
          className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {messages.reports.backToReports}
        </Link>
      </div>
    </section>
  );
}
