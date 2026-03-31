import Link from "next/link";

export function ReportsEmptyState() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Library
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Aún no tienes reportes
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
          Crea tu primer reporte para empezar a organizar tus entregables y volver a ellos desde esta biblioteca.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Puedes comenzar subiendo un archivo o preparando una fuente conectada desde integraciones.
        </p>
      </div>
      <Link
        href="/reports/new"
        className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Crear tu primer reporte
      </Link>
    </section>
  );
}
