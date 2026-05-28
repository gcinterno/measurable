"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";

type ReportFolder = {
  id: string;
  name: string;
};

const REPORT_PDF_DOWNLOADS_LOCKED = true;
const REPORT_SHARE_LOCKED = REPORT_PDF_DOWNLOADS_LOCKED;

type ReportActionsMenuProps = {
  open: boolean;
  deleting: boolean;
  pdfLoading?: boolean;
  shareLoading?: boolean;
  savingFolder?: boolean;
  folders: ReportFolder[];
  folderId: string;
  pendingFolderId: string;
  quickActionFeedback?: string;
  quickActionError?: string;
  viewHref?: string;
  saveFeedback?: string;
  saveError?: string;
  onToggle: () => void;
  onClose: () => void;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onPendingFolderChange: (folderId: string) => void;
  onSaveFolder: () => void;
  onDelete: () => void;
};

export function ReportActionsMenu({
  open,
  deleting,
  pdfLoading = false,
  shareLoading = false,
  savingFolder = false,
  folders,
  folderId,
  pendingFolderId,
  quickActionFeedback,
  quickActionError,
  viewHref,
  saveFeedback,
  saveError,
  onToggle,
  onClose,
  onDownloadPdf,
  onShare,
  onPendingFolderChange,
  onSaveFolder,
  onDelete,
}: ReportActionsMenuProps) {
  const { language, messages } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pdfDownloadLocked = REPORT_PDF_DOWNLOADS_LOCKED;
  const shareLocked = REPORT_SHARE_LOCKED;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Report options"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        ...
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="space-y-1 pb-3">
            {viewHref ? (
              <Link
                href={viewHref}
                onClick={onClose}
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {language === "es" ? "Ver reporte" : "View report"}
              </Link>
            ) : null}
            {onDownloadPdf ? (
              <div className="group relative">
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  disabled={pdfDownloadLocked || pdfLoading}
                  aria-disabled={pdfDownloadLocked}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed ${
                    pdfDownloadLocked
                      ? "border border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7ed_100%)] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      : "text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  }`}
                >
                  <span>
                    {pdfLoading ? "Preparing PDF..." : messages.reports.downloadPdf}
                  </span>
                  {pdfDownloadLocked ? (
                    <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Locked
                    </span>
                  ) : null}
                </button>
                {pdfDownloadLocked ? (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                    Coming soon
                  </span>
                ) : null}
              </div>
            ) : null}
            {onShare ? (
              <div className="group relative">
                <button
                  type="button"
                  onClick={onShare}
                  disabled={shareLocked || shareLoading}
                  aria-disabled={shareLocked}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed ${
                    shareLocked
                      ? "border border-amber-200 bg-[linear-gradient(135deg,#fffdf7_0%,#fff7ed_100%)] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      : "text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  }`}
                >
                  <span>{shareLoading ? messages.common.generating : messages.common.share}</span>
                  {shareLocked ? (
                    <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Locked
                    </span>
                  ) : null}
                </button>
                {shareLocked ? (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                    Coming soon
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {quickActionFeedback ? (
            <p className="pb-3 text-xs font-medium text-emerald-600">{quickActionFeedback}</p>
          ) : null}
          {quickActionError ? (
            <p className="pb-3 text-xs font-medium text-red-600">{quickActionError}</p>
          ) : null}
          <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {messages.reports.addToFolder}
          </p>
          <select
            value={pendingFolderId}
            onChange={(event) => onPendingFolderChange(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">{messages.common.noFolder}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              {messages.common.cancel}
            </button>
            <button
              type="button"
              onClick={onSaveFolder}
              disabled={savingFolder || pendingFolderId === folderId}
              className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {savingFolder ? "Saving..." : messages.common.save}
            </button>
          </div>
          {saveFeedback ? (
            <p className="mt-2 text-xs font-medium text-emerald-600">{saveFeedback}</p>
          ) : null}
          {saveError ? (
            <p className="mt-2 text-xs font-medium text-red-600">{saveError}</p>
          ) : null}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? messages.common.deletingReport : messages.common.deleteReport}
            </button>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
