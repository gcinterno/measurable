"use client";

type ExportButtonProps = {
  loading: boolean;
  successMessage: string;
  error: string;
  onExport: () => void;
  disabled?: boolean;
};

export function ExportButton({
  loading,
  successMessage,
  error,
  onExport,
  disabled = false,
}: ExportButtonProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onExport}
        disabled={loading || disabled}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        ) : null}
        {loading ? "Exportando PPTX..." : "Exportar PPTX"}
      </button>
      {disabled && !loading ? (
        <p className="text-sm text-slate-500">
          El contenido del reporte debe estar listo antes de exportar.
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-emerald-600">{successMessage}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
