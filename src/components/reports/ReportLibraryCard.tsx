"use client";

import Link from "next/link";
import { useState } from "react";

import { ReportActionsMenu } from "@/components/dashboard/ReportActionsMenu";
import { ReportPreviewThumbnail } from "@/components/dashboard/ReportPreviewThumbnail";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import { deleteReport } from "@/lib/api/reports";
import type { Report } from "@/types/report";

type ReportFolder = {
  id: string;
  name: string;
};

type ReportLibraryCardProps = {
  report: Report;
  folders: ReportFolder[];
  folderId?: string;
  onMoveToFolder?: (reportId: string, folderId: string) => void;
  onDeleted?: (reportId: string) => void;
};

function formatDate(value: string) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ReportLibraryCard({
  report,
  folders,
  folderId = "",
  onMoveToFolder,
  onDeleted,
}: ReportLibraryCardProps) {
  const { language } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteReport() {
    const confirmed = window.confirm(
      `Delete "${report.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      setMenuOpen(false);
      return;
    }

    try {
      setDeleting(true);
      await deleteReport(report.id);
      setMenuOpen(false);
      onDeleted?.(report.id);
    } catch (error) {
      console.error("report library delete error:", error);
      window.alert("We could not delete the report right now. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      className={`overflow-visible rounded-[28px] border-0 bg-transparent p-0 shadow-none transition hover:-translate-y-0.5 sm:border sm:border-slate-200 sm:bg-white sm:p-4 sm:shadow-sm sm:hover:border-slate-300 sm:hover:shadow-md ${
        menuOpen ? "relative z-20" : ""
      }`}
    >
      <ReportPreviewThumbnail report={report} />

      <div className="-mt-8 rounded-[24px] border border-slate-200/90 bg-white p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-white/70 sm:-mt-9 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
            {report.status}
          </p>
          <h4 className="mt-2.5 line-clamp-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.15rem]">
            {report.title}
          </h4>
          <p className="mt-1.5 text-sm text-slate-500">
            {language === "es" ? "Creado" : "Created"} {formatDate(report.createdAt)}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2.5">
          {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
            <Link
              href={`/reports/${report.id}`}
              className="inline-flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
            >
              {language === "es" ? "Ver reporte" : "View report"}
            </Link>
          ) : null}
          <ReportActionsMenu
            open={menuOpen}
            deleting={deleting}
            folders={folders}
            folderId={folderId}
            onToggle={() => setMenuOpen((current) => !current)}
            onClose={() => setMenuOpen(false)}
            onMoveToFolder={(nextFolderId) => {
              onMoveToFolder?.(report.id, nextFolderId);
              setMenuOpen(false);
            }}
            onDelete={() => void handleDeleteReport()}
          />
        </div>
      </div>
    </article>
  );
}
