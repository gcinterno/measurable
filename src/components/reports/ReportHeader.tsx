"use client";

import { useI18n } from "@/components/providers/LanguageProvider";

type ReportHeaderProps = {
  title: string;
  status: string;
  createdAt: string;
  workspaceName?: string;
  workspaceId?: string;
};

function formatDate(value: string, language: "en" | "es", fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "es" ? "es-MX" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ReportHeader({
  title,
  status,
  createdAt,
  workspaceName,
  workspaceId,
}: ReportHeaderProps) {
  const { language, messages } = useI18n();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
        {messages.reports.detailLabel}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {status}
        </span>
        <span>
          {messages.reports.createdLabel}:{" "}
          {formatDate(createdAt, language, messages.reports.dateUnavailable)}
        </span>
        {workspaceName ? (
          <span>
            {messages.reports.workspaceLabel}: {workspaceName}
          </span>
        ) : null}
        {!workspaceName && workspaceId ? (
          <span>
            {messages.reports.workspaceIdLabel}: {workspaceId}
          </span>
        ) : null}
      </div>
    </section>
  );
}
