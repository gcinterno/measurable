"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/LanguageProvider";

export function IntegrationDropzoneCard() {
  const { messages } = useI18n();
  return (
    <section className="new-report-card max-w-full rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8 md:max-w-none">
      <div className="new-report-dropzone rounded-[28px] border-2 border-dashed border-sky-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_100%)] p-5 sm:p-8">
        <div className="flex min-h-[240px] flex-col items-center justify-center text-center sm:min-h-[280px]">
          <Link
            href="/reports/new/flow"
            aria-label={messages.nav.newReport}
            className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-3xl !text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 sm:h-20 sm:w-20"
          >
            +
          </Link>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {messages.reports.createNewReport}
          </h2>
          <Link
            href="/integrations"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800"
          >
            {messages.reports.openIntegrations}
          </Link>
        </div>
      </div>
    </section>
  );
}
