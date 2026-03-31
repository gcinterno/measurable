import Link from "next/link";

import { ExportButton } from "@/components/reports/ExportButton";

type ExportPanelProps = {
  loading: boolean;
  successMessage: string;
  error: string;
  onExport: () => void;
  disabled?: boolean;
};

export function ExportPanel({
  loading,
  successMessage,
  error,
  onExport,
  disabled = false,
}: ExportPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">Exportar</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Genera una salida PPTX cuando el contenido del reporte este listo para compartirse.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        <ExportButton
          loading={loading}
          successMessage={successMessage}
          error={error}
          onExport={onExport}
          disabled={disabled}
        />
        <Link
          href="/reports"
          className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Volver a reportes
        </Link>
      </div>
    </section>
  );
}
