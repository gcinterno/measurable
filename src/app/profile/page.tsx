import { AppShell } from "@/components/layout/AppShell";

export default function ProfilePage() {
  return (
    <AppShell>
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Profile placeholder</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          The page is intentionally lightweight for now, but it already uses the shared shell, top bar, and navigation states.
        </p>
      </section>
    </AppShell>
  );
}
