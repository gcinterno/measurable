"use client";

import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";
import { ReportBlock } from "@/components/reports/ReportBlock";
import { ExportPanel } from "@/components/reports/ExportPanel";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportVersionsPanel } from "@/components/reports/ReportVersionsPanel";
import { FEATURES } from "@/config/features";
import {
  exportReportPptx,
  fetchReportDetail,
  fetchReportVersions,
  updateReportBlock,
} from "@/lib/api/reports";
import { getPlanCapabilities } from "@/lib/workspace/plan-limits";
import { useActiveWorkspace } from "@/lib/workspace/use-active-workspace";
import type { ReportBlock as ReportBlockType, ReportDetail, ReportVersion } from "@/types/report";

type ReportViewerProps = {
  reportId: string;
};

export function ReportViewer({ reportId }: ReportViewerProps) {
  const { messages } = useI18n();
  const { workspace } = useActiveWorkspace();
  const planCapabilities = getPlanCapabilities(workspace);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState("");

  async function loadReport() {
    try {
      setLoading(true);
      setError("");

      const [reportData, versionData] = await Promise.all([
        fetchReportDetail(reportId),
        fetchReportVersions(reportId),
      ]);

      setReport(reportData);
      setVersions(versionData);
      setSelectedVersionId(versionData[0]?.id || "");
    } catch (err: unknown) {
      console.error("report reload error:", err);
      setError(messages.reports.loadReportDescription);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadReportEffect() {
      try {
        setLoading(true);
        setError("");

        const [reportData, versionData] = await Promise.all([
          fetchReportDetail(reportId),
          fetchReportVersions(reportId),
        ]);

        if (!active) {
          return;
        }

        setReport(reportData);
        setVersions(versionData);
        setSelectedVersionId(versionData[0]?.id || "");
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        console.error("report initial load error:", err);
        setError(messages.reports.loadReportDescription);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReportEffect();

    return () => {
      active = false;
    };
  }, [messages.reports.loadReportDescription, reportId]);

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) || versions[0] || null,
    [selectedVersionId, versions]
  );

  const blocks: ReportBlockType[] = useMemo(() => {
    if (selectedVersion?.blocks.length) {
      return selectedVersion.blocks;
    }

    return (report?.blocks || []).map((block) => ({
      ...block,
      editable: false,
    }));
  }, [report?.blocks, selectedVersion]);

  async function handleSaveBlock(blockId: string, content: string) {
    const versionId = selectedVersion?.id;

    if (!versionId) {
      throw new Error("There is no selected version to save changes.");
    }

    const updatedBlock = await updateReportBlock({
      reportId,
      versionId,
      blockId,
      content,
    });

    setVersions((current) =>
      current.map((version) =>
        version.id !== versionId
          ? version
          : {
              ...version,
              blocks: version.blocks.map((block) =>
                block.id === blockId ? updatedBlock : block
              ),
            }
      )
    );
  }

  async function handleExport() {
    if (!FEATURES.ENABLE_PPTX_EXPORT) {
      return;
    }

    console.info("[PlanLimits][export.ui]", {
      currentPlan: planCapabilities.plan,
      plan: planCapabilities.plan,
      exportType: "pptx",
      reportId,
      allowed: planCapabilities.canExportPptx,
    });

    if (!planCapabilities.canExportPptx) {
      setExportError("PPTX export is available on Core and Advanced plans.");
      return;
    }

    try {
      setExportLoading(true);
      setExportError("");
      setExportSuccess("");
      console.info("[PlanLimits][export.ui]", {
        currentPlan: planCapabilities.plan,
        plan: planCapabilities.plan,
        exportType: "pptx",
        reportId,
        allowed: planCapabilities.canExportPptx,
        stage: "request start",
      });
      const message = await exportReportPptx(reportId);
      console.info("[PlanLimits][export.ui]", {
        currentPlan: planCapabilities.plan,
        plan: planCapabilities.plan,
        exportType: "pptx",
        reportId,
        allowed: planCapabilities.canExportPptx,
        stage: "request success",
      });
      setExportSuccess(message || messages.reports.exportStarted);
    } catch (err: unknown) {
      console.warn("[PlanLimits][export.ui]", {
        currentPlan: planCapabilities.plan,
        plan: planCapabilities.plan,
        exportType: "pptx",
        reportId,
        allowed: planCapabilities.canExportPptx,
        stage: "request failure",
        error: err instanceof Error ? err.message : String(err),
      });
      console.error("report export error:", err);
      setExportError(messages.reports.exportError);
    } finally {
      setExportLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="h-5 w-64 animate-pulse rounded-full bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <ReportEmptyState
        title={messages.reports.loadReportError}
        description={error}
        onRefresh={loadReport}
      />
    );
  }

  if (!report) {
    return (
      <ReportEmptyState
        title={messages.reports.reportNotFound}
        description={messages.reports.reportNotFoundDescription}
        onRefresh={loadReport}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ReportHeader
        title={report.title}
        status={report.status}
        createdAt={report.createdAt}
        workspaceName={report.workspaceName}
        workspaceId={report.workspaceId}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {versions.length > 0 ? (
            <ReportVersionsPanel
              versions={versions}
              selectedVersionId={selectedVersionId}
              onVersionChange={setSelectedVersionId}
            />
          ) : null}

          {blocks.length === 0 ? (
            <ReportEmptyState
              title={messages.reports.contentUnavailable}
              description={messages.reports.contentUnavailableDescription}
              onRefresh={loadReport}
            />
          ) : (
            <section className="grid gap-4">
              {blocks.map((block) => (
                <ReportBlock
                  key={block.id}
                  block={block}
                  onSave={handleSaveBlock}
                />
              ))}
            </section>
          )}
        </div>

        <div className="space-y-6">
          {FEATURES.ENABLE_PPTX_EXPORT ? (
            <ExportPanel
              loading={exportLoading}
              successMessage={exportSuccess}
              error={exportError}
              onExport={handleExport}
              disabled={blocks.length === 0 || !planCapabilities.canExportPptx}
            />
          ) : null}

          {versions.length === 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">
                {messages.reports.versionsLabel}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {messages.reports.contentUnavailableDescription}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
