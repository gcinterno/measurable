"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { useI18n } from "@/components/providers/LanguageProvider";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { RecentReportCard } from "@/components/dashboard/RecentReportCard";
import { IntegrationDropzoneCard } from "@/components/reports/IntegrationDropzoneCard";
import { isAbortError, isAuthError } from "@/lib/api";
import { fetchCurrentUser } from "@/lib/api/me";
import { fetchReports } from "@/lib/api/reports";
import { integrationCatalog } from "@/lib/integrations/catalog";
import { useAuthStore } from "@/lib/store/auth-store";
import type { User } from "@/types/auth";
import type { Report } from "@/types/report";

export default function DashboardPage() {
  const { messages } = useI18n();
  const authUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportsAvailable, setReportsAvailable] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [userResult, reportsResult] = await Promise.allSettled([
          fetchCurrentUser({ signal: controller.signal }),
          fetchReports({ signal: controller.signal }),
        ]);

        if (!active) {
          return;
        }

        const nextUser =
          userResult.status === "fulfilled"
            ? userResult.value
            : isAbortError(userResult.reason) || isAuthError(userResult.reason)
              ? null
              : authUser;

        const nextReports =
          reportsResult.status === "fulfilled" ? reportsResult.value : [];
        const nextReportsAvailable = reportsResult.status === "fulfilled";

        setUser(nextUser || authUser || null);
        setReports(nextReports.slice(0, 5));
        setReportsAvailable(nextReportsAvailable);

        const hasUserContext = Boolean(nextUser || authUser);

        if (!hasUserContext && userResult.status === "rejected") {
          if (!isAbortError(userResult.reason) && !isAuthError(userResult.reason)) {
            throw userResult.reason;
          }
        }
      } catch (err: unknown) {
        if (isAbortError(err) || isAuthError(err)) {
          return;
        }

        if (!active) {
          return;
        }

        console.error("dashboard load error:", err);
        setError(
          "We could not load your dashboard right now. Try again in a few seconds."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
      controller.abort();
    };
  }, [authUser, reloadKey]);

  if (loading) {
    return (
      <AppShell>
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="space-y-3">
            <div className="h-6 w-52 animate-pulse rounded-full bg-slate-200" />
            <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          </div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <section className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
            {messages.common.error}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {messages.dashboard.couldNotLoadDashboard}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
            {error}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {messages.dashboard.couldNotLoadDashboardDescription}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {messages.common.tryAgain}
          </button>
        </section>
      </AppShell>
    );
  }

  const userName = user?.name || "team";
  const quickActions = [
    {
      title: messages.dashboard.quickActionNewReportTitle,
      description: messages.dashboard.quickActionNewReportDescription,
      href: "/reports/new/flow",
      icon: "plus" as const,
    },
    {
      title: messages.dashboard.quickActionViewReportsTitle,
      description: messages.dashboard.quickActionViewReportsDescription,
      href: "/reports",
      icon: "reports" as const,
    },
    {
      title: messages.dashboard.quickActionIntegrationsTitle,
      description: messages.dashboard.quickActionIntegrationsDescription,
      href: "/integrations",
      icon: "integrations" as const,
    },
  ];

  return (
    <AppShell>
      <div className="max-w-full space-y-5 sm:space-y-6 md:max-w-none">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Hola, {userName}!
          </h1>
        </section>

        <IntegrationDropzoneCard />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-950">{messages.dashboard.recentReports}</h3>
              <p className="mt-1 text-sm text-slate-500">{messages.dashboard.recentReportsDescription}</p>
            </div>
            <Link href="/reports" className="text-sm font-medium text-sky-700">
              {messages.common.viewAll}
            </Link>
          </div>

          {reports.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {reports.map((report) => (
                <RecentReportCard
                  key={report.id}
                  report={report}
                  onDeleted={(reportId) =>
                    setReports((current) =>
                      current.filter((item) => item.id !== reportId)
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6">
              <p className="font-medium text-slate-950">
                {reportsAvailable
                  ? messages.dashboard.noRecentReports
                  : messages.dashboard.reportsUnavailable}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {reportsAvailable
                  ? messages.dashboard.noRecentReportsDescription
                  : messages.dashboard.reportsUnavailableDescription}
              </p>
              <Link
                href="/reports/new/flow"
                className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {messages.nav.newReport}
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{messages.dashboard.integrations}</h3>
              <p className="mt-1 text-sm text-slate-500">{messages.dashboard.integrationsDescription}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {integrationCatalog.map((integration) => (
              <div
                key={integration.integrationKey}
                className="flex min-w-0 flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                  <Image
                    src={integration.logoUrl}
                    alt={integration.logoAlt}
                    width={24}
                    height={24}
                    className="h-6 w-6"
                    unoptimized
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">
                  {integration.name}
                </p>
                <Link
                  href={integration.detailHref || "/integrations"}
                  className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {messages.common.connect}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              href="/integrations"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800 sm:w-auto"
            >
              {messages.dashboard.viewAllIntegrations}
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">{messages.dashboard.quickActions}</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.title}
                title={action.title}
                description={action.description}
                href={action.href}
                icon={action.icon}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
