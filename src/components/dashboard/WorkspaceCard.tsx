import type { Workspace } from "@/types/workspace";
import { PlanLimitsSummary } from "@/components/workspace/PlanLimitsSummary";
import { useI18n } from "@/components/providers/LanguageProvider";
import { formatNumber } from "@/lib/formatters";

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
  const { messages } = useI18n();
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ||
    workspaces[0];

  if (!activeWorkspace) {
    return (
      <section className="rounded-[24px] border border-white/10 bg-white/8 p-5 backdrop-blur">
        <p className="text-sm font-medium text-white">{messages.workspace.workspace}</p>
        <p className="mt-4 text-lg font-medium">{messages.workspace.noWorkspace}</p>
        <p className="mt-2 text-sm text-slate-300">
          {messages.workspace.noWorkspaceDescription}
        </p>
        <button
          type="button"
          disabled
          className="mt-5 rounded-2xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-300"
        >
          {messages.workspace.createLater}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/8 p-5 backdrop-blur">
      <p className="text-sm font-medium text-white">{messages.workspace.activeWorkspace}</p>
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
          {(workspaces.length === 1
            ? messages.workspace.availableCount
            : messages.workspace.availableCountPlural
          ).replace("{count}", formatNumber(workspaces.length, 0))}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {messages.workspace.activeDescription}
        </p>
        {activeWorkspace.slug ? (
          <p className="mt-2 text-sm text-sky-200">{messages.workspace.slug}: {activeWorkspace.slug}</p>
        ) : null}
        <div className="mt-4">
          <PlanLimitsSummary workspace={activeWorkspace} compact />
        </div>
      </div>
    </section>
  );
}
