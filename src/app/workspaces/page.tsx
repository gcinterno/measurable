import { AppShell } from "@/components/layout/AppShell";

export default function WorkspacesPage() {
  return (
    <AppShell>
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Workspaces placeholder</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          This older route now uses the same shell so it no longer breaks type-checking while the dedicated workspace experience is still pending.
        </p>
      </section>
    </AppShell>
  );
}
