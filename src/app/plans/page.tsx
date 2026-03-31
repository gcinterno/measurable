import { AppShell } from "@/components/layout/AppShell";

const plans = [
  {
    name: "Free",
    price: "USD 0",
    cadence: "/mes",
    highlight: false,
    description: "Para probar el producto y validar el flujo base.",
    features: [
      "3 reportes al mes",
      "Hasta 5 slides",
      "1 GB storage",
      "Export PDF",
    ],
    icon: "circle",
  },
  {
    name: "Starter",
    price: "USD 15",
    cadence: "/mes",
    highlight: false,
    description: "Ideal para equipos pequeños con volumen inicial.",
    features: [
      "10 reportes al mes",
      "Hasta 5 slides",
      "5 GB storage",
      "Export PDF",
    ],
    icon: "spark",
  },
  {
    name: "Core",
    price: "USD 25",
    cadence: "/mes",
    highlight: true,
    description: "El plan recomendado para operación constante y exportación editable.",
    features: [
      "30 reportes al mes",
      "Hasta 10 slides",
      "15 GB storage",
      "Export PDF",
      "Export PPTX",
    ],
    icon: "layers",
  },
  {
    name: "Advanced",
    price: "USD 49",
    cadence: "/mes",
    highlight: false,
    description: "Pensado para equipos que operan más volumen y más profundidad.",
    features: [
      "50 reportes al mes",
      "Hasta 30 slides",
      "50 GB storage",
      "Export PDF",
      "Export PPTX",
    ],
    icon: "orbit",
  },
  {
    name: "Premium",
    price: "USD 99",
    cadence: "/mes",
    highlight: false,
    description: "Para operación intensiva con automatizaciones recurrentes.",
    features: [
      "50 reportes al mes",
      "Hasta 30 slides",
      "200 GB storage",
      "Export PDF",
      "Export PPTX",
      "Automatizacion de reportes mensuales",
    ],
    icon: "crown",
  },
] as const;

const comparisonRows = [
  {
    feature: "Reportes al mes",
    values: ["3", "10", "30", "50", "50"],
  },
  {
    feature: "Slides por reporte",
    values: ["5", "5", "10", "30", "30"],
  },
  {
    feature: "Storage",
    values: ["1 GB", "5 GB", "15 GB", "50 GB", "200 GB"],
  },
  {
    feature: "Export PDF",
    values: ["Si", "Si", "Si", "Si", "Si"],
  },
  {
    feature: "Export PPTX",
    values: ["No", "No", "Si", "Si", "Si"],
  },
  {
    feature: "Automatizacion mensual",
    values: ["No", "No", "No", "No", "Si"],
  },
] as const;

function PlanIcon({ icon }: { icon: (typeof plans)[number]["icon"] }) {
  const className = "h-4 w-4 stroke-current";

  switch (icon) {
    case "circle":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="6.5" strokeWidth="1.8" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 4.5v4M12 15.5v4M4.5 12h4M15.5 12h4" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" strokeWidth="1.8" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 5l7 4-7 4-7-4 7-4Z" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M5 12.5l7 4 7-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "orbit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="2.25" strokeWidth="1.8" />
          <path d="M6 12a9 4.5 0 1 0 12 0a9 4.5 0 1 0 -12 0Z" strokeWidth="1.8" />
        </svg>
      );
    case "crown":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 17.5h14l-1.5-8-4 3-1.5-4-1.5 4-4-3-1.5 8Z" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default function PlansPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Plans
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Membresias para cada etapa del equipo
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
            Desde una capa gratuita para validar el producto hasta un plan premium con automatizacion mensual, todos los planes mantienen una estructura SaaS clara y comparables.
          </p>
        </section>

        <section className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`w-[220px] shrink-0 rounded-[24px] border p-4 shadow-sm transition ${
                  plan.highlight
                    ? "border-sky-300 bg-[linear-gradient(180deg,rgba(14,165,233,0.14)_0%,rgba(14,165,233,0.04)_100%)] shadow-[0_0_0_1px_rgba(125,211,252,0.45)]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-2xl ${
                          plan.highlight
                            ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                        }`}
                      >
                        <PlanIcon icon={plan.icon} />
                      </div>
                      <p className="text-base font-semibold text-slate-950">{plan.name}</p>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {plan.description}
                    </p>
                  </div>
                  {plan.highlight ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                      Core
                    </span>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-semibold tracking-tight text-slate-950">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{plan.cadence}</p>
                </div>

                <div className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                    >
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    plan.highlight
                      ? "bg-slate-950 text-white hover:bg-slate-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Elegir
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Comparison
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Tabla comparativa
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              El plan Core queda resaltado como la opcion de equilibrio para la mayoria de equipos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-950">
                    Caracteristica
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      className={`px-6 py-4 text-left text-sm font-semibold ${
                        plan.highlight
                          ? "bg-[linear-gradient(180deg,rgba(14,165,233,0.14)_0%,rgba(14,165,233,0.04)_100%)] text-slate-950"
                          : "text-slate-950"
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIndex) => (
                  <tr
                    key={row.feature}
                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-950">
                      {row.feature}
                    </td>
                    {row.values.map((value, valueIndex) => (
                      <td
                        key={`${row.feature}-${plans[valueIndex].name}`}
                        className={`px-6 py-4 text-sm ${
                          plans[valueIndex].highlight
                            ? "bg-[linear-gradient(180deg,rgba(14,165,233,0.12)_0%,rgba(14,165,233,0.03)_100%)] font-semibold text-slate-950"
                            : "text-slate-600"
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
