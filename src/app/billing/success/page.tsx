"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useBilling } from "@/lib/billing/useBilling";

function SuccessCheck() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="h-48 w-48 rounded-full bg-emerald-100 shadow-[0_28px_72px_rgba(34,197,94,0.16)] sm:h-56 sm:w-56 lg:h-[21rem] lg:w-[21rem] xl:h-[24rem] xl:w-[24rem]" />
      <div className="absolute flex h-36 w-36 items-center justify-center rounded-full bg-emerald-500 shadow-[0_24px_60px_rgba(34,197,94,0.28)] sm:h-40 sm:w-40 lg:h-[15.5rem] lg:w-[15.5rem] xl:h-[18rem] xl:w-[18rem]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-14 w-14 stroke-white sm:h-16 sm:w-16 lg:h-24 lg:w-24 xl:h-28 xl:w-28"
        >
          <path
            d="M6.75 12.5 10 15.75 17.75 8"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <section className="grid min-h-[70vh] items-start gap-10 pb-24 pt-2 lg:min-h-[76vh] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-20 lg:pb-8 lg:pt-4 xl:gap-28">
      <div className="order-2 space-y-6 text-center lg:order-1 lg:text-left">
        <div className="mx-auto h-16 w-52 animate-pulse rounded-3xl bg-slate-200 sm:h-20 sm:w-64 lg:mx-0 lg:h-24 lg:w-80" />
        <div className="mx-auto h-16 w-72 animate-pulse rounded-3xl bg-slate-200 sm:h-20 sm:w-96 lg:mx-0 lg:h-24 lg:w-[34rem]" />
        <div className="mx-auto h-8 w-72 animate-pulse rounded-full bg-slate-100 sm:w-96 lg:mx-0 lg:h-10 lg:w-[30rem]" />
        <div className="h-px w-full bg-slate-200/80 lg:hidden" />
        <div className="flex flex-col gap-4 sm:mx-auto sm:max-w-md lg:mx-0 lg:max-w-[32rem]">
          <div className="h-16 animate-pulse rounded-[1.75rem] bg-slate-200 lg:h-[4.75rem]" />
          <div className="h-14 animate-pulse rounded-[1.5rem] bg-slate-100 lg:h-[3.75rem] lg:max-w-[22rem]" />
        </div>
      </div>
      <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
        <div className="h-52 w-52 animate-pulse rounded-full bg-emerald-100 sm:h-60 sm:w-60 lg:h-[21rem] lg:w-[21rem] xl:h-[24rem] xl:w-[24rem]" />
      </div>
    </section>
  );
}

export default function BillingSuccessPage() {
  const { billing, loading, error, refresh } = useBilling();
  const [activationChecked, setActivationChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLatestBilling() {
      await refresh();

      if (active) {
        setActivationChecked(true);
      }
    }

    void loadLatestBilling();

    return () => {
      active = false;
    };
  }, [refresh]);

  const planName = billing?.planName?.trim() || "your Measurable plan";
  const subtitle =
    planName === "your Measurable plan"
      ? "Get started with your Measurable plan."
      : `Get started with ${planName}.`;

  const showLoadingState = loading && !activationChecked;
  const showSuccessState = billing?.isActive;
  const showPendingState = activationChecked && !billing?.isActive && !error;

  return (
    <AppShell>
      <section className="mx-auto max-w-[1180px] px-4 pb-24 pt-1 sm:px-6 md:pb-28 lg:px-8 lg:pb-10 lg:pt-6 xl:max-w-[1240px]">
        {showLoadingState ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid min-h-[68vh] items-start gap-6 pb-6 pt-1 lg:min-h-[76vh] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-20 lg:pb-0 xl:gap-28">
            <div className="order-2 flex flex-col justify-start text-center lg:order-1 lg:justify-center lg:text-left">
              <div className="mx-auto lg:mx-0">
                <Image
                  src="/brand/measurable-logo-black.svg"
                  alt="Measurable"
                  width={360}
                  height={108}
                  className="hidden h-16 w-auto object-contain sm:hidden lg:block lg:h-24 xl:h-28"
                  unoptimized
                />
              </div>
              <h1 className="mt-2 text-[2.65rem] font-semibold tracking-[-0.04em] text-slate-950 sm:mt-4 sm:text-[3.25rem] lg:mt-10 lg:text-[4.4rem] lg:leading-[0.96] xl:text-[4.85rem]">
                Congratulations!
              </h1>
              <p className="mt-2 text-[1.35rem] leading-8 text-slate-600 sm:mt-3 sm:text-[1.55rem] sm:leading-9 lg:mt-5 lg:max-w-[36rem] lg:text-[2rem] lg:leading-[1.28]">
                {showSuccessState ? subtitle : "Activating your plan..."}
              </p>
              {showPendingState ? (
                <p className="mt-5 text-sm leading-7 text-amber-700 sm:text-base lg:max-w-[34rem]">
                  We received your payment, but we&apos;re still confirming your plan. Please check Billing in a moment.
                </p>
              ) : null}
              {error ? (
                <p className="mt-5 text-sm leading-7 text-amber-700 sm:text-base lg:max-w-[34rem]">
                  We received your payment, but we&apos;re still confirming your plan. Please check Billing in a moment.
                </p>
              ) : null}
              <div className="mt-4 h-px w-full bg-slate-200/80 lg:hidden" />
              <div className="mt-4 flex flex-col gap-4 sm:mx-auto sm:w-full sm:max-w-md lg:mx-0 lg:mt-10 lg:max-w-[32rem]">
                <Link
                  href="/reports/new"
                  className="inline-flex min-h-16 items-center justify-center rounded-[1.75rem] bg-[var(--measurable-blue)] px-7 py-4 text-lg font-semibold !text-white shadow-[0_22px_48px_rgba(23,73,255,0.22)] transition hover:bg-[var(--measurable-blue-hover)] hover:!text-white lg:min-h-[4.9rem] lg:text-[1.6rem]"
                >
                  Create New Report
                </Link>
                <Link
                  href="/billing"
                  className="inline-flex min-h-[3.4rem] items-center justify-center rounded-[1.35rem] border border-slate-200 bg-slate-50 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-[78%] sm:self-center lg:min-h-[3.9rem] lg:w-[22rem] lg:self-start lg:text-[1.15rem]"
                >
                  Go to billing
                </Link>
              </div>
            </div>

            <div className="order-1 flex justify-center pb-0 lg:order-2 lg:justify-end lg:pb-0">
              <SuccessCheck />
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
