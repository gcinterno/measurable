"use client";

type SharedReportExpiredStateProps = {
  variant: "expired" | "not_found" | "generic";
  exportMode?: boolean;
};

const VARIANT_COPY = {
  expired: {
    title: "Este link de reporte ha expirado",
    description:
      "Por seguridad, los reportes compartidos de Measurable están disponibles durante 3 días. Puedes volver a generar un link desde tu cuenta.",
  },
  not_found: {
    title: "No encontramos este reporte compartido",
    description:
      "El link pudo haber sido eliminado, revocado o escrito incorrectamente.",
  },
  generic: {
    title: "No pudimos cargar este reporte compartido.",
    description: "Intenta abrir el enlace de nuevo en unos minutos.",
  },
} as const;

export function SharedReportExpiredState({
  variant,
  exportMode = false,
}: SharedReportExpiredStateProps) {
  const copy = VARIANT_COPY[variant];

  return (
    <div
      className={`min-h-screen bg-[#f3f7fb] ${exportMode ? "public-share-pdf-mode" : ""}`}
      data-pdf-error={exportMode ? "true" : undefined}
    >
      <div className="mx-auto flex min-h-screen max-w-[1180px] items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full max-w-[680px] rounded-[36px] border border-white/70 bg-white px-6 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#eef4ff] ring-1 ring-[#dbe6ff]">
              <img src="/brand/measurable-logo.svg" alt="Measurable" className="h-7 w-auto" />
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {copy.title}
          </h1>

          <p className="mx-auto mt-4 max-w-[560px] text-base leading-7 text-slate-600 sm:text-lg">
            {copy.description}
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href="https://www.measurableapp.com"
              className="inline-flex h-14 items-center justify-center rounded-[22px] bg-[var(--measurable-blue)] px-8 text-base font-semibold text-white shadow-[0_18px_40px_rgba(23,73,255,0.22)] transition hover:scale-[1.01] hover:bg-[var(--measurable-blue-hover)]"
            >
              Visita la página
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
