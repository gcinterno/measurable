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
        <section className="brand-card p-5 sm:p-8">
          <div className="space-y-3">
            <div className="h-6 w-52 animate-pulse rounded-full bg-slate-200" />
            <div className="h-28 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" />
            <div className="h-28 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" />
          </div>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <section className="rounded-[16px] border border-[color:rgba(239,68,68,0.22)] bg-[var(--surface)] p-6 shadow-[0_10px_28px_rgba(7,17,31,0.06)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
            {messages.common.error}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {messages.dashboard.couldNotLoadDashboard}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            {error}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            {messages.dashboard.couldNotLoadDashboardDescription}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="brand-button-secondary mt-5 inline-flex px-4 py-2.5 text-sm font-semibold"
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
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Hola, {userName}!
          </h1>
        </section>

        <IntegrationDropzoneCard />

        <section className="brand-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{messages.dashboard.recentReports}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{messages.dashboard.recentReportsDescription}</p>
            </div>
            <Link href="/reports" className="text-sm font-medium text-[var(--measurable-blue)] hover:text-[var(--measurable-blue-hover)]">
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
            <div className="mt-6 rounded-[16px] border border-dashed border-[var(--border-blue-soft)] bg-[var(--surface-soft)] px-4 py-6">
              <p className="font-medium text-[var(--text-primary)]">
                {reportsAvailable
                  ? messages.dashboard.noRecentReports
                  : messages.dashboard.reportsUnavailable}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {reportsAvailable
                  ? messages.dashboard.noRecentReportsDescription
                  : messages.dashboard.reportsUnavailableDescription}
              </p>
              <Link
                href="/reports/new/flow"
                className="brand-button-secondary mt-4 inline-flex px-4 py-2.5 text-sm font-semibold"
              >
                {messages.nav.newReport}
              </Link>
            </div>
          )}
        </section>

        <section className="brand-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{messages.dashboard.integrations}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{messages.dashboard.integrationsDescription}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {integrationCatalog.map((integration) => (
              <div
                key={integration.integrationKey}
                className="flex min-w-0 flex-col items-center justify-center rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-4 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border-soft)]">
                  <Image
                    src={integration.logoUrl}
                    alt={integration.logoAlt}
                    width={24}
                    height={24}
                    className="h-6 w-6"
                    unoptimized
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                  {integration.name}
                </p>
                <Link
                  href={integration.detailHref || "/integrations"}
                  className="brand-button-secondary mt-4 inline-flex px-4 py-2 text-sm font-semibold"
                >
                  {messages.common.connect}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              href="/integrations"
              className="brand-button-primary inline-flex w-full items-center justify-center px-5 py-3 text-sm font-semibold !text-white sm:w-auto"
            >
              {messages.dashboard.viewAllIntegrations}
            </Link>
          </div>
        </section>

        <section className="brand-card p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{messages.dashboard.quickActions}</h3>
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
