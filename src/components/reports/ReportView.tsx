"use client";

import { useEffect, useMemo, useState } from "react";

import { SlideRenderer } from "@/components/reports/SlideRenderer";
import { buildExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";
import { fetchReportVersionBlocks } from "@/lib/api/reports";
import { setReportChatContext } from "@/lib/reports/chat-context";
import type { ReportVersionBlock } from "@/types/report";

type ReportViewProps = {
  reportId: string;
};

function getReportTitle(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return titleBlock?.data.text || `Reporte ${blocks.length > 0 ? "Meta" : ""}`.trim();
}

function getReportSummary(blocks: ReportVersionBlock[]) {
  const textBlock = blocks.find((block) => block.type === "text" && block.data.text);
  return textBlock?.data.text || "";
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="aspect-[16/9] w-full rounded-[34px] border border-slate-800/80 bg-[#07111f] p-6 sm:p-8 lg:p-10">
          <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 h-20 w-2/3 animate-pulse rounded-[28px] bg-white/10" />
          <div className="mt-6 h-28 w-1/2 animate-pulse rounded-[28px] bg-white/5" />
        </div>
      </section>
      <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="aspect-[16/9] w-full rounded-[34px] border border-slate-800/80 bg-[#07111f] p-6 sm:p-8 lg:p-10">
          <div className="grid h-full gap-4 lg:grid-cols-3">
            <div className="animate-pulse rounded-[28px] bg-white/10" />
            <div className="animate-pulse rounded-[28px] bg-white/5" />
            <div className="animate-pulse rounded-[28px] bg-white/5" />
          </div>
        </div>
      </section>
      <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="aspect-[16/9] w-full rounded-[34px] border border-slate-800/80 bg-[#07111f] p-6 sm:p-8 lg:p-10">
          <div className="grid h-full gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="animate-pulse rounded-[28px] bg-white/10" />
            <div className="grid gap-4">
              <div className="animate-pulse rounded-[28px] bg-white/10" />
              <div className="animate-pulse rounded-[28px] bg-white/5" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StateCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="mx-auto max-w-[980px] rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="rounded-[32px] border border-slate-800/80 bg-[linear-gradient(145deg,#07111f_0%,#0f172a_100%)] p-8 text-white sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300">
          Executive Dark
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          {description}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

export default function ReportView({ reportId }: ReportViewProps) {
  const [blocks, setBlocks] = useState<ReportVersionBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchReportVersionBlocks(reportId, "1");

        if (!active) {
          return;
        }

        setBlocks(data);
      } catch (err: unknown) {
        console.error("report version view error:", err);

        if (!active) {
          return;
        }

        setError(
          "No pudimos cargar el contenido del reporte. Intenta nuevamente en unos segundos."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [reportId]);

  const title = useMemo(() => getReportTitle(blocks), [blocks]);
  const summary = useMemo(() => getReportSummary(blocks), [blocks]);
  const viewModel = useMemo(
    () => buildExecutiveDarkViewModel(blocks),
    [blocks]
  );

  useEffect(() => {
    if (blocks.length === 0) {
      return;
    }

    const stats = blocks
      .filter((block) => block.type === "stat")
      .map((block, index) => ({
        label: block.data.label || `KPI ${index + 1}`,
        value:
          block.data.value === null ||
          block.data.value === undefined ||
          block.data.value === ""
            ? "N/A"
            : String(block.data.value),
      }));

    setReportChatContext({
      reportId,
      title,
      summary,
      stats,
    });
  }, [blocks, reportId, summary, title]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <StateCard
        title="No fue posible cargar el reporte"
        description={error}
        actionLabel="Volver a intentar"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (blocks.length === 0) {
    return (
      <StateCard
        title="Este reporte no tiene bloques"
        description="Cuando el backend termine de generar el contenido, aparecerá aquí automáticamente."
        actionLabel="Actualizar"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="mx-auto max-w-[1180px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Executive Dark
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
              Plantilla premium tipo board deck construida con los bloques del reporte.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-500">Report ID: {reportId}</p>
        </div>
      </section>

      <div className="rounded-[44px] bg-[#eef3f8] px-3 py-4 sm:px-4 sm:py-5">
        <SlideRenderer model={viewModel} />
      </div>
    </div>
  );
}
