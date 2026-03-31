"use client";

import { useEffect, useMemo, useState } from "react";

import { ReportBlock } from "@/components/reports/ReportBlock";
import { ExportPanel } from "@/components/reports/ExportPanel";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { ReportVersionsPanel } from "@/components/reports/ReportVersionsPanel";
import {
  exportReportPptx,
  fetchReportDetail,
  fetchReportVersions,
  updateReportBlock,
} from "@/lib/api/reports";
import type { ReportBlock as ReportBlockType, ReportDetail, ReportVersion } from "@/types/report";

type ReportViewerProps = {
  reportId: string;
};

export function ReportViewer({ reportId }: ReportViewerProps) {
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
    } catch (err: any) {
      console.error("report reload error:", err);
      setError(
        "No pudimos cargar este reporte en este momento. Vuelve a intentarlo en unos segundos."
      );
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
      } catch (err: any) {
        if (!active) {
          return;
        }

        console.error("report initial load error:", err);
        setError(
          "No pudimos cargar este reporte en este momento. Vuelve a intentarlo en unos segundos."
        );
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
  }, [reportId]);

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
      throw new Error("No hay una version seleccionada para guardar cambios.");
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
    try {
      setExportLoading(true);
      setExportError("");
      setExportSuccess("");
      const message = await exportReportPptx(reportId);
      setExportSuccess(message || "La exportacion se inicio correctamente.");
    } catch (err: any) {
      console.error("report export error:", err);
      setExportError(
        "No pudimos iniciar la exportacion del PPTX. Intenta nuevamente en unos segundos."
      );
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
        title="No fue posible cargar el reporte"
        description={error}
        onRefresh={loadReport}
      />
    );
  }

  if (!report) {
    return (
      <ReportEmptyState
        title="Reporte no encontrado"
        description="No encontramos un payload valido para este reporte. Revisa el listado y vuelve a intentarlo."
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
              title="El contenido del reporte aún no está disponible"
              description="Este reporte existe, pero todavia no tenemos bloques listos para renderizar. Puedes actualizar la vista o volver al listado."
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
          <ExportPanel
            loading={exportLoading}
            successMessage={exportSuccess}
            error={exportError}
            onExport={handleExport}
            disabled={blocks.length === 0}
          />

          {versions.length === 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">Versions</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                El reporte aun no tiene versiones disponibles desde backend.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
