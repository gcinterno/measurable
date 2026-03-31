"use client";

import type { ReportVersionBlock } from "@/types/report";

type ReportSlidesDeckProps = {
  blocks: ReportVersionBlock[];
  theme?: string;
};

function getTextValue(text: string | null | undefined) {
  return text?.trim() || "";
}

function getStatValue(value: ReportVersionBlock["data"]["value"]) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  return String(value);
}

function formatDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 27);

  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function getReportTitle(blocks: ReportVersionBlock[]) {
  const titleBlock = blocks.find((block) => block.type === "title");
  return getTextValue(titleBlock?.data.text) || "Meta Pages Overview";
}

function getStatBlocks(blocks: ReportVersionBlock[]) {
  return blocks.filter((block) => block.type === "stat").slice(0, 4);
}

function getTextBlocks(blocks: ReportVersionBlock[]) {
  return blocks
    .filter((block) => block.type === "text")
    .map((block) => getTextValue(block.data.text))
    .filter(Boolean);
}

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildAnalysisText(textBlocks: string[]) {
  return textBlocks.slice(0, 2);
}

function buildConclusionText(textBlocks: string[]) {
  return textBlocks[textBlocks.length - 1] || textBlocks[0] || "";
}

function buildExecutiveHighlights(statBlocks: ReportVersionBlock[]) {
  return statBlocks.slice(0, 3).map((block) => ({
    label: block.data.label || "KPI",
    value: getStatValue(block.data.value),
  }));
}

function SlideFrame({
  index,
  title,
  eyebrow,
  children,
}: {
  index: number;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)] p-3 shadow-sm sm:p-5">
      <div className="mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-[#fbfcfe] shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 sm:p-8 lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                {eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-[2rem]">
                {title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden items-center gap-1.5 sm:flex">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2.5 rounded-full transition ${
                      dot === index ? "w-7 bg-slate-950" : "w-2.5 bg-slate-300"
                    }`}
                  />
                ))}
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                {String(index).padStart(2, "0")} / 05
              </span>
            </div>
          </div>

          <div className="mt-7 min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function ReportSlidesDeck({
  blocks,
  theme = "minimalista",
}: ReportSlidesDeckProps) {
  const reportTitle = getReportTitle(blocks);
  const textBlocks = getTextBlocks(blocks);
  const statBlocks = getStatBlocks(blocks);
  const dateRange = formatDateRange();
  const analysisBlocks = buildAnalysisText(textBlocks);
  const conclusionText = buildConclusionText(textBlocks);
  const analysisParagraphs = splitParagraphs(analysisBlocks.join("\n\n"));
  const conclusionParagraphs = splitParagraphs(conclusionText);
  const executiveHighlights = buildExecutiveHighlights(statBlocks);
  const coverDescription =
    analysisBlocks[0] ||
    "Resumen ejecutivo con contexto de crecimiento, rendimiento y conclusiones clave.";
  const isModern = theme === "moderno";

  if (isModern) {
    return (
      <div className="space-y-6">
        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.2),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                    Portada
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem]">
                    {reportTitle}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  01 / 05
                </span>
              </div>

              <div className="mt-7 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-7 backdrop-blur">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
                      Reporte mensual de resultados
                    </p>
                    <p className="mt-8 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-5xl">
                      {reportTitle}
                    </p>
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                      {coverDescription}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Periodo
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {dateRange}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Tipo de entrega
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Moderno · 5 slides
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid h-full gap-4">
                  <div className="flex min-h-[250px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/5 p-6 text-center">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Imagen
                      </p>
                      <p className="mt-4 text-xl font-semibold tracking-tight text-white">
                        Espacio para logo o visual hero
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        Pensado para una portada más impactante en junta.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Highlights
                    </p>
                    <div className="mt-4 space-y-3">
                      {executiveHighlights.map((highlight) => (
                        <div
                          key={highlight.label}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-300">
                            {highlight.label}
                          </span>
                          <span className="text-base font-semibold text-white">
                            {highlight.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                    KPIs
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem]">
                    Indicadores principales
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  02 / 05
                </span>
              </div>

              <div className="mt-7 grid min-h-0 flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statBlocks.map((block, index) => (
                  <article
                    key={block.id}
                    className={`flex min-h-[220px] flex-col justify-between rounded-[28px] border p-6 ${
                      index === 0
                        ? "border-sky-400/30 bg-[linear-gradient(145deg,#0ea5e9_0%,#1d4ed8_100%)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                        {block.data.label || "KPI"}
                      </p>
                      <p className="mt-8 text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
                        {getStatValue(block.data.value)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Periodo mensual</span>
                      <span>Resultado</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                    Análisis
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem]">
                    Rendimiento, crecimiento y contexto
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  03 / 05
                </span>
              </div>

              <div className="mt-7 grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.12fr_0.88fr]">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-7">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                    Lectura del periodo
                  </p>
                  <div className="mt-5 space-y-5 text-[15px] leading-8 text-slate-200">
                    {analysisParagraphs.map((text, index) => (
                      <p key={`${index}-${text.slice(0, 24)}`}>{text}</p>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[28px] border border-sky-400/20 bg-[linear-gradient(145deg,#0f172a_0%,#111827_100%)] p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Rendimiento
                    </p>
                    <p className="mt-4 text-xl font-semibold leading-tight text-white">
                      El comportamiento del periodo se interpreta a partir de la combinación entre audiencia, alcance e interacción.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Contexto
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Esta slide traduce los bloques del backend a una narrativa más presentable para seguimiento mensual en junta, sin cambiar la fuente original de datos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                    Conclusión
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem]">
                    Cierre y recomendación ejecutiva
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  04 / 05
                </span>
              </div>

              <div className="mt-7 grid min-h-0 flex-1 gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-7">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Conclusión
                  </p>
                  <div className="mt-5 space-y-5 text-[15px] leading-8 text-slate-200">
                    {(conclusionParagraphs.length > 0
                      ? conclusionParagraphs
                      : [
                          "Aún no hay una conclusión textual disponible, pero el reporte ya contiene una primera lectura ejecutiva con KPIs y resumen de desempeño.",
                        ]
                    ).map((paragraph, index) => (
                      <p key={`${index}-${paragraph.slice(0, 24)}`}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-[28px] border border-sky-400/20 bg-[linear-gradient(145deg,#0f172a_0%,#172554_100%)] p-7">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Próximo paso
                    </p>
                    <p className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.03em] text-white">
                      Usa este slide como cierre de junta y como puente hacia decisiones del siguiente ciclo.
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-300">
                    La recomendación final puede acompañarse con acciones concretas, responsables y próximos entregables.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 shadow-sm sm:p-5">
          <div className="mx-auto aspect-[16/9] w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#020617] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
            <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-6 text-white sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                    Cierre
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl lg:text-[2rem]">
                    {reportTitle}
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                  05 / 05
                </span>
              </div>

              <div className="mt-7 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-7">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Slide final
                    </p>
                    <p className="mt-8 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl">
                      Gracias.
                    </p>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                      {coverDescription}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Periodo analizado
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {dateRange}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                        Formato
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Presentación moderna
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex h-full min-h-[250px] items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/5 p-6 text-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Imagen final
                    </p>
                    <p className="mt-4 text-xl font-semibold tracking-tight text-white">
                      Espacio para logo o cierre visual
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Mantiene consistencia con la portada para cerrar la presentación con presencia de marca.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SlideFrame index={1} eyebrow="Portada" title={reportTitle}>
        <div className="grid h-full gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="flex flex-col justify-between rounded-[28px] bg-[linear-gradient(140deg,#0f172a_0%,#172554_38%,#1d4ed8_100%)] p-7 text-white sm:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">
                Reporte mensual de resultados
              </p>
              <p className="mt-8 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl">
                {reportTitle}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-[15px]">
                {coverDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                  Periodo
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {dateRange}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100">
                  Tipo de entrega
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  Deck ejecutivo · 5 slides
                </p>
              </div>
            </div>
          </div>

          <div className="grid h-full gap-4">
            <div className="flex min-h-[250px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 text-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Branding
                </p>
                <p className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  Logo de marca o imagen principal
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Espacio pensado para cliente, unidad de negocio o una imagen editorial de portada.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Resumen ejecutivo
              </p>
              <div className="mt-4 space-y-3">
                {executiveHighlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-600">
                      {highlight.label}
                    </span>
                    <span className="text-base font-semibold text-slate-950">
                      {highlight.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={2} eyebrow="KPIs" title="Indicadores principales">
        <div className="grid h-full gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statBlocks.map((block, index) => (
            <article
              key={block.id}
              className={`flex min-h-[220px] flex-col justify-between rounded-[28px] border p-6 ${
                index === 0
                  ? "border-slate-900 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-950"
              }`}
            >
              <div>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                    index === 0 ? "text-sky-200" : "text-slate-400"
                  }`}
                >
                  {block.data.label || "KPI"}
                </p>
                <p
                  className={`mt-8 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl ${
                    index === 0 ? "text-white" : "text-slate-950"
                  }`}
                >
                  {getStatValue(block.data.value)}
                </p>
              </div>

              <div
                className={`flex items-center justify-between text-sm ${
                  index === 0 ? "text-slate-300" : "text-slate-500"
                }`}
              >
                <span>Periodo mensual</span>
                <span>Resultado</span>
              </div>
            </article>
          ))}
        </div>
      </SlideFrame>

      <SlideFrame
        index={3}
        eyebrow="Análisis"
        title="Rendimiento, crecimiento y contexto"
      >
        <div className="grid h-full gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Lectura del periodo
            </p>
            <div className="mt-5 space-y-5 text-[15px] leading-8 text-slate-700">
              {analysisParagraphs.map((text, index) => (
                <p key={`${index}-${text.slice(0, 24)}`}>{text}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                Rendimiento
              </p>
              <p className="mt-4 text-xl font-semibold leading-tight">
                El comportamiento del periodo se interpreta a partir de la combinación entre audiencia, alcance e interacción.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                Contexto
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Esta slide traduce los bloques del backend a una narrativa más presentable para seguimiento mensual en junta, sin cambiar la fuente original de datos.
              </p>
            </div>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={4} eyebrow="Conclusión" title="Cierre y recomendación ejecutiva">
        <div className="grid h-full gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Conclusión
            </p>
            <div className="mt-5 space-y-5 text-[15px] leading-8 text-slate-700">
              {(conclusionParagraphs.length > 0
                ? conclusionParagraphs
                : [
                    "Aún no hay una conclusión textual disponible, pero el reporte ya contiene una primera lectura ejecutiva con KPIs y resumen de desempeño.",
                  ]
              ).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[28px] bg-[linear-gradient(145deg,#eff6ff_0%,#dbeafe_100%)] p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                Próximo paso
              </p>
              <p className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.03em] text-slate-950">
                Usa este slide como cierre de junta y como puente hacia decisiones del siguiente ciclo.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-4 text-sm leading-7 text-slate-600">
              La recomendación final puede acompañarse con acciones concretas, responsables y próximos entregables.
            </div>
          </div>
        </div>
      </SlideFrame>

      <SlideFrame index={5} eyebrow="Cierre" title={reportTitle}>
        <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-between rounded-[28px] bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                Slide final
              </p>
              <p className="mt-8 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Gracias.
              </p>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                {coverDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Periodo analizado
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {dateRange}
                </p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Formato
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  Presentación mensual
                </p>
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-[250px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Imagen final
              </p>
              <p className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                Espacio para logo o cierre visual
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Mantiene consistencia con la portada para cerrar la presentación con presencia de marca.
              </p>
            </div>
          </div>
        </div>
      </SlideFrame>
    </div>
  );
}
