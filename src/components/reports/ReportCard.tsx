import Link from "next/link";

import type { Report } from "@/types/report";

type ReportCardProps = {
  report: Report;
  folderOptions?: Array<{
    id: string;
    name: string;
  }>;
  folderId?: string;
  onMoveToFolder?: (folderId: string) => void;
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

export function ReportCard({
  report,
  folderOptions = [],
  folderId = "",
  onMoveToFolder,
}: ReportCardProps) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
              {report.status}
            </span>
            <span className="text-sm text-slate-500">
              Creado: {formatDate(report.createdAt)}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {report.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Abre este reporte para revisar su contenido, versiones y exportaciones disponibles.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          {onMoveToFolder ? (
            <label className="flex flex-col gap-1 text-sm text-slate-500">
              <span>Mover a carpeta</span>
              <select
                value={folderId}
                onChange={(event) => onMoveToFolder(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">Sin carpeta</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Link
            href={`/reports/${report.id}`}
            className="inline-flex shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ver reporte
          </Link>
        </div>
      </div>
    </article>
  );
}
