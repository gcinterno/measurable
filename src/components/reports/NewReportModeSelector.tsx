"use client";

type NewReportMode = "upload" | "integration";

type NewReportModeSelectorProps = {
  mode: NewReportMode;
  onChange: (mode: NewReportMode) => void;
};

const modes = [
  {
    id: "upload" as const,
    label: "Upload file",
    description: "Sube un Excel o CSV y crea el reporte desde un dataset nuevo.",
  },
  {
    id: "integration" as const,
    label: "Use integration",
    description: "Prepara un reporte a partir de una fuente ya conectada y sincronizada.",
  },
];

export function NewReportModeSelector({
  mode,
  onChange,
}: NewReportModeSelectorProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        {modes.map((option) => {
          const active = option.id === mode;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-[24px] border px-5 py-5 text-left transition ${
                active
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                  active ? "text-sky-200" : "text-sky-600"
                }`}
              >
                {option.label}
              </p>
              <p
                className={`mt-2 text-sm leading-6 ${
                  active ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
