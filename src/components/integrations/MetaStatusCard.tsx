type MetaStatusCardProps = {
  state:
    | "not_connected"
    | "connected"
    | "pages_loaded"
    | "page_selected"
    | "syncing"
    | "synced"
    | "generating_report"
    | "error";
  workspaceId: string | null;
  onAction: () => void;
  actionLabel: string;
  actionDisabled: boolean;
  error: string;
};

function getStateCopy(state: MetaStatusCardProps["state"]) {
  switch (state) {
    case "connected":
      return {
        badge: "Connection ready",
        title: "Facebook Pages connected successfully",
        description:
          "Authorization is complete. The next step is choosing the page you want to use in the report.",
      };
    case "pages_loaded":
      return {
        badge: "Pages available",
        title: "You can now choose a page",
        description:
          "Select the correct page and confirm the selection to continue with the sync.",
      };
    case "page_selected":
      return {
        badge: "Page selected",
        title: "Everything is ready to sync data",
        description:
          "The page has been saved. You can now sync the real data from Facebook Pages.",
      };
    case "syncing":
      return {
        badge: "Syncing",
        title: "Syncing Facebook Pages data",
        description:
          "We are querying the backend to prepare the data before generating the report.",
      };
    case "synced":
      return {
        badge: "Synced",
        title: "Data synced successfully",
        description:
          "The information is ready. The next step is generating the report inside the platform.",
      };
    case "generating_report":
      return {
        badge: "Generating",
        title: "Generating the report",
        description:
          "We are creating the report with the synced data. We will redirect you as soon as it is ready.",
      };
    case "error":
      return {
        badge: "Error",
        title: "There is a problem at this step",
        description:
          "Review the message and try the main action again to continue the flow.",
      };
    case "not_connected":
    default:
      return {
        badge: "Not connected",
        title: "Connect Facebook Pages to begin",
        description:
          "First authorize Facebook Pages. Then you can choose a page, sync data, and generate the report.",
      };
  }
}

export function MetaStatusCard({
  state,
  workspaceId,
  onAction,
  actionLabel,
  actionDisabled,
  error,
}: MetaStatusCardProps) {
  const copy = getStateCopy(state);

  return (
    <section className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#1d4ed8_140%)] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">
            {copy.badge}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            {copy.description}
          </p>
          <p className="mt-4 text-sm text-sky-100">
            Active workspace: {workspaceId || "No workspace selected"}
          </p>
        </div>

        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {actionLabel}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
    </section>
  );
}
