import Link from "next/link";

type IntegrationSourceCardProps = {
  workspaceId: string | null;
  reportName: string;
  onReportNameChange: (value: string) => void;
  sourceName: string;
  sourceReady: boolean;
  sourceSummary: string;
  helperText: string;
  loading?: boolean;
  error?: string;
};

export function IntegrationSourceCard({
  workspaceId,
  reportName,
  onReportNameChange,
  sourceName,
  sourceReady,
  sourceSummary,
  helperText,
  loading = false,
  error = "",
}: IntegrationSourceCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
        Integration flow
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Create reports from a synced integration.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
        This view prepares the flow to create reports from connected sources without relying on a manual upload.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Active workspace
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-950">
          {workspaceId || "No workspace selected"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {workspaceId
            ? "Future report creation from integrations will use this workspace."
            : "Select a workspace in the dashboard before continuing."}
        </p>
      </div>

      <div className="mt-6">
        <label className="block">
          <span className="text-sm font-medium text-slate-950">Report name</span>
          <input
            type="text"
            value={reportName}
            onChange={(event) => onReportNameChange(event.target.value)}
            placeholder="Ej. Meta campaigns sync"
            disabled={loading}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Selected source
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              {sourceName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {sourceSummary}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              sourceReady
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {sourceReady ? "Ready" : "Pending"}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
        <p className="font-medium text-slate-950">
          {sourceReady
            ? "The synced source is ready to move to the next step."
            : "Connect and sync a source to create reports from integrations."}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{helperText}</p>
        <Link
          href="/integrations"
          className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Go to integrations
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white opacity-60"
        >
          Create report with this data
        </button>
        <p className="text-sm text-slate-500">
          {sourceReady
            ? "The flow already detected your synced source. At this stage, the backend only needs to expose the final payload to create the report directly."
            : "Once you complete a sync, this area will be ready to create the report without uploading files manually."}
        </p>
      </div>
    </section>
  );
}
