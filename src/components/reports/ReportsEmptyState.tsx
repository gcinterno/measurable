import Link from "next/link";

import { useI18n } from "@/components/providers/LanguageProvider";

export function ReportsEmptyState() {
  const { messages } = useI18n();
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          {messages.reports.library}
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {messages.reports.noReportsYet}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
          {messages.reports.noReportsDescription}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {messages.reports.noReportsHint}
        </p>
      </div>
      <Link
        href="/reports/new/flow"
        className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {messages.reports.createFirstReport}
      </Link>
    </section>
  );
}
