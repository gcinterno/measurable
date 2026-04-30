"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/LanguageProvider";
import { ExportButton } from "@/components/reports/ExportButton";
import { FEATURES } from "@/config/features";

type ExportPanelProps = {
  loading: boolean;
  successMessage: string;
  error: string;
  onExport: () => void;
  disabled?: boolean;
};

export function ExportPanel({
  loading,
  successMessage,
  error,
  onExport,
  disabled = false,
}: ExportPanelProps) {
  const { messages } = useI18n();

  if (!FEATURES.ENABLE_PPTX_EXPORT) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{messages.reports.exportTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {messages.reports.exportDescription}
      </p>
      <div className="mt-5 flex flex-col gap-4">
        <ExportButton
          loading={loading}
          successMessage={successMessage}
          error={error}
          onExport={onExport}
          disabled={disabled}
        />
        <Link
          href="/reports"
          className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {messages.reports.backToReports}
        </Link>
      </div>
    </section>
  );
}
