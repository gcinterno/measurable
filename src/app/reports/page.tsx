"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { ReportLibraryCard } from "@/components/reports/ReportLibraryCard";
import { ReportsEmptyState } from "@/components/reports/ReportsEmptyState";
import { isAbortError, isAuthError } from "@/lib/api";
import { fetchReports } from "@/lib/api/reports";
import { formatNumber } from "@/lib/formatters";
import { getActiveWorkspaceId } from "@/lib/workspace/session";
import type { Report } from "@/types/report";

type ReportFolder = {
  id: string;
  name: string;
};

const REPORT_FOLDERS_KEY = "reportFolders";
const REPORT_FOLDER_ASSIGNMENTS_KEY = "reportFolderAssignments";
const REPORTS_CACHE_KEY = "reportsPageCache";
const INITIAL_VISIBLE_REPORTS = 12;

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

function loadCachedReports() {
  if (typeof window === "undefined") {
    return [] as Report[];
  }

  try {
    const raw = window.localStorage.getItem(REPORTS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Report[]) : [];
  } catch {
    return [];
  }
}

function saveCachedReports(reports: Report[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(reports));
}

export default function ReportsPage() {
  const { language, messages } = useI18n();
  const [reports, setReports] = useState<Report[]>([]);
  const [folders, setFolders] = useState<ReportFolder[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState("");
  const [openMenuFolderId, setOpenMenuFolderId] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStaleBanner, setShowStaleBanner] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_REPORTS);

  useEffect(() => {
    console.log("reports page mounted");
    setFolders(loadStoredFolders());
    setAssignments(loadStoredAssignments());
    setReports(loadCachedReports());
  }, []);

  const loadReports = useCallback(async (signal?: AbortSignal) => {
    const workspaceId = getActiveWorkspaceId();
    const hasToken =
      typeof window !== "undefined" ? Boolean(window.localStorage.getItem("token")) : false;

    console.log("workspace/user context resolved", {
      workspaceId: workspaceId || null,
      hasToken,
    });

    setLoading(true);
    setError("");
    setShowStaleBanner(false);

    try {
      const data = await fetchReports({ signal });

      setReports(data);
      saveCachedReports(data);
      console.log("final rendered report count", data.length);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }

      if (!isAuthError(err)) {
        console.error("reports list error:", err);
      }

      const cachedReports = loadCachedReports();

      if (cachedReports.length > 0) {
        setReports(cachedReports);
        setShowStaleBanner(true);
        console.log("final rendered report count", cachedReports.length);
        return;
      }

      setError(messages.reports.loadReportDescription);
    } finally {
      setLoading(false);
    }
  }, [messages.reports.loadReportDescription]);

  useEffect(() => {
    const controller = new AbortController();

    void loadReports(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadReports]);

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
  const displayedReports = useMemo(
    () => visibleReports.slice(0, visibleCount),
    [visibleCount, visibleReports]
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  }, [activeFolderId, reports.length]);

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

  function openRenameFolder(folderId: string) {
    const currentFolder = folders.find((folder) => folder.id === folderId);

    if (!currentFolder) {
      return;
    }

    setRenamingFolderId(folderId);
    setRenameFolderName(currentFolder.name);
    setOpenMenuFolderId("");
  }

  function handleRenameFolder(folderId: string) {
    const currentFolder = folders.find((folder) => folder.id === folderId);
    const nextName = renameFolderName.trim();

    if (!currentFolder || !nextName || nextName === currentFolder.name) {
      setRenamingFolderId("");
      setRenameFolderName("");
      return;
    }

    const nextFolders = folders.map((folder) =>
      folder.id === folderId
        ? {
            ...folder,
            name: nextName,
          }
        : folder
    );

    setFolders(nextFolders);
    saveFolders(nextFolders);
    setRenamingFolderId("");
    setRenameFolderName("");
  }

  function handleDeleteFolder(folderId: string) {
    const currentFolder = folders.find((folder) => folder.id === folderId);

    if (!currentFolder) {
      return;
    }

    const confirmed = window.confirm(
      messages.reports.folderDeleteConfirm.replace("{name}", currentFolder.name)
    );

    if (!confirmed) {
      setOpenMenuFolderId("");
      return;
    }

    const nextFolders = folders.filter((folder) => folder.id !== folderId);
    const nextAssignments = { ...assignments };

    Object.keys(nextAssignments).forEach((reportId) => {
      if (nextAssignments[reportId] === folderId) {
        delete nextAssignments[reportId];
      }
    });

    setFolders(nextFolders);
    saveFolders(nextFolders);
    setAssignments(nextAssignments);
    saveAssignments(nextAssignments);
    setOpenMenuFolderId("");

    if (activeFolderId === folderId) {
      setActiveFolderId("");
    }

    if (renamingFolderId === folderId) {
      setRenamingFolderId("");
      setRenameFolderName("");
    }
  }

  return (
    <AppShell>
      <section className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 px-2 py-1 text-center sm:rounded-[28px] sm:border sm:border-slate-200 sm:bg-white sm:p-8 sm:text-left sm:shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="mx-auto max-w-2xl sm:mx-0">
            <p className="hidden text-sm font-semibold uppercase tracking-[0.2em] text-sky-600 sm:block">
              {messages.reports.library}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {messages.reports.libraryTitle}
            </h2>
            <p className="mt-3 hidden text-sm leading-6 text-slate-500 sm:block sm:text-base">
              {messages.reports.libraryDescription}
            </p>
          </div>

          <Link
            href="/reports/new/flow"
            className="mx-auto hidden rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800 sm:inline-flex sm:mx-0"
          >
            {messages.nav.newReport}
          </Link>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setShowCreateFolderModal(true)}
            className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            + {messages.reports.folderCreate}
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
              {messages.common.error}
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reports.loadReportsErrorTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              {error}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {messages.reports.loadReportsErrorDescription}
            </p>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {messages.reports.tryAgain}
            </button>
          </section>
        ) : null}

        {!loading && !error && showStaleBanner ? (
          <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            {messages.reports.staleBanner}
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
                  {messages.reports.folderNone}
                </button>
                {folders.map((folder) => {
                  const active = activeFolderId === folder.id;

                  return (
                    <div key={folder.id} className="relative">
                      <div
                        className={`flex items-center overflow-hidden rounded-2xl text-sm font-semibold transition ${
                          active
                            ? "bg-sky-600 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFolderId(folder.id)}
                          className="px-4 py-2.5"
                        >
                          {folder.name}
                        </button>
                        <button
                          type="button"
                          aria-label={`Folder options for ${folder.name}`}
                          onClick={() =>
                            setOpenMenuFolderId((current) =>
                              current === folder.id ? "" : folder.id
                            )
                          }
                          className={`px-3 py-2.5 transition ${
                            active
                              ? "bg-sky-700/30 text-white hover:bg-sky-700/50"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          ...
                        </button>
                      </div>

                      {openMenuFolderId === folder.id ? (
                        <div className="absolute left-0 top-12 z-10 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                          <button
                            type="button"
                            onClick={() => openRenameFolder(folder.id)}
                            className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            {messages.reports.folderRename}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="flex w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            {messages.reports.folderDelete}
                          </button>
                        </div>
                      ) : null}

                      {renamingFolderId === folder.id ? (
                        <div className="absolute left-0 top-12 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {messages.reports.folderRename}
                          </p>
                          <input
                            type="text"
                            value={renameFolderName}
                            onChange={(event) => setRenameFolderName(event.target.value)}
                            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                            autoFocus
                          />
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingFolderId("");
                                setRenameFolderName("");
                              }}
                              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                              {messages.common.cancel}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRenameFolder(folder.id)}
                              className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              {messages.common.save}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                    {messages.nav.reports}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    {messages.reports.latestReports}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeFolderId
                      ? messages.reports.folderViewSelected.replace(
                          "{name}",
                          folders.find((folder) => folder.id === activeFolderId)?.name ||
                            messages.reports.folderNone
                        )
                      : messages.reports.folderViewNone}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {formatNumber(visibleReports.length, 0)}
                </span>
              </div>

              {visibleReports.length > 0 ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {displayedReports.map((report) => (
                    <ReportLibraryCard
                      key={report.id}
                      report={report}
                      folders={folders}
                      folderId={assignments[report.id] || ""}
                      onMoveToFolder={handleMoveReport}
                      onDeleted={(reportId) => {
                        const nextReports = reports.filter((item) => item.id !== reportId);
                        const nextAssignments = { ...assignments };
                        delete nextAssignments[reportId];
                        setReports(nextReports);
                        saveCachedReports(nextReports);
                        setAssignments(nextAssignments);
                        saveAssignments(nextAssignments);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                  {messages.reports.noReportsInFolder}
                </div>
              )}

              {visibleReports.length > displayedReports.length ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) => current + INITIAL_VISIBLE_REPORTS)
                    }
                    className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {messages.reports.viewMore}
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>

      {showCreateFolderModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              {messages.reports.folderNew}
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {messages.reports.folderCreate}
            </h3>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              {messages.reports.folderName}
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder={language === "es" ? "ej. Reportes 2025" : "e.g. 2025 Reports"}
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
                {messages.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {messages.common.create}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
