"use client";

import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { trackEvent } from "@/lib/analytics";

export default function BillingCancelPage() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
          Billing update
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Checkout was cancelled.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          No billing changes were applied. You can review pricing again whenever you&apos;re ready.
        </p>

        <div className="mt-8">
          <Link
            href="/pricing"
            onClick={() =>
              trackEvent("upgrade_click", {
                current_plan: "unknown",
                target_plan: "unknown",
                cta_location: "billing_page",
              })
            }
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--measurable-blue)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(23,73,255,0.22)] transition hover:bg-[var(--measurable-blue-hover)]"
          >
            Back to pricing
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
