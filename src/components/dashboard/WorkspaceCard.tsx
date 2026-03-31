import type { Workspace } from "@/types/workspace";

type WorkspaceCardProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onWorkspaceChange?: (workspaceId: string) => void;
};

export function WorkspaceCard({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
}: WorkspaceCardProps) {
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ||
    workspaces[0];

  if (!activeWorkspace) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/8 p-5 backdrop-blur">
        <p className="text-sm font-medium text-white">Workspace</p>
        <p className="mt-4 text-lg font-medium">Sin workspace disponible</p>
        <p className="mt-2 text-sm text-slate-300">
          Cuando tengas un workspace disponible, podras usarlo para crear reportes e integrar fuentes de datos.
        </p>
        <button
          type="button"
          disabled
          className="mt-5 rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-300"
        >
          Crear o seleccionar workspace despues
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/8 p-5 backdrop-blur">
      <p className="text-sm font-medium text-white">Workspace activo</p>
      <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/30 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-medium">{activeWorkspace.name}</p>
          {workspaces.length > 1 ? (
            <select
              value={activeWorkspace.id}
              onChange={(event) => onWorkspaceChange?.(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-300"
            >
              {workspaces.map((workspace) => (
                <option
                  key={workspace.id}
                  value={workspace.id}
                  className="text-slate-950"
                >
                  {workspace.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-300">
          {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} disponible
          {workspaces.length === 1 ? "" : "s"} en tu cuenta.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Los nuevos reportes y conexiones usaran este workspace mientras siga activo.
        </p>
        {activeWorkspace.slug ? (
          <p className="mt-2 text-sm text-sky-200">Slug: {activeWorkspace.slug}</p>
        ) : null}
      </div>
    </section>
  );
}
