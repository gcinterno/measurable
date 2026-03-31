"use client";

import { useState } from "react";

import type { Report } from "@/types/report";

type RecentReportCardProps = {
  report: Report;
};

type ReportFolder = {
  id: string;
  name: string;
};

const REPORT_FOLDERS_KEY = "reportFolders";
const REPORT_FOLDER_ASSIGNMENTS_KEY = "reportFolderAssignments";

function loadStoredFolders() {
  if (typeof window === "undefined") {
    return [] as ReportFolder[];
  }

  try {
    const raw = window.localStorage.getItem(REPORT_FOLDERS_KEY);
    return raw ? (JSON.parse(raw) as ReportFolder[]) : [];
  } catch {
    return [];
  }
}

function loadStoredAssignments() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  try {
    const raw = window.localStorage.getItem(REPORT_FOLDER_ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveAssignments(assignments: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    REPORT_FOLDER_ASSIGNMENTS_KEY,
    JSON.stringify(assignments)
  );
}

function formatDate(value: string) {
  if (!value) {
    return "Fecha no disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function RecentReportCard({ report }: RecentReportCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [folders] = useState<ReportFolder[]>(() => loadStoredFolders());
  const [folderId, setFolderId] = useState(() => {
    const storedAssignments = loadStoredAssignments();
    return storedAssignments[report.id] || "";
  });

  function handleMoveToFolder(nextFolderId: string) {
    const nextAssignments = {
      ...loadStoredAssignments(),
    };

    if (!nextFolderId) {
      delete nextAssignments[report.id];
    } else {
      nextAssignments[report.id] = nextFolderId;
    }

    saveAssignments(nextAssignments);
    setFolderId(nextFolderId);
    setMenuOpen(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-950 sm:text-base">
          <span>{report.title}</span>
          <span className="ml-2 text-slate-500">
            creado el {formatDate(report.createdAt)}
          </span>
        </p>
      </div>

      <div className="relative flex shrink-0 justify-end">
        <button
          type="button"
          aria-label="Opciones del reporte"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          ...
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-11 z-10 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Añadir a carpeta
            </p>
            <select
              value={folderId}
              onChange={(event) => handleMoveToFolder(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Sin carpeta</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
