import type { ReportVersion } from "@/types/report";

type ReportVersionsPanelProps = {
  versions: ReportVersion[];
  selectedVersionId: string;
  onVersionChange: (versionId: string) => void;
};

function formatDate(value: string) {
  if (!value) {
    return "Fecha no disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ReportVersionsPanel({
  versions,
  selectedVersionId,
  onVersionChange,
}: ReportVersionsPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Versions
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Selecciona una version
          </h2>
        </div>
        <select
          value={selectedVersionId}
          onChange={(event) => onVersionChange(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.version} · {version.status} · {formatDate(version.createdAt)}
            </option>
          ))}
        </select>
      </div>

      {versions.length > 0 && !versions.some((version) => version.blocks.length > 0) ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-medium text-slate-950">{version.version}</p>
              <p className="mt-1 text-sm text-slate-500">
                Estado: {version.status}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Creado: {formatDate(version.createdAt)}
              </p>
              {version.rawMetadata ? (
                <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                  {JSON.stringify(version.rawMetadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
