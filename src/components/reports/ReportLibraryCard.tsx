"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ReportActionsMenu } from "@/components/dashboard/ReportActionsMenu";
import { ReportPreviewThumbnail } from "@/components/dashboard/ReportPreviewThumbnail";
import { useI18n } from "@/components/providers/LanguageProvider";
import { FEATURES } from "@/config/features";
import {
  createReportShare,
  deleteReport,
  downloadReportPdf,
  fetchReportDetail,
} from "@/lib/api/reports";
import {
  getReportIntegrationBadgeDetails,
  type ReportIntegrationPlatform,
} from "@/lib/reports/integration-metadata";
import type { Report } from "@/types/report";

type ReportFolder = {
  id: string;
  name: string;
};

type ReportLibraryCardProps = {
  report: Report;
  folders: ReportFolder[];
  folderId?: string;
  onMoveToFolder?: (reportId: string, folderId: string) => Promise<void> | void;
  onDeleted?: (reportId: string) => Promise<void> | void;
  onDeleteError?: (error: unknown) => void;
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
  onDeleteError,
}: ReportLibraryCardProps) {
  const { language } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState(folderId);
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderFeedback, setFolderFeedback] = useState("");
  const [folderError, setFolderError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [quickActionFeedback, setQuickActionFeedback] = useState("");
  const [quickActionError, setQuickActionError] = useState("");
  const baseIntegrationBadge = useMemo(
    () => getReportIntegrationBadgeDetails(report),
    [report]
  );
  const [badgeReportOverride, setBadgeReportOverride] = useState<Report | null>(null);
  const detailIntegrationBadge = useMemo(
    () => (badgeReportOverride ? getReportIntegrationBadgeDetails(badgeReportOverride) : null),
    [badgeReportOverride]
  );
  const activeTemplate = report.template || undefined;
  const effectiveReport = useMemo(() => {
    if (!badgeReportOverride) {
      return report;
    }

    return {
      ...report,
      ...badgeReportOverride,
      integrationMetadata:
        badgeReportOverride.integrationMetadata || report.integrationMetadata,
      reportSources:
        badgeReportOverride.reportSources?.length
          ? badgeReportOverride.reportSources
          : report.reportSources,
      rawIntegrationHints:
        badgeReportOverride.rawIntegrationHints || report.rawIntegrationHints,
      description: badgeReportOverride.description || report.description,
      sourceSummary: badgeReportOverride.sourceSummary || report.sourceSummary,
      title: badgeReportOverride.title || report.title,
    } satisfies Report;
  }, [badgeReportOverride, report]);
  const integrationBadge = useMemo(
    () => getReportIntegrationBadgeDetails(effectiveReport),
    [effectiveReport]
  );

  useEffect(() => {
    setBadgeReportOverride(null);
  }, [report.id]);

  useEffect(() => {
    if (baseIntegrationBadge.label !== "Legacy Report" || badgeReportOverride) {
      return;
    }

    let active = true;

    async function loadReportDetailForBadge() {
      try {
        const detail = await fetchReportDetail(report.id);

        if (!active || !detail) {
          return;
        }

        const mergedDetail = {
          ...report,
          ...detail,
          integrationMetadata: detail.integrationMetadata || report.integrationMetadata,
          reportSources:
            detail.reportSources?.length ? detail.reportSources : report.reportSources,
          rawIntegrationHints: detail.rawIntegrationHints || report.rawIntegrationHints,
          description: detail.description || report.description,
          sourceSummary: detail.sourceSummary || report.sourceSummary,
          title: detail.title || report.title,
        } satisfies Report;
        const nextDetailBadge = getReportIntegrationBadgeDetails(mergedDetail);

        if (process.env.NODE_ENV !== "production") {
          console.debug("[legacy-report-debug]", {
            reportId: report.id,
            title: report.title,
            integration_metadata: report.integrationMetadata,
            integrationMetadata: report.integrationMetadata,
            rawIntegrationHints: report.rawIntegrationHints,
            sourceSummary: report.sourceSummary,
            description: report.description,
            report_type: report.rawIntegrationHints?.reportType,
            channel: report.integrationMetadata?.channel || report.rawIntegrationHints?.channel,
            social_network:
              report.integrationMetadata?.socialNetwork ||
              report.rawIntegrationHints?.socialNetwork,
            baseBadge: baseIntegrationBadge.badgeLabel,
            detailBadge: nextDetailBadge.badgeLabel,
            effectiveBadge:
              nextDetailBadge.label !== "Legacy Report"
                ? nextDetailBadge.badgeLabel
                : baseIntegrationBadge.badgeLabel,
          });
        }

        if (nextDetailBadge.label !== "Legacy Report") {
          setBadgeReportOverride(mergedDetail);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("report badge detail fallback error:", {
          reportId: report.id,
          error,
        });
      }
    }

    void loadReportDetailForBadge();

    return () => {
      active = false;
    };
  }, [badgeReportOverride, baseIntegrationBadge, report]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[report-card-badge-state]", {
        reportId: report.id,
        baseBadge: baseIntegrationBadge.badgeLabel,
        detailBadge: detailIntegrationBadge?.badgeLabel || null,
        effectiveBadge: integrationBadge.badgeLabel,
        detailFallbackUsed: Boolean(badgeReportOverride),
      });
    }
  }, [
    badgeReportOverride,
    baseIntegrationBadge.badgeLabel,
    detailIntegrationBadge?.badgeLabel,
    integrationBadge.badgeLabel,
    report.id,
  ]);

  function IntegrationBadgeIcon({ platform }: { platform: ReportIntegrationPlatform }) {
    if (platform === "csv" || platform === "upload") {
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-700">
          {platform === "csv" ? "C" : "U"}
        </span>
      );
    }

    if (platform === "instagram") {
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)] text-[9px] font-bold text-white">
          I
        </span>
      );
    }

    if (platform === "tiktok") {
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[9px] font-bold text-white">
          T
        </span>
      );
    }

    if (platform === "facebook") {
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-[9px] font-bold text-white">
          f
        </span>
      );
    }

    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[9px] font-bold text-slate-700">
        L
      </span>
    );
  }

  async function copyText(value: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  async function handleSaveFolder() {
    try {
      setSavingFolder(true);
      setFolderError("");
      await onMoveToFolder?.(report.id, pendingFolderId);
      setFolderFeedback("Folder updated");
      window.setTimeout(() => {
        setFolderFeedback("");
        setMenuOpen(false);
      }, 1200);
    } catch (error) {
      console.error("report folder update error:", error);
      setFolderError("The folder could not be saved.");
    } finally {
      setSavingFolder(false);
    }
  }

  useEffect(() => {
    if (!menuOpen) {
      setPendingFolderId(folderId);
    }
  }, [folderId, menuOpen]);

  async function handleDeleteReport() {
    try {
      setDeleting(true);
      await deleteReport(report.id);
      await onDeleted?.(report.id);
      setDeleteFeedback("Report deleted successfully.");
      setDeleteConfirmOpen(false);
      setMenuOpen(false);
    } catch (error) {
      console.error("report library delete error:", error);
      setDeleteConfirmOpen(false);
      if (onDeleteError) {
        onDeleteError(error);
        return;
      }

      window.alert("No se pudo eliminar el reporte. Intenta nuevamente.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      setPdfLoading(true);
      setQuickActionError("");
      setQuickActionFeedback("");
      console.info("[PDF_TEMPLATE_AUDIT]", {
        reportId: report.id,
        activeTemplate: activeTemplate || null,
        source: activeTemplate ? "report" : "default",
      });
      await downloadReportPdf(
        report.id,
        activeTemplate ? { template: activeTemplate } : undefined
      );
      setQuickActionFeedback("PDF listo.");
      window.setTimeout(() => {
        setQuickActionFeedback("");
        setMenuOpen(false);
      }, 1200);
    } catch (error) {
      console.error("report library pdf download error:", error);
      setQuickActionError("The PDF could not be downloaded. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleShareReport() {
    try {
      setShareLoading(true);
      setQuickActionError("");
      setQuickActionFeedback("");
      const response = await createReportShare(report.id);
      await copyText(response.shareUrl);
      setQuickActionFeedback("Link copied");
      window.setTimeout(() => {
        setQuickActionFeedback("");
        setMenuOpen(false);
      }, 1200);
    } catch (error) {
      console.error("report library share error:", error);
      setQuickActionError("The link could not be copied.");
    } finally {
      setShareLoading(false);
    }
  }

  return (
    <article
      className={`overflow-visible rounded-[16px] border-0 bg-transparent p-0 shadow-none transition hover:-translate-y-0.5 sm:border sm:border-[var(--border-soft)] sm:bg-white sm:p-4 sm:shadow-[0_10px_24px_rgba(7,17,31,0.05)] sm:hover:border-[var(--border-blue-soft)] sm:hover:shadow-[0_14px_30px_rgba(7,17,31,0.08)] ${
        menuOpen ? "relative z-20" : ""
      }`}
    >
      <ReportPreviewThumbnail report={effectiveReport} />

      <div className="-mt-8 rounded-[16px] border border-[var(--border-soft)] bg-white p-3.5 shadow-[0_14px_30px_rgba(7,17,31,0.06)] ring-1 ring-white/70 sm:-mt-9 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--measurable-blue)]">
            {report.status}
          </p>
          <h4 className="mt-2.5 line-clamp-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.15rem]">
            {report.title}
          </h4>
          <p className="mt-1.5 text-sm text-slate-500">
            {language === "es" ? "Creado" : "Created"} {formatDate(report.createdAt)}
          </p>
          {report.sourceSummary ? (
            <p className="mt-1 text-sm text-slate-500">
              {report.sourceSummary}
            </p>
          ) : null}
          <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="flex shrink-0 items-center gap-1">
              {integrationBadge.platforms.slice(0, 3).map((platform) => (
                <IntegrationBadgeIcon key={`${report.id}-${platform}`} platform={platform} />
              ))}
            </span>
            <span className="truncate">{integrationBadge.badgeLabel}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2.5">
          {!FEATURES.ENABLE_APP_REVIEW_MODE ? (
            <Link
              href={`/reports/${report.id}`}
              className="inline-flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-[var(--measurable-blue)] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[var(--measurable-blue-hover)]"
            >
              {language === "es" ? "Ver reporte" : "View report"}
            </Link>
          ) : null}
          <ReportActionsMenu
            open={menuOpen}
            deleting={deleting}
            pdfLoading={pdfLoading}
            shareLoading={shareLoading}
            savingFolder={savingFolder}
            folders={folders}
            folderId={folderId}
            pendingFolderId={pendingFolderId}
            quickActionFeedback={quickActionFeedback}
            quickActionError={quickActionError}
            viewHref={`/reports/${report.id}`}
            saveFeedback={folderFeedback}
            saveError={folderError}
            onToggle={() => setMenuOpen((current) => !current)}
            onClose={() => {
              setPendingFolderId(folderId);
              setFolderError("");
              setQuickActionError("");
              setMenuOpen(false);
            }}
            onDownloadPdf={() => void handleDownloadPdf()}
            onShare={() => void handleShareReport()}
            onPendingFolderChange={(nextFolderId) => {
              setPendingFolderId(nextFolderId);
              setFolderFeedback("");
              setFolderError("");
            }}
            onSaveFolder={() => void handleSaveFolder()}
            onDelete={() => setDeleteConfirmOpen(true)}
          />
        </div>
        {deleteFeedback ? (
          <p className="mt-3 text-sm text-emerald-600">{deleteFeedback}</p>
        ) : null}
      </div>

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <h3 className="text-xl font-semibold text-slate-950">Delete report</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to delete this report? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteReport()}
                disabled={deleting}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {deleting ? "Deleting..." : "Delete report"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
