"use client";

import { useI18n } from "@/components/providers/LanguageProvider";
import type { ReportVersion } from "@/types/report";

type ReportVersionsPanelProps = {
  versions: ReportVersion[];
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
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

function getLocaleCode(locale: "en" | "es", messages: ReturnType<typeof useI18n>["messages"]) {
  return locale === "es" ? messages.reports.localeCodeEs : messages.reports.localeCodeEn;
}

export function ReportVersionsPanel({
  versions,
  selectedVersionId,
  onVersionChange,
}: ReportVersionsPanelProps) {
  const { language, messages } = useI18n();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            {messages.reports.versionsLabel}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {messages.reports.selectVersion}
          </h2>
        </div>
        <select
          value={selectedVersionId}
          onChange={(event) => onVersionChange(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.version} · {getLocaleCode(version.locale, messages)} · {version.status} ·{" "}
              {formatDate(version.createdAt, language, messages.reports.dateUnavailable)}
            </option>
          ))}
        </select>
      </div>

      {versions.length > 0 && !versions.some((version) => version.blocks.length > 0) ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-medium text-slate-950">{version.version}</p>
              <p className="mt-1 text-sm text-slate-500">
                {messages.reports.statusLabel}: {version.status}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {messages.reports.insightLanguage}: {getLocaleCode(version.locale, messages)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {messages.reports.createdLabel}:{" "}
                {formatDate(version.createdAt, language, messages.reports.dateUnavailable)}
              </p>
              {version.rawMetadata ? (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                  {JSON.stringify(version.rawMetadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
