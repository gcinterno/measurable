"use client";

import type { ExecutiveDarkViewModel } from "@/components/reports/report-view.helpers";

type SlideRendererProps = {
  model: ExecutiveDarkViewModel;
};

function SlideFrame({
  index,
  title,
  eyebrow,
  children,
}: {
  index: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[40px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mx-auto aspect-[16/9] w-full max-w-[1200px] overflow-hidden rounded-[34px] border border-slate-800/80 bg-[#07111f] shadow-[0_28px_100px_rgba(2,6,23,0.35)]">
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_24%),linear-gradient(180deg,#07111f_0%,#0b1728_100%)] p-6 text-white sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300">
                {eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl lg:text-[2.15rem]">
                {title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden items-center gap-1.5 md:flex">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2.5 rounded-full ${
                      String(dot).padStart(2, "0") === index
                        ? "w-8 bg-white"
                        : "w-2.5 bg-white/25"
                    }`}
                  />
                ))}
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                {index}/05
              </span>
            </div>
          </div>

          <div className="mt-8 min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function SlideRenderer({ model }: SlideRendererProps) {
  return (
    <div className="space-y-7">
      <SlideFrame index="01" eyebrow="Cover" title={model.title}>
        <div className="grid h-full gap-6 lg:grid-cols-[1.24fr_0.76fr]">
          <div className="flex flex-col justify-between rounded-[30px] bg-[linear-gradient(145deg,#020617_0%,#0f172a_38%,#1d4ed8_100%)] p-7 sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
                {model.deliveryLabel}
              </p>
              <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-5xl lg:text-[3.8rem]">
                {model.title}
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-slate-200 sm:text-[15px]">
                {model.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                Periodo: {model.periodLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                {model.deckLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                Board presentation
              </span>
            </div>
          </div>

          <div className="grid h-full gap-4">
            <div className="flex min-h-[260px] items-center justify-center rounded-[30px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Branding
                </p>
                <p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">
                  Logo de marca o imagen editorial
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Espacio premium para identidad visual del cliente o de la unidad de negocio.
                </p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Executive snapshot
              </p>
              <div className="mt-4 space-y-3">
                {model.heroMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-300">
                      {metric.label}
                    </span>
                    <span className="text-base font-semibold text-white">
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame
        index="02"
        eyebrow="KPI Overview"
        title="Monthly performance at a glance"
      >
        <div className="flex h-full flex-col">
          <div className="max-w-3xl">
            <p className="text-lg leading-8 text-slate-300">
              Panorama ejecutivo de los indicadores clave del periodo. Diseñado para lectura rápida en junta y discusión de resultados.
            </p>
          </div>

          <div className="mt-8 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
            {model.kpis.map((kpi, index) => (
              <article
                key={kpi.id}
                className={`flex min-h-[320px] flex-col justify-between rounded-[30px] border p-7 ${
                  index === 0
                    ? "border-sky-400/20 bg-[linear-gradient(145deg,#111827_0%,#1d4ed8_100%)]"
                    : "border-slate-200 bg-white text-slate-950"
                }`}
              >
                <div>
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${
                      index === 0 ? "text-sky-200" : "text-slate-400"
                    }`}
                  >
                    {kpi.label}
                  </p>
                  <p
                    className={`mt-10 text-5xl font-semibold leading-none tracking-[-0.06em] sm:text-6xl lg:text-[4.5rem] ${
                      index === 0 ? "text-white" : "text-slate-950"
                    }`}
                  >
                    {kpi.value}
                  </p>
                </div>

                <div
                  className={`flex items-center justify-between text-sm ${
                    index === 0 ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  <span>Monthly result</span>
                  <span>Executive KPI</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </SlideFrame>

      <SlideFrame
        index="03"
        eyebrow="Analysis"
        title="Performance, growth and context"
      >
        <div className="grid h-full gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-7 text-slate-950">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Main reading
            </p>
            <p className="mt-6 text-[15px] leading-8 text-slate-700 sm:text-base">
              {model.primaryNarrative}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,#111827_0%,#0f172a_100%)] p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                Performance insight
              </p>
              <p className="mt-6 text-lg leading-8 text-white sm:text-xl">
                {model.premiumInsight}
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-[#f8fbff] p-7 text-slate-950">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Context
              </p>
              <p className="mt-6 text-[15px] leading-8 text-slate-700 sm:text-base">
                {model.secondaryNarrative}
              </p>
            </div>
          </div>
        </div>

        {model.parseErrors.length > 0 ? (
          <div className="mt-5 rounded-[24px] border border-amber-300/30 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            Algunos bloques del reporte no pudieron interpretarse visualmente, pero el template siguió renderizando el contenido disponible.
          </div>
        ) : null}
      </SlideFrame>
    </div>
  );
}
