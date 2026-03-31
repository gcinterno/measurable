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
        badge: "Conexión lista",
        title: "Facebook Pages conectado correctamente",
        description:
          "La autorización ya quedó lista. El siguiente paso es elegir la página que quieres usar en el reporte.",
      };
    case "pages_loaded":
      return {
        badge: "Páginas disponibles",
        title: "Ya puedes elegir una página",
        description:
          "Selecciona la página correcta y confirma la selección para continuar con la sincronización.",
      };
    case "page_selected":
      return {
        badge: "Página seleccionada",
        title: "Todo listo para sincronizar datos",
        description:
          "La página ya quedó guardada. Ahora puedes sincronizar los datos reales desde Facebook Pages.",
      };
    case "syncing":
      return {
        badge: "Sincronizando",
        title: "Sincronizando datos de Facebook Pages",
        description:
          "Estamos consultando el backend para dejar los datos listos antes de generar el reporte.",
      };
    case "synced":
      return {
        badge: "Sincronizado",
        title: "Datos sincronizados correctamente",
        description:
          "La información ya está lista. El siguiente paso es generar el reporte dentro de la plataforma.",
      };
    case "generating_report":
      return {
        badge: "Generando",
        title: "Generando el reporte",
        description:
          "Estamos creando el reporte con los datos sincronizados. Te redirigiremos en cuanto esté listo.",
      };
    case "error":
      return {
        badge: "Error",
        title: "Hay un problema en este paso",
        description:
          "Revisa el mensaje y vuelve a intentar la acción principal para continuar con el flujo.",
      };
    case "not_connected":
    default:
      return {
        badge: "Sin conexión",
        title: "Conecta Facebook Pages para comenzar",
        description:
          "Primero autoriza Facebook Pages. Después podrás elegir una página, sincronizar datos y generar el reporte.",
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
            Workspace activo: {workspaceId || "Sin workspace seleccionado"}
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
