"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubnav } from "@/components/admin/AdminSubnav";

type AdminPageShellProps = {
  title: string;
  description: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminPageShell({
  title,
  description,
  headerActions,
  children,
}: AdminPageShellProps) {
  return (
    <AppShell>
      <AdminGuard>
        <section className="mt-1 rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface)] px-5 py-6 shadow-[0_10px_24px_rgba(15,23,42,0.035)] sm:mt-2 sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--measurable-blue)]">
                Admin workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-[2.4rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
                {description}
              </p>
            </div>
            {headerActions ? <div className="lg:min-w-[320px] lg:max-w-[420px]">{headerActions}</div> : null}
          </div>
        </section>
        <div className="mt-6">
          <AdminSubnav />
          {children}
        </div>
      </AdminGuard>
    </AppShell>
  );
}
