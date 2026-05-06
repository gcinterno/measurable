import Link from "next/link";

import { useI18n } from "@/components/providers/LanguageProvider";

export function ReportsEmptyState() {
  const { messages } = useI18n();
  return (
    <section className="brand-card rounded-[28px] p-6 sm:p-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--measurable-blue)]">
          {messages.reports.library}
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          {messages.reports.noReportsYet}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
          {messages.reports.noReportsDescription}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {messages.reports.noReportsHint}
        </p>
      </div>
      <Link
        href="/reports/new/flow"
        className="mt-6 inline-flex rounded-2xl bg-[var(--navy-900)] px-5 py-3 text-sm font-semibold !text-white transition hover:bg-[var(--navy-950)]"
      >
        {messages.reports.createFirstReport}
      </Link>
    </section>
  );
}
