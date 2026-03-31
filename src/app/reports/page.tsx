"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ReportsEmptyState } from "@/components/reports/ReportsEmptyState";
import { fetchReports } from "@/lib/api/reports";
import type { Report } from "@/types/report";

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

function saveFolders(folders: ReportFolder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REPORT_FOLDERS_KEY, JSON.stringify(folders));
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

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState("");
  const [openMenuReportId, setOpenMenuReportId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setFolders(loadStoredFolders());
    setAssignments(loadStoredAssignments());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchReports();

        if (!active) {
          return;
        }

        setReports(data);
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        console.error("reports list error:", err);
        setError(
          "No pudimos cargar tu libreria de reportes en este momento. Intenta actualizar la vista."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, []);

  const unassignedReports = useMemo(
    () => reports.filter((report) => !assignments[report.id]),
    [assignments, reports]
  );

  const visibleReports = useMemo(() => {
    if (!activeFolderId) {
      return unassignedReports;
    }

    return reports.filter((report) => assignments[report.id] === activeFolderId);
  }, [activeFolderId, assignments, reports, unassignedReports]);

  function handleCreateFolder() {
    const trimmedName = newFolderName.trim();

    if (!trimmedName) {
      return;
    }

    const nextFolders = [
      ...folders,
      {
        id: `folder-${Date.now()}`,
        name: trimmedName,
      },
    ];

    setFolders(nextFolders);
    saveFolders(nextFolders);
    setNewFolderName("");
    setShowCreateFolderModal(false);
  }

  function handleMoveReport(reportId: string, folderId: string) {
    const nextAssignments = {
      ...assignments,
    };

    if (!folderId) {
      delete nextAssignments[reportId];
    } else {
      nextAssignments[reportId] = folderId;
    }

    setAssignments(nextAssignments);
    saveAssignments(nextAssignments);
  }

  return (
    <AppShell>
      <section className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Library
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Tus reportes
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Organiza reportes en carpetas para agruparlos por año, cliente o cualquier criterio operativo.
            </p>
          </div>

          <Link
            href="/reports/new"
            className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Nuevo reporte
          </Link>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowCreateFolderModal(true)}
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            + Crear carpeta
          </button>
        </div>

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
              <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
              <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
            </div>
          </section>
        ) : null}

        {!loading && error ? (
          <section className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
              Error
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              No fue posible cargar los reportes
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {error}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Tu sesion sigue activa. Solo necesitamos volver a consultar la lista.
            </p>
          </section>
        ) : null}

        {!loading && !error && reports.length === 0 ? <ReportsEmptyState /> : null}

        {!loading && !error && reports.length > 0 ? (
          <div className="space-y-5">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveFolderId("")}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeFolderId === ""
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Sin carpeta
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      activeFolderId === folder.id
                        ? "bg-sky-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {folder.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                    Reportes
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    Ultimos reportes
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeFolderId
                      ? `Viendo los reportes de ${
                          folders.find((folder) => folder.id === activeFolderId)?.name ||
                          "la carpeta seleccionada"
                        }.`
                      : "Viendo reportes sin carpeta."}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {visibleReports.length}
                </span>
              </div>

              {visibleReports.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {visibleReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/reports/${report.id}`}
                          className="block truncate text-sm font-medium text-slate-950 transition hover:text-sky-700 sm:text-base"
                        >
                          <span>{report.title}</span>
                          <span className="ml-2 text-slate-500">
                            creado el {formatDate(report.createdAt)}
                          </span>
                        </Link>
                      </div>

                      <div className="relative flex shrink-0 justify-end">
                        <button
                          type="button"
                          aria-label="Opciones del reporte"
                          onClick={() =>
                            setOpenMenuReportId((current) =>
                              current === report.id ? "" : report.id
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          ...
                        </button>

                        {openMenuReportId === report.id ? (
                          <div className="absolute right-0 top-11 z-10 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Añadir a carpeta
                            </p>
                            <select
                              value={assignments[report.id] || ""}
                              onChange={(event) => {
                                handleMoveReport(report.id, event.target.value);
                                setOpenMenuReportId("");
                              }}
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
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  No hay reportes en esta carpeta por ahora.
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>

      {showCreateFolderModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Nueva carpeta
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Crear carpeta
            </h3>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Nombre de carpeta
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Ej. Reportes 2025"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              autoFocus
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName("");
                }}
                className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
