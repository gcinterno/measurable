import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";

function EmptyBillingCard({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
        <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        {actionLabel && actionHref ? (
          <div className="mt-5">
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800"
            >
              {actionLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function BillingPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Billing
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Billing overview
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Review your current plan, payment activity, and billing details in one place.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Current plan
              </p>
              <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-6">
                <p className="text-sm font-medium text-slate-950">No active plan</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Once billing is active, your current subscription and renewal details will appear here.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <EmptyBillingCard
            title="No billing activity"
            description="Invoices, charges, and payment history will appear here once this workspace has billing activity."
            actionLabel="View Plans"
            actionHref="/plans"
          />

          <div className="space-y-6">
            <EmptyBillingCard
              title="No payment methods"
              description="Saved cards and billing methods will appear here once you start a paid plan."
              actionLabel="View Plans"
              actionHref="/plans"
            />

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                Billing actions
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                No billing actions available
              </h3>
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
                <p className="text-sm font-medium text-slate-950">
                  Billing is not active yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  When billing is enabled, you will be able to manage upgrades, renewals, and cancellations from here.
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/plans"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800"
                >
                  View plans
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
