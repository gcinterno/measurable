"use client";

import { useEffect, useRef } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";

type ReportFolder = {
  id: string;
  name: string;
};

type ReportActionsMenuProps = {
  open: boolean;
  deleting: boolean;
  folders: ReportFolder[];
  folderId: string;
  onToggle: () => void;
  onClose: () => void;
  onMoveToFolder: (folderId: string) => void;
  onDelete: () => void;
};

export function ReportActionsMenu({
  open,
  deleting,
  folders,
  folderId,
  onToggle,
  onClose,
  onMoveToFolder,
  onDelete,
}: ReportActionsMenuProps) {
  const { messages } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);

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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {messages.reports.addToFolder}
          </p>
          <select
            value={folderId}
            onChange={(event) => onMoveToFolder(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">{messages.common.noFolder}</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
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
      ) : null}
    </div>
  );
}
